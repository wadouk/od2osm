import {h, Component} from 'preact'
import style from './style.css'
import leafletCss from 'leaflet/dist/leaflet.css'

import {Marker, Map, Rectangle, TileLayer, Popup} from 'react-leaflet'
import {LatLng} from 'leaflet'

import L from 'leaflet'
import Loader from '../components/Loader'

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
})

const diffStatusText = {
  "=": "même valeur dans OSM et l'OD",
  "~": "l'OD compléte OSM",
  "+": "l'OD compléte OSM",
  "*": "OSM gagne",
}

export default class Point extends Component {
  state = {
    radius: 20,
  }

  async componentDidMount() {
    const {qid, pid} = this.props
    const r = await fetch(`/api/quests/${qid}/points/${pid}`)
    const d = await r.json()
    this.setState({point: d[0]})
  }

  getOverpassQuery() {
    const {point} = this.state
    if (!point) {
      return ""
    }
    const {properties} = point
    const bbox = new LatLng(point.point.y, point.point.x).toBounds(this.state.radius)
    const bboxOverpass = [bbox.getSouth(), bbox.getWest(), bbox.getNorth(), bbox.getEast()].map(v => v.toFixed(6)).join(', ')
    const q = Object.entries(properties)
      .filter(([k, v]) => ['shop', 'amenity'].indexOf(k) !== -1)
      .map(([k, v]) => v.split(";")
        .map(u => `node ["${k}"="${u}"](${bboxOverpass}); `).join("\n"),
      )[0]

    return `[out:json] [timeout:25] ;\n ( \n${q} \n); out meta;`
  }

  async fetchOverpass() {
    const query = this.getOverpassQuery()
    let body = new URLSearchParams({
      data: query,
    })
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      mode: "cors",
      credentials: "omit",
      body: body,
    }

    this.setState({loaderOverpass: true})
    const r = await fetch("http://overpass-api.de/api/interpreter", options)

    const d = await r.json()
    this.setState({loaderOverpass: false, overpass: d})
  }

  renderPoint(point) {
    const {properties} = point
    return <div>
      <h2>OpenData</h2>
      <div>{this.renderTags(properties)}</div>
    </div>
  }

  markerOpendataMoved(e) {
    const {point} = this.state
    const latLng = e.target.getLatLng()
    point.point.y = latLng.lat
    point.point.x = latLng.lng
    this.setState({point})
  }

  renderCirclesElements({elements}) {
    return elements.map(this.renderCirclesElement)
  }

  renderCirclesElement({lon, lat}) {
    return <Marker position={{lon, lat}}>
      <Popup>Overpass</Popup>
    </Marker>
  }

  renderCirclesOverpass() {
    const {overpass} = this.state
    return overpass ? this.renderCirclesElements(overpass) : []
  }

  renderElement = ({tags, ...info}) => {
    const point = this.state.point
    const p0 = new LatLng(point.point.y, point.point.x)
    const {id, lat, lon, ...others} = info
    const p1 = new LatLng(lat, lon)

    return <div>
      <div className={style.renderElement}>
        <span>Distance: {p0.distanceTo(p1).toFixed(0)}m</span>
        &nbsp;
        <a href={`https://www.openstreetmap.org/node/${id}`}>{id}</a>
        &nbsp;
        <button onClick={this.setAction('merge', {id, lat, lon, tags})} disabled={this.state.action} className={style.conflateThis}>
          Rapprocher de ce point
        </button>
      </div>
      <h3>Tags</h3>
      <div>{this.renderTags(tags)}</div>
      <h3>Contexte</h3>
      <div>{this.renderTags(others)}</div>
    </div>
  }

  renderTags(t, cb) {
    return Object.entries(t)
      .sort(([k1], [k2]) => k1 > k2 ? 1 : -1)
      .map(([k, v]) => <div> {cb ? <span className={style.diffStatusText} title={diffStatusText[cb(k, v)]}
                                         aria-label={diffStatusText[cb(k, v)]}>{cb(k, v)}</span> : null}
        <b>{k}</b> : <i>{v}</i></div>)
  }

  renderDiffTags() {
    const {point, p} = this.state
    const {properties} = point
    const {tags} = p

    const keysP = Object.keys(properties) // opendata
    const keysT = Object.keys(tags) // overpass

    function diffState(k, v) {
      let keysFromOSM = keysT.indexOf(k) !== -1
      let keysFromOpenData = keysP.indexOf(k) !== -1
      if (keysFromOSM && !keysFromOpenData) {
        return "*"
      } else if (!keysFromOSM && keysFromOpenData) {
        return "+"
      } else {
        if (v === tags[k]) {
          return "="
        }
        return "~"
      }
    }

    const newTags = {...tags, ...properties}
    let u = Object.entries(newTags).map(([k, v]) => diffState(k, v)).reduce((acc, v) => {
      return acc.indexOf(v) === -1 ? acc.concat(v) : acc
    }, [])
    const fullDiff = (() => {
      if (u.indexOf("+") === -1) {
        if (u.indexOf("~") === -1) {
          return "="
        }
        return "~"
      }
      return "+"
    })()

    return (<div>
      <h3>Status des différences</h3>
      <div className={style.renderElement}>
        <i>{diffStatusText[fullDiff]}</i>
        <button onClick={this.setAction()}>Annuler</button>
      </div>
      <h3>Fusion des tags</h3>
      <div>{this.renderTags(newTags, diffState)}</div>
    </div>)
  }

  renderOverpass({elements}) {
    return <div>
      <div>Résultat : {elements.length}</div>
      {elements.map(this.renderElement)}
    </div>
  }

  setAction = (action, p) => (e) => {
    this.setState({action, p})
  }

  renderMerge() {
    return this.renderDiffTags()
  }

  renderAdd() {
    const {point} = this.state
    return <div>{this.renderPoint(point)}</div>
  }

  renderAction() {
    const {action} = this.state
    switch (action) {
      case 'add':
        return this.renderAdd()
      case 'merge':
        return this.renderMerge()
      default:
        return undefined
    }
  }

  renderMap(point) {
    const bbox = new LatLng(point.point.y, point.point.x).toBounds(this.state.radius)
    return <Map center={{lon: point.point.x, lat: point.point.y}} bounds={bbox} className={style.leafletContainer}>
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
      />
      <Marker draggable={true} position={{lon: point.point.x, lat: point.point.y}}
              onMoveEnd={this.markerOpendataMoved.bind(this)}><Popup>Opendata</Popup></Marker>
      <Rectangle bounds={bbox}/>
      {this.renderCirclesOverpass()}
    </Map>

  }

  render({qid, pid}, {point, overpass}) {
    return <div className={style.point}>
      {point ? this.renderPoint(point) : <Loader/>}
      <div>
        <h2>Rapprochement</h2>
        <div className={style.renderElement}>
          <label htmlFor="radius">Radius</label>
          <input id="radius" type="number" step={20} value={this.state.radius}
                 onChange={(e) => this.setState({radius: e.target.value})}/>
          <button onClick={this.fetchOverpass.bind(this)}>Conflation</button>
        </div>
        <div>
          <div><i>{this.getOverpassQuery().split('\n').map(t => [t, <br/>])}</i></div>
          {point ? this.renderMap(point) : null}
        </div>
      </div>
      <div>
        <h2>Overpass {this.state.loaderOverpass ? <Loader/> : null}</h2>
        {overpass ? this.renderOverpass(overpass) : null}
      </div>
      <div>
        <h2>OSM</h2>
        {this.renderAction()}
      </div>
    </div>
  }
}