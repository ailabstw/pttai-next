const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const express = require('express')
const bodyParser = require('body-parser')
const pino = require('express-pino-logger')()

const hyperdrive = require('hyperdrive')
const storage = require('./storage/dat')
const AsyncLock = require('async-lock')
const joinNetwork = require('./network/hyperdiscovery')

var archivesLock = new AsyncLock()

async function main () {
  const archives = {}
  const app = express()

  app.use(bodyParser.json())
  app.use(pino)

  app.post('/load', async (req, res) => {
    const { key } = req.body
    const archive = await loadArchive(key)

    res.json({ result: 'ok', key: archive.key.toString('hex') })
  })

  const port = process.argv[2] || '10237'
  app.listen(port, () => { console.log(`listening ${port}`) })

  function loadArchive (key) {
    return new Promise((resolve, reject) => {
      console.log('loading archive', key, archives[key] ? archives[key].key.toString('hex') : 'not found')
      archivesLock.acquire('lock', (done) => {
        if (archives[key]) {
          return archives[key].ready(() => {
            console.log('existed archive loaded')
            done()
            return resolve(archives[key])
          })
        }

        const archive = hyperdrive(storage(`replicator/storage/${key}`, { secretDir: 'replicator/secrets' }), key, { latest: true })
        archive.on('ready', async () => {
          archives[key] = archive
          joinNetwork(archive)

          archive.on('sync', () => { console.log('sync') })
          archive.on('update', () => {
            console.log('update')
            console.log(archive.metadata.listenerCount('append'))
          })
          archive.on('content', () => {
            console.log('content')
          })

          console.log('new archive loaded')
          resolve(archive)
          done()
        })
      })
    })
  }
}

main()
