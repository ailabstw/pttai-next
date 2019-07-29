import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import axios from 'axios'
import socketIOClient from 'socket.io-client'
import 'emoji-mart/css/emoji-mart.css'
import { Picker as EmojiPicker } from 'emoji-mart'
import { Redirect } from 'react-router-dom'

import { Menu, Item } from 'react-contexify'
import Messages from './Messages'
import 'react-contexify/dist/ReactContexify.min.css'

const HUBS = [
  process.env.REACT_APP_HUB_URL
]

class Chat extends Component {
  constructor () {
    super()
    this.state = {
      currentTopic: '#general',
      friends: [],
      me: { key: '' },
      messages: {},
      dmChannels: {},
      hubID: 0,
      api: process.env.REACT_APP_GATEWAY_URL,
      username: 'username',
      showEmojiPicker: false,
      emojiPickerBottom: 0,
      emojiPickerData: null,
      profiles: {},
      token: window.localStorage.getItem('token')
    }

    this.messageEndRef = React.createRef()
    this.emojiPickerRef = React.createRef()
    this.inputRef = React.createRef()
  }

  async req (method, url, data) {
    return axios({
      method,
      url: `${this.state.api}${url}`,
      params: { token: this.state.token },
      data: { data }
    })
  }

  componentDidMount () {
    this.load()
    document.addEventListener('mousedown', this.onClickOutSideEmojiPicker.bind(this))
    if (this.inputRef) {
      this.inputRef.current.focus()
    }
  }

  componentWillUnmount () {
    document.removeEventListener('mousedown', this.onClickOutSideEmojiPicker.bind(this))
  }

  async updateProfile () {
    let name = window.prompt('Enter new name')

    if (name) {
      await this.req('post', '/profile', { name })

      this.setState({ username: name })
    }
  }

  onKeyPress (e) {
    if (e.key === 'Enter' && e.target.value.length > 0) {
      this.postToTopic({ message: { type: 'text', value: e.target.value } })

      e.target.value = ''
    }
  }

  onClickOutSideEmojiPicker (e) {
    if (this.emojiPickerRef.current && !ReactDOM.findDOMNode(ReactDOM.findDOMNode(this.emojiPickerRef.current)).contains(e.target)) {
      this.setState({ showEmojiPicker: false })
    }
  }

