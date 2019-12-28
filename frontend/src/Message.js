import React, { Component } from 'react'
import { MenuProvider } from 'react-contexify'
import Reactions from './Reactions'
import Linkify from 'react-linkify'
import nameColors from './name_colors'

import moment from 'moment'

class Message extends Component {
  id2color (id) {
    const n = parseInt(id, 16)
    return nameColors[n % nameColors.length]
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
    if (this.props.type === 'text') {
      authorStyle = this.id2color(m.author)
    }

    return <li
      className='message flex flex-col w-full'>
      {
        shouldRenderDate? <div className='date-divider my-2'  data-content={moment(date).format('dddd, MMMM Do')}></div> : ''
      }
      <div className='relative flex flex-row flex-start pt-2 pb-1 hover:bg-message-hover'>
        <div className='w-16 cursor-pointer flex-shrink-0'>
          <img className='w-8 h-8 ml-4 mr-2' src='/icon_avatar.svg' alt='User Avatar'></img>
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
            <Linkify properties={{ target: '_blank', className: 'underline' }}>
              {`${m.message.value}`}
            </Linkify>
          </div>
          { m.reactions && m.reactions.length > 0
            ? <div className='mb-1 ml-1'>
              <Reactions myKey={this.props.myKey} reactions={m.reactions} onAddReaction={this.props.onAddReaction} message={m} />
            </div>
            : <div/>}
        </div>
        <div className='w-16'>
          <MenuProvider id='menu_id' event='onClick' data={m}>
            <span className='text-gray-500 hover:text-black cursor-pointer'>...</span>
          </MenuProvider>
        </div>
      </div>
    </li>
  }
}

export default Message
