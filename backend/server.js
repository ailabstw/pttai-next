const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const cors = require('cors')
const user = require('./lib')

module.exports = function (archive) {
  let app = express()
  app.use(bodyParser.json())
  app.use(cors())
  app.use(morgan('tiny'))

  // TODO: authz
  app.get('/me', (req, res) => {
    res.json({ result: { key: archive.key.toString('hex') } })
  })

  app.get('/topics', async (req, res) => {
    let ts = await user.getTopics(archive)

    res.json({ result: ts })
  })

  app.post('/topics', async (req, res) => {
    await user.createTopic(archive, req.body.data)

    res.json({ result: 'ok' })
  })

  app.get('/topics/:id', async (req, res) => {
    let t = await user.getTopic(archive, req.params.id)

    res.json({ result: t })
  })

  app.post('/topics/:id', async (req, res) => {
    await user.postToTopic(archive, req.params.id, req.body.data)

    res.json({ result: 'ok' })
  })

  app.get('/topics/:id/curators', async (req, res) => {
    let cs = await user.getCurators(archive, req.params.id)

    res.json({ result: cs })
  })

  app.post('/topics/:id/curators', async (req, res) => {
    await user.addCurator(archive, req.params.id, req.body.data)

    res.json({ result: 'ok' })
  })

  app.post('/topics/:id/moderation', async (req, res) => {
    await user.moderate(archive, req.params.id, req.body.data)

    res.json({ result: 'ok' })
  })

  app.post('/topics/:id/reactions', async (req, res) => {
    await user.react(archive, req.params.id, req.body.data)

    res.json({ result: 'ok' })
  })

  app.get('/friends', async (req, res) => {
    let fs = await user.getFriends(archive)

    res.json({ result: fs })
  })

  app.post('/friends', async (req, res) => {
    await user.createFriend(archive, req.body.data)

    res.json({ result: 'ok' })
  })

  return app
}
