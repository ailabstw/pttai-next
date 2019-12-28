import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import axios from 'axios'
import socketIOClient from 'socket.io-client'
import 'emoji-mart/css/emoji-mart.css'
import { Picker as EmojiPicker } from 'emoji-mart'
import { Redirect, Link } from 'react-router-dom'
import { ReactTitle } from 'react-meta-tags'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import uuid from 'uuid/v4'

import Div100vh from 'react-div-100vh'

import Messages from './Messages'
import FormDialog from './Modal/FormDialog'
import AlertDialog from './Modal/AlertDialog'
import ConfirmDialog from './Modal/ConfirmDialog'

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
      username: '',
      usernameInEdit: '',
      usernameEditMode: false,
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
      messageListScrolled: false,
      messageInEditKey: null,
      openCreateChannelModal: false,
      openAlertModal: false,
      openConfirmModal: false,
      alertMessage: '',
      confirmMessage: '',
      confirmData: {},
    }

    this.messageEndRef = React.createRef()
    this.emojiPickerRef = React.createRef()
    this.usernameInputRef = React.createRef()
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

  componentDidUpdate (prevProps, prevState) {
    if (this.usernameInputRef.current && this.usernameInputRef.current.getElementsByTagName('input')) {
      this.usernameInputRef.current.getElementsByTagName('input')[0].focus()
    }
  }

  componentWillUnmount () {
    document.removeEventListener('mousedown', this.onClickOutSideEmojiPicker.bind(this))
    document.removeEventListener('touchstart', this.onClickOutSideEmojiPicker.bind(this))
  }

  async updateProfile () {
    this.setState({ usernameEditMode: true, usernameInEdit: this.state.username })
  }

  async updateUserName () {
    if (this.state.usernameInEdit) {
      await this.req('post', '/profile', { name: this.state.usernameInEdit })
    }
    this.setState({ usernameEditMode: false, username: this.state.usernameInEdit })
  }

  onKeyPress (e) {
    if (e.key === 'Enter' && e.target.value.length > 0) {
      this.postToTopic({ message: { type: 'text', value: e.target.value } })

      e.target.value = ''
    }
  }

  onClickOutSideEmojiPicker (e) {
    if (this.state.usernameEditMode && !ReactDOM.findDOMNode(ReactDOM.findDOMNode(this.usernameInputRef.current)).contains(e.target)) {
      this.setState({ usernameEditMode: false })
    }

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

  isPublicChannel () {
    return this.state.currentTopic[0] === '#'
  }

  getReceiverKey (channelID) {
    const keys = channelID.split('-')
    if (keys[0] === this.state.me.key) {
      return keys[1]
    }
    return keys[0]
  }

  async postToTopic (data) {
    if (this.isPublicChannel()) {
      const topic = this.state.currentTopic.slice(1)
      data.id = Date.now()
      await this.req('post', `/topics/${topic}`, data)
    } else {
      await this.req('post', '/dm', { message: data.message, receiver: this.getReceiverKey(this.state.currentTopic) })
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
        const key = this.getReceiverKey(channelID)
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

  async createTopic ({ name:topic }) {
    if (topic) {
      if (topic.match(/[\w-]+/) && topic.length <= 20) {
        await this.req('post', '/topics', topic)
        if (topic[0] !== '#') topic = `#${topic}`
        this.setState({ currentTopic: topic }, () => {
          this.postToTopic({ message: { type: 'action', value: 'joined the topic' } })
          this.setState({ openCreateChannelModal: false })
        })
      } else {
        this.setState({
          openCreateChannelModal: false,
          openAlertModal: true,
          alertMessage: 'invalid topic name',
        })
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
    this.setState({ openConfirmModal: true, confirmMessage: 'delete message?', confirmData: { event: event, props:props }})
  }

  async onConfirmMessageDelete({ event, props }) {
    console.log('mod', props)
    try {
      const ret = await this.req('delete', `/topics/${props.topic}/${props.id}`)
      console.log(ret.data)
      this.setState({ openConfirmModal: false, confirmMessage: '', confirmData: {} })
    } catch (e) {
      this.setState({
        openConfirmModal: false,
        confirmMessage: '',
        confirmData: {},
        openAlertModal: true,
        alertMessage: '刪除失敗',
      })
    }
  }

  async handleUpdate ({ event, props, type, data }) {
    switch (type) {
      case 'edit':
        this.setState({ messageInEditKey: props.id })
        break
      case 'cancel':
        this.setState({ messageInEditKey: null })
        break
      case 'confirm':
        if (data) {
          console.log('mod', data)
          try {
            const ret = await this.req('put', `/topics/${props.topic}/${props.id}`, { id: props.id, message: { type: 'text', value: data } })
            console.log(ret.data)
            this.setState({ messageInEditKey: null })
          } catch (e) {
            this.setState({
              messageInEditKey: null,
              openAlertModal: true,
              alertMessage: '編輯失敗',
            })
          }
        }
        break
      default:
        console.log('this wont be reached')
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

    if (this.isPublicChannel()) {
      const ret = await this.req('post', `/topics/${props.topic}/reactions`, { id: Date.now(), react: emoji.native, msgID: props.id })
      console.log(ret.data)
    } else {
      const ret = await this.req('post', '/dm', {
        message: {
          type: 'react',
          value: {
            id: Date.now(),
            react: emoji.native,
            msgID: props.id
          }
        },
        receiver: this.getReceiverKey(this.state.currentTopic)
      })
      console.log(ret.data)
    }
  }

  async onAddReaction (react, message) {
    if (this.isPublicChannel()) {
      await this.req('post', `/topics/${message.topic}/reactions`, { id: Date.now(), react: react, msgID: message.id })
    } else {
      await this.req('post', '/dm', {
        message: {
          type: 'react',
          value: {
            id: Date.now(),
            react: react,
            msgID: message.id
          }
        },
        receiver: this.getReceiverKey(this.state.currentTopic)
      })
    }
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

  onUserNameChange (e) {
    this.setState({ usernameInEdit: e.target.value })
  }

  render () {
    let messages = []
    let currentActiveDM

    console.log(this.state.currentTopic, this.state.dmChannels)
    if (this.state.messages[this.state.currentTopic]) {
      messages = this.state.messages[this.state.currentTopic]
    } else {
      messages = this.state.dmChannels[this.state.currentTopic]
      currentActiveDM = this.getReceiverKey(this.state.currentTopic)
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
            ? <EmojiPicker ref={this.emojiPickerRef} style={{ zIndex: 20, right: 10, bottom: this.state.emojiPickerBottom, position: 'absolute' }} onClick={this.handleSelectEmoji.bind(this)} />
            : ''}
          <div className='header shadow-lg bg-gray-200 sm:hidden w-full h-full flex flex-row items-center justify-between px-2'>
            <FontAwesomeIcon icon='bars' size='lg' onClick={this.onClickHeaderMenu.bind(this)} />

            <span className='font-bold'>{header}</span>
            <FontAwesomeIcon icon='bars' size='lg' className='invisible' />{/* just for alignment */}
          </div>
          <div className={`z-10 sidebar bg-side-bar-color ${this.state.mobileShowSidebar ? '' : 'hidden'} sm:block shadow-lg sm:shadow-none`} ref={this.sideBarRef}>
            <div className='flex flex-col justify-between h-full'>
              <div className='overflow-y-auto p-0'>
                <div className='flex flex-row items-start p-3'>
                  <div className='w-10 flex-shrink-0 ml-0'>
                    <img className='w-10' src='/icon_company.svg' alt='Company Icon'></img>
                  </div>
                  <div className='flex-shrink pl-3 mt-0'>
                    <div className='text-base text-font-color font-bold'>台灣人工智慧實驗室</div>
                    {
                      this.state.usernameEditMode
                        ? <div className='text-sm text-font-color flex flex-row mt-1' ref={this.usernameInputRef}>
                            <input className='min-w-0 my-atuo px-1 h-7 rounded focus:outline-none' onChange={this.onUserNameChange.bind(this)} value={this.state.usernameInEdit}/>
                            <img id='icon_done' className='w-7 ml-auto cursor-pointer' src='/icon_done.svg' alt='Confirm Username'
                              onClick={this.updateUserName.bind(this)}
                              onMouseOver={(e) => e.target.src = '/icon_done_hover.svg'}
                              onMouseOut={(e) => e.target.src = '/icon_done.svg'}/>
                          </div>
                        : <div className='h-7 leading-loose text-sm text-font-color cursor-pointer hover:underline'
                            onClick={(e) => {this.setState({ usernameEditMode: true, usernameInEdit: this.state.username })}}>
                              {this.state.username.slice(0, 16)}
                          </div>
                    }
                  </div>
                </div>
                <div className='pt-2'>
                  <div className='p-3 flex flex-row justify-between'>
                    <div className='leading-loose text-font-color font-bold'>Channels</div>
                    <div className='cursor-pointer'>
                      <img id='icon_add' className="w-7" src="/icon_add.svg" alt="Add new channel"
                           onMouseOver={(e) => e.target.src = '/icon_add_hover.svg'}
                           onMouseOut={(e) => e.target.src = '/icon_add.svg'}
                           onMouseDown={(e) => e.target.value = '/icon_add_pressed.svg'}
                           onClick={(e) => this.setState({ openCreateChannelModal: true }) }/>
                    </div>
                  </div>
                  <ul>
                    {Object.keys(this.state.messages).sort().map(t => {
                      let textStyle = 'text-font-color'
                      if (unread[t]) textStyle = `text-black font-bold`
                      if (t === this.state.currentTopic) {
                        return <li onClick={this.changeTopic(`${t}`).bind(this)} key={t} className={`p-3 py-1 rounded bg-side-bar-color-active cursor-pointer ${textStyle}`}>{'# ' + t.substring(t.indexOf('#') + 1)}</li>
                      } else if (!t.startsWith('__')) {
                        return <li onClick={this.changeTopic(`${t}`).bind(this)} key={t} className={`p-3 py-1 cursor-pointer ${textStyle}`}>{'# ' + t.substring(t.indexOf('#') + 1)}</li>
                      }
                      return ''
                    })}
                  </ul>
                </div>
                <div className='pt-2 mb-40'>
                  <div className='flex flex-row justify-between'>
                    <div className='p-3 leading-loose text-font-color font-bold'>Friends</div>
                      {/* <h2 className='cursor-pointer mr-1 text-gray-600' onClick={this.newFriend.bind(this)}>+</h2> */}
                  </div>
                  <ul>
                    {this.state.friends.map(f => {
                        const id = f.key || f.id
                      let c = ''
                      let avatarSrc = '/icon_avatar.svg'
                      if (currentActiveDM === id) {
                        c = 'bg-side-bar-color-active rounded'
                        avatarSrc = '/icon_avatar_pressed.svg'
                      }
                      let name = id
                      let textStyle = 'text-font-color'
                      const channelID = [id, this.state.me.key].sort().join('-')
                      if (unread[channelID]) textStyle = `text-black font-bold`
                      if (this.state.profiles[id]) name = this.state.profiles[id].name
                      if (name.length > 12) name = name.slice(0, 12) + '...'
                      return <li
                        className={`p-3 py-1 flex flex-row cursor-pointer ${textStyle} ${c}`}
                        key={id}
                        onClick={this.changeTopic(channelID).bind(this)}>
                          <img className="w-8 h-8 mr-2" src={avatarSrc} alt="Avatar"></img>
                          <div className='leading-loose text-font-color'>{name}</div>
                      </li>
                    })}
                  </ul>
                </div>
              </div>
              <div className='hidden bg-gray-100 h-20 flex flex-col justify-around px-2'>
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
          <div className='message bg-red overflow-y-auto' onScroll={this.onScrollMessage.bind(this)} ref={this.messagesRef}>
            {messages
              ? <Messages
                profiles={this.state.profiles}
                messages={messages}
                myKey={this.state.me.key}
                onAddReaction={this.onAddReaction.bind(this)}
                onNewFriend={this._newFriend.bind(this)}
                showScrollButton={this.state.messageListScrolled}
                onClickScrollButton={this.onClickMessageListScrollButton.bind(this)}
                isPublicChannel={this.isPublicChannel()}
                onMessageReactClicked={this.handleAddReaction.bind(this)}
                onMessageEditClicked={this.handleUpdate.bind(this)}
                onMessageDeleteClicked={this.handleDelete.bind(this)}
                messageInEditKey={this.state.messageInEditKey}
              /> : ''}
            <div id='end' ref={this.messageEndRef} />
          </div>
          <div className='p-4 prompt bg-blue'>
            <textarea onKeyPress={this.onKeyPress.bind(this)} placeholder='say something...' className='border border-dialogue-color-normal focus:border-dialogue-color-pressed w-full h-full p-4 rounded border-box outline-none resize-none' ref={this.inputRef}></textarea>
          </div>
        </div>
        <FormDialog
          open={this.state.openCreateChannelModal}
          handleClose={(e) => this.setState({ openCreateChannelModal: false })}
          handleSubmit={this.createTopic.bind(this)}
        />
        <AlertDialog
          open={this.state.openAlertModal}
          message={this.state.alertMessage}
          handleClose={(e) => this.setState({ openAlertModal: false })}
        />
        <ConfirmDialog
          open={this.state.openConfirmModal}
          message={this.state.confirmMessage}
          data={this.state.confirmData}
          handleClose={(e) => this.setState({ openConfirmModal: false })}
          handleConfirm={this.onConfirmMessageDelete.bind(this)}
        />
      </Div100vh>
    )
  }
}

export default Chat
