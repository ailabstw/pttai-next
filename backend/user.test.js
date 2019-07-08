const tape = require('tape')
const axios = require('axios')
const hyperdrive = require('hyperdrive')
const ram = require('random-access-memory')
const user = require('./lib')

const server = require('./server')

const HOST = 'http://localhost:8080'

tape('test', async function (t) {
  let archive = hyperdrive(ram)
  archive.on('ready', async () => {
    await user.init(archive)

    let app = server(archive)
    let s = app.listen(8080)

    let res = await axios.get(`${HOST}/topics`)

    t.same(res.data, { result: [] })

    res = await axios.post(`${HOST}/topics`, { data: 'foo' })
    t.same(res.data, { result: 'ok' })

    res = await axios.get(`${HOST}/topics`)
    t.same(res.data, { result: ['foo'] })

    res = await axios.get(`${HOST}/topics/foo`)
    t.same(res.data, { result: [] })

    res = await axios.post(`${HOST}/topics/foo`, { data: { id: 'helloo', title: 'hello', body: 'world' } })
    t.same(res.data, { result: 'ok' })

    res = await axios.get(`${HOST}/topics/foo`)
    t.same(res.data.result[0].title, 'hello')
    t.same(res.data.result[0].topic, 'foo')

    res = await axios.get(`${HOST}/topics/foo/curators`)
    t.same(res.data, { result: [] })

    res = await axios.post(`${HOST}/topics/foo/curators`, { data: { id: '123', name: 'ccc' } })
    t.same(res.data, { result: 'ok' })

    res = await axios.get(`${HOST}/topics/foo/curators`)
    t.same(res.data, { result: [{ id: '123', name: 'ccc', topic: 'foo' }] })

    res = await axios.get(`${HOST}/friends`)
    t.same(res.data, { result: [] })

    res = await axios.post(`${HOST}/friends`, { data: { id: '123', name: 'ccc' } })
    t.same(res.data, { result: 'ok' })

    res = await axios.get(`${HOST}/friends`)
    t.same(res.data, { result: [{ id: '123', name: 'ccc' }] })

    s.close()
    t.end()
  })
})
