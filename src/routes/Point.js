import {Component} from 'preact'
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

  renderPoint(qid, pid, point) {
    const {properties} = point
    const bbox = new LatLng(point.point.y, point.point.x).toBounds(this.state.radius)
    return <div>
      <h2>OpenData</h2>
      <div>{Object.entries(properties).sort(([k1], [k2]) => k1 > k2).map(([k, v]) => <div><b>{k}</b> = <i>{v}</i></div>)}</div>
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
      <div><button>Rapprocher de ce point</button></div>
      <div>Distance: {p0.distanceTo(p1).toFixed(0)}m</div>
      <div>{Object.entries(tags).sort(([k1], [k2]) => k1 > k2).map(([k, v]) => <div><b>{k}</b> = <i>{v}</i></div>)}</div>
    </div>
  }

  renderOverpass({elements}) {
    return <div>
      <div>Résultat : {elements.length}</div>
      {elements.map(this.renderElement)}
    </div>
  }

  render({qid, pid}, {point, overpass}) {
    return <div className={style.point}>
      {point ? this.renderPoint(qid, pid, point) : <div>loading</div>}
      <div>
        <h2>Overpass</h2>
        <div>
          <label htmlFor="radius">Radius</label>
          <input id="radius" type="number" value={this.state.radius} onChange={(e) => this.setState({radius: e.target.value})}/>
          <button onClick={this.fetchOverpass.bind(this)}>Conflation</button>
          <div><i>{this.getOverpassQuery()}</i></div>
          <button>Créer un point ici</button>
        </div>
        {overpass ? this.renderOverpass(overpass) : null}
      </div>
    </div>
  }
}