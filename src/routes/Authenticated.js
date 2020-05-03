import {h, Component} from 'preact'

import osmauth from '../osmauth'

export default class Authenticated extends Component {

  componentWillMount() {
    const authenticated = osmauth.authenticated()
    this.setState({authenticated})
  }

  logout = () => {
    osmauth.logout()
    this.setState({authenticated: false})
  }

  authenticate = () => {
    osmauth.authenticate(this.done)
  }

  done = (e) => {
    const authenticated = osmauth.authenticated()
    this.setState({authenticated})
  }

  render() {
    const {authenticated} = this.state
    return authenticated ? <button onClick={this.logout}>Logout</button> :  <button onClick={this.authenticate}>Authenticate</button>
  }
}

