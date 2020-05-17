import osmauth from './osmauth'

export async function upload(comment, changeSetCount, changes, source) {
  const changeSetId = await createChangeSet(comment, changeSetCount, source)
  const result = await uploadChangeSet(changeSetId, changes)
  await closeChangeSet(changeSetId)
  return result
}

export async function getMapBounds(bounds) {
  const left = bounds.getWest()
  const bottom = bounds.getSouth()
  const right = bounds.getEast()
  const top = bounds.getNorth()

  const b = [left, bottom, right, top].join(',')
  return new Promise((resolve, reject) => {
    return osmauth.xhr({
      options: {
        header: {
          Accept: 'application/json',
        },
      },
      prefix: true,
      path: `/api/0.6/map?bbox=${b}`,
      method: 'GET',
    }, (err, success) => {
      if (err) {
        return reject(err)
      }
      return resolve(JSON.parse(success))
    })
  })
}

async function createChangeSet(comment, changeSetCount, source) {
  let content = `<osm>
      <changeset>
        <tag k="created_by" v="od2osm"/>
        <tag k="comment" v="${comment}"/>
        <tag k="source" v="${source}"/>
        <tag k="changesets_count" v="${changeSetCount}"/>
      </changeset>
  </osm>`
  return new Promise((resolve, reject) => {

    return osmauth.xhr({
      options: {
        header: {
          'Content-Type': 'text/xml',
        },
      },
      prefix: true,
      path: '/api/0.6/changeset/create',
      method: 'PUT',
      content,
    }, (err, success) => {
      if (err) {
        return reject(err)
      }
      return resolve(success)
    })
  })
}

async function closeChangeSet(changeSetId) {
  return new Promise((resolve, reject) => {
    return osmauth.xhr({
      options: {
        header: {
          'Content-Type': 'text/xml',
        },
      },
      prefix: true,
      path: `/api/0.6/changeset/${changeSetId}/close`,
      method: 'PUT',
    }, (err, success) => {
      if (err) {
        return reject(err)
      }
      return resolve(success)
    })
  })
}

function toXmlTags(tags) {
  return Object.entries(tags)
    .map(([k, v]) => {
      return `<tag k="${k}" v="${v}"/>`
    }).join('\n')
}
async function uploadChangeSet(changeSetId, changes) {
  function toXmlNode(n) {
    return n.map(({tags, lat, lon, id, version}) => {
      return `<node id="${id}" version="${version}" changeset="${changeSetId}" lat="${lat}" lon="${lon}"> ${toXmlTags(tags)} </node>`
    }).join('\n')
  }

  const [creates, modifies] = changes.reduce((acc, curr) => {
    const [creates, modifies] = acc
    const {action} = curr
    if (action === 'valid') {
      return [creates, modifies.concat(curr)]
    }
    return [creates.concat(curr), modifies]
  }, [[], []]).map( toXmlNode )

  return new Promise((resolve, reject) => {
    osmauth.xhr({
      options: {
        header: {
          'Content-Type': 'text/xml',
        },
      },
      prefix: true,
      path: `/api/0.6/changeset/${changeSetId}/upload`,
      method: 'POST',
      content: `<osmChange version="0.6" generator="od2osm">
        <create>
            ${creates}        
        </create>
        <modify>
            ${modifies}
        </modify>
        <delete if-unused="true"/>
        </osmChange>`,
    }, (err, success) => {
      if (err) {
        return reject(err)
      }
      return resolve(success)
    })
  })
}