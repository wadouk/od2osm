import {Link} from 'preact-router'
import {useEffect, useState} from 'preact/hooks'

export default function Quest({id}) {
  const [points, setValue] = useState([])
  useEffect(async () => {
    const {id} = this.props
    const r = await fetch(`/api/quests/${id}/points`)
    const points = await r.json()
    setValue(points)
  }, [])

  const qid = id
  return (<ul>{points.map(({name, id}) => <li>
    <Link href={`/quests/${qid}/points/${id}`}>{name}</Link>
  </li>)}
  </ul>)
}