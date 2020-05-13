import {useContext, useReducer} from 'preact/hooks'
import {createContext} from 'preact'

export const ACTION_POINT = 'point'
export const ACTION_ASYNC = 'async'
export const ACTION_OVERPASS = 'overpass'
export const ACTION_RADIUS_CHANGED = 'radiusChanged'
export const ACTION_POINT_MOVED = 'pointMoved'
export const ACTION_VALID_CONFLATION = 'actionValidConflation'
export const ACTION_CANCEL_CONFLATION = 'actionCancelConflation'
export const ACTION_CREATE_CONFLATION = 'actionCreateConflation'
export const ACTION_MORE_OSM = 'moreOSM'
export const ACTION_MORE_OD = 'moreOD'
export const ACTION_INPUT_VALUE = 'inputValue'
export const ACTION_VALUE_OD = 'valueOD'
export const ACTION_VALUE_OSM = 'valueOSM'
export const ACTION_CHANGE_SET_ADD = 'changesetAdd'

const initState = {radius: 20, changes: [], conflated: null, points : [], filterAction: 'todo'}

const reducer = (state, {type, msg}) => {
  switch (type) {
    case 'done':
    case 'authenticated':
    case 'fail':
    case 'logout':
    case 'comment':
    case 'dumb':
    case 'loader':
    case ACTION_ASYNC:
    case ACTION_OVERPASS:
    case ACTION_RADIUS_CHANGED:
    case 'points':
    case 'filterAction':
      return {...state, ...msg}


    case ACTION_POINT:
      return (() => {
        const {conflated, ...newState} = state
        const newMsg = conflated === 'create' ? {} : msg
        return {...newState, ...newMsg, conflated}
      })()

    case ACTION_VALID_CONFLATION:
      return {...state, conflated: 'valid'}

    case ACTION_CANCEL_CONFLATION:
      return (() => {
        const {conflated, merged, ...newState} = state
        return {...newState}
      })()

    case ACTION_CREATE_CONFLATION:
      const {overpass} = state
      const newOverpass = {...overpass, elements : []}
      return {...state, overpass: newOverpass, conflated: 'create'}

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
        const newMerged = {...properties, ...msg}
        return {...state, merged: newMerged}
      })()

    case ACTION_MORE_OD:
      return (() => {
        const {point, conflated} = state
        const {properties} = point
        const newMerged = conflated === 'valid' ? {...msg, ...properties} : {...properties}
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
        const {changes, merged, overpass, point, conflated} = state
        const {id} = point
        const {qid} = msg
        const element = (conflated === 'valid' && overpass.elements.length > 0 && overpass.elements[0]) || (conflated === 'create' && {
          lat: point.point.y,
          lon: point.point.x,
          type: 'node',
          id: -(changes.length + 1),
          version: 0
        })
        const newChanges = changes.filter(({pid}) => pid !== id).concat({...element, tags: merged, pid: id, qid, action: conflated})
        return {
          ...state,
          point: undefined,
          merged: undefined,
          overpass: undefined,
          changes: newChanges,
          conflated: null,
        }
      })()

    case 'cancelChanges':
      return (() => {
        const {changes, ...newState} = state
        return {...newState, changes: []}
      })()

    case 'changesSent':
      return (() => {
        const {error, loader, comment, ...newState} = state
        return {...newState, ...initState}
      })()

    default:
      console.warn('type inconnu', {type})
      return state
  }
}

export const ReducerContext = createContext('reducer')

const persitentReducer = (state, action) => {
  localStorage.setItem('actions', JSON.stringify((JSON.parse(localStorage.getItem('actions')) || []).concat(action)))
  let newState = reducer(state, action)
  console.info('state', newState)
  return newState

}

export function initReducer() {
  const recoveredState = (JSON.parse(localStorage.getItem('actions')) || []).reduce(reducer, initState)
  return useReducer(persitentReducer, recoveredState)
}

export function useContextReducer() {
  return useContext(ReducerContext)
}