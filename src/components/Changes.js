import {useContextReducer} from '../reducer'
import {upload} from '../osmQueries'
import Loader from './Loader'

export default function Changes() {
  const [state, dispatch] = useContextReducer()
  const {changes, comment, changeSetCount, loader, error} = state

  function renderTags(t) {
    return t ? Object.entries(t)
      .filter(([k]) => ['qid', 'pid', 'action'].indexOf(k) === -1)
      .sort(([k1], [k2]) => k1 > k2 ? 1 : -1)
      .map(([k, v]) => <div><b>{k}</b> : <i>{v}</i></div>) : null
  }

  async function clickUpload() {
    try {
      dispatch({type: 'loader', msg: {loader: true}})
      const result = await upload(comment, changeSetCount, changes)

      const ids = changes.reduce((all, {pid, qid, id}) => {
        return {...all, [id]: {pid, qid}}
      }, {})

      const ns = result.getElementsByTagName('diffResult')
      const toSend = []
      for (let i = 0; i < ns.length; ++i) {
        const oldId = ns[i].getAttribute('old_id')
        const newId = ns[i].getAttribute('new_id')
        const {pid, qid} = ids[oldId]
        toSend.push({osmId: newId, pid, qid})
      }

      await fetch(`/api/points`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(toSend)
      })

      dispatch({type: 'loader', msg: {loader: false}})
    } catch (xhr) {
      dispatch({type: 'loader', msg: {loader: false}})
      dispatch({type: 'dumb', msg: {error: `${xhr.status} ${xhr.responseText}`}})
    }
  }

  function changeComment(e) {
    dispatch({type: "comment", msg: {comment: e.target.value}})
  }

  function renderChange({tags, ...props}) {
    const {action, id} = props
    return <div>
      <h1>{action === 'valid'  ? `Modificiation ${id}` : 'Création'}</h1>
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
    <div>
      <label htmlFor="comment">Un commentaire</label>
      <input type="text" value={comment} onChange={changeComment}/>
    </div>
    <div>
      <button onClick={clickUpload} disabled={!comment || changes.length === 0}>Envoyer</button>
      {loader ? <Loader/> : null}
      {error ? <div>{error}</div> : null}
    </div>
    <div>{changes.map(renderChange)}</div>
  </div>
}