const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const cors = require('cors')
const user = require('./lib')
const hyperdrive = require('hyperdrive')
const Discovery = require('hyperdiscovery')
const storage = require('./storage/ram')
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

let view = new View()

view.on('gossip', ({ cipher, nonce, sender }) => {
  for (let token in archives) {
    let archive = archives[token]
    let keyPair = { publicKey: archive.key, secretKey: archive.metadata.secretKey }

    // console.log('decrypting', keyPair.secretKey)
    let decrypted = box.decrypt(sender.key, keyPair.secretKey, Buffer.from(cipher, 'hex'), Buffer.from(nonce, 'hex'))
    // console.log('trying', decrypted.toString())
    let success = false
    for (let i = 0; i < decrypted.length; i++) {
      if (decrypted[i] !== 0) {
        success = true
        break
      }
    }

    if (success) {
      view.emit('decrypted', { receiver: archive, msg: decrypted, sender })
      view.collectDM(archive.key.toString('hex'), decrypted.toString())
    }
  }
})

let ns = io

if (process.env.GATEWAY_SOCKET_IO_NAMESPACE) {
  ns = io.of(process.env.GATEWAY_SOCKET_IO_NAMESPACE)
}

let token2socket = {}

ns.on('connection', (socket) => {
  socket.emit('hello')
  socket.on('register', function (token) {
    if (!token) return
    console.log('registering', token)
    token2socket[token] = socket
  })
})

view.on('decrypted', ({ receiver, msg, sender }) => {
  for (let token in token2socket) {
    console.log('broadcasting dm', token)
    let archive = archives[token]
    let socket = token2socket[token]
    console.log(archive.key.toString('hex'))
    console.log(receiver.key.toString('hex'))
    if (archive.key.toString('hex') === receiver.key.toString('hex')) {
      socket.emit('dm', { sender: sender.key.toString('hex'), msg: msg.toString() })
      break
    }
  }
})

function getArchive (token) {
  return new Promise((resolve, reject) => {
    console.log('get archive', token, archives[token] ? archives[token].key.toString('hex') : '')
    if (archives[token]) return resolve(archives[token])

    let archive = hyperdrive(storage(token), { latest: true })
    archives[token] = archive

    archive.on('ready', async () => {
      await user.init(archive)

      await user.createTopic(archive, 'tech')
      await user.createTopic(archive, 'food')
      await user.postToTopic(archive, 'tech', { id: Math.random(), message: 'hello' })
      await user.postToTopic(archive, 'food', { id: Math.random(), message: 'hello' })

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
  let archive = hyperdrive(storage(`replicates/${key}`), key, { latest: true })

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

  if (req.body.name) {
    await user.setProfile(archive, { name: req.body.name })
  }
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
