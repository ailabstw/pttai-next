const hyperdrive = require('hyperdrive')
const ram = require('random-access-memory')
const Discovery = require('hyperdiscovery')
const bodyParser = require('body-parser')
const cors = require('cors')

const user = require('./lib')

let users = []

let messages = []
let currentVersion = {}
let mods = []
let reacts = {}
let profiles = {}

let discovery = null

for (let i = 0; i < users.length; i++) {
  readUser(users[i])
}

let hubArchive = hyperdrive(ram)

var app = require('express')()
var http = require('http').Server(app)
var io = require('socket.io')(http)
app.use(bodyParser.json())
app.use(cors())

app.post('/join', async (req, res) => {
  // verify the user did get a valid invitation
  // or, if the user already have an approved join from a trusted master, also consider it valid
  // if the user have an approve from an unknown master, add it the the temporary trust list?

  // TODO: pass hub_key.sign('pttai') to the user as userdata

  if (!users.find(x => x === req.body.public_key)) {
    users.push(req.body.public_key)
    readUser(req.body.public_key)
  }
  console.log(users)
  res.json({ result: 'ok' })
})

app.get('/hub.json', (req, res) => {
  res.json({ key: hubArchive.key.toString('hex'), moderators: [] })
})

io.on('connection', (socket) => {
  console.log('connected')
  io.emit('update', messages)
  io.emit('profiles', profiles)
})

let port = process.argv[2] || 3003

http.listen(port, () => { console.log(`listening ${port}`) })

function readUser (k1) {
  let d1 = hyperdrive(ram, Buffer.from(k1, 'hex'))
  d1.on('error', console.error)
  // const net = require('net')

  // let socket = net.connect(port)
  // socket.pipe(d1.replicate({ live: true })).pipe(socket)
  if (!discovery) {
    discovery = Discovery(d1)
  } else {
    discovery.add(d1)
  }

  // d1.metadata.on('download', (idx, data) => console.log('download', idx, data))

  d1.on('sync', () => { console.log('sync') })
  d1.on('update', () => {
    console.log('update')
    updateView(d1)
  })
  d1.on('content', () => {
    console.log('content')
    updateView(d1)
  })
}

async function updateView (d1) {
  if (!currentVersion[d1.key.toString('hex')]) currentVersion[d1.key.toString('hex')] = 0

  let diff = d1.createDiffStream(currentVersion[d1.key.toString('hex')])
  diff.on('data', async (d) => {
    console.log(d.name)
    if (d.value.size === 0) return // skip directories

    if (d.name.match(/^\/topics\/(.+)\/moderation\/(.+)$/)) {
      let data = await user.readFile(d1, d.name)

      let action = JSON.parse(data)
      mods.push(action)
    } else if (d.name.match(/^\/topics\/(.+)\/reactions\/(.+)$/)) {
      let data = await user.readFile(d1, d.name)

      let react = JSON.parse(data)
      if (!reacts[react.msgID]) reacts[react.msgID] = []
      react.author = d1.key.toString('hex')
      reacts[react.msgID].push(react)
    } else if (d.name.match(/^\/topics\/(.+)$/)) {
      let data = await user.readFile(d1, d.name)
      let m = JSON.parse(data)
      m.author = d1.key.toString('hex')
      messages.push(m)

      messages = messages.sort((x, y) => x.date - y.date)
    } else if (d.name.match(/^\/profile.json/)) {
      let data = await user.readFile(d1, d.name)
      let profile = JSON.parse(data)
      profiles[d1.key.toString('hex')] = profile

      io.emit('profiles', profiles)
    }

    for (let j = 0; j < mods.length; j++) {
      messages = messages.filter(m => m.id !== mods[j].id)
    }

    for (let msgID in reacts) {
      for (let i = 0; i < messages.length; i++) {
        if (`${messages[i].id}` === msgID) {
          messages[i].reactions = []
          for (let react of reacts[msgID]) {
            messages[i].reactions.push(react)
          }
          break
        }
      }
    }
    io.emit('update', messages)
  })

  currentVersion[d1.key.toString('hex')] = d1.version
}
