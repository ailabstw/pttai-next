import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import axios from 'axios'
import socketIOClient from 'socket.io-client'
import 'emoji-mart/css/emoji-mart.css'
import { Picker as EmojiPicker } from 'emoji-mart'
import { Redirect, Link } from 'react-router-dom'
import { Menu, Item, Separator } from 'react-contexify'
import { ReactTitle } from 'react-meta-tags'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import uuid from 'uuid/v4'

import Div100vh from 'react-div-100vh'

import Messages from './Messages'
import 'react-contexify/dist/ReactContexify.min.css'

const HUBS = [
  process.env.REACT_APP_HUB_URL
]

class Chat extends Component {
  constructor () {
    super()
    this.state = {
      currentTopic: window.localStorage.getItem('currentTopic') || '#general',
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
      token: window.localStorage.getItem('token').trim(),
      lastReadTime: JSON.parse(window.localStorage.getItem('lastReadTime') || '{}'),
      lastMessageTime: {},
      disconnected: false,
      mobileShowSidebar: false,
      loadFailed: false,
      messageListScrolled: false
    }

    this.messageEndRef = React.createRef()
    this.emojiPickerRef = React.createRef()
    this.inputRef = React.createRef()
    this.sideBarRef = React.createRef()
    this.messagesRef = React.createRef()
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
    document.addEventListener('touchstart', this.onClickOutSideEmojiPicker.bind(this))
    if (this.inputRef.current) {
      this.inputRef.current.focus()
    }
  }

  componentWillUnmount () {
    document.removeEventListener('mousedown', this.onClickOutSideEmojiPicker.bind(this))
    document.removeEventListener('touchstart', this.onClickOutSideEmojiPicker.bind(this))
  }

  async updateProfile () {
    const name = window.prompt('Enter new name')

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

    if (this.state.mobileShowSidebar) {
      if (this.sideBarRef.current && !ReactDOM.findDOMNode(ReactDOM.findDOMNode(this.sideBarRef.current)).contains(e.target)) {
        this.setState({ mobileShowSidebar: false })
      }
    }
  }

  scrollMessage (force) {
    if (this.messageEndRef.current) {
      if (force) {
        this.messageEndRef.current.scrollIntoView()
      } else if (!this.state.messageListScrolled) {
        this.messageEndRef.current.scrollIntoView()
      }
    }
  }

