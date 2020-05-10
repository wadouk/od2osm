import osmauth from './osmauth'

export async function upload(comment, changeSetCount, changes) {
  const changeSetId = await createChangeSet(comment, changeSetCount)
  await uploadChangeSet(changeSetId, changes)
  await closeChangeSet(changeSetId)
}

async function createChangeSet(comment, changeSetCount) {
  let content = `<osm>
      <changeset>
        <tag k="created_by" v="od2osm"/>
        <tag k="comment" v="${comment}"/>
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
      content: content,
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
  const [creates, modifies] = changes.reduce((acc, curr) => {
    const [creates, modifies] = acc
    if (curr.hasOwnProperty('id')) {
      return [creates, modifies.concat(curr)]
    }
    return [creates.concat(curr), modifies]
  }, [[] , []])

  const xmlModifies = modifies.map(({tags, lat, lon, id, version, ...props}) => {
    return `<node id="${id}" version="${version}" changeset="${changeSetId}" lat="${lat}" lon="${lon}">
        ${toXmlTags(tags)}
        </node>`
  }).join('\n')

  const xmlCreates = creates.map(({tags, lat, lon, ...props}, i) => {
    const newId = -(i + 1)
    return `<node version="0" id="${newId}" changeset="${changeSetId}" lat="${lat}" lon="${lon}">
        ${toXmlTags(tags)}
        </node>`
  }).join('\n')

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
            ${xmlCreates}        
        </create>
        <modify>
            ${xmlModifies}
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