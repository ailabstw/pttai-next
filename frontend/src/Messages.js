import React, { Component } from 'react'
import { MenuProvider } from 'react-contexify'
import Reactions from './Reactions'
import Linkify from 'react-linkify'

class Messages extends Component {
  onNewFriend (id) {
    return () => {
      this.props.onNewFriend(id)
    }
  }

  render () {
    console.log('rendering messages', this.props.messages)
    return <ul className='min-h-full flex flex-col justify-end'>
      {this.props.messages.map(m => {
        if (m.message.type === 'text') {
          return <li
            key={m.id}
            className='flex flex-col hover:bg-gray-100'>
            <div className='flex flex-row justify-between'>
              <span>
                <span className='font-bold cursor-pointer hover:underline' onClick={this.onNewFriend(m.author)}>
                  {m.author ? (this.props.profiles[m.author] ? this.props.profiles[m.author].name.substring(0, 8) : m.author.substring(0, 8) + '...') : ''}
                </span>
                : <Linkify properties={{ target: '_blank', className: 'text-blue-600 underline' }}>{m.message.value}</Linkify>
              </span>
              <MenuProvider id='menu_id' event='onClick' data={m}>
                <span className='text-gray-500 hover:text-black cursor-pointer'>...</span>
              </MenuProvider>
            </div>
            { m.reactions && m.reactions.length > 0
              ? <div className='my-1 mb-3'>
                <Reactions myKey={this.props.myKey} reactions={m.reactions} onAddReaction={this.props.onAddReaction} message={m} />
              </div>
              : <div className='my-1' />}
          </li>
        } else if (m.message.type === 'action') {
          return <li
            key={m.id}
            className='message flex flex-col hover:bg-gray-100'>
            <div className='flex flex-row justify-between'>
              <span className='text-gray-500 italic'>
                <span className='font-bold cursor-pointer hover:underline' onClick={this.onNewFriend(m.author)}>
                  {m.author ? (this.props.profiles[m.author] ? this.props.profiles[m.author].name.substring(0, 8) : m.author.substring(0, 8) + '...') : ''}
                </span>
                <Linkify properties={{ target: '_blank', className: 'text-blue-400 underline' }}>{` ${m.message.value}`}</Linkify>
              </span>
              <MenuProvider id='menu_id' event='onClick' data={m}>
                <span className='text-gray-500 hover:text-black cursor-pointer'>...</span>
              </MenuProvider>
            </div>
            { m.reactions && m.reactions.length > 0
              ? <div className='my-1 mb-3'>
                <Reactions myKey={this.props.myKey} reactions={m.reactions} onAddReaction={this.props.onAddReaction} message={m} />
              </div>
              : <div className='my-1' />}
          </li>
        }
        return ''
      })}
    </ul>
  }
}

export default Messages
