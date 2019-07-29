const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const cors = require('cors')
const user = require('./lib')
const hyperdrive = require('hyperdrive')
const Discovery = require('hyperdiscovery')
const storage = require('./storage/dat')
const box = require('./lib/box')

// no-op auth for testing
const authGoogle = require('./auth/google')
const authTest = require('./auth/noop')

const View = require('./lib/gateway_view')

let archives = {}
let disc

let app = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)
app.use(bodyParser.json())
app.use(cors())
app.use(morgan('tiny'))

let view = new View(archives)

let ns = io

if (process.env.GATEWAY_SOCKET_IO_NAMESPACE) {
  ns = io.of(process.env.GATEWAY_SOCKET_IO_NAMESPACE)
}

let token2socket = {}

ns.on('connection', (socket) => {
  socket.emit('hello')
  socket.on('register', async function (token) {
    if (!token) return

    console.log('registering', token)
    await getArchive(token)
    token2socket[token] = socket

    // console.log('registered', token, archives[token])
    if (archives[token]) {
      let ret = filterDMChannels(view.state.dmChannels, archives[token])
      socket.emit('dm', ret)
    }
  })
})

view.on('dm', (dmChannels) => {
  for (let token in token2socket) {
    let socket = token2socket[token]
    let socketArchive = archives[token]
    if (socket && socketArchive) {
      let ret = filterDMChannels(dmChannels, archives[token])
      socket.emit('dm', ret)
    } else {
      console.error('unable to find archive for socket with token:', token)
    }
  }
})

function filterDMChannels (dmChannels, archive) {
  let ret = {}
  console.log(archive.key.toString('hex'))
  for (let channelID in dmChannels) {
    console.log('channelID', channelID, dmChannels[channelID])
    try {
      let archiveKey = archive.key.toString('hex')
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

function getArchive (token) {
  return new Promise((resolve, reject) => {
    console.log('get archive', token, archives[token] ? archives[token].key.toString('hex') : '')
    if (archives[token]) return resolve(archives[token])

    let archive = hyperdrive(storage(`gateway/storage/${token}`, { secretDir: 'gateway/secrets' }), { latest: true })
    archives[token] = archive

    archive.on('ready', async () => {
      try {
        await user.init(archive)

        await user.createTopic(archive, 'tech')
        await user.createTopic(archive, 'food')
        await user.postToTopic(archive, 'tech', { id: Math.random(), message: 'hello' })
        await user.postToTopic(archive, 'food', { id: Math.random(), message: 'hello' })
      } catch (e) {
        console.error(e)
      }
      if (!disc) {
        disc = Discovery(archive)
      } else {
        disc.add(archive)
      }

      resolve(archive)
    })

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
  })
}

function replicate (key) {
  let archive = hyperdrive(storage(`gateway/replicates/${key}`, { secretdir: 'gateway/secrets' }), key, { latest: true })

  if (!disc) {
    disc = Discovery(archive)
  } else {
    disc.add(archive)
  }
}

app.post('/login', async (req, res) => {
  let { token, name } = await authGoogle(req.body.id_token.id_token)
  let archive = await getArchive(token)

  if (name) {
    await user.setProfile(archive, { name })
  }
  res.json({ result: { key: archive.key.toString('hex'), token } })
})

app.post('/test-login', async (req, res) => {
  let token = await authTest(req.body.id_token)
  let archive = await getArchive(token)

  await user.setProfile(archive, { name: req.body.id_token })
  res.json({ result: { key: archive.key.toString('hex'), token } })
})

app.get('/me', async (req, res) => {
  let archive = await getArchive(req.query.token)
  console.log(Object.keys(archives))
  res.json({ result: { key: archive.key.toString('hex') } })
})

app.get('/topics', async (req, res) => {
  let archive = await getArchive(req.query.token)
  let ts = await user.getTopics(archive)

  res.json({ result: ts })
})

app.post('/topics', async (req, res) => {
  let archive = await getArchive(req.query.token)
  await user.createTopic(archive, req.body.data)

  res.json({ result: 'ok' })
})

app.get('/topics/:id', async (req, res) => {
  let archive = await getArchive(req.query.token)
  let t = await user.getTopic(archive, req.params.id)

  res.json({ result: t })
})

app.post('/topics/:id', async (req, res) => {
  let archive = await getArchive(req.query.token)
  await user.postToTopic(archive, req.params.id, req.body.data)

  res.json({ result: 'ok' })
})

app.get('/topics/:id/curators', async (req, res) => {
  let archive = await getArchive(req.query.token)
  let cs = await user.getCurators(archive, req.params.id)

  res.json({ result: cs })
})

app.post('/topics/:id/curators', async (req, res) => {
  let archive = await getArchive(req.query.token)
  await user.addCurator(archive, req.params.id, req.body.data)

  res.json({ result: 'ok' })
})

app.post('/topics/:id/moderation', async (req, res) => {
  let archive = await getArchive(req.query.token)
  await user.moderate(archive, req.params.id, req.body.data)

  res.json({ result: 'ok' })
})

app.post('/topics/:id/reactions', async (req, res) => {
  let archive = await getArchive(req.query.token)
  await user.react(archive, req.params.id, req.body.data)

  res.json({ result: 'ok' })
})

app.get('/friends', async (req, res) => {
  let archive = await getArchive(req.query.token)
  let fs = await user.getFriends(archive)

  res.json({ result: fs })
})

app.post('/friends', async (req, res) => {
  let archive = await getArchive(req.query.token)
  await user.createFriend(archive, req.body.data)

  await replicate(req.body.data.id)

  res.json({ result: 'ok' })
})

app.post('/dm', async (req, res) => {
  let archive = await getArchive(req.query.token)

  let receiverPublicKey = Buffer.from(req.body.data.receiver, 'hex')
  let msg = Buffer.from(req.body.data.message)

  console.log('sending dm', { receiver: receiverPublicKey, secretKey: archive.metadata.secretKey })

  let b = box.encrypt(archive.metadata.secretKey, receiverPublicKey, msg)

  await user.postToTopic(
    archive,
    '__gossiping',
    {
      id: Math.random(),
      nonce: b.nonce.toString('hex'),
      cipher: b.cipher.toString('hex')
    })

  res.json({ result: 'ok' })
})

app.get('/profile', async (req, res) => {
  let archive = await getArchive(req.query.token)
  let profile = await user.getProfile(archive)

  res.json({ result: profile })
})

app.post('/profile', async (req, res) => {
  let archive = await getArchive(req.query.token)
  await user.setProfile(archive, req.body.data)

  res.json({ result: 'ok' })
})

let port = process.argv[2] || '9988'

http.listen(port, () => { console.log(`listening ${port}`) })
