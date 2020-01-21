const user = require('..')
const EventEmitter = require('events')
const box = require('../box')

class GatewayView extends EventEmitter {
  constructor (archives, state) {
    super()

    if (!state) {
      state = {
        dmChannels: {},
        dmChannelsVisible: {},
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
    const messageJson = JSON.parse(message)
    let dmChannelID = [authorKey, receiverKey].sort().join('-')
    if (messageJson.channel) {
      dmChannelID = messageJson.channel.id
    }

    if (!this.state.dmChannels[dmChannelID]) this.state.dmChannels[dmChannelID] = []

    this.state.dmChannels[dmChannelID].push({ author: authorKey, message: messageJson, id: dmID })

    // reduce
    let dmReactions = this.state.dmChannels[dmChannelID].filter(m => m.message.type === 'react')
    dmReactions = dmReactions.reduce((acc, m) => {
      const messageID = m.message.value.msgID.toString()
      if (!(messageID in acc)) {
        acc[messageID] = []
      }
      m.message.value.author = authorKey
      acc[messageID].push(m.message.value)
      return acc
    }, {})
    this.state.dmChannels[dmChannelID] = this.state.dmChannels[dmChannelID].map((dmMessage) => {
      if (dmMessage.id.toString() in dmReactions) {
        dmMessage.reactions = dmReactions[dmMessage.id.toString()]
      }
      return dmMessage
    })

    this.state.dmChannels[dmChannelID] = this.state.dmChannels[dmChannelID].sort((x, y) => x.message.date - y.message.date)
    this.state.dmChannelsVisible[dmChannelID] = this.state.dmChannels[dmChannelID].filter(m => m.message.type !== 'react')
    this.emit('dm', this.state.dmChannelsVisible)
  }

  __onGossip () {
    console.log('gossip received, pending', this.pendingDMs.length, this.resolvedDMIDs)
    const nextPendingDMs = []
    for (let i = 0; i < this.pendingDMs.length; i++) {
      const { author, nonce, cipher, id: dmID, messageId: mesID } = this.pendingDMs[i]

      let foundReceiver = false

      if (mesID && this.resolvedDMIDs.indexOf(mesID) !== -1) {
        foundReceiver = true
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
              this.emit('decrypted', { receiver: archive, msg: decrypted, author, id: dmID, messageId: mesID })
              if (mesID && this.resolvedDMIDs.indexOf(mesID) === -1) {
                this.resolvedDMIDs.push(mesID)
              }
              this.collectDM(archive.key.toString('hex'), author.key.toString('hex'), dmID, decrypted.toString())
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
    console.log('gossip finished, pending', this.pendingDMs.length, this.resolvedDMIDs)
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

        const { nonce, cipher, id: dmID, messageId: mesID } = JSON.parse(data)

        this.pendingDMs.unshift({ author: archive, nonce, cipher, id: dmID, messageId: mesID })
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
