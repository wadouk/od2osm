import {useContextReducer} from '../reducer'

export default function Changes() {
  const [ state, dispatch ] = useContextReducer()
  const { changes } = state

  function renderTags(t) {
    return t ? Object.entries(t)
      .sort(([k1], [k2]) => k1 > k2 ? 1 : -1)
      .map(([k, v]) => <div><b>{k}</b> : <i>{v}</i></div>) : null
  }

  function renderChange({tags, ...props}) {
    const {id} = props
    return <div>
      <h1>{id ? `Modificiation ${id}` : 'Cŕeation'}</h1>
      <div>
        <h2>Attributs</h2>
        {renderTags(props)}
        <h2>Propriétés</h2>
        {renderTags(tags)}
      </div>
    </div>
  }
  return <div>
    <h1>Changements</h1>
    <div>Nombre de changements : {changes.length}</div>
    <div>{changes.map(renderChange)}</div>
  </div>
}