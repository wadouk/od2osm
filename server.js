'use strict'

const Path = require('path')
const Hapi = require('@hapi/hapi')
const Inert = require('@hapi/inert')

const {Client, types} = require('pg')
const client = new Client()

var hstore = require('hstore.js')

const dbinit = async () => {
  try {
    await client.connect()
    console.log(1)
    const oids = await client.query("SELECT oid FROM pg_type WHERE typname='hstore'")
    console.log(2)
    types.setTypeParser(oids.rows[0].oid, function (val) {
      return hstore.parse(val)
    })
  } catch (e) {
    console.error(e)
  }

  return client

}

const init = async () => {

  const server = new Hapi.Server({
    port: 3000,
  })

  await server.register(Inert)

  const client = await dbinit()

  server.route({
    method: 'GET',
    path: '/quests',
    options: {
      cors: true,
    },
    handler: async (request, h) => {
      const res = await client.query('select * from quests')
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
      const {params} = request
      const {qid} = params
      console.log({qid})
      try {
        const res = await client.query('select * from points where qid = $1', [qid])
        return res.rows
      } catch (e) {
        console.error(e)
      }

    },
  })

  await server.start()

  console.log('Server running at:', server.info.uri)
}


process.on('unhandledRejection', (err) => {
  console.trace(err)
})

init()