  scrollMessage () {
    if (this.messageEndRef.current) {
      this.messageEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  async postToTopic (data) {
    if (this.state.currentTopic[0] === '#') {
    // to channel
      let topic = this.state.currentTopic.slice(1)
      data.id = Date.now()
      await this.req('post', `/topics/${topic}`, data)
    } else {
      // dm
      let keys = this.state.currentTopic.split('-')
      let key
      if (keys[0] === this.state.me.key) {
        key = keys[1]
      } else {
        key = keys[0]
      }
      await this.req('post', '/dm', { message: data.message, receiver: key })
    }
    this.scrollMessage()
  }

  async load () {
    let res

    res = await this.req('get', `/friends`)
    let friends = res.data.result

    res = await this.req('get', `/me`)
    let me = res.data.result

    res = await this.req('get', `/profile`)
    let profile = res.data.result

    this.setState({ friends, me, username: profile.name }, this.connect)
  }

  async connect () {
    if (this.hubSocket) this.hubSocket.close()
    let hub = HUBS[this.state.hubID]

    await axios.post(`${hub}/join`, { public_key: this.state.me.key })

    let socket = socketIOClient(hub, { path: process.env.REACT_APP_HUB_PATH })
    this.hubSocket = socket
    this.hubSocket.on('update', (msgs) => {
      console.log('hub update', msgs)

      let messages = {}
      for (let i = 0; i < msgs.length; i++) {
        let m = msgs[i]
        let topic = `#${m.topic}`
        if (!messages[topic]) messages[topic] = []
        messages[topic].push(m)
      }

      this.setState({ messages })
      this.scrollMessage()
    })
    this.hubSocket.on('profiles', (profiles) => {
      console.log('profiles', profiles)
      this.setState({ profiles })
    })

    this.hubSocket.on('event', console.log)
    this.hubSocket.on('error', console.error)

    let gatewaySocket = socketIOClient(this.state.api, { path: process.env.REACT_APP_GATEWAY_PATH, forceNew: true })
    this.gatewaySocket = gatewaySocket
    this.gatewaySocket.on('hello', () => {
      this.gatewaySocket.emit('register', this.state.token)
    })

    this.gatewaySocket.on('dm', (dmChannels) => {
      console.log('dm', dmChannels)
      this.setState({ dmChannels })
      for (let channelID in dmChannels) {
        let keys = channelID.split('-')
        let key
        if (keys[0] === this.state.me.key) {
          key = keys[1]
        } else {
          key = keys[0]
        }
        if (this.state.friends.findIndex(x => x.id === key) === -1) {
          this.setState({ friends: this.state.friends.concat([{ id: key }]) })
        }
      }
    })
    this.gatewaySocket.on('error', console.error)
  }

  async createTopic () {
    let topic = window.prompt('enter a new topic')
    if (topic && topic.match(/[\w-]+/)) {
      await this.req('post', '/topics', topic)
      if (topic[0] !== '#') topic = `#${topic}`
      this.setState({ currentTopic: topic }, () => {
        this.postToTopic({ message: { type: 'text', value: 'joined the channel' } })
      })
    } else {
      window.alert('failed to create topic')
    }
  }

  async newFriend () {
    let id = window.prompt('friend\'s ID')
    if (id) {
      await this.req('post', '/friends', { id })
      await this.req('post', '/dm', { message: { type: 'text', value: 'hello new friend' }, receiver: id })
      let res = await this.req('get', `/friends`)
      let friends = res.data.result
      this.setState({ friends })
    }
  }

  changeTopic (topic) {
    return () => {
      this.setState({ currentTopic: topic }, () => {
        this.scrollMessage()
      })
    }
  }

  async handleModeration ({ event, props }) {
    let ok = window.confirm('hide the message?')

    if (ok) {
      console.log('mod', props)
      let ret = await this.req('post', `/topics/${props.topic}/moderation`, { id: props.id, action: 'delete' })
      console.log(ret.data)
    }
  }

  handleAddReaction ({ event, props }) {
    this.setState({ emojiPickerData: props, emojiPickerBottom: document.documentElement.clientHeight - event.clientY - 100, showEmojiPicker: true })
  }

  async handleSelectEmoji (emoji, e) {
    this.setState({ showEmojiPicker: false })
    let props = this.state.emojiPickerData
    let ret = await this.req('post', `/topics/${props.topic}/reactions`, { id: Date.now(), react: emoji.native, msgID: props.id })
    console.log(ret.data)
  }

  setHub (id) {
    return () => {
      this.setState({ hubID: id }, () => {
        this.connect()
      })
    }
  }

  render () {
    let messages = []
    let currentActiveDM

    console.log(this.state.currentTopic, this.state.dmChannels)
    if (this.state.messages[this.state.currentTopic]) {
      messages = this.state.messages[this.state.currentTopic]
    } else {
      messages = this.state.dmChannels[this.state.currentTopic]
      let keys = this.state.currentTopic.split('-')
      if (keys[0] === this.state.me.key) {
        currentActiveDM = keys[1]
      } else {
        currentActiveDM = keys[0]
      }
    }

    if (!this.state.token) {
      return <Redirect to={{ path: '/' }} />
    }

    return (
      <div className='w-screen h-screen app'>
        {this.state.showEmojiPicker
          ? <EmojiPicker ref={this.emojiPickerRef} style={{ right: 0, bottom: this.state.emojiPickerBottom, position: 'absolute' }} onClick={this.handleSelectEmoji.bind(this)} />
          : ''}
        <Menu id='menu_id'>
          <Item onClick={this.handleAddReaction.bind(this)}>React...</Item>
          <Item onClick={this.handleModeration.bind(this)}>Hide</Item>
        </Menu>
        <div className='sidebar bg-gray-200' >
          <div className='flex flex-col justify-between h-full'>
            <div className='overflow-y-auto p-2'>
              <div className='mb-4'>
                <h2 className='font-bold'>P.me</h2>
                <input className='p-1 border border-gray-500 rounded font-mono text-xs w-full bg-gray-200' value={process.env.REACT_APP_GATEWAY_URL} readOnly />
              </div>
              <div className='flex flex-row justify-between'>
                <h2 className='font-bold'>Topics</h2>
                <h2 className='cursor-pointer mr-1 text-gray-600' onClick={this.createTopic.bind(this)}>+</h2>
              </div>
              <ul>
                {Object.keys(this.state.messages).sort().map(t => {
                  if (t === this.state.currentTopic) {
                    return <li onClick={this.changeTopic(`${t}`).bind(this)} key={t} className='rounded bg-gray-400 cursor-pointer'>{t}</li>
                  } else if (!t.startsWith('__')) {
                    return <li onClick={this.changeTopic(`${t}`).bind(this)} key={t} className='cursor-pointer'>{t}</li>
                  }
                  return ''
                })}
              </ul>
              <div className='mt-4'>
                <div className='flex flex-row justify-between'>
                  <h2 className='font-bold'>Friends</h2>
                  <h2 className='cursor-pointer mr-1 text-gray-600' onClick={this.newFriend.bind(this)}>+</h2>
                </div>
                <ul>
                  {this.state.friends.map(f => {
                    let c = ''
                    if (currentActiveDM === f.id) {
                      c = 'bg-gray-400 rounded'
                    }
                    let name = f.id
                    if (this.state.profiles[f.id]) name = this.state.profiles[f.id].name
                    if (name.length > 12) name = name.slice(0, 12) + '...'
                    return <li
                      className={`cursor-pointer ${c}`}
                      key={f.id}
                      onClick={this.changeTopic([f.id, this.state.me.key].sort().join('-')).bind(this)}>
                         @{name}
                    </li>
                  })}
                </ul>
              </div>
            </div>
            <div className='bg-gray-100 h-20 flex flex-col justify-around px-2'>
              <div className='flex flex-row justify-between items-center'>
                <h2>@{this.state.username.slice(0, 16)}</h2>
                <h2 className='cursor-pointer mr-1 text-gray-600' onClick={this.updateProfile.bind(this)}>✎</h2>
              </div>
              <input className='bg-gray-400 px-1 border border-gray-500 w-full' value={this.state.me.key} readOnly />
            </div>
          </div>

        </div>
        <div className='message bg-red overflow-y-auto px-2' >
          {messages ? <Messages profiles={this.state.profiles} messages={messages} myKey={this.state.me.key} /> : ''}
          <div id='end' ref={this.messageEndRef} />
        </div>
        <div className='prompt bg-blue'>
          <input onKeyPress={this.onKeyPress.bind(this)} type='text' placeholder='say something...' className='focus:border-gray-900 border border-gray-400 w-full h-full p-2 rounded border-box outline-none' ref={this.inputRef} />
        </div>
      </div>
    )
  }
}

export default Chat