  async postToTopic (data) {
    if (this.state.currentTopic[0] === '#') {
    // to channel
      const topic = this.state.currentTopic.slice(1)
      data.id = Date.now()
      await this.req('post', `/topics/${topic}`, data)
    } else {
      // dm
      const keys = this.state.currentTopic.split('-')
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

    try {
      res = await this.req('get', `/friends`)
      const friends = res.data.result

      res = await this.req('get', `/me`)
      const me = res.data.result

      res = await this.req('get', `/profile`)
      const profile = res.data.result

      this.setState({ friends, me, username: profile.name }, this.connect)
    } catch (e) {
      this.setState({ loadFailed: true })
    }
  }

  async connect () {
    if (this.hubSocket) this.hubSocket.close()
    const hub = HUBS[this.state.hubID]

    await axios.request({
      method: 'POST',
      url: `${hub}/join`,
      data: { public_key: this.state.me.key },
      params: { token: this.state.token }
    })
    // await axios.post(`${hub}/join`, { public_key: this.state.me.key })

    const socket = socketIOClient(
      hub,
      {
        path: process.env.REACT_APP_HUB_PATH,
        query: { token: this.state.token }
      })
    this.hubSocket = socket
    this.hubSocket.on('update', (msgs) => {
      console.log('hub update', msgs)

      const messages = {}
      const lastMessageTime = Object.assign({}, this.state.lastMessageTime)
      const lastReadTime = Object.assign({}, this.state.lastReadTime)
      for (let i = 0; i < msgs.length; i++) {
        const m = msgs[i]
        const topic = `#${m.topic}`
        if (!messages[topic]) messages[topic] = []
        messages[topic].push(m)

        if (!lastMessageTime[topic]) {
          lastMessageTime[topic] = m.date
        } else if (lastMessageTime[topic] < m.date) {
          lastMessageTime[topic] = m.date
        }

        if (!lastReadTime[topic]) lastReadTime[topic] = Date.now()
      }

      // current topic is always read
      lastReadTime[this.state.currentTopic] = Date.now()

      window.localStorage.setItem('lastReadTime', JSON.stringify(lastReadTime))
      this.setState({ messages, lastMessageTime, lastReadTime }, () => {
        window.setTimeout(() => {
          this.scrollMessage()
        }, 100)
      })
    })
    this.hubSocket.on('profiles', (profiles) => {
      console.log('profiles', profiles)
      this.setState({ profiles })
    })
    this.hubSocket.on('disconnect', (reason) => {
      this.setState({ disconnected: true })
    })
    this.hubSocket.on('reconnect', (reason) => {
      this.setState({ disconnected: false })
    })

    this.hubSocket.on('event', console.log)
    this.hubSocket.on('error', console.error)

    const gatewaySocket = socketIOClient(
      this.state.api,
      {
        path: process.env.REACT_APP_GATEWAY_PATH,
        forceNew: true,
        query: { token: this.state.token }
      })
    this.gatewaySocket = gatewaySocket
    this.gatewaySocket.on('disconnect', (reason) => {
      this.setState({ disconnected: true })
    })
    this.gatewaySocket.on('reconnect', (reason) => {
      this.setState({ disconnected: false })
    })

    this.gatewaySocket.on('dm', (dmChannels) => {
      console.log('dm', dmChannels)
      this.setState({ dmChannels })
      const lastMessageTime = Object.assign({}, this.state.lastMessageTime)
      const lastReadTime = Object.assign({}, this.state.lastReadTime)
      for (const channelID in dmChannels) {
        const keys = channelID.split('-')
        let key
        if (keys[0] === this.state.me.key) {
          key = keys[1]
        } else {
          key = keys[0]
        }
        if (this.state.friends.findIndex(f => (f.key || f.id) === key) === -1) {
          this.setState({ friends: this.state.friends.concat([{ id: key }]) })
        }
        if (!lastReadTime[channelID]) lastReadTime[channelID] = Date.now()

        for (const dm of dmChannels[channelID]) {
          const m = dm.message
          if (!lastMessageTime[channelID]) {
            lastMessageTime[channelID] = m.date
          } else if (lastMessageTime[channelID] < m.date) {
            lastMessageTime[channelID] = m.date
          }
        }
      }
      // current topic is always read
      lastReadTime[this.state.currentTopic] = Date.now()

      this.setState({ lastMessageTime, lastReadTime })
      window.localStorage.setItem('lastReadTime', JSON.stringify(lastReadTime))
    })
    this.gatewaySocket.on('error', console.error)
  }

  async createTopic () {
    let topic = window.prompt('enter a new topic (english only)')
    if (topic) {
      if (topic.match(/[\w-]+/) && topic.length <= 20) {
        await this.req('post', '/topics', topic)
        if (topic[0] !== '#') topic = `#${topic}`
        this.setState({ currentTopic: topic }, () => {
          this.postToTopic({ message: { type: 'action', value: 'joined the topic' } })
        })
      } else {
        window.alert('invalid topic name')
      }
    }
  }

  async newFriend () {
    const id = window.prompt('friend\'s ID')
    if (id) {
      await this._newFriend(id)
    }
  }

  async _newFriend (key) {
    if (this.state.me.key === key) return
    if (this.state.friends.find(f => f.id === key)) {
      return this.changeTopic([key, this.state.me.key].sort().join('-'))()
    }
    await this.req('post', '/friends', { id: uuid(), key })
    await this.req('post', '/dm', { message: { type: 'action', value: 'started the conversation' }, receiver: key })
    const res = await this.req('get', `/friends`)
    const friends = res.data.result
    this.setState({ friends }, () => {
      this.changeTopic([key, this.state.me.key].sort().join('-'))()
    })
  }

  changeTopic (topic) {
    return () => {
      const lastReadTime = Object.assign({}, this.state.lastReadTime)
      lastReadTime[topic] = Date.now()
      window.localStorage.setItem('lastReadTime', JSON.stringify(lastReadTime))
      window.localStorage.setItem('currentTopic', topic)
      if (this.inputRef.current) {
        this.inputRef.current.focus()
      }
      this.setState({ currentTopic: topic, lastReadTime, mobileShowSidebar: false }, () => {
        this.scrollMessage()
      })
    }
  }

  async handleModeration ({ event, props }) {
    const ok = window.confirm('hide the message?')

    if (ok) {
      console.log('mod', props)
      const ret = await this.req('post', `/topics/${props.topic}/moderation`, { id: props.id, action: 'delete' })
      console.log(ret.data)
    }
  }

  async handleDelete ({ event, props }) {
    const ok = window.confirm('delete message?')

    if (ok) {
      console.log('mod', props)
      try {
        const ret = await this.req('delete', `/topics/${props.topic}/${props.id}`)
        console.log(ret.data)
      } catch (e) {
        window.alert('刪除失敗')
      }
    }
  }

  async handleUpdate ({ event, props }) {
    const update = window.prompt('編輯訊息', props.message.value)

    if (update) {
      console.log('mod', props)
      try {
        const ret = await this.req('put', `/topics/${props.topic}/${props.id}`, { id: props.id, message: { type: 'text', value: update } })
        console.log(ret.data)
      } catch (e) {
        window.alert('編輯失敗')
      }
    }
  }

  handleAddReaction ({ event, props }) {
    this.setState({ emojiPickerData: props, emojiPickerBottom: document.documentElement.clientHeight - event.clientY - 50, showEmojiPicker: true })
  }

  onClickHeaderMenu () {
    this.setState({ mobileShowSidebar: true })
  }

  async handleSelectEmoji (emoji, e) {
    this.setState({ showEmojiPicker: false })
    const props = this.state.emojiPickerData
    const ret = await this.req('post', `/topics/${props.topic}/reactions`, { id: Date.now(), react: emoji.native, msgID: props.id })
    console.log(ret.data)
  }

  async onAddReaction (react, message) {
    await this.req('post', `/topics/${message.topic}/reactions`, { id: Date.now(), react: react, msgID: message.id })
  }

  setHub (id) {
    return () => {
      this.setState({ hubID: id }, () => {
        this.connect()
      })
    }
  }

  onScrollMessage (e) {
    const scrollDistance = this.messagesRef.current.scrollHeight - (this.messagesRef.current.scrollTop + this.messagesRef.current.clientHeight)

    if (scrollDistance > 50) {
      this.setState({ messageListScrolled: true })
    } else {
      this.setState({ messageListScrolled: false })
    }
  }

  onClickMessageListScrollButton () {
    this.scrollMessage(true)
  }

  render () {
    let messages = []
    let currentActiveDM

    console.log(this.state.currentTopic, this.state.dmChannels)
    if (this.state.messages[this.state.currentTopic]) {
      messages = this.state.messages[this.state.currentTopic]
    } else {
      messages = this.state.dmChannels[this.state.currentTopic]
      const keys = this.state.currentTopic.split('-')
      if (keys[0] === this.state.me.key) {
        currentActiveDM = keys[1]
      } else {
        currentActiveDM = keys[0]
      }
    }

    const unread = {}
    for (const topic in this.state.lastReadTime) {
      if (this.state.lastMessageTime[topic] > this.state.lastReadTime[topic]) {
        unread[topic] = true
      }
    }
    console.log('unread', unread)

    if (!this.state.token || this.state.loadFailed) {
      return <Redirect to={{ path: '/' }} />
    }

    let header = this.state.currentTopic
    if (currentActiveDM) {
      if (this.state.profiles[currentActiveDM]) header = `@${this.state.profiles[currentActiveDM].name}`
    }

    return (
      <Div100vh>
        <div className='w-screen h-full app'>
          {Object.keys(unread).length > 0 ? <ReactTitle title='(*) PTT.ai' /> : <ReactTitle title='PTT.ai' />}
          {this.state.disconnected ? <div className='absolute top-0 left-0 h-8 font-bold bg-red-800 text-gray-300 w-screen flex items-center justify-center z-20'>Disconnected</div> : ''}
          {this.state.showEmojiPicker
            ? <EmojiPicker ref={this.emojiPickerRef} style={{ right: 0, bottom: this.state.emojiPickerBottom, position: 'absolute' }} onClick={this.handleSelectEmoji.bind(this)} />
            : ''}
          <Menu id='menu_id'>
            <Item onClick={this.handleAddReaction.bind(this)}>React...</Item>
            <Item onClick={this.handleUpdate.bind(this)}>Edit...</Item>
            <Separator />
            <Item onClick={this.handleDelete.bind(this)}>Delete</Item>
          </Menu>
          <div className='header shadow-lg bg-gray-200 sm:hidden w-full h-full flex flex-row items-center justify-between px-2'>
            <FontAwesomeIcon icon='bars' size='lg' onClick={this.onClickHeaderMenu.bind(this)} />

            <span className='font-bold'>{header}</span>
            <FontAwesomeIcon icon='bars' size='lg' className='invisible' />{/* just for alignment */}
          </div>
          <div className={`z-10 sidebar bg-gray-200 ${this.state.mobileShowSidebar ? '' : 'hidden'} sm:block shadow-lg sm:shadow-none`} ref={this.sideBarRef}>
            <div className='flex flex-col justify-between h-full'>
              <div className='overflow-y-auto p-2'>
                <div className='mb-4'>
                  <h2 className='font-bold'>P.me</h2>
                  <input className='p-1 border border-gray-500 rounded font-mono text-xs w-full bg-gray-200' value={process.env.REACT_APP_GATEWAY_URL} readOnly />
                </div>
                <div className='flex flex-row justify-between'>
                  <h2>Topics</h2>
                  <h2 className='cursor-pointer mr-1 text-gray-600' onClick={this.createTopic.bind(this)}>+</h2>
                </div>
                <ul>
                  {Object.keys(this.state.messages).sort().map(t => {
                    let textStyle = 'text-gray-600'
                    if (unread[t]) textStyle = `text-black font-bold`
                    if (t === this.state.currentTopic) {
                      return <li onClick={this.changeTopic(`${t}`).bind(this)} key={t} className={`mt-1 rounded bg-gray-400 cursor-pointer ${textStyle}`}>{t}</li>
                    } else if (!t.startsWith('__')) {
                      return <li onClick={this.changeTopic(`${t}`).bind(this)} key={t} className={`mt-1 cursor-pointer ${textStyle}`}>{t}</li>
                    }
                    return ''
                  })}
                </ul>
                <div className='mt-4'>
                  <div className='flex flex-row justify-between'>
                    <h2>Friends</h2>
                    {/* <h2 className='cursor-pointer mr-1 text-gray-600' onClick={this.newFriend.bind(this)}>+</h2> */}
                  </div>
                  <ul>
                    {this.state.friends.map(f => {
                      const id = f.key || f.id

                      let c = ''
                      if (currentActiveDM === id) {
                        c = 'bg-gray-400 rounded'
                      }
                      let name = id
                      let textStyle = 'text-gray-600'
                      const channelID = [id, this.state.me.key].sort().join('-')
                      if (unread[channelID]) textStyle = `text-black font-bold`
                      if (this.state.profiles[id]) name = this.state.profiles[id].name
                      if (name.length > 12) name = name.slice(0, 12) + '...'
                      return <li
                        className={`mt-1 cursor-pointer ${textStyle} ${c}`}
                        key={id}
                        onClick={this.changeTopic(channelID).bind(this)}>
                         @{name}
                      </li>
                    })}
                  </ul>
                </div>
              </div>
              <div className='bg-gray-100 h-20 flex flex-col justify-around px-2'>
                <div className='flex flex-row justify-between items-center'>
                  <Link to={`/QR?q=${encodeURIComponent(`${window.location.origin}/#/?friend=${this.state.me.key}`)}`} target='_blank'>
                    <h2 className='hover:underline'>
                      <FontAwesomeIcon icon='qrcode' className='mr-1 text-gray-500' />
                      @{this.state.username.slice(0, 16)}
                    </h2>
                  </Link>
                  <h2 className='cursor-pointer mr-1 text-gray-600' onClick={this.updateProfile.bind(this)}>✎</h2>
                </div>
                <input className='bg-gray-400 px-1 border border-gray-500 w-full' value={this.state.me.key} readOnly />
              </div>
            </div>

          </div>
          <div className='message bg-red overflow-y-auto px-2' onScroll={this.onScrollMessage.bind(this)} ref={this.messagesRef}>
            {messages
              ? <Messages
                profiles={this.state.profiles}
                messages={messages}
                myKey={this.state.me.key}
                onAddReaction={this.onAddReaction.bind(this)}
                onNewFriend={this._newFriend.bind(this)}
                allowReact={!currentActiveDM}
                showScrollButton={this.state.messageListScrolled}
                onClickScrollButton={this.onClickMessageListScrollButton.bind(this)}
              /> : ''}
            <div id='end' ref={this.messageEndRef} />
          </div>
          <div className='prompt bg-blue'>
            <input onKeyPress={this.onKeyPress.bind(this)} type='text' placeholder='say something...' className='focus:border-gray-900 border border-gray-400 w-full h-full p-2 rounded border-box outline-none' ref={this.inputRef} />
          </div>
        </div>
      </Div100vh>
    )
  }
}

export default Chat
