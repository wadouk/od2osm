import {h, Component} from 'preact'
import {Link} from 'preact-router/match'
// import style from './style';

export default class Quests extends Component {
  async componentDidMount() {
    const r = await fetch('http://localhost:3000/quests')
    const quests = await r.json()
    this.setState({quests})
  }

  render(_, {quests}) {
    return <ul>
      {(quests || [] ).map(({id, name}) => <Link href={`/quests/${id}/points`}>{name}</Link>)}
    </ul>
  }
}