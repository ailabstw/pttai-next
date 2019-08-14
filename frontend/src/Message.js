import React, { Component } from 'react'
import { MenuProvider } from 'react-contexify'
import Reactions from './Reactions'
import Linkify from 'react-linkify'
import nameColors from './name_colors'

import moment from 'moment'

class Message extends Component {
  id2color (id) {
    let n = parseInt(id, 16)
    return nameColors[n % nameColors.length]
  }

  render () {
    let m = this.props.message
    let shouldRenderDate = true
    let date = m.date || m.message.date

    if (this.props.lastMessage) {
      let lastMessage = this.props.lastMessage
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
      className='message flex flex-col hover:bg-gray-100'>
      {shouldRenderDate
        ? <div className='text-sm text-center border-b border-gray-300 mb-2'>{moment(date).format('YYYY-MM-DD')}</div>
        : ''}
      <div className='flex flex-row justify-between'>
        <span className='text-gray-600 inline-block mr-4 text-sm w-10'>{moment(date).format('HH:mm')}</span>
        <span className={`${textStyle} flex-grow`}>
          <span
            className={`font-bold cursor-pointer hover:underline ${authorStyle}`}
            onClick={this.props.onNewFriend(m.author)}>
            {this.props.author}
          </span>
          <Linkify properties={{ target: '_blank', className: 'text-blue-400 underline' }}>{` ${m.message.value}`}</Linkify>
        </span>
        {this.props.allowReact ? <MenuProvider id='menu_id' event='onClick' data={m}>
          <span className='text-gray-500 hover:text-black cursor-pointer'>...</span>
        </MenuProvider> : ''}
      </div>
      { m.reactions && m.reactions.length > 0
        ? <div className='my-1 mb-3 ml-16'>
          <Reactions myKey={this.props.myKey} reactions={m.reactions} onAddReaction={this.props.onAddReaction} message={m} />
        </div>
        : <div className='my-1' />}
    </li>
  }
}

export default Message
