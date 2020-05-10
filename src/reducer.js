import {useContext, useReducer} from 'preact/hooks'
import {createContext} from 'preact'

export const ACTION_POINT = 'point'
export const ACTION_ASYNC = 'async'
export const ACTION_OVERPASS = 'overpass'
export const ACTION_RADIUS_CHANGED = 'radiusChanged'
export const ACTION_POINT_MOVED = 'pointMoved'
export const ACTION_MORE_OSM = 'moreOSM'
export const ACTION_MORE_OD = 'moreOD'
export const ACTION_INPUT_VALUE = 'inputValue'
export const ACTION_VALUE_OD = 'valueOD'
export const ACTION_VALUE_OSM = 'valueOSM'
export const ACTION_CHANGE_SET_ADD = 'changesetAdd'

const reducer = (state, {type, msg}) => {
  switch (type) {
    case 'done':
    case 'authenticated':
    case 'fail':
    case 'logout':
    case 'comment':
    case 'dumb':
    case 'loader':
      return {...state, ...msg}

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
        const {point} = state
        const {properties} = point
        const newMerged = {...properties, ...(msg)}
        return {...state, merged: newMerged}
      })()

    case ACTION_MORE_OD:
      return (() => {
        const {point} = state
        const {properties} = point
        const newMerged = {...(msg), ...properties}
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
      return (() => {
        const {changes, merged, overpass, point} = state
        const element = overpass.elements.length > 0 && overpass.elements[0] || {lat: point.point.y, lon: point.point.x, type : 'node'}
        const newChanges = changes.concat({...element, tags: merged})
        return {...state, point: undefined, merged: undefined, overpass: undefined, changes: newChanges}
      })()
    default:
      console.warn('type inconnu', {type})
      return state
  }
}

export const ReducerContext = createContext('reducer')

export function initReducer() {
  return useReducer(reducer, {radius: 20, changes: []})
}

export function useContextReducer() {
  return useContext(ReducerContext)
}