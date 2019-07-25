const user = require('.')
const EventEmitter = require('events')

class GatewayView extends EventEmitter {
  constructor (state) {
    super()
    if (!state) {
      state = {
        dm: {},
        currentVersion: {}
      }
    }

    this.state = state

    this.keys = []
  }

  addKey (keyPair) {
    this.keys.push(keyPair)
  }

  collectDM (receiver, message) {

  }

  apply (archive) {
    let key = archive.key.toString('hex')
    if (!this.state.currentVersion[key]) this.state.currentVersion[key] = 0

    let diff = archive.createDiffStream(this.state.currentVersion[key])
    diff.on('data', async (d) => {
      console.log(d.name)
      if (d.value.size === 0) return // skip directories
      if (d.name.match(/^\/topics\/__gossiping\/(.+)$/)) {
        let data = await user.readFile(archive, d.name)

        let { nonce, cipher } = JSON.parse(data)

        console.log('gossiping!', key, d.name, { nonce, cipher })

        this.emit('gossip', { sender: archive, nonce, cipher })
      }
    })

    this.state.currentVersion[key] = archive.version
  }
}

module.exports = GatewayView
