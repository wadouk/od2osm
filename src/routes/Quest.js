import {Link} from 'preact-router'
import {useEffect} from 'preact/hooks'
import {useContextReducer} from '../reducer'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import fr from 'dayjs/locale/fr'

dayjs.extend(localizedFormat)

const filters = {
  todo: 'à faire',
  valid: 'En cours: modification',
  create: 'En cours: création',
  done: 'Traité',
}

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
      return cid ? `${filters[action]} depuis le ${dayjs(inserted).locale('fr').format('LLLL')} ${osmid ? `osmid=${osmid}` : ''}` : ''
    }

    return <li>
      <Link
        href={`/quests/${qid}/points/${pid}`}>{name}</Link> {displayStatus()}
    </li>
  }

  function filter(e) {
    dispatch({type: 'filterAction', msg: {filterAction: e.target.value}})
  }

  function buildInput([v, l]) {
    return <div>
      <input type="radio" name="action" value={v} id={v} onChange={filter} checked={filterAction === v}/>
      <label htmlFor={v}>{l}</label>
    </div>
  }

  return (<div>
    <div>
      <h1>Les {points.length} points dans ce jeu de données OpenData</h1>
      <div>
        <div>Afficher ceux :</div>
        {Object.entries(filters).map(buildInput)}
      </div>
    </div>
    <ul>{points.filter(({action}) => (filterAction && action === filterAction) || (!filterAction && !action)).map(renderPoint)}</ul>
  </div>)

}