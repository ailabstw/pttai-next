const user = require('..')
const EventEmitter = require('events')
const box = require('../box')

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

    // 暫時還不知道發給誰的 DM 先存起來，等有新的 archive 加入時再試試
    this.pendingDMs = []

    this.on('gossip', this.__onGossip)
  }

  addArchive (token, archive) {
    this.archives[token] = archive
    this.emit('gossip')
  }

  collectDM (receiverKey, authorKey, id, message) {
    let dmChannelID = [authorKey, receiverKey].sort().join('-')

    if (!this.state.dmChannels[dmChannelID]) this.state.dmChannels[dmChannelID] = []

    this.state.dmChannels[dmChannelID].push({ author: authorKey, message: JSON.parse(message), id })

    this.state.dmChannels[dmChannelID] = this.state.dmChannels[dmChannelID].sort((x, y) => x.message.date - y.message.date)

    this.emit('dm', this.state.dmChannels)
  }

  __onGossip () {
    console.log('gossip received, pending', this.pendingDMs.length)
    let nextPendingDMs = []
    for (let i = 0; i < this.pendingDMs.length; i++) {
      let { author, nonce, cipher, id } = this.pendingDMs[i]

      let foundReceiver = false
      for (let token in this.archives) {
        let archive = this.archives[token]
        let keyPair = { publicKey: archive.key, secretKey: archive.metadata.secretKey }

        // console.log('decrypting', keyPair.secretKey)
        if (author.key && keyPair.secretKey) {
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
            foundReceiver = true
            this.emit('decrypted', { receiver: archive, msg: decrypted, author, id })
            this.collectDM(archive.key.toString('hex'), author.key.toString('hex'), id, decrypted.toString())
            break
          }
        }
      }

      if (!foundReceiver) {
        nextPendingDMs.push(this.pendingDMs[i])
      }
    }

    this.pendingDMs = nextPendingDMs
    console.log('gossip finished, pending', this.pendingDMs.length)
  }

  apply (archive) {
    let key = archive.key.toString('hex')
    if (!this.state.currentVersion[key]) {
      this.state.currentVersion[key] = 0
      // check all pending dm since this is a new archive
      this.emit('gossip')
    }

    let diff = archive.createDiffStream(this.state.currentVersion[key])
    diff.on('data', async (d) => {
      console.log('gateway', archive.key.toString('hex'), d.name)
      if (d.value.size === 0) return // skip directories
      if (d.name.match(/^\/topics\/__gossiping\/(.+)$/)) {
        let data = await user.readFile(archive, d.name)

        let { nonce, cipher, id } = JSON.parse(data)

        // console.log('gossiping!', key, d.name, { nonce, cipher })

        this.pendingDMs.unshift({ author: archive, nonce, cipher, id })

        this.emit('gossip')
      }
    })

    this.state.currentVersion[key] = archive.version
  }
}

module.exports = GatewayView
