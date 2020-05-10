import {useEffect, useReducer} from 'preact/hooks'
import L, {LatLng} from 'leaflet'
import {Map, Marker, Popup, Rectangle, TileLayer} from 'react-leaflet'
import style from '../routes/style.css'
import Loader from './Loader'

import leafletCss from 'leaflet/dist/leaflet.css'

const ACTION_POINT = 'point'
const ACTION_ASYNC = 'async'
const ACTION_OVERPASS = 'overpass'
const ACTION_RADIUS_CHANGED = 'radiusChanged'
const ACTION_POINT_MOVED = 'pointMoved'
const ACTION_MORE_OSM = 'moreOSM'
const ACTION_MORE_OD = 'moreOD'
const ACTION_INPUT_VALUE = 'inputValue'
const ACTION_VALUE_OD = 'valueOD'
const ACTION_VALUE_OSM = 'valueOSM'
const ACTION_CHANGE_SET_ADD = 'changesetAdd'

const reducer = (state, {type, msg}) => {
  switch (type) {
    case ACTION_POINT:
    case ACTION_ASYNC:
    case ACTION_OVERPASS:
    case ACTION_RADIUS_CHANGED:
      return {...state, ...msg}

    case ACTION_POINT_MOVED:
      return (() => {
        const {point} = state
        const {lat, lng} = msg
        const newPoint = {x: lng, y: lat}
        return {...state, point: {...point, point: newPoint}}
      })()

    case ACTION_MORE_OSM:
      return (() => {
        const {overpass, point} = state
        const {properties} = point
        const {tags} = getOsmPoint(overpass)
        const newMerged = {...properties, ...tags}
        return {...state, merged: newMerged}
      })()

    case ACTION_MORE_OD:
      return (() => {
        const {overpass, point} = state
        const {properties} = point
        const {tags} = getOsmPoint(overpass)
        const newMerged = {...tags, ...properties}
        return {...state, merged: newMerged}
      })()

    case ACTION_INPUT_VALUE:
    case ACTION_VALUE_OD:
    case ACTION_VALUE_OSM:
      return (() => {
        const {merged} = state
        const {key, value} = msg
        const newMerged = {...merged, [key]: value}
        return {...state, merged: newMerged}
      })()

    case ACTION_CHANGE_SET_ADD:
      return ( () => {
        const {changes, merged} = state
        const newChanges = (changes || []).concat(merged)
        return {...state, point: undefined, merged: undefined, overpass: undefined, changes: newChanges}
      })
    default:
      console.warn('type inconnu', {type})
      return state
  }
}

function getOsmPoint(overpass) {
  const {elements} = overpass || {}
  return elements && elements.length > 0 && elements[0] || {}
}

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
})

export default function Matcher({qid, pid}) {
  const [state, dispatch] = useReducer(reducer, {radius: 20})

  function emit(type, msg) {
    dispatch({type, msg})
  }

  const clickEmit = (action) => (e) => {
    emit(action)
  }

  const {point, radius, overpass, loaderOverpass, merged} = state

  useEffect(async () => {
    const r = await fetch(`/api/quests/${qid}/points/${pid}`)
    const d = await r.json()
    emit(ACTION_POINT, {point: d[0]})
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
    if (!point) {
      return
    }
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

    emit(ACTION_ASYNC, {loaderOverpass: true})
    const r = await fetch("http://overpass-api.de/api/interpreter", options)

    const d = await r.json()
    emit(ACTION_ASYNC, {loaderOverpass: false})
    emit(ACTION_OVERPASS, {overpass: d})
  }

  function markerOpendataMoved(e) {
    emit(ACTION_POINT_MOVED, e.target.getLatLng())
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

  function renderMap() {
    if (!point) {
      return <Loader/>
    }
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

  const {properties} = point || {}
  const {tags} = getOsmPoint(overpass)
  const allKeyTags = Object.keys({...tags, ...properties})

  useEffect(async () => {
    await fetchOverpass()
  }, [point])

  function radiusChanged(e) {
    emit(ACTION_RADIUS_CHANGED, {radius: e.target.value})
  }

  return <div className={style.point}>
    <div>
      <h2>Rapprochement</h2>
      <div className={style.renderElement}>
        <label htmlFor="radius">Radius</label>
        <input id="radius" type="number" step={20} value={radius}
               onChange={radiusChanged}/>
        <button onClick={fetchOverpass}>Conflation</button>

      </div>
      {renderMap()}
    </div>
    <div>
      <table>
        <tr>
          <th>Attributs</th>
          <th>OpenData</th>
          <th>OSM {loaderOverpass ? <Loader/> : null}</th>
          <td>
            <button disabled={!properties} onClick={clickEmit(ACTION_MORE_OD)}>Plutôt OD</button>
            <button disabled={!tags} onClick={clickEmit(ACTION_MORE_OSM)}>Plutôt OSM</button>
          </td>
        </tr>
        {allKeyTags.map(v => {
          return <tr>
            <td className={style.keys}>{v} :</td>
            <td>{properties && properties[v]}</td>
            <td>{tags && tags[v]}</td>
            <td>
              <input type="text" value={merged && merged[v]} onChange={e => emit(ACTION_INPUT_VALUE, {key:v, value: e.target.value})}/>
              <button
                  disabled={!merged || (merged && !properties.hasOwnProperty(v) || merged[v] === properties[v])}
                  onClick={e => emit(ACTION_INPUT_VALUE, {key:v, value: properties[v]})}>
                OD
              </button>
              <button
                disabled={!merged || (merged && !tags.hasOwnProperty(v) || merged[v] === tags[v])}
                onClick={e => emit(ACTION_INPUT_VALUE, {key:v, value: tags[v]})}>
                OSM
              </button>
            </td>
          </tr>
        })}
        <tr>
          <td colSpan={3}></td>
          <td>
            <button disabled={!merged} onClick={clickEmit(ACTION_CHANGE_SET_ADD)}>Ajouter au changeset</button>
          </td>
        </tr>
      </table>
    </div>
  </div>
}