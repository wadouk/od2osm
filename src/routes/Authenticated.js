import osmauth from '../osmauth'
import {ReducerContext} from '../reducer'
import {useContext, useEffect} from 'preact/hooks'
import {win} from 'leaflet/src/core/Browser'

export default function Authenticated() {
  const [state, dispatch] = useContext(ReducerContext)

  useEffect(() => {
    const authenticated = osmauth.authenticated()
    dispatch({type: 'authenticated', msg: {authenticated}})
  }, [])

  const logout = () => {
    osmauth.logout()
    dispatch({
      type: 'logout', msg: {
        authenticated: false,
        displayName: null,
        id: null,
        count: null,
      },
    })
  }

  const authenticate = () => {
    osmauth.authenticate(done)
  }

  function resetLocalStorage() {
    localStorage.removeItem('actions')
    window.location.reload()
  }

  const done = () => {
    const authenticated = osmauth.authenticated()
    dispatch({type: 'authenticated', msg: {authenticated}})
  }

  const {authenticated} = state

  function buttonAuthenticated() {
    return authenticated ? <button onClick={logout}>Logout</button> :
      <button onClick={authenticate}>Authenticate</button>
  }

  return <div>
    <h1>Authentification</h1>
    <div>{buttonAuthenticated()}</div>
    <h1>En cas de problème, vider le local storage et recharger</h1>
    <div><button onClick={resetLocalStorage}>Bouton magique</button></div>
  </div>
}

