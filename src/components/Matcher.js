import {h} from 'preact'
import {useEffect} from 'preact/hooks'
import L, {LatLng} from 'leaflet'
import {Map, Marker, Popup, Rectangle, TileLayer} from 'react-leaflet'
import style from '../routes/style.css'
import Loader from './Loader'

import leafletCss from 'leaflet/dist/leaflet.css'

import {
  ACTION_POINT,
  ACTION_ASYNC,
  ACTION_OVERPASS,
  ACTION_RADIUS_CHANGED,
  ACTION_POINT_MOVED,
  ACTION_MORE_OSM,
  ACTION_MORE_OD,
  ACTION_INPUT_VALUE,
  ACTION_VALUE_OD,
  ACTION_VALUE_OSM,
  ACTION_CHANGE_SET_ADD,
  useContextReducer,
  ACTION_VALID_CONFLATION,
  ACTION_CANCEL_CONFLATION, ACTION_CREATE_CONFLATION,
} from '../reducer'

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
  const [state, dispatch] = useContextReducer()
  const {point, radius, overpass, loaderOverpass, merged, conflated} = state

  function emit(type, msg) {
    dispatch({type, msg})
  }

  const clickEmit = (action, msg) => async (e) => {
    emit(action, msg)
    switch (action) {
      case ACTION_VALID_CONFLATION:
        if (overpass && overpass.elements && overpass.elements.length > 0) {
          await fetch(`/api/quests/${qid}/points/${pid}/conflation/${overpass.elements[0].id}`, {
            method: 'PATCH',
          })
        }
        break
      case ACTION_CANCEL_CONFLATION:
        await fetch(`/api/quests/${qid}/points/${pid}/conflation`, {
          method: 'DELETE',
        })
        break
    }
  }

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
  }, [point && point.id])

  function radiusChanged(e) {
    emit(ACTION_RADIUS_CHANGED, {radius: e.target.value})
  }



  function renderTags(v) {
    function pickItDisabled(t) {
      return (!merged || (merged && t && !t.hasOwnProperty(v) || (merged && t && merged[v] === t[v]) || (merged && !t)))
    }

    function showValue(t) {
      return t && t[v] || ''
    }

    return (<tr>
      <td className={style.keys}>{v} :</td>
      <td className={style.value}
          alt={showValue(properties)}
          title={showValue(properties)}
          aria-label={showValue(properties)}>
        {showValue(properties)}
      </td>
      <td className={style.value}
          alt={showValue(tags)}
          title={showValue(tags)}
          aria-label={showValue(tags)}>
        {showValue(tags)}
      </td>
      <td className={style.actions}>
        <input type="text"
               value={showValue(merged)}
               onChange={e => emit(ACTION_INPUT_VALUE, {key: v, value: e.target.value})}/>
        <button
          disabled={pickItDisabled(properties)}
          onClick={e => emit(ACTION_VALUE_OD, {key: v, value: properties[v]})}>
          OD
        </button>
        <button
          disabled={pickItDisabled(tags)}
          onClick={e => emit(ACTION_VALUE_OSM, {key: v, value: tags[v]})}>
          OSM
        </button>
      </td>
    </tr>)
  }

  console.log(state)

  const validConflationDisabled = !overpass || typeof conflated === 'string'
  const cancelConflationDisabled = !(typeof conflated === 'string')
  const createConflationDisabled = !overpass || typeof conflated === 'string'

  function wordingAction() {
    if (merged) {
      if (conflated === 'valid' && overpass && overpass.elements.length > 0) {
        return <li>Vous avez choisi d'éventuellement completer le point OSM existant avec les données de l'open
          data</li>
      } else if (conflated === 'create') {
        return <li>Vous avez choisi de créer le point avec les données en OpenData</li>
      }
    }
    return null
  }

  return <div className={style.point}>
    <div className={style.firstCol}>
      <h2>Rapprochement</h2>
      <div className={style.renderElement}>
        <label htmlFor="radius">Radius</label>
        <input id="radius" type="number"
               step={20}
               value={radius}
               onChange={radiusChanged}/>
        <button onClick={fetchOverpass}>Conflation</button>
      </div>
      <p>Vous pouvez déplacer le marqueur de l'open data pour vous rapprocher du point venant d'OSM ou augmenter le
        rectangle de recherche.</p>
      <div>
        <button
          onClick={clickEmit(ACTION_VALID_CONFLATION)}
          disabled={validConflationDisabled}>
          Valider
        </button>
        <button
          onClick={clickEmit(ACTION_CANCEL_CONFLATION)}
          disabled={cancelConflationDisabled}>
          Annuler
        </button>
        <button
          onClick={clickEmit(ACTION_CREATE_CONFLATION)}
          disabled={createConflationDisabled}>
          Créer
        </button>
      </div>
      {renderMap()}
    </div>
    <div className={style.secondCol}>
      <table>
        <tr>
          <th>Attributs</th>
          <th>OpenData</th>
          <th>OSM {loaderOverpass ? <Loader/> : null}</th>
          <td>
            <button disabled={!(conflated === 'valid' || conflated === 'create') || !properties}
                    onClick={clickEmit(ACTION_MORE_OD, tags)}>
              Plutôt OD
            </button>
            <button disabled={!(conflated === 'valid') || !tags}
                    onClick={clickEmit(ACTION_MORE_OSM, tags)}>
              Plutôt OSM
            </button>
          </td>
        </tr>
        {allKeyTags.map(renderTags)}
        <tr>
          <td colSpan={3}/>
          <td>
            <button disabled={!merged} onClick={clickEmit(ACTION_CHANGE_SET_ADD)}>Ajouter au changeset</button>
          </td>
        </tr>
      </table>
      <ul>
        {wordingAction()}
      </ul>
    </div>
  </div>
}