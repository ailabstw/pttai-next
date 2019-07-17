const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const cors = require('cors')
const user = require('./lib')
const hyperdrive = require('hyperdrive')
const Discovery = require('hyperdiscovery')
const { OAuth2Client } = require('google-auth-library')
const storage = require('./storage/ram')

require('dotenv').config()

const GOOGLE_SIGNIN_CLIENT_ID = process.env.GOOGLE_SIGNIN_CLIENT_ID
const googleOAuthClient = new OAuth2Client(GOOGLE_SIGNIN_CLIENT_ID)

let archives = {}
let disc

let app = express()
app.use(bodyParser.json())
app.use(cors())
app.use(morgan('tiny'))

function getArchive (token) {
  return new Promise((resolve, reject) => {
    console.log('get archive', token, archives[token] ? archives[token].key.toString('hex') : '')
    if (archives[token]) return resolve(archives[token])

    let archive = hyperdrive(storage(token), { latest: true })

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

      archives[token] = archive
      resolve(archive)
    })
  })
}

app.post('/login', async (req, res) => {
  // let token = await authGoogle(req.body.id_token)
  // TODO: token expiration
  let token = await authToken(req.body.id_token)
  let archive = await getArchive(token)
  res.json({ result: { key: archive.key.toString('hex'), token } })
})

// TODO: authz
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

let port = process.argv[2] | '9988'

// TODO: google oauth to token
// TODO: token to r/w archive

app.listen(port, () => {
  console.log('API listening on', port)
})

async function authGoogle (idToken) {
  const ticket = await googleOAuthClient.verifyIdToken({
    idToken: idToken,
    audience: GOOGLE_SIGNIN_CLIENT_ID
  })
  const payload = ticket.getPayload()
  let userID = payload['sub']
  return userID
}

// for testing
async function authToken (token) {
  return token
}
