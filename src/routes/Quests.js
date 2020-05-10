import {Link} from 'preact-router/match'
import {useEffect, useState} from 'preact/hooks'

export default function Quests(){
  const [quests, setValue] = useState([])
  useEffect(async () => {
    const r = await fetch('/api/quests')
    const quests = await r.json()
    setValue(quests)
  }, [])

    return <ul>
      {quests.map(({id, name}) => <Link href={`/quests/${id}/points`}>{name}</Link>)}
    </ul>
}