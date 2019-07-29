const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const hyperdrive = require('hyperdrive')
const ram = require('random-access-memory')
const Discovery = require('hyperdiscovery')
const bodyParser = require('body-parser')
const cors = require('cors')
const morgan = require('morgan')
const View = require('./lib/views/hub')

let users = []

let view = new View()

let discovery = null

for (let i = 0; i < users.length; i++) {
  readUser(users[i])
}

let hubArchive = hyperdrive(ram)

var app = require('express')()
var http = require('http').Server(app)
var io = require('socket.io')(http)
app.use(bodyParser.json())
app.use(morgan('tiny'))
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
  console.log('users', users)
  res.json({ result: 'ok' })
})

app.get('/hub.json', (req, res) => {
  res.json({ key: hubArchive.key.toString('hex'), moderators: [] })
})

let ns = io

if (process.env.HUB_SOCKET_IO_NAMESPACE) {
  ns = io.of(process.env.HUB_SOCKET_IO_NAMESPACE)
}

ns.on('connection', (socket) => {
  console.log('connected')
  console.log(Object.keys(io.nsps))
  socket.emit('update', view.messages)
  socket.emit('profiles', view.profiles)
})

view.on('update', (msgs) => {
  ns.emit('update', msgs)
})

view.on('profiles', (profiles) => {
  ns.emit('profiles', profiles)
})

let port = process.argv[2] || 3003

http.listen(port, () => { console.log(`listening ${port}`) })

function readUser (k1) {
  console.log('reading user', k1)
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
    console.log(d1.metadata.listenerCount('append'))
    view.apply(d1)
  })
  d1.on('content', () => {
    console.log('content')
    view.apply(d1)
  })
}
