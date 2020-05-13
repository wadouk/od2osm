import {useEffect} from 'preact/hooks'
import L, {LatLng} from 'leaflet'
import {Map, Marker, Popup, Rectangle, TileLayer} from 'react-leaflet'
import style from './Matcher.css'
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
import {route} from 'preact-router'

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
        await fetch(`/api/quests/${qid}/points/${pid}/conflation/${overpass.elements[0].id}`, {
          method: 'PATCH',
        })
        break
      case ACTION_CREATE_CONFLATION:
        await fetch(`/api/quests/${qid}/points/${pid}/conflation`, {
          method: 'PATCH',
        })
        break
      case ACTION_CANCEL_CONFLATION:
        await fetch(`/api/quests/${qid}/points/${pid}/conflation`, {
          method: 'DELETE',
        })
        break
      case ACTION_CHANGE_SET_ADD:
        route(`/quests/${qid}/points`)
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
    try {
      const r = await fetch("http://overpass-api.de/api/interpreter", options)

      const d = await r.json()
      emit(ACTION_ASYNC, {loaderOverpass: false})
      emit(ACTION_OVERPASS, {overpass: d})
    } catch (e) {
      emit(ACTION_ASYNC, {loaderOverpass: 'fail'})
    }

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

  const validConflationDisabled = !(overpass && overpass.elements && overpass.elements.length > 0) || typeof conflated === 'string'
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

  function firstStep() {
    return <div className={style.firstCol}>
      <h2>Rapprochement</h2>
      <div className={style.renderElement}>
        <label htmlFor="radius">Distance de recherche d'un point similaire :</label>
        <input id="radius" type="number"
               step={20}
               size={5}
               value={radius}
               onChange={radiusChanged}/>
               mètres
      </div>
      <ul>
        <li>le rectangle représente la zone de recherche</li>
        <li>le marqueur au centre du carré est aux coordonnés de l'open data</li>
        <li>l'autre marqueur éventuel est le point similaire dans OSM</li>
        <li>Des info bulles au clic permettent de les différencier</li>
        <li>Vous pouvez déplacer le marqueur OpenData</li>
        <li>Ou vous pouvez changer la taille de la zone de recherche (em mètres)</li>
      </ul>
      <h3>Le point à trouver par ici :</h3>
      <p>{properties && Object.entries(properties)
        .filter(([k, v]) => ['shop', 'amenity', 'name'].indexOf(k) !== -1)
        .map(([k, v]) => k + '=' + v)
        .join(', ') || ''
      }</p>
      <div className={style.actions}>
        <button onClick={fetchOverpass}>Conflation</button>
        <Loader loaderState={loaderOverpass}/>
        <span>{overpass && overpass.elements ? `Nb résultat OSM: ${overpass.elements.length}` : '' }</span>
        <button
          className={style.secondGroupActions}
          onClick={clickEmit(ACTION_VALID_CONFLATION)}
          disabled={validConflationDisabled}>
          Valider
        </button>
        <button
          onClick={clickEmit(ACTION_CREATE_CONFLATION)}
          disabled={createConflationDisabled}>
          Créer
        </button>
      </div>
      {renderMap()}
    </div>
  }

  function secondStep() {
    return <div className={style.secondCol}>
      <h2>Fusion des tags</h2>
      <table>
        <tr>
          <th>Attributs</th>
          <th>OpenData</th>
          <th>OSM</th>
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
          <td colSpan={3}>
            <button
              onClick={clickEmit(ACTION_CANCEL_CONFLATION)}
              disabled={cancelConflationDisabled}>
              Annuler le rapprochement
            </button>
          </td>
          <td>
            <button
              disabled={!(typeof conflated === 'string') || !merged}
              onClick={clickEmit(ACTION_CHANGE_SET_ADD, {qid})}>
              Ajouter au changeset
            </button>
          </td>
        </tr>
      </table>
      <ul>
        {wordingAction()}
      </ul>
    </div>
  }

  return <div className={style.point}>
    {conflated ? secondStep() : firstStep()}
  </div>
}