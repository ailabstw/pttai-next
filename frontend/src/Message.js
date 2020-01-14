import React, { Component } from 'react'
import Reactions from './Reactions'
import Linkify from 'react-linkify'
import nameColors from './name_colors'

import moment from 'moment'

class Message extends Component {
  constructor (props) {
    super()
    this.state = {
      shouldRenderOption: false,
      messageInEdit: props.message.message.value
    }

    this.messageRef = React.createRef()
  }

  componentDidUpdate (prevProps, prevState) {
    if (this.messageRef.current && this.messageRef.current.getElementsByTagName('textarea')) {
      this.messageRef.current.getElementsByTagName('textarea')[0].focus()
    }
  }

  id2color (id) {
    const n = parseInt(id, 16)
    return nameColors[n % nameColors.length]
  }

  onMessageChange (e) {
    this.setState({ messageInEdit: e.target.value })
  }

  onMessageCancelEdit (event, message) {
    this.setState({ messageInEdit: this.props.message.message.value })
    this.props.onMessageEditClicked({ event: event, props: message, type: 'cancel' })
  }

  onMessageConfirmEdit (event, message) {
    this.props.onMessageEditClicked({ event: event, props: message, type: 'confirm', data: this.state.messageInEdit })
  }

  renderMessage (m) {
    if (!m || !m.message) {
      return null
    }

    if (m.message.type === 'text') {
      if (this.props.messageInEditKey === this.props.myKey) {
        return (
          <div className='flex flex-col' ref={this.messageRef}>
            <textarea className='w-full p-2 border border-dialogue-color-normal rounded focus:outline-none resize-y' onChange={this.onMessageChange.bind(this)} value={this.state.messageInEdit} />
            <div className='flex flex-row justify-start my-2'>
              <div className='w-24 h-8 mr-2 rounded text-center leading-loose bg-cancel-btn-color hover:bg-cancel-btn-color-hover text-font-color cursor-pointer' onClick={(e) => this.onMessageCancelEdit(e, m)}>Cancel</div>
              <div className='w-24 h-8 mr-2 rounded text-center leading-loose bg-confirm-btn-color hover:bg-confirm-btn-olor-hover text-white cursor-pointer' onClick={(e) => this.onMessageConfirmEdit(e, m)}>Confirm</div>
            </div>
          </div>
        )
      } else {
        return (
          <Linkify properties={{ target: '_blank', className: 'underline' }}>
            {`${m.message.value}`}
          </Linkify>
        )
      }
    } else if (m.message.type === 'file') {
      if (m.message.value.type.startsWith('image/')) {
        return (
          <div className='flex flex-col my-1'>
            <a className='h-24 w-24' download={m.message.value.name} href={m.message.value.dataUrl} title={m.message.value.name}>
              <img className='h-24 w-24 object-cover rounded cursor-pointer' alt='uploaded file' src={m.message.value.dataUrl} />
            </a>
            <div className='h-full text-xs ml-1'>{m.message.value.name}</div>
          </div>
        )
      } else {
        let iconFile = ''
        if (m.message.value.type.startsWith('video/')) {
          iconFile = './icon_videofile.svg'
        } else if (m.message.value.type === 'application/zip') {
          iconFile = './icon_zipfile.svg'
        } else {
          iconFile = './icon_txtfile.svg'
        }

        return (
          <div className='flex flex-row my-1'>
            <div className='h-10 w-10 p-2 bg-upload-file-color-2 rounded-l cursor-pointer' alt='uploaded file'>
              <a download={m.message.value.name} href={m.message.value.dataUrl} title={m.message.value.name}>
                <img className='h-6 w-6' alt='file icon' src={iconFile} />
              </a>
            </div>
            <div className='h-10 w-auto p-3 bg-upload-file-color-3 text-white text-xs rounded-r cursor-pointer'>
              <a download={m.message.value.name} href={m.message.value.dataUrl} title={m.message.value.name}>
                {m.message.value.name}
              </a>
            </div>
          </div>
        )
      }
    } else if (m.message.type === 'action') {
      return (
        <Linkify properties={{ target: '_blank', className: 'underline' }}>
          {`${m.message.value}`}
        </Linkify>
      )
    }
  }

