import {h, Component} from 'preact'
import style from './style.css'
import leafletCss from 'leaflet/dist/leaflet.css'

import {Circle, Map, Rectangle, TileLayer} from 'react-leaflet'
import {LatLng} from 'leaflet'

export default class Point extends Component {
  state = {
    radius: 20
  }

  async componentDidMount() {
    const {qid, pid} = this.props
    const r = await fetch(`http://localhost:3000/quests/${qid}/points/${pid}`)
    const d = await r.json()
    this.setState({point: d[0]})
  }

  getOverpassQuery() {
    const {point} = this.state
    if (!point) {
      return
    }
    const {properties} = point
    const bbox = new LatLng(point.point.y, point.point.x).toBounds(this.state.radius)
    const bboxOverpass = [bbox.getSouth(), bbox.getWest(), bbox.getNorth(), bbox.getEast()].map(v => v.toFixed(6)).join(', ')
    const q = Object.entries(properties)
      .filter(([k, v]) => ['shop', 'amenity'].indexOf(k) !== -1)
      .map(([k, v]) => v.split(";")
        .map(u => `node ["${k}"="${u}"](${bboxOverpass}); `).join("\n")
      )[0]

    return `[out:json] [timeout:25] ; ( ${q} ); out; >; out skel qt;`
  }

  async fetchOverpass () {
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

    const r = await fetch("http://overpass-api.de/api/interpreter", options)

    const d = await r.json()
    this.setState({overpass: d})
  }

  renderPoint(point) {
    const {properties} = point
    const bbox = new LatLng(point.point.y, point.point.x).toBounds(this.state.radius)
    return <div>
      <h2>OpenData</h2>
      <div>{this.renderTags(properties)}</div>
      <Map center={{lon: point.point.x, lat: point.point.y}} bounds={bbox} className={style.leafletContainer}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
        />
        <Circle center={{lon: point.point.x, lat: point.point.y}} radius={1}/>
        <Rectangle bounds={bbox}/>
        {this.renderCirclesOverpass()}
      </Map>
    </div>
  }

  renderCirclesElements({elements}) {
    return elements.map(this.renderCirclesElement)
  }

  renderCirclesElement({lon, lat}) {
    return <Circle center={{lon, lat}} radius={1}/>
  }

  renderCirclesOverpass() {
    const {overpass} = this.state
    return overpass ? this.renderCirclesElements(overpass) : []
  }

  renderElement = ({id, lat, lon, tags}) => {
    const point = this.state.point
    const p0 = new LatLng(point.point.y, point.point.x)
    const p1 = new LatLng(lat, lon)
    return <div>
      <div><a href={`https://www.openstreetmap.org/node/${id}`}>{id}</a></div>
      <div><button onClick={this.setAction('merge', {id, lat, lon, tags})} disabled={this.state.action}>Rapprocher de ce point</button></div>
      <div>Distance: {p0.distanceTo(p1).toFixed(0)}m</div>
      <div>{this.renderTags(tags)}</div>
    </div>
  }

  renderTags(t, cb) {
    return Object.entries(t)
      .sort(([k1], [k2]) => k1 > k2 ? 1 : -1)
      .map(([k, v]) => <div> {cb ? cb(k, v): null} <b>{k}</b> : <i>{v}</i></div>)
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
      if (keysFromOSM && !keysFromOpenData ) {
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

    const diffStatusText = {
      "=": "OSM identique ou mieux que OD",
      "~": "OD compléte OSM",
      "+": "OD compléte OSM",
      "*": "OSM gagne"
    }


    return (<div>
      <div><b>Status des différences</b> : <i>{diffStatusText[fullDiff]}</i></div>
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
      case 'add': return this.renderAdd()
      case 'merge': return this.renderMerge()
      default: return undefined
    }
  }

  render({qid, pid}, {point, overpass}) {
    return <div className={style.point}>
      {point ? this.renderPoint(point) : <div>loading</div>}
      <div>
        <h2>Overpass</h2>
        <div>
          <label htmlFor="radius">Radius</label>
          <input id="radius" type="number" step={20} value={this.state.radius} onChange={(e) => this.setState({radius: e.target.value})}/>
          <button onClick={this.fetchOverpass.bind(this)}>Conflation</button>
          <div><i>{this.getOverpassQuery()}</i></div>
        </div>
        {overpass ? this.renderOverpass(overpass) : null}
      </div>
      <div>
        <h2>OSM</h2>
        <button onClick={this.setAction('add')} disabled={this.state.action}>Créer un point ici</button>
        {this.renderAction()}
      </div>
    </div>
  }
}