const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const express = require('express')
const bodyParser = require('body-parser')
const pino = require('express-pino-logger')()

const hyperdrive = require('hyperdrive')
const storage = require('./storage/dat')
const AsyncLock = require('async-lock')
const assert = require('assert')
const joinNetwork = require('./network/hyperdiscovery')

var archivesLock = new AsyncLock()

assert.ok(process.env.JWT_SECRET)
const GATEWAY_URL = process.env.GATEWAY_URL

const EventEmitter = require('events')
const user = require('./lib')
const axios = require('axios')

class View extends EventEmitter {
  constructor () {
    super()

    this.state = {
      currentVersion: {}
    }
  }

  apply (archive) {
    const key = archive.key.toString('hex')
    if (!this.state.currentVersion[key]) {
      this.state.currentVersion[key] = 0
    }

    const diff = archive.createDiffStream(this.state.currentVersion[key])
    diff.on('data', async (d) => {
      console.log('replicator', archive.key.toString('hex'), d.name)
      if (d.value.size === 0) return // skip directories
      if (d.name.match(/^\/topics\/__gossiping\/(.+)$/)) {
        const data = await user.readFile(archive, d.name)

        const { nonce, cipher, id: dmID } = JSON.parse(data)

        // post to gateway
        await axios({
          method: 'POST',
          url: `${GATEWAY_URL}/gossip`,
          data: {
            authorArchive: key,
            dmID: dmID,
            nonce,
            cipher
          }
        })
      }
    })

    this.state.currentVersion[key] = archive.version
  }
}

async function main () {
  const archives = {}
  const app = express()

  const view = new View()

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
            view.apply(archive)
          })
          archive.on('content', () => {
            console.log('content')
            view.apply(archive)
          })
          view.apply(archive)

          console.log('new archive loaded')
          resolve(archive)
          done()
        })
      })
    })
  }
}

main()
