'use strict';

import { h, Component } from 'preact';
import style from './style';

var ohauth = require('ohauth');
var resolveUrl = require('resolve-url');


// # osm-auth
//
// This code is only compatible with IE10+ because the [XDomainRequest](http://bit.ly/LfO7xo)
// object, IE<10's idea of [CORS](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing),
// does not support custom headers, which this uses everywhere.
const osmAuth = function(o) {

  var oauth = {};

  // authenticated users will also have a request token secret, but it's
  // not used in transactions with the server
  oauth.authenticated = function() {
    return !!(token('oauth_token') && token('oauth_token_secret'));
  };

  oauth.logout = function() {
    token('oauth_token', '');
    token('oauth_token_secret', '');
    token('oauth_request_token_secret', '');
    return oauth;
  };

  // TODO: detect lack of click event
  oauth.authenticate = function(callback) {
    if (oauth.authenticated()) return callback();

    oauth.logout();

    // ## Getting a request token
    var params = timenonce(getAuth(o)),
      url = o.url + '/oauth/request_token';

    params.oauth_signature = ohauth.signature(
      o.oauth_secret, '',
      ohauth.baseString('POST', url, params));

    if (!o.singlepage) {
      // Create a 600x550 popup window in the center of the screen
      var w = 600, h = 550,
        settings = [
          ['width', w], ['height', h],
          ['left', screen.width / 2 - w / 2],
          ['top', screen.height / 2 - h / 2]].map(function(x) {
          return x.join('=');
        }).join(','),
        popup = window.open('about:blank', 'oauth_window', settings);
    }

    // Request a request token. When this is complete, the popup
    // window is redirected to OSM's authorization page.
    ohauth.xhr('POST', url, params, null, {}, reqTokenDone);
    o.loading();

    function reqTokenDone(err, xhr) {
      o.done();
      if (err) return callback(err);
      var resp = ohauth.stringQs(xhr.response);
      token('oauth_request_token_secret', resp.oauth_token_secret);
      var authorize_url = o.url + '/oauth/authorize?' + ohauth.qsString({
        oauth_token: resp.oauth_token,
        oauth_callback: resolveUrl(o.landing)
      });

      if (o.singlepage) {
        location.href = authorize_url;
      } else {
        popup.location = authorize_url;
      }
    }

    // Called by a function in a landing page, in the popup window. The
    // window closes itself.
    window.authComplete = function(token) {
      var oauth_token = ohauth.stringQs(token.split('?')[1]);
      get_access_token(oauth_token.oauth_token);
      delete window.authComplete;
    };

    // ## Getting an request token
    //
    // At this point we have an `oauth_token`, brought in from a function
    // call on a landing page popup.
    function get_access_token(oauth_token) {
      var url = o.url + '/oauth/access_token',
        params = timenonce(getAuth(o)),
        request_token_secret = token('oauth_request_token_secret');
      params.oauth_token = oauth_token;
      params.oauth_signature = ohauth.signature(
        o.oauth_secret,
        request_token_secret,
        ohauth.baseString('POST', url, params));

      // ## Getting an access token
      //
      // The final token required for authentication. At this point
      // we have a `request token secret`
      ohauth.xhr('POST', url, params, null, {}, accessTokenDone);
      o.loading();
    }

    function accessTokenDone(err, xhr) {
      o.done();
      if (err) return callback(err);
      var access_token = ohauth.stringQs(xhr.response);
      token('oauth_token', access_token.oauth_token);
      token('oauth_token_secret', access_token.oauth_token_secret);
      callback(null, oauth);
    }
  };

  oauth.bootstrapToken = function(oauth_token, callback) {
    // ## Getting an request token
    // At this point we have an `oauth_token`, brought in from a function
    // call on a landing page popup.
    function get_access_token(oauth_token) {
      var url = o.url + '/oauth/access_token',
        params = timenonce(getAuth(o)),
        request_token_secret = token('oauth_request_token_secret');
      params.oauth_token = oauth_token;
      params.oauth_signature = ohauth.signature(
        o.oauth_secret,
        request_token_secret,
        ohauth.baseString('POST', url, params));

      // ## Getting an access token
      // The final token required for authentication. At this point
      // we have a `request token secret`
      ohauth.xhr('POST', url, params, null, {}, accessTokenDone);
      o.loading();
    }

    function accessTokenDone(err, xhr) {
      o.done();
      if (err) return callback(err);
      var access_token = ohauth.stringQs(xhr.response);
      token('oauth_token', access_token.oauth_token);
      token('oauth_token_secret', access_token.oauth_token_secret);
      callback(null, oauth);
    }

    get_access_token(oauth_token);
  };

  // # xhr
  //
  // A single XMLHttpRequest wrapper that does authenticated calls if the
  // user has logged in.
  oauth.xhr = function(options, callback) {
    if (!oauth.authenticated()) {
      if (o.auto) {
        return oauth.authenticate(run);
      } else {
        callback('not authenticated', null);
        return;
      }
    } else {
      return run();
    }

    function run() {
      var params = timenonce(getAuth(o)),
        oauth_token_secret = token('oauth_token_secret'),
        url = (options.prefix !== false) ? o.url + options.path : options.path,
        url_parts = url.replace(/#.*$/, '').split('?', 2),
        base_url = url_parts[0],
        query = (url_parts.length === 2) ? url_parts[1] : '';

      // https://tools.ietf.org/html/rfc5849#section-3.4.1.3.1
      if ((!options.options || !options.options.header ||
        options.options.header['Content-Type'] === 'application/x-www-form-urlencoded') &&
        options.content) {
        params = {...params, ...ohauth.stringQs(options.content)};
      }

      params.oauth_token = token('oauth_token');
      params.oauth_signature = ohauth.signature(
        o.oauth_secret,
        oauth_token_secret,
        ohauth.baseString(options.method, base_url, {...params, ...ohauth.stringQs(query)})
      );

      return ohauth.xhr(options.method, url, params, options.content, options.options, done);
    }

    function done(err, xhr) {
      if (err) return callback(err);
      else if (xhr.responseXML) return callback(err, xhr.responseXML);
      else return callback(err, xhr.response);
    }
  };

  // pre-authorize this object, if we can just get a token and token_secret
  // from the start
  oauth.preauth = function(c) {
    if (!c) return;
    if (c.oauth_token) token('oauth_token', c.oauth_token);
    if (c.oauth_token_secret) token('oauth_token_secret', c.oauth_token_secret);
    return oauth;
  };

  oauth.options = function(_) {
    if (!arguments.length) return o;

    o = _;
    o.url = o.url || 'https://www.openstreetmap.org';
    o.landing = o.landing || 'land.html';
    o.singlepage = o.singlepage || false;

    // Optional loading and loading-done functions for nice UI feedback.
    // by default, no-ops
    o.loading = o.loading || function() {};
    o.done = o.done || function() {};

    return oauth.preauth(o);
  };

  // 'stamp' an authentication object from `getAuth()`
  // with a [nonce](http://en.wikipedia.org/wiki/Cryptographic_nonce)
  // and timestamp
  function timenonce(o) {
    o.oauth_timestamp = ohauth.timestamp();
    o.oauth_nonce = ohauth.nonce();
    return o;
  }

  // get/set tokens. These are prefixed with the base URL so that `osm-auth`
  // can be used with multiple APIs and the keys in `localStorage`
  // will not clash
  var token;

  token = function (x, y) {
    if (arguments.length === 1) return localStorage.getItem(o.url + x);
    else if (arguments.length === 2) return localStorage.setItem(o.url + x, y);
  };

  // Get an authentication object. If you just add and remove properties
  // from a single object, you'll need to use `delete` to make sure that
  // it doesn't contain undesired properties for authentication
  function getAuth(o) {
    return {
      oauth_consumer_key: o.oauth_consumer_key,
      oauth_signature_method: 'HMAC-SHA1'
    };
  }

  // potentially pre-authorize
  oauth.options(o);

  return oauth;
};

var auth = osmAuth({
  oauth_secret: '9WfJnwQxDvvYagx1Ut0tZBsOZ0ZCzAvOje3u1TV0',
  oauth_consumer_key: 'WLwXbm6XFMG7WrVnE8enIF6GzyefYIN6oUJSxG65',
  landing: '/login'
});

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
      count: changesets.getAttribute('count')
    };

    this.setState(o)
  }

  // Note: `user` comes from the URL, courtesy of our router
	render({}, {authenticated, displayName, id, count}) {
    console.log({authenticated, displayName})

    if (authenticated) {
      return (
        <div class={style.profile}>
          <p>Hello {displayName}.</p>
          <button onClick={this.logout}>Logout</button>
        </div>
      )
    } else {
      return (
        <div className={style.profile}>
          <button onClick={this.authenticate}>Authenticate</button>
        </div>
      )
    }
  }
}
