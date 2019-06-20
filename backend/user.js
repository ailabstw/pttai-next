const hyperdrive = require('hyperdrive')
const ram = require('random-access-memory')
const Discovery = require('hyperdiscovery')

const user = require('./lib')

let archive = hyperdrive(ram)

archive.on('ready', async () => {
  await user.init(archive)

  await user.createTopic(archive, 'tech')
  await user.createTopic(archive, 'food')
  await user.postToTopic(archive, 'tech', { id: Math.random(), message: 'hello' })
  await user.postToTopic(archive, 'food', { id: Math.random(), message: 'hello' })

  console.log(archive.key.toString('hex'))

  Discovery(archive)
})

const server = require('./server')
let app = server(archive)
let port = process.argv[2] | '10000'
app.listen(port, () => {
  console.log('API listening on', port)
})
