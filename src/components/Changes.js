import {useContextReducer} from '../reducer'
import {upload} from '../osmQueries'
import Loader from './Loader'
import {route} from 'preact-router'

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

      const ns = result.getElementsByTagName('node')
      const toSend = []
      for (let i = 0; i < ns.length; ++i) {
        const oldId = ns[i].getAttribute('old_id')
        const newId = ns[i].getAttribute('new_id')
        const {pid, qid} = ids[oldId] || {}
        toSend.push({osmId: newId, pid, qid})
      }

      await fetch(`/api/points`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toSend),
      })

      dispatch({type: 'loader', msg: {loader: false}})
      dispatch({type: 'changesSent'})
      route('/quests')
    } catch (e) {
      console.error(e)
      dispatch({type: 'loader', msg: {loader: false}})
      if (e && e.message) {
        dispatch({type: 'dumb', msg: {error: e.message}})
      } else if (e.status) {
        dispatch({type: 'dumb', msg: {error: `${e.status} ${e.responseText}`}})
      }
    }
  }

  function changeComment(e) {
    dispatch({type: "comment", msg: {comment: e.target.value}})
  }

  function renderChange({tags, ...props}) {
    const {action, id} = props
    return <div>
      <h1>{action === 'valid' ? `Modificiation ${id}` : 'Création'}</h1>
      <div>
        <h2>Attributs</h2>
        {renderTags(props)}
        <h2>Propriétés</h2>
        {renderTags(tags)}
      </div>
    </div>
  }

  async function cancelChanges() {
    await changes.map(async ({qid, pid}) => fetch(`/api/quests/${qid}/points/${pid}/conflation`, {
      method: 'DELETE',
    }))

    dispatch({type: 'cancelChanges'})
  }

  return <div>
    <h1>Changements</h1>
    <div>Nombre de changements : {changes && changes.length}</div>
    <div>
      <label htmlFor="comment">Un commentaire</label>
      <input type="text" value={comment || ''} onChange={changeComment} />
    </div>
    <div>
      <button onClick={clickUpload} disabled={!comment || (changes && changes.length === 0) || loader === true}>Envoyer</button>
      <button onClick={cancelChanges}>Annuler les changements</button>
      {loader ? <Loader /> : null}
      {error && typeof error === 'string' ? <div>{error}</div> : null}
    </div>
    <div>{changes && changes.map(renderChange)}</div>
  </div>
}