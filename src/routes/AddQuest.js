import {useState} from 'preact/hooks'
import style from './addQuests.css'
import {MAIN_TAGS} from '../osmConstants'

export default function Quests() {
  const [state, stateUpdater] = useState({})

  const {name, moreInfoUrl, uuid, geojson, error, sendDataStatus} = state

  function change(attr) {
    return (e) => {
      stateUpdater({
        ...state,
        [attr]: e.target.value,
      })
    }
  }

  function changeFile(e) {
    stateUpdater({
      ...state,
      geojson: e.target.files[0],
    })
  }

  async function sendIt(e) {
    e.preventDefault()
    const res = await fetch('/api/quests', {
      method: 'PUT',
      body: new URLSearchParams({name, moreInfoUrl}),
    })
    if (res.status === 201) {
      // eslint-disable-next-line no-unused-vars
      const {uuid, error, newState} = state
      const {uuid: newUuid} = await res.json()
      stateUpdater({...newState, uuid: newUuid})
    } else {
      // eslint-disable-next-line no-unused-vars
      const {uuid, error, newState} = state
      const {constraint, routine} = await res.json()
      stateUpdater({
        ...newState,
        error: routine === '_bt_check_unique' && constraint === 'quests_name_uindex' ? 'Un nom identique existe déjà' : `Routine: ${routine}, Contrainte: ${constraint}`,
      })
    }
  }

  async function sendData(e) {
    e.preventDefault()
    const body = new FormData()
    body.append("uuid", uuid)
    body.append("geojson", geojson)

    stateUpdater({...state, sendDataStatus: 'En cours'})
    const res = await fetch('/api/quests', {
      method: 'POST',
      body,
    })
    stateUpdater({
      ...state,
      sendDataStatus: res.status === 204 ? 'Tout bon' : `Pas bon: ${res.status} ${res.statusText}`,
    })
  }

  const sampleJson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "UnIDquiNeChangeJamaisDansLeJeuDeDonnée",
        geometry: {
          type: "Point",
          coordinates: [23.670982, 45.87989],
        },
        properties: {
          name: "Mon nom",
          amenity: "restaurant;fast_food",
          diet: "organic"
        },
      },
    ],
  }

  return <div className={style.addQuests}>
    <h1>Créer le jeu de données</h1>
    <form onSubmit={sendIt}>
      <label htmlFor="name">Le nom</label>
      <input type="text" id={"name"} onChange={change("name")} value={name} required={true} />
      <label htmlFor="more_info_url">URL d'origine du jeu de données</label>
      <input type="text" id={"more_info_url"} onChange={change("moreInfoUrl")} value={moreInfoUrl} required={true} />
      <button>
        Envoyer
      </button>
      {error ? (<div>
        <p>Création impossible : {error}</p>
      </div>) : null}
      {uuid ? (<div>
        <p>Identifiant à conserver : {uuid}</p>
      </div>) : null}
    </form>

    <h1>Envoyer les données</h1>

    <form onSubmit={sendData}>
      <label htmlFor="uuid">Identifiant du jeu de données</label>
      <input type="text" value={uuid} onChange={change("uuid")} required={true} />
      <label htmlFor="dataset">Le fichier de données</label>
      <input type="file" id="dataset" onChange={changeFile} accept="application/geo+json, application/json"
             required={true} />
      <button>Envoyer</button>
      <div>
        {sendDataStatus}
      </div>
    </form>
    <h2>Ligne de commande</h2>
    <p>Vous pouvez aussi envoyer vos données en ligne de commande</p>
    <code>curl -v -F "geojson=@points.json;type=application/geo+json" -F "uuid=6378b5a2-5a9f-4b43-a5a0-ba9bce3bcac0" -H "Content-Type:
      multipart/form-data" https://od2osm.cleverapps.io/api/quests </code>
    <h2>Structure attendues du fichier</h2>
    <p>Un <a href="https://geojson.org/" target={"_new"} rel={"noopener"}>geojson</a> osmifié : </p>
    <ul>
      <li>Les properties contiennent les tags OSM</li>
      <li>Seul les features de type point sont reconnus</li>
      <li>Un id à la racine</li>
      <li>Au moins un tag "principal" ({MAIN_TAGS.map((t, i, a) => [<i>{t}</i>].concat(i < a.length-1 ? ', ': ''))})</li>
      <li>Si la correspondance n'est pas précise entre la taxinomie du jeu de données et OSM, un point virgule dans le tag principal permet de chercher plusieurs valeurs lors de la conflation. Dans l'exemple, il sera cherché un restaurant OU un fastfood</li>
      <li>Les types mimes supportés pour la pièce jointe sont <i>"application/json" "application/geo+json"</i> ou <i>"application/octet-stream"</i> c'est à dire que le <i>curl</i> sans le champ <i>type</i> fonctionne aussi</li>
    </ul>
    <pre>
      {JSON.stringify(sampleJson, null, 2)}
    </pre>
  </div>
}