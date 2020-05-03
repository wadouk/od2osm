'use strict';

import { h, Component } from 'preact';

import style from './loginStatus.css'
import auth from '../osmauth'

export default class Login extends Component {

  authenticate = () => {
    auth.authenticate(this.update);
  }

  logout = () => {
    auth.logout();
    this.setState({
      authenticated: false,
      displayName : null,
      id : null,
      count : null
    })
  }

  update = () => {
    let authenticated = auth.authenticated()
    this.setState({authenticated})

    if (authenticated) {
      auth.xhr({
        method: 'GET',
        path: '/api/0.6/user/details'
      }, this.done);
    }
  }

  componentWillMount() {
    const oauth_token = new URLSearchParams(window.location.search.slice(1)).get("oauth_token")
    if (oauth_token) {
      opener.authComplete(window.location.href);
      window.close();
    }

    this.update()
  }

  done = (err, res) => {
    if (err) {
      this.setState({userDetailsErr: err})
      return;
    }

    const u = res.getElementsByTagName('user')[0];
    const changesets = res.getElementsByTagName('changesets')[0];
    const o = {
      displayName: u.getAttribute('display_name'),
      id: u.getAttribute('id'),
      count: changesets.getAttribute('count'),
      avatar: res.querySelector('img').getAttribute('href')
    };

    this.setState(o)
  }

  // Note: `user` comes from the URL, courtesy of our router
	render({}, {authenticated, displayName, id, count, avatar}) {
    return <div className={style.loginStatus}> {authenticated ? (<img src={avatar} alt={displayName} title={displayName}/>) : (<button onClick={this.authenticate}>Authenticate</button>)} </div>
  }
}
