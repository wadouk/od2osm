import {Link} from 'preact-router'
import {useEffect} from 'preact/hooks'
import {useContextReducer} from '../reducer'

export default function Quest({id}) {
  const [state, dispatch] = useContextReducer()

  const {points, filterAction} = state

  useEffect(async () => {
    const r = await fetch(`/api/quests/${id}/points`)
    const points = await r.json()
    dispatch({type: 'points', msg: {points}})
  }, [])

  function renderPoint({name, pid, qid, action, inserted, osmid, cid}) {
    function displayStatus() {
      return cid ? `status: ${action} on ${inserted} ${osmid ? `osmid=${osmid}` : ''}` : ''
    }

    return <li>
      <Link
        href={`/quests/${qid}/points/${pid}`}>{name}</Link> {displayStatus()}
    </li>
  }

  function filter(e) {
    dispatch({type: 'filterAction', msg: {filterAction: e.target.value}})
  }

  function buildInput({v, l}) {
    return <div>
      <input type="radio" name="action" value={v} id={v} onChange={filter} checked={filterAction === v}/>
      <label htmlFor={v}>{l}</label>
    </div>
  }

  const filters = [
    {v: 'todo', l: 'à faire'},
    {v: 'valid', l: 'Rapprochés'},
    {v: 'create', l: 'En cours de création'},
    {v: 'done', l: 'Traité'},
  ].map(buildInput)

  return (<div>
    <div>
      <h1>Les {points.length} points dans ce jeu de données OpenData</h1>
      <div>
        <div>Afficher ceux</div>
        {filters}
      </div>
    </div>
    <ul>{points.filter(({action}) => (filterAction && action === filterAction) || (!filterAction && !action)).map(renderPoint)}</ul>
  </div>)

}