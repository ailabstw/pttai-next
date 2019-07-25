import React, { Component } from 'react'
import { MenuProvider } from 'react-contexify'
import Reactions from './Reactions'

class Messages extends Component {
  render () {
    console.log('rendering messages', this.props.messages)
    return <ul className='min-h-full flex flex-col justify-end'>
      {this.props.messages.map(m => {
        return <li
          key={m.id}
          className='flex flex-col'>
          <div className='flex flex-row justify-between'>
            <span><span className='font-bold'>{m.author ? (this.props.profiles[m.author] ? this.props.profiles[m.author].name.substring(0, 8) : m.author.substring(0, 8) + '...') : ''}</span>: {m.message}</span>
            <MenuProvider id='menu_id' event='onClick' data={m}>
              <span className='text-gray-500 hover:text-black cursor-pointer'>...</span>
            </MenuProvider>
          </div>
          { m.reactions && m.reactions.length > 0
            ? <div className='my-1 mb-3'>
              <Reactions reactions={m.reactions} />
            </div>
            : <div className='my-1' />}
        </li>
      })}
    </ul>
  }
}

export default Messages
