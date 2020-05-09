import {useEffect, useReducer} from 'preact/hooks'
import L, {LatLng} from 'leaflet'
import {Map, Marker, Popup, Rectangle, TileLayer} from 'react-leaflet'
import style from '../routes/style.css'
import Loader from './Loader'

import leafletCss from 'leaflet/dist/leaflet.css'

const reducer = (state, {type, msg}) => {
  switch (type) {
    case 'point':
    case 'async':
    case 'overpass':
    case 'action':
    case 'radiusChanged':
      return {...state, ...msg}
    case 'pointMoved':
      const {point} = state
      const {lat, lng} = msg
      const newPoint = {x: lng, y: lat}
      return {...state, point: {...point, point:newPoint}}
    default:
      console.warn('type inconnu', {type})
      return state
  }
}

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

export default function Matcher({qid, pid}) {
  const [state, dispatch] = useReducer(reducer, {radius: 20})

  const {point, radius, overpass, action, p} = state

  useEffect(async () => {
    const r = await fetch(`/api/quests/${qid}/points/${pid}`)
    const d = await r.json()
    dispatch({type: 'point', msg: {point: d[0]}})
  }, [])

  function getOverpassQuery() {
    if (!point) {
      return ""
    }
    const {properties} = point
    const bbox = new LatLng(point.point.y, point.point.x).toBounds(radius)
    const bboxOverpass = [bbox.getSouth(), bbox.getWest(), bbox.getNorth(), bbox.getEast()].map(v => v.toFixed(6)).join(', ')
    const q = Object.entries(properties)
      .filter(([k, v]) => ['shop', 'amenity'].indexOf(k) !== -1)
      .map(([k, v]) => v.split(";")
        .map(u => `node ["${k}"="${u}"](${bboxOverpass}); `).join("\n"),
      )[0]

    return `[out:json] [timeout:25] ;\n ( \n${q} \n); out meta;`
  }

  async function fetchOverpass() {
    const query = getOverpassQuery()
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

    dispatch({type: 'async', msg: {loaderOverpass: true}})
    const r = await fetch("http://overpass-api.de/api/interpreter", options)

    const d = await r.json()
    dispatch({type: 'async', msg: {loaderOverpass: false}})
    dispatch({type: 'overpass', msg: {overpass: d}})
  }

  function renderPoint() {
    const {properties} = point
    return <div>
      <h2>OpenData</h2>
      <div>{renderTags(properties)}</div>
    </div>
  }

  function markerOpendataMoved(e) {
    dispatch({type: 'pointMoved', msg: e.target.getLatLng()})
  }


  function renderCirclesElements({elements}) {
    return elements.map(renderCirclesElement)
  }

  function renderCirclesElement({lon, lat}) {
    return <Marker position={{lon, lat}}>
      <Popup>Overpass</Popup>
    </Marker>
  }

  function renderCirclesOverpass() {
    return overpass ? renderCirclesElements(overpass) : []
  }

  function renderElement({tags, ...info}) {
    const p0 = new LatLng(point.point.y, point.point.x)
    const {id, lat, lon, ...others} = info
    const p1 = new LatLng(lat, lon)

    return <div>
      <div className={style.renderElement}>
        <span>Distance: {p0.distanceTo(p1).toFixed(0)}m</span>
        &nbsp;
        <a href={`https://www.openstreetmap.org/node/${id}`}>{id}</a>
        &nbsp;
        <button onClick={setAction('merge', {id, lat, lon, tags})} disabled={action}
                className={style.conflateThis}>
          Rapprocher de ce point
        </button>
      </div>
      <h3>Tags</h3>
      <div>{renderTags(tags)}</div>
      <h3>Contexte</h3>
      <div>{renderTags(others)}</div>
    </div>
  }

  function renderTags(t, cb) {
    return Object.entries(t)
      .sort(([k1], [k2]) => k1 > k2 ? 1 : -1)
      .map(([k, v]) => <div> {cb ? <span className={style.diffStatusText} title={diffStatusText[cb(k, v)]}
                                         aria-label={diffStatusText[cb(k, v)]}>{cb(k, v)}</span> : null}
        <b>{k}</b> : <i>{v}</i></div>)
  }

  function renderDiffTags() {
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
        <button onClick={setAction()}>Annuler</button>
      </div>
      <h3>Fusion des tags</h3>
      <div>{renderTags(newTags, diffState)}</div>
    </div>)
  }

  function renderOverpass({elements}) {
    return <div>
      <div>Résultat : {elements.length}</div>
      {elements.map(renderElement)}
    </div>
  }

  const setAction = (action, p) => (e) => {
    dispatch({type: 'action', msg: {action, p}})
  }

  function renderMerge() {
    return renderDiffTags()
  }

  function renderAdd() {
    return <div>{renderPoint(point)}</div>
  }

  function renderAction() {
    switch (action) {
      case 'add':
        return renderAdd()
      case 'merge':
        return renderMerge()
      default:
        return undefined
    }
  }

  function renderMap(point) {
    const bbox = new LatLng(point.point.y, point.point.x).toBounds(radius)
    return <Map center={{lon: point.point.x, lat: point.point.y}} bounds={bbox} className={style.leafletContainer}>
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
      />
      <Marker draggable={true} position={{lon: point.point.x, lat: point.point.y}}
              onMoveEnd={markerOpendataMoved}><Popup>Opendata</Popup></Marker>
      <Rectangle bounds={bbox}/>
      {renderCirclesOverpass()}
    </Map>
  }

  return <div className={style.point}>
    {point ? renderPoint() : <Loader/>}
    <div>
      <h2>Rapprochement</h2>
      <div className={style.renderElement}>
        <label htmlFor="radius">Radius</label>
        <input id="radius" type="number" step={20} value={state.radius}
               onChange={(e) => dispatch({type: 'radiusChanged', msg: {radius: e.target.value}})}/>
        <button onClick={fetchOverpass}>Conflation</button>
      </div>
      <div>
        <div><i>{getOverpassQuery().split('\n').map(t => [t, <br/>])}</i></div>
        {point ? renderMap(point) : null}
      </div>
    </div>
    <div>
      <h2>Overpass {state.loaderOverpass ? <Loader/> : null}</h2>
      {overpass ? renderOverpass(overpass) : null}
    </div>
    <div>
      <h2>OSM</h2>
      {renderAction()}
    </div>
  </div>
}