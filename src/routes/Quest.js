import { h, Component } from 'preact';
// import style from './style';

export default class Quest extends Component {
  async componentDidMount() {
    const {id} = this.props
    const r = await fetch(`http://localhost:3000/quests/${id}/points`)
    const points = await r.json()
    this.setState({points})
  }

  render (_, {points}) {
    console.log({points})
    return (<ul>{(points || []).map(function ({properties, point, id}) {
      console.log({properties, point, id})
      return <li>{properties.name} {id}</li>
    })}</ul>)}
}