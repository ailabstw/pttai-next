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

  d1.metadata.on('download', (idx, data) => console.log('download', idx, data))

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
  console.log('version', d1.version)

  console.log('update view')
  if (!currentVersion[d1.key.toString('hex')]) currentVersion[d1.key.toString('hex')] = 0
  let diff = d1.createDiffStream(currentVersion[d1.key.toString('hex')])
  diff.on('data', async (d) => {
    if (d.name.startsWith('/topics/')) {
      if (d.name.match('moderation/(.+)')) {
        let data = await user.readFile(d1, d.name)
        console.log(d.name, data.toString('utf-8'))

        let action = JSON.parse(data)
        mods.push(action)
      }
    }

    let topics = await user.getTopics(d1)
    for (let i = 0; i < topics.length; i++) {
      let ms = await user.getTopic(d1, topics[i])

      for (let i = 0; i < ms.length; i++) {
        let x = ms[i]
        x.author = d1.key.toString('hex')
        // console.log(x)
        if (messages.find(m => m.id === x.id)) continue
        messages.push(x)
        messages = messages.sort((x, y) => x.date - y.date)

        for (let j = 0; j < mods.length; j++) {
          messages = messages.filter(m => m.id !== mods[j].id)
        }
        // console.log(messages)
      }
      io.emit('update', messages)
    }
  })

  currentVersion[d1.key.toString('hex')] = d1.version
}
