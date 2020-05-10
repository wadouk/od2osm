'use strict'

import style from './loginStatus.css'
import auth from '../osmauth'
import {useEffect} from 'preact/hooks'
import {useContextReducer} from '../reducer'

export default function Login() {

  const [state, dispatch] = useContextReducer()

  const authenticate = () => {
    auth.authenticate(update)
  }

  const update = () => {
    let authenticated = auth.authenticated()
    dispatch({type: 'authenticated', msg: {authenticated}})

    if (authenticated) {
      auth.xhr({
        method: 'GET',
        path: '/api/0.6/user/details',
      }, done)
    }
  }

  useEffect(() => {
    const oauth_token = new URLSearchParams(window.location.search.slice(1)).get("oauth_token")
    if (oauth_token) {
      opener.authComplete(window.location.href)
      window.close()
    }

    update()
  }, [])

  const done = (err, res) => {
    if (err) {
      dispatch({
        type: 'fail', msg: {
          userDetailsErr: err,
        },
      })
      return
    }

    const u = res.getElementsByTagName('user')[0]
    const changesets = res.getElementsByTagName('changesets')[0]
    const o = {
      displayName: u.getAttribute('display_name'),
      id: u.getAttribute('id'),
      changeSetCount: changesets.getAttribute('count'),
      avatar: (res.querySelector('img') ? res.querySelector('img').getAttribute('href') : null),
    }

    dispatch({msg: o, type: 'done'})
  }

  const renderAuthenticated = (avatar, displayName) => {
    return avatar ? <img src={avatar} alt={displayName} title={displayName}/> :
      <span alt={displayName} title={displayName}>{displayName}</span>
  }

  const renderEmpty = () => {
    return <button onClick={authenticate}>Authenticate</button>
  }

  const {authenticated, displayName, id, count, avatar} = state
  return <div
    className={style.loginStatus}> {authenticated ? renderAuthenticated(avatar, displayName) : renderEmpty()} </div>
}
