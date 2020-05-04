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

  async fetchOverpass () {
    const {point} = this.state
    const {properties} = point
    const mainTag = Object.entries(properties).filter(([k, v]) => ['shop', 'amenity'].indexOf(k) !== -1).map(([k, v]) => `"${k}"="${v}"`)[0]
    const bbox = new LatLng(point.point.y, point.point.x).toBounds(this.state.radius)
    const bboxOverpass = [bbox.getSouth(), bbox.getWest(), bbox.getNorth(), bbox.getEast()].map(v => v.toFixed(6)).join(', ')
    let query = `[out:json] [timeout:25] ;
    (
     node [${mainTag}](${bboxOverpass});
    );
     out; >; out skel qt;`

    console.log(query)
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
    console.log(d)
    this.setState({overpass: d})
  }

  renderPoint(qid, pid, point) {
    const {properties} = point
    const bbox = new LatLng(point.point.y, point.point.x).toBounds(this.state.radius)
    return <div>
      <h1>{properties.name}</h1>
      <div>Centre: {`${point.point.x}, ${point.point.y}`}</div>
      <div>BBox : {bbox.toBBoxString()}</div>
      <h2>OpenData</h2>
      <div>{Object.entries(properties).sort(([k1], [k2]) => k1 > k2).map(([k, v]) => <div><b>{k}</b> = <i>{v}</i></div>)}</div>
      <div>
        <label htmlFor="radius">Radius</label>
        <input id="radius" type="number" value={this.state.radius} onChange={(e) => this.setState({radius: e.target.value})}/>
        <button onClick={this.fetchOverpass.bind(this)}>Conflation</button>
      </div>

      <Map center={{lon: point.point.x, lat: point.point.y}} bounds={bbox} className={style.leafletContainer}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
        />
        <Circle center={{lon: point.point.x, lat: point.point.y}} radius={1}/>
        <Rectangle bounds={bbox}/>
      </Map>
    </div>
  }

  renderElement = ({id, lat, lon, tags}) => {
    const point = this.state.point
    const p0 = new LatLng(point.point.y, point.point.x)
    const p1 = new LatLng(lat, lon)
    return <div>
      <div>{id}</div>
      <div>Distance: {p0.distanceTo(p1).toFixed(0)}m</div>
      <div>{Object.entries(tags).sort(([k1], [k2]) => k1 > k2).map(([k, v]) => <div><b>{k}</b> = <i>{v}</i></div>)}</div>
    </div>
  }

  renderOverpass({elements}) {
    return <div>
      {elements.map(this.renderElement)}
    </div>
  }

  render({qid, pid}, {point, overpass}) {
    return <div>
      {point ? this.renderPoint(qid, pid, point) : <div>loading</div>}
      {overpass ? this.renderOverpass(overpass) : <div>loading</div>}
    </div>
  }
}