import {Link} from 'preact-router/match'
import {useEffect} from 'preact/hooks'
import {useContextReducer} from '../reducer'

export default function Quests() {
  const [state, dispatch] = useContextReducer()

  useEffect(async () => {
    const r = await fetch('/api/quests')
    const quests = await r.json()
    dispatch({type: 'quests', msg: {quests}})
  }, [])

  const {quests} = state

  return <ul>
    {quests.map(({id, name}) => <li><Link href={`/quests/${id}/points`}>{name}</Link></li>)}
  </ul>
}