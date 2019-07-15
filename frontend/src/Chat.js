import React, { Component } from 'react'
import axios from 'axios'
import socketIOClient from 'socket.io-client'

const HUBS = [
  'http://localhost:3003',
  'http://localhost:3004'
]

class Chat extends Component {
  constructor () {
    super()
    this.state = {
      currentTopic: 'tech',
      topics: [],
      friends: [],
      me: { key: '' },
      messages: {},
      hubID: 0,
      apiInput: 'http://localhost:10000',
      api: 'http://localhost:10000',
      username: 'username'
    }

    this.messageEndRef = React.createRef()
  }

  componentDidMount () {
    this.load()
  }

  async updateProfile () {
    let name = window.prompt('Enter new name')

    await axios.post(`${this.state.api}/profile`, { data: { name } })

    this.setState({ username: name })
  }

  onKeyPress (e) {
    if (e.key === 'Enter') {
      this.submit(e.target.value)

      e.target.value = ''
    }
  }

  scrollMessage () {
    this.messageEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }

  async submit (msg) {
    if (msg.startsWith('+')) {
      let msgs = this.state.messages[this.state.currentTopic]
      let last = msgs[msgs.length - 1]
      await axios.post(`${this.state.api}/topics/${this.state.currentTopic}/reactions`, { data: { id: Date.now(), msgID: last.id, react: msg.slice(1) } })
      return
    }
    await axios.post(`${this.state.api}/topics/${this.state.currentTopic}`, { data: { id: Date.now(), message: msg } })
    this.scrollMessage()
  }

  async load () {
    let res

    res = await axios.get(`${this.state.api}/topics`)
    let topics = res.data.result

    res = await axios.get(`${this.state.api}/friends`)
    let friends = res.data.result

    res = await axios.get(`${this.state.api}/me`)
    let me = res.data.result

    res = await axios.get(`${this.state.api}/profile`)
    let profile = res.data.result
    console.log(profile)

    this.setState({ topics, friends, me, username: profile.name }, this.connect)
  }

  async connect () {
    if (this.socket) this.socket.close()
    let hub = HUBS[this.state.hubID]

    await axios.post(`${hub}/join`, { public_key: this.state.me.key })

    let socket = socketIOClient(hub)
    this.socket = socket
    this.socket.on('update', (msgs) => {
      console.log(msgs)

      let messages = {}
      for (let i = 0; i < msgs.length; i++) {
        let m = msgs[i]
        if (!messages[m.topic]) messages[m.topic] = []
        messages[m.topic].push(m)
      }

      this.setState({ messages })
      this.scrollMessage()
    })

    this.socket.on('event', console.log)
  }

  changeTopic (topic) {
    return () => {
      this.setState({ currentTopic: topic })
    }
  }

  handleAPIChange (e) {
    this.setState({ apiInput: e.target.value })
  }

  handleModeration (topic, id) {
    return async () => {
      console.log('mod', topic, id)
      let ret = await axios.post(`${this.state.api}/topics/${topic}/moderation`, { data: { id, action: 'delete' } })
      console.log(ret.data)
    }
  }

  handleAPIInputKeyPress (e) {
    if (e.key === 'Enter') {
      this.setState({ api: this.state.apiInput }, async () => {
        await this.load()
        await this.connect()
      })

      e.target.value = ''
    }
  }

  setHub (id) {
    return () => {
      this.setState({ hubID: id }, () => {
        this.connect()
      })
    }
  }

  render () {
    return (
      <div className='w-screen h-screen app' >
        <div className='hubs bg-gray-500 pt-2'>
          {HUBS.map((h, i) => {
            return <div
              className={`rounded-full bg-gray-700 flex justify-center items-center text-white text-xl mt-2 border-box border-white ${this.state.hubID === i ? 'border-4' : ''}`}
              style={{ width: '50px', height: '50px', marginLeft: '3px' }}
              key={i}
              onClick={this.setHub(i).bind(this)}
            >
              {i}
            </div>
          })}
        </div>
        <div className='sidebar bg-gray-200' >
          <div className='flex flex-col justify-between h-full'>
            <div className='overflow-y-auto p-2'>
              <div className='mb-4'>
                <h2>P.me</h2>
                <input className='p-1 border border-gray-500 rounded font-mono text-xs w-full bg-gray-200' value={this.state.apiInput} onChange={this.handleAPIChange.bind(this)} onKeyPress={this.handleAPIInputKeyPress.bind(this)} />
              </div>
              <div className='flex flex-row justify-between'>
                <h2>Topics</h2>
                <h2 className='cursor-pointer mr-1 text-gray-600'>+</h2>
              </div>
              <ul>
                {this.state.topics.map(t => {
                  if (t === this.state.currentTopic) {
                    return <li onClick={this.changeTopic(t).bind(this)} key={t} className='rounded bg-gray-400 cursor-pointer'>#{t}</li>
                  } else {
                    return <li onClick={this.changeTopic(t).bind(this)} key={t} className='cursor-pointer'>#{t}</li>
                  }
                })}
              </ul>
              <div className='mt-4'>
                <h2>Friends</h2>
                <ul>
                  {this.state.friends.map(f => <li key={f.id}>{f.name}</li>)}
                </ul>
                <span className='text-gray-700 underline cursor-pointer'>add new friend</span>
              </div>
            </div>
            <div className='bg-gray-100 h-20 flex flex-col justify-around px-2'>
              <h2 onClick={this.updateProfile.bind(this)}>@{this.state.username.slice(0, 16)}</h2>
              <input className='bg-gray-400 px-1 border border-gray-500 w-full' value={this.state.me.key} readOnly />
            </div>
          </div>

        </div>
        <div className='message bg-red overflow-y-auto px-2' >
          <ul className='min-h-full flex flex-col justify-end'>
            {this.state.messages[this.state.currentTopic] ? this.state.messages[this.state.currentTopic].map(m => {
              return <li
                key={m.id}
                className='flex flex-col'>
                <div className='flex flex-row justify-between'>
                  <span><span className='font-bold'>{m.author ? m.author.substring(0, 8) : ''}...</span>: {m.message}</span>
                  <span className='text-gray-500 hover:text-black cursor-pointer' onClick={this.handleModeration(m.topic, m.id).bind(this)}>...</span>
                </div>
                <div className='my-1'>
                  {m.reactions && m.reactions.length > 0 ? m.reactions.map(r => <span className='text-sm py-1 px-2 mx-1 bg-gray-200 rounded-lg w-auto' key={r.id}>{r.react}</span>) : '' }
                </div>
              </li>
            }) : ''}
          </ul>
          <div id='end' ref={this.messageEndRef} />
        </div>
        <div className='prompt bg-blue'>
          <input onKeyPress={this.onKeyPress.bind(this)} type='text' placeholder='say something...' className='border border-grey-100 w-full h-full p-2 rounded border-box' />
        </div>
      </div>
    )
  }
}

export default Chat
