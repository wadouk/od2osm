'use strict'

const Hapi = require('@hapi/hapi')
const Inert = require('@hapi/inert')

const {Client, types, Pool} = require('pg')
const client = new Client()

const pool = new Pool()

const hstore = require('hstore.js')

const dbHstoreType = async () => {
  try {
    const oids = await pool.query("SELECT oid FROM pg_type WHERE typname='hstore'")
    types.setTypeParser(oids.rows[0].oid, function (val) {
      return hstore.parse(val)
    })
  } catch (e) {
    console.error(e)
  }
}

const start = async () => {

  const server = new Hapi.Server({
    port: 3000,
  })

  await server.register(Inert)

  await dbHstoreType()

  server.route({
    method: 'GET',
    path: '/quests',
    options: {
      cors: true,
    },
    handler: async (request, h) => {
      const res = await pool.query('select * from quests')
      return res.rows
    },
  })
  server.route({
    method: 'GET',
    path: '/quests/{qid}/points',
    options: {
      cors: true,
    },
    handler: async (request, h) => {
      try {
        const {params} = request
        const {qid} = params
        const res = await pool.query("select id, properties->'name' as name from points where qid = $1", [qid])
        return res.rows
      } catch (e) {
        console.error(e)
      }
    },
  })

  server.route({
    method: 'GET',
    path: '/quests/{qid}/points/{pid}',
    options: {
      cors: true,
    },
    handler: async (request, h) => {
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
    path: '/quests/{qid}/points/{pid}/conflation/{osmId}',
    options: {
      cors: true,
    },
    handler: async (request, h) => {
      try {
        const {params} = request
        const {qid, pid, osmId} = params
        await pool.query('insert into conflation (qid, pid, osmid) values ($1, $2, $3)', [qid, pid, osmId])
        return h.response()
      } catch (e) {
        console.error(e)
      }
    },
  })
  server.route({
    method: 'DELETE',
    path: '/quests/{qid}/points/{pid}/conflation',
    options: {
      cors: true,
    },
    handler: async (request, h) => {
      try {
        const {params} = request
        const {qid, pid, osmId} = params
        await pool.query('insert into conflation (qid, pid) values ($1, $2)', [qid, pid])
        return h.response()
      } catch (e) {
        console.error(e)
      }
    },
  })

  server.route({
    method: 'POST',
    path: '/quests',
    options: {
      payload: {
        multipart: true,
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
      const {geojson} = payload
      const datas = JSON.parse(geojson.toString())

      await pool.query('truncate table points')

      for (const {id, geometry, properties} of datas.features.filter(({properties}) => Boolean(properties))) {
        const {coordinates} = geometry
        const p = hstore.stringify(properties)
        const [x, y] = coordinates
        const c = `(${x},${y})`

        let params = [c, p, id, 1]
        try {
          await pool.query('insert into points (point, properties, id, qid) values ($1, $2, $3, $4)', params)
        } catch (e) {
          console.error(params, e)
          break
        }
      }

      return h.response()
    },
  })

  await server.start()

  console.log('Server running at:', server.info.uri)
}


process.on('unhandledRejection', (err) => {
  console.trace(err)
})

process.on("SIGINT", async function () {
  await pool.end()
  process.exit()
})

start()
