const Hapi = require('@hapi/hapi')
const Inert = require('@hapi/inert')
const Path = require('path')
const {v4: uuid} = require('uuid')

const {types, Pool} = require('pg')

const dbConfig = process.env.POSTGRESQL_ADDON_URI ? {connectionString: process.env.POSTGRESQL_ADDON_URI} : undefined

const pool = new Pool(dbConfig)

const hstore = require('hstore.js')

const dbHstoreType = async () => {
  try {
    const oids = await pool.query("SELECT oid FROM pg_type WHERE typname='hstore'")
    types.setTypeParser(oids.rows[0].oid, val => hstore.parse(val))
  } catch (e) {
    console.error(e)
  }
}

const start = async () => {

  const server = new Hapi.Server({
    port: process.env.PORT || 3000,

    routes: {
      files: {
        relativeTo: Path.join(__dirname, 'build'),
      },
    },
  })

  await server.register(Inert)

  server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
      directory: {
        path: '.',
      },
    },
  })

  await dbHstoreType()

  server.route({
      method: 'GET',
      path: '/api/quests',
      options: {
        cors: true,
      },
      handler: async () => {
        try {
          const res = await pool.query('select distinct q.id, q.name, q.more_info_url from quests q inner join points p on q.id = p.qid')
          return res.rows
        } catch (e) {
          console.error(e)
        }
      },
    },
  )
  server.route({
    method: 'GET',
    path: '/api/quests/{qid}/points',
    options: {
      cors: true,
    },
    handler: async (request) => {
      try {
        const {params} = request
        const {qid} = params
        const res = await pool.query(`select * from conflatedpoints where qid = $1 `, [qid])
        return res.rows
      } catch (e) {
        console.error(e)
      }
    },
  })

  server.route({
    method: 'GET',
    path: '/api/quests/{qid}/points/{pid}',
    options: {
      cors: true,
    },
    handler: async (request) => {
      try {
        const {params} = request
        const {qid, pid} = params
        const res = await pool.query('select * from points where qid = $1 and id = $2', [qid, pid])
        return res.rows
      } catch (e) {
        console.error(e)
      }
    },
  })

  server.route({
    method: 'PATCH',
    path: '/api/quests/{qid}/points/{pid}/conflation/{osmId}',
    options: {
      cors: true,
      payload: {
        allow: ['application/x-www-form-urlencoded', 'application/json'],
        parse: true,
      },
    },
    handler: async (request, h) => {
      try {
        const {params, payload} = request
        const {qid, pid, osmId} = params
        const {status = 'valid'} = payload || {}
        await pool.query("delete from conflation where qid=$1 and pid=$2 and (action = 'valid' or action is null)", [qid, pid])
        await pool.query('insert into conflation (qid, pid, action, osmid) values ($1, $2, $3, $4)', [qid, pid, status, osmId])
        return h.response()
      } catch (e) {
        console.error(e)
      }
    },
  })

  /**
   * Patch when changeset upload to OSM
   */
  server.route({
    method: 'PATCH',
    path: '/api/points',
    options: {
      cors: true,
      payload: {
        multipart: true,
        parse: true,
        output: 'data',
        allow: 'application/json',
      },
      response: {
        emptyStatusCode: 204,
      },
    },
    handler: async (request, h) => {
      try {
        const {payload} = request
        payload.map(async ({osmId, qid, pid}) => {
          await pool.query("delete from conflation where qid=$1 and pid=$2 and (action in ('valid') or action is null)", [qid, pid])
          await pool.query('insert into conflation (qid, pid, action, osmid) values ($1, $2, $3, $4)', [qid, pid, 'done', osmId])
        })

        return h.response()
      } catch (e) {
        console.error(e)
      }
    },
  })
  server.route({
    method: 'PATCH',
    path: '/api/quests/{qid}/points/{pid}/conflation',
    options: {
      cors: true,
      payload: {
        allow: ['application/x-www-form-urlencoded', 'application/json'],
        parse: true,
      },
    },
    handler: async (request, h) => {
      try {
        const {params, payload} = request
        const {qid, pid} = params
        const {status = 'create'} = payload || {}
        await pool.query("delete from conflation where qid=$1 and pid=$2 and (action in ('valid', 'create', 'cancel') or action is null)", [qid, pid])
        await pool.query('insert into conflation (qid, pid, action) values ($1, $2, $3)', [qid, pid, status])
        return h.response()
      } catch (e) {
        console.error(e)
      }
    },
  })
  server.route({
    method: 'PATCH',
    path: '/api/quests/{qid}/points/{pid}/comment',
    options: {
      cors: true,
      payload: {
        allow: 'application/x-www-form-urlencoded',
        parse: true,
      },
      response: {
        emptyStatusCode: 204,
      },
    },
    handler: async (request, h) => {
      try {
        const {params, payload} = request
        const {qid, pid} = params
        const {comment} = payload
        await pool.query('insert into comment (qid, pid, comment) values ($1, $2, $3)', [qid, pid, comment])
        return h.response()
      } catch (e) {
        console.error(e)
      }
    },
  })
  server.route({
    method: 'GET',
    path: '/api/points/comments',
    options: {
      cors: true,
    },
    handler: async () => {
      try {
        const res = await pool.query('select distinct comment from comment order by comment')
        return res.rows
      } catch (e) {
        console.error(e)
      }
    },
  })

  server.route({
    method: 'DELETE',
    path: '/api/quests/{qid}/points/{pid}/conflation',
    options: {
      cors: true,
    },
    handler: async (request, h) => {
      try {
        const {params} = request
        const {qid, pid} = params
        await pool.query("delete from conflation where qid=$1 and pid=$2 and (action is null)", [qid, pid])
        await pool.query("insert into conflation (qid, pid) values ($1, $2)", [qid, pid])
        return h.response()
      } catch (e) {
        console.error(e)
      }
    },
  })

  server.route({
    method: 'PUT',
    path: '/api/quests',
    options: {
      payload: {
        allow: 'application/x-www-form-urlencoded',
        parse: true,
      },
    },
    handler: async (request, h) => {
      try {
        const {payload} = request
        const {name, moreInfoUrl} = payload
        const newUuid = uuid()

        await pool.query("insert into quests (name, more_info_url, uuid) values ($1, $2, $3)", [name, moreInfoUrl, newUuid])

        return h.response({uuid: newUuid}).code(201)
      } catch (e) {
        console.error(e)
        return h.response({
          constraint: e.constraint,
          routine: e.routine,
        }).code(500)
      }
    },
  })

  function decodePayload(part) {
    let contentType = part.headers["content-type"]
    if (/application\/(geo\+)?json/.test(contentType)) {
      return part.payload
    } else if (/application\/octet-stream/.test(contentType)) {
      return JSON.parse(part.payload.toString())
    }
    let error = new Error("bad content type")
    error.hey = 1
    error.contentType = contentType
    throw error
  }

  server.route({
    method: 'POST',
    path: '/api/quests',
    options: {
      payload: {
        multipart: {
          output: 'annotated'
        },
        parse: true,
        output: 'data',
        allow: 'multipart/form-data',
      },
      response: {
        emptyStatusCode: 204,
      },
    },
    handler: async (request, h) => {
      const {payload} = request
      const {geojson, uuid} = payload
      if (!geojson || !uuid) {
        return h.response().code(400).message('missing mandatory data')
      }

      try {
        const datas = decodePayload(geojson)

        const res = await pool.query("select id from quests where uuid = $1", [uuid])
        if (res.rows.length !== 1) {
          return h.response().code(404).message('quests not found')
        }
        const qid = res.rows[0].id

        const client = await pool.connect()
        await client.query("begin")

        try {
          await client.query('delete from points where qid = $1', [qid])

          for (const {id, geometry, properties} of datas.features.filter(({properties}) => Boolean(properties))) {
            const {coordinates} = geometry
            const [x, y] = coordinates
            const c = `(${x},${y})`

            const p = hstore.stringify(properties)

            let params = [c, p, id, qid]
            await client.query('insert into points (point, properties, id, qid) values ($1, $2, $3, $4)', params)
          }
          await client.query("commit")
        } catch (e) {
          await client.query("rollback")

          console.error(e)
          return h.response().code(400).message("invalid geojson")
        } finally {
          client.release()
        }

        return h.response()
      } catch (e) {
        console.error(e)
        return h.response().code(400).message(e.hey === 1 ? e.message : "check your datas")
      }
    },
  })

  await server.start()

  console.log('Server running at:', server.info.uri)
}


process.on('unhandledRejection', (err) => {
  console.trace(err)
})

process.on("SIGINT", async () => {
  await pool.end()
  process.exit()
})

start()
