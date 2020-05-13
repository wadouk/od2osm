import osmauth from '../osmauth'
import {ReducerContext} from '../reducer'
import {useContext, useEffect} from 'preact/hooks'

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

  const done = () => {
    const authenticated = osmauth.authenticated()
    dispatch({type: 'authenticated', msg: {authenticated}})
  }

  const {authenticated} = state
  return authenticated ? <button onClick={logout}>Logout</button> :
    <button onClick={authenticate}>Authenticate</button>
}

