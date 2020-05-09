import {useReducer} from 'preact/hooks'
import {createContext} from 'preact'

const reducer = (state, {type, msg}) => {
  console.log({type, msg})
  switch (type) {
    case 'done':
    case 'authenticated':
    case 'fail':
    case 'logout':
      return {...state, ...msg}
    default:
      throw new Error('Unexpected action')
  }
}

export const ReducerContext = createContext('reducer')

export function initReducer() {
  return useReducer(reducer, {})
}