const user = require('.')
const EventEmitter = require('events')
const box = require('./box')

class GatewayView extends EventEmitter {
  constructor (archives, state) {
    super()

    if (!state) {
      state = {
        dm: {},
        currentVersion: {}
      }
    }

    this.archives = archives
    this.state = state
    this.keys = []

    this.on('gossip', this.__onGossip)
  }

  addKey (keyPair) {
    this.keys.push(keyPair)
  }

  collectDM (receiverKey, author, id, message) {
    if (!this.state.dm[receiverKey]) this.state.dm[receiverKey] = []

    this.state.dm[receiverKey].push({ author, message, id })

    this.emit('dm', this.state.dm)
  }

  __onGossip ({ cipher, nonce, author, id }) {
    for (let token in this.archives) {
      let archive = this.archives[token]
      let keyPair = { publicKey: archive.key, secretKey: archive.metadata.secretKey }

      // console.log('decrypting', keyPair.secretKey)
      let decrypted = box.decrypt(author.key, keyPair.secretKey, Buffer.from(cipher, 'hex'), Buffer.from(nonce, 'hex'))
      // console.log('trying', decrypted.toString())
      let success = false
      for (let i = 0; i < decrypted.length; i++) {
        if (decrypted[i] !== 0) {
          success = true
          break
        }
      }

      if (success) {
        this.emit('decrypted', { receiver: archive, msg: decrypted, author, id })
        this.collectDM(archive.key.toString('hex'), author.key.toString('hex'), id, decrypted.toString())
      }
    }
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

        let { nonce, cipher, id } = JSON.parse(data)

        console.log('gossiping!', key, d.name, { nonce, cipher })

        this.emit('gossip', { author: archive, nonce, cipher, id })
      }
    })

    this.state.currentVersion[key] = archive.version
  }
}

module.exports = GatewayView
