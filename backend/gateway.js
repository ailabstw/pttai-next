const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const assert = require('assert')
const fs = require('fs')
const express = require('express')
const bodyParser = require('body-parser')
const pino = require('express-pino-logger')()
const cors = require('cors')
const user = require('./lib')
const hyperdrive = require('hyperdrive')
const Discovery = require('hyperdiscovery')
const storage = require('./storage/dat')
const box = require('./lib/box')
const AsyncLock = require('async-lock')
const jwt = require('jsonwebtoken')

assert.ok(process.env.JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET
const ENABLE_TEST_LOGIN = process.env.ENABLE_TEST_LOGIN

var archivesLock = new AsyncLock()

require('express-async-errors')

// no-op auth for testing
const authGoogle = require('./auth/google')

const View = require('./lib/views/gateway')

async function main () {
  const archives = {}
  let disc

  const app = express()
  var http = require('http').Server(app)
  var io = require('socket.io')(http)
  app.use(bodyParser.json())
  app.use(cors())
  app.use(pino)

  const authToken = function (req, res, next) {
    const { id } = jwt.verify(req.query.token, JWT_SECRET)

    if (id) {
      req.archiveID = id
      next()
    } else {
      next(new Error('invalid token'))
    }
  }

  const view = new View(archives)
  await loadExistingArchives()

  let ns = io

  if (process.env.GATEWAY_SOCKET_IO_NAMESPACE) {
    ns = io.of(process.env.GATEWAY_SOCKET_IO_NAMESPACE)
  }

  const id2socket = {}

  ns.use(function (socket, next) {
    if (!socket.handshake.query.token) {
      return next(new Error('invalid token'))
    }

    const { id } = jwt.verify(socket.handshake.query.token, JWT_SECRET)
    if (!id) {
      return next(new Error('invalid token'))
    }

    socket.archiveID = id
    next()
  })

  ns.on('connection', async (socket) => {
    const id = socket.archiveID
    console.log('registering connection from', id)
    await loadArchive(id)
    id2socket[id] = socket

    if (archives[id]) {
      const ret = filterDMChannels(view.state.dmChannels, archives[id])
      socket.emit('dm', ret)
    }
  })

  view.on('dm', (dmChannels) => {
    for (const id in id2socket) {
      const socket = id2socket[id]
      const socketArchive = archives[id]
      if (socket && socketArchive) {
        const ret = filterDMChannels(dmChannels, archives[id])
        socket.emit('dm', ret)
      } else {
        console.error('unable to find archive for socket with id:', id)
      }
    }
  })

  function filterDMChannels (dmChannels, archive) {
    const ret = {}
    for (const channelID in dmChannels) {
      try {
        const archiveKey = archive.key.toString('hex')
        if (channelID.startsWith(archiveKey) || channelID.endsWith(archiveKey)) {
          ret[channelID] = dmChannels[channelID]
        } else {
          continue
        }
      } catch (e) {
        console.error(e)
      // TODO: ignore for now
      }
    }

    return ret
  }

  function loadArchive (id, rejectNotFound) {
    return new Promise((resolve, reject) => {
      console.log('loading archive', id, archives[id] ? archives[id].key.toString('hex') : 'not found')
      archivesLock.acquire('lock', (done) => {
        if (archives[id]) {
          return archives[id].ready(() => {
            console.log('existed archive loaded')
            done()
            return resolve(archives[id])
          })
        }

        if (rejectNotFound) {
          done()
          return reject(new Error('archive not found'))
        }

        const archive = hyperdrive(storage(`gateway/storage/${id}`, { secretDir: 'gateway/secrets' }), { latest: true })
        archive.on('ready', async () => {
          view.addArchive(id, archive)
          archives[id] = archive
          try {
            await user.init(archive)

            await user.createTopic(archive, 'general')
            await user.postToTopic(archive, 'general', { id: Date.now(), message: { type: 'action', value: 'joined the topic' } })
          } catch (e) {
            console.error(e)
          }
          if (!disc) {
            disc = Discovery(archive)
          } else {
            disc.add(archive)
          }

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

          // load saved data
          view.apply(archive)

          console.log('new archive loaded')
          resolve(archive)
          done()
        })
      })
    })
  }

  app.post('/login', async (req, res) => {
    const { id, name } = await authGoogle(req.body.id_token.id_token)
    const archive = await loadArchive(id)

    if (name) {
      await user.setProfile(archive, { name })
    }

    const token = jwt.sign({ id }, JWT_SECRET)
    res.json({ result: { key: archive.key.toString('hex'), token } })
  })

  if (ENABLE_TEST_LOGIN) {
    app.post('/test-login', async (req, res) => {
      const id = req.body.id_token
      const archive = await loadArchive(id)

      await user.setProfile(archive, { name: id })

      const token = jwt.sign({ id }, JWT_SECRET)
      res.json({ result: { key: archive.key.toString('hex'), token } })
    })
  }

  app.get('/me', authToken, async (req, res) => {
    const archive = await loadArchive(req.archiveID, true)
    console.log(Object.keys(archives))
    res.json({ result: { key: archive.key.toString('hex') } })
  })

  app.get('/topics', authToken, async (req, res) => {
    const archive = await loadArchive(req.archiveID, true)
    const ts = await user.getTopics(archive)

    res.json({ result: ts })
  })

  app.post('/topics', authToken, async (req, res) => {
    const archive = await loadArchive(req.archiveID, true)
    await user.createTopic(archive, req.body.data)

    res.json({ result: 'ok' })
  })

  app.get('/topics/:id', authToken, async (req, res) => {
    const archive = await loadArchive(req.archiveID, true)
    const t = await user.getTopic(archive, req.params.id)

    res.json({ result: t })
  })

  app.post('/topics/:id', authToken, async (req, res) => {
    const archive = await loadArchive(req.archiveID, true)
    await user.postToTopic(archive, req.params.id, req.body.data)

    res.json({ result: 'ok' })
  })

  app.get('/topics/:id/curators', authToken, async (req, res) => {
    const archive = await loadArchive(req.archiveID, true)
    const cs = await user.getCurators(archive, req.params.id)

    res.json({ result: cs })
  })

  app.post('/topics/:id/curators', authToken, async (req, res) => {
    const archive = await loadArchive(req.archiveID, true)
    await user.addCurator(archive, req.params.id, req.body.data)

    res.json({ result: 'ok' })
  })

  app.post('/topics/:id/moderation', authToken, async (req, res) => {
    const archive = await loadArchive(req.archiveID, true)
    await user.moderate(archive, req.params.id, req.body.data)

    res.json({ result: 'ok' })
  })

  app.post('/topics/:id/reactions', authToken, async (req, res) => {
    const archive = await loadArchive(req.archiveID, true)
    await user.react(archive, req.params.id, req.body.data)

    res.json({ result: 'ok' })
  })

  app.get('/friends', authToken, async (req, res) => {
    const archive = await loadArchive(req.archiveID, true)
    const fs = await user.getFriends(archive)

    res.json({ result: fs })
  })

  app.post('/friends', authToken, async (req, res) => {
    const archive = await loadArchive(req.archiveID, true)
    await user.createFriend(archive, req.body.data)

    res.json({ result: 'ok' })
  })

  app.post('/dm', authToken, async (req, res) => {
    const archive = await loadArchive(req.archiveID, true)

    const receiverPublicKey = Buffer.from(req.body.data.receiver, 'hex')
    let msg = req.body.data.message
    if (!msg.date) msg.date = Date.now()
    msg = Buffer.from(JSON.stringify(req.body.data.message))

    // console.log('sending dm', { receiver: receiverPublicKey, secretKey: archive.metadata.secretKey })

    const b = box.encrypt(archive.metadata.secretKey, receiverPublicKey, msg)

    await user.postToTopic(
      archive,
      '__gossiping',
      {
        id: Date.now(),
        nonce: b.nonce.toString('hex'),
        cipher: b.cipher.toString('hex')
      })

    res.json({ result: 'ok' })
  })

  app.get('/profile', authToken, async (req, res) => {
    const archive = await loadArchive(req.archiveID, true)
    const profile = await user.getProfile(archive)

    res.json({ result: profile })
  })

  app.post('/profile', authToken, async (req, res) => {
    const archive = await loadArchive(req.archiveID, true)
    await user.setProfile(archive, req.body.data)

    res.json({ result: 'ok' })
  })

  app.use((err, req, res, next) => {
    if (err.message === 'archive not found') {
      res.status(403)
      return res.json({ error: err.message })
    } else if (err) {
      console.error(err)
      res.status(500)
      res.json({ error: 'Internal Server Error' })
    }

    next()
  })

  const port = process.argv[2] || '9988'

  http.listen(port, () => { console.log(`listening ${port}`) })

  async function loadExistingArchives () {
    console.log('loading existing archives')
    try {
      const ids = fs.readdirSync(path.resolve('./gateway/storage'))
      console.log(ids)
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        await loadArchive(id)
      }
      console.log('loaded')
    } catch (e) {
      // TODO: ignore for now
      console.error(e)
    }
  }
}

main()
