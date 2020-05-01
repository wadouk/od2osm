const { Client, types } = require('pg')
const client = new Client()

var hstore = require('hstore.js');

async function h () {
  try {
    await client.connect()
    console.log(1)
    const oids = await client.query("SELECT oid FROM pg_type WHERE typname='hstore'")
    console.log(2)
    types.setTypeParser(oids[0].oid, function (val) {
      return hstore.parse(val)
    })
    console.log(3)
    const res = await client.query('SELECT * from opendata')
    console.log(res.rows[0].properties)
  } catch (e) {
    console.error({e})
  }

  return client
}

h().then((client) => {
  console.log({t: 'finally'})
  client.end().then(_ => {
    console.log('hello')
  })

})