  render () {
    const m = this.props.message
    let shouldRenderDate = true
    const date = m.date || m.message.date

    if (this.props.lastMessage) {
      const lastMessage = this.props.lastMessage
      if (moment(date).date() === moment(lastMessage.date || lastMessage.message.date).date()) {
        shouldRenderDate = false
      }
    }

    let textStyle = ''
    if (this.props.type === 'action') {
      textStyle = 'italic text-gray-500'
    }

    let authorStyle = ''
    if (this.props.type !== 'action') {
      authorStyle = this.id2color(m.author)
    }

    return <li
      className='message flex flex-col w-full'
      onMouseEnter={(e) => this.setState({ shouldRenderOption: true })}
      onMouseLeave={(e) => this.setState({ shouldRenderOption: false })}>
      {
        shouldRenderDate ? <div className='date-divider my-2' data-content={moment(date).format('dddd, MMMM Do')} /> : ''
      }
      <div className='relative flex flex-row flex-start pt-2 pb-1 hover:bg-message-hover'>
        {
          this.state.shouldRenderOption
            ? <div className='flex flex-row absolute rounded-full bg-white top-minus-1 left-1/2 block shadow p-1'>
              <img className='m-1 w-6 h-6 cursor-pointer' src='/icon_emoji.svg' alt='emoji'
                onMouseEnter={(e) => { e.target.src = '/icon_emoji_pressed.svg' }}
                onMouseLeave={(e) => { e.target.src = '/icon_emoji.svg' }}
                onClick={(e) => this.props.onMessageReactClicked({ event: e, props: m })} />
              {
                this.props.isPublicChannel && this.props.type === 'text'
                  ? <img className='m-1 w-6 h-6 cursor-pointer' src='/icon_edit.svg' alt='edit'
                    onMouseEnter={(e) => { e.target.src = '/icon_edit_pressed.svg' }}
                    onMouseLeave={(e) => { e.target.src = '/icon_edit.svg' }}
                    onClick={(e) => this.props.onMessageEditClicked({ event: e, props: m, type: 'edit' })} /> : ''
              }
              {
                this.props.isPublicChannel && this.props.type !== 'action'
                  ? <img className='m-1 w-6 h-6 cursor-pointer' src='/icon_delete.svg' alt='delete'
                    onMouseEnter={(e) => { e.target.src = '/icon_delete_pressed.svg' }}
                    onMouseLeave={(e) => { e.target.src = '/icon_delete.svg' }}
                    onClick={(e) => this.props.onMessageDeleteClicked({ event: e, props: m })} /> : ''
              }
            </div> : ''
        }
        <div className='w-16 flex-shrink-0'>
          <img className='w-8 h-8 ml-4 mr-2' src='/icon_avatar.svg' alt='User Avatar' />
        </div>
        <div className={`'flex flex-col w-full min-w-0 pr-4 ${textStyle}`}>
          <div className='flex flex-row flex-start'>
            <span
              className={`font-bold mr-2 cursor-pointer hover:underline ${authorStyle}`}
              onClick={this.props.onNewFriend(m.author)}>
              {this.props.author}
            </span>
            <span className='text-font-color-light inline-block mr-2 text-xs pt-1 font-mono'>{moment(date).format('HH:mm A')}</span>
          </div>
          <div className='text-font-color min-w-0 w-full break-words'>
            {
              this.renderMessage(m)
            }
          </div>
          { m.reactions && m.reactions.length > 0
            ? <div className='mb-1 ml-1'>
              <Reactions myKey={this.props.myKey} reactions={m.reactions} onAddReaction={this.props.onAddReaction} message={m} />
            </div>
            : <div />}
        </div>
        <div className='w-2' />
      </div>
    </li>
  }
}

export default Message
