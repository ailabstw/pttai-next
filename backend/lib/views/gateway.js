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

    // 記住已經解開過的 dm ID，避免重複
    this.resolvedDMIDs = []

    this.on('gossip', this.__onGossip)
  }

  addArchive (id, archive) {
    this.archives[id] = archive
    this.emit('gossip')
  }

  collectDM (receiverKey, authorKey, dmID, message) {
    const dmChannelID = [authorKey, receiverKey].sort().join('-')

    if (!this.state.dmChannels[dmChannelID]) this.state.dmChannels[dmChannelID] = []
    this.state.dmChannels[dmChannelID].push({ author: authorKey, message: JSON.parse(message), id: dmID })
    this.state.dmChannels[dmChannelID] = this.state.dmChannels[dmChannelID].sort((x, y) => x.message.date - y.message.date)

    this.emit('dm', this.state.dmChannels)
  }

  __onGossip () {
    console.log('gossip received, pending', this.pendingDMs.length)
    const nextPendingDMs = []
    for (let i = 0; i < this.pendingDMs.length; i++) {
      const { author, nonce, cipher, id: dmID } = this.pendingDMs[i]

      let foundReceiver = false

      if (this.resolvedDMIDs[dmID]) {
        foundReceiver = true
        if (this.resolvedDMIDs.indexOf(dmID) !== -1) {
          this.resolvedDMIDs.push(dmID)
        }
      } else {
        for (const archiveID in this.archives) {
          const archive = this.archives[archiveID]
          const keyPair = { publicKey: archive.key, secretKey: archive.metadata.secretKey }

          // console.log('decrypting', keyPair.secretKey)
          if (author.key && keyPair.secretKey) {
            const decrypted = box.decrypt(author.key, keyPair.secretKey, Buffer.from(cipher, 'hex'), Buffer.from(nonce, 'hex'))
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
              this.emit('decrypted', { receiver: archive, msg: decrypted, author, id: dmID })
              if (this.resolvedDMIDs.indexOf(dmID) !== -1) {
                this.resolvedDMIDs.push(dmID)
                this.collectDM(archive.key.toString('hex'), author.key.toString('hex'), dmID, decrypted.toString())
              }
              break
            }
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
    const key = archive.key.toString('hex')
    if (!this.state.currentVersion[key]) {
      this.state.currentVersion[key] = 0
      // check all pending dm since this is a new archive
      this.emit('gossip')
    }

    const diff = archive.createDiffStream(this.state.currentVersion[key])
    diff.on('data', async (d) => {
      console.log('gateway', archive.key.toString('hex'), d.name)
      if (d.value.size === 0) return // skip directories
      if (d.name.match(/^\/topics\/__gossiping\/(.+)$/)) {
        const data = await user.readFile(archive, d.name)

        const { nonce, cipher, id: dmID } = JSON.parse(data)

        this.pendingDMs.unshift({ author: archive, nonce, cipher, id: dmID })

        this.emit('gossip')
      }
    })

    this.state.currentVersion[key] = archive.version
  }

  // manually add a new gossip to the view, use to add gossip from unmanaged friend's archive
  applyGossip (authorArchive, nonce, cipher, dmID) {
    this.pendingDMs.unshift({ author: authorArchive, nonce, cipher, id: dmID })
    this.emit('gossip')
  }
}

module.exports = GatewayView
