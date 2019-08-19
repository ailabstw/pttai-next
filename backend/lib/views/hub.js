const user = require('..')
const EventEmitter = require('events')

class View extends EventEmitter {
  constructor (state) {
    super()
    if (!state) {
      state = {
        messages: [],
        currentVersion: {},
        mods: [],
        reacts: {},
        profiles: {}
      }
    }

    this.state = state
  }

  get messages () {
    return this.state.messages
  }

  get profiles () {
    return this.state.profiles
  }

  applyDiff (key, d, data) {
    if (d.name.match(/__gossiping/)) {
      // skip hidden topic
    } else if (d.name.match(/^\/topics\/(.+)\/moderation\/(.+)$/)) {
      const action = JSON.parse(data)
      this.state.mods.push(action)
    } else if (d.name.match(/^\/topics\/(.+)\/reactions\/(.+)$/)) {
      const react = JSON.parse(data)
      if (!this.state.reacts[react.msgID]) this.state.reacts[react.msgID] = []
      react.author = key
      this.state.reacts[react.msgID].push(react)
    } else if (d.name.match(/^\/topics\/(.+)$/)) {
      const m = JSON.parse(data)
      m.author = key
      if (!this.state.messages.find(x => x.id === m.id)) {
        this.state.messages.push(m)

        this.state.messages = this.state.messages.sort((x, y) => x.date - y.date)
      }
    } else if (d.name.match(/^\/profile.json/)) {
      const profile = JSON.parse(data)
      this.state.profiles[key] = profile

      this.emit('profiles', this.state.profiles)
    }
  }

  apply (archive) {
    const key = archive.key.toString('hex')
    if (!this.state.currentVersion[key]) this.state.currentVersion[key] = 0

    const diff = archive.createDiffStream(this.state.currentVersion[key])
    diff.on('data', async (d) => {
      console.log('hub', archive.key.toString('hex'), d.name)
      if (d.value.size === 0) return // skip directories

      const data = await user.readFile(archive, d.name)
      this.applyDiff(key, d, data)
      this.reduce()
    })

    this.state.currentVersion[key] = archive.version
  }

  reduce () {
    for (let j = 0; j < this.state.mods.length; j++) {
      this.state.messages = this.state.messages.filter(m => m.id !== this.state.mods[j].id)
    }

    for (const msgID in this.state.reacts) {
      for (let i = 0; i < this.state.messages.length; i++) {
        if (`${this.state.messages[i].id}` === msgID) {
          this.state.messages[i].reactions = []
          for (const react of this.state.reacts[msgID]) {
            this.state.messages[i].reactions.push(react)
          }
          break
        }
      }
    }
    console.log('view updated')
    this.emit('update', this.state.messages)
  }
}

module.exports = View
