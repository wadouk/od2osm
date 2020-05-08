import {h, Component} from 'preact'
import {Link} from 'preact-router'
// import style from './style';

export default class Quest extends Component {
  async componentDidMount() {
    const {id} = this.props
    const r = await fetch(`/api/quests/${id}/points`)
    const points = await r.json()
    this.setState({points})
  }

  render({id}, {points}) {
    const qid = id
    return (<ul>{(points || []).map(({name, id}) => <li>
      <Link href={`/quests/${qid}/points/${id}`}>{name}</Link>
    </li>)}
    </ul>)
  }
}