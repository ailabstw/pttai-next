const user = require('.')
const EventEmitter = require('events')
const box = require('./box')

class GatewayView extends EventEmitter {
  constructor (archives, state) {
    super()

    if (!state) {
      state = {
        dmChannels: {},
        currentVersion: {}
      }
    }

    this.archives = archives
    this.state = state
    this.keys = []

    // 暫時還不知道發給誰的 DM 先存起來，等有新的 archive 加入時再試試
    this.pendingDMs = []

    this.on('gossip', this.__onGossip)
  }

  addKey (keyPair) {
    this.keys.push(keyPair)
  }

  collectDM (receiverKey, authorKey, id, message) {
    let dmChannelID = [authorKey, receiverKey].sort().join('-')

    if (!this.state.dmChannels[dmChannelID]) this.state.dmChannels[dmChannelID] = []

    this.state.dmChannels[dmChannelID].push({ author: authorKey, message, id })

    this.emit('dm', this.state.dmChannels)
  }

  __onGossip () {
    for (let i = 0; i < this.pendingDMs.length; i++) {
      let { author, nonce, cipher, id } = this.pendingDMs[i]

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
          this.pendingDMs.splice(i, 1)
          this.emit('decrypted', { receiver: archive, msg: decrypted, author, id })
          this.collectDM(archive.key.toString('hex'), author.key.toString('hex'), id, decrypted.toString())
        }
      }
    }
  }

  apply (archive) {
    let key = archive.key.toString('hex')
    if (!this.state.currentVersion[key]) this.state.currentVersion[key] = 0

    let diff = archive.createDiffStream(this.state.currentVersion[key])
    diff.on('data', async (d) => {
      console.log('gateway', d.name)
      if (d.value.size === 0) return // skip directories
      if (d.name.match(/^\/topics\/__gossiping\/(.+)$/)) {
        let data = await user.readFile(archive, d.name)

        let { nonce, cipher, id } = JSON.parse(data)

        console.log('gossiping!', key, d.name, { nonce, cipher })

        this.pendingDMs.unshift({ author: archive, nonce, cipher, id })

        this.emit('gossip', { author: archive, nonce, cipher, id })
      }
    })

    this.state.currentVersion[key] = archive.version
  }
}

module.exports = GatewayView
