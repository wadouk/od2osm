import {useContextReducer} from '../reducer'
import {upload} from '../osmQueries'
import Loader from './Loader'
import {route} from 'preact-router'
import {useEffect} from 'preact/hooks'
import {TileLayer} from 'react-leaflet'

export default function Changes() {
  const [state, dispatch] = useContextReducer()
  const {changes, comment, changeSetCount, loader, error, quests, changeSetSource} = state

  const qid = changes
    .map(c => c.qid)
    .reduce((acc, curr) => {
      if (acc.indexOf(curr) === -1)
        return acc.concat(curr)
      return acc

    }, [])[0]
  let filteredQuests = quests.filter(q => q.id == qid)
  const source = changeSetSource || (filteredQuests && filteredQuests.length > 0 && filteredQuests[0].more_info_url) || ''

  function renderTags(t) {
    return t ? Object.entries(t)
      .filter(([k]) => ['qid', 'pid', 'action'].indexOf(k) === -1)
      .sort(([k1], [k2]) => k1 > k2 ? 1 : -1)
      .map(([k, v]) => <div><b>{k}</b> : <i>{v}</i></div>) : null
  }

  async function clickUpload() {
    try {
      dispatch({type: 'loader', msg: {loader: true}})
      const result = await upload(comment, changeSetCount, changes, source)

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
      route(`/quests${changes && changes.length > 0 && changes[0].qid ? `/${changes[0].qid}/points` : ''}`)
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
      <h1>{action === 'valid' ? `Modification ${id}` : 'Création'}</h1>
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


  function changeSource(e) {
    dispatch({type: 'updateSource', msg: {changeSetSource: e.target.value}})
  }
  useEffect(() => {
    dispatch({type: 'updateSource', msg: {changeSetSource: source}})
  }, [])

  return <div>
    <h1>Changements</h1>
    <div>Nombre de changements : {changes && changes.length}</div>
    <div>
      <label htmlFor="comment">Un commentaire</label>
      <input type="text" value={comment || ''} onChange={changeComment} />
    </div>
    <div>
      <label htmlFor="source">Source</label>
      <input type="text" value={source || ''} size={50} onChange={changeSource} />
      <ul>
        <li>Ajouter <i>BDOrtho IGN</i> en <i>source</i> si vous l'avez utilisé pour au moins un des points</li>
      </ul>
    </div>
    <div>
      <button onClick={clickUpload} disabled={!comment || (changes && changes.length === 0) || loader === true}>Envoyer</button>
      <button onClick={cancelChanges}>Annuler les changements</button>
      {loader ? <Loader /> : null}
      {error && typeof error === 'string' ? <div>{error}</div> : null}
    </div>
    <div>{changes && source && changes.map(renderChange)}</div>
  </div>
}