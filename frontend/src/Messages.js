import React, { Component } from 'react'

import Message from './Message'

class Messages extends Component {
  onNewFriend (id) {
    return () => {
      this.props.onNewFriend(id)
    }
  }

  render () {
    console.log('rendering messages', this.props.messages)

    return <ul className='min-h-full flex flex-col justify-end'>
      {this.props.showScrollButton
        ? <div
          className='cursor-pointer absolute shadow-lg border border-gray-300 rounded-full p-1 px-3 bg-gray-300 sm:hidden'
          onClick={this.props.onClickScrollButton}
          style={{ bottom: '60px', left: '50%' }}>
            Scroll to bottom
        </div>
        : ''}
      {this.props.messages.length > 0 ? <div className='h-48' /> : ''}
      {this.props.messages.map((m, i) => {
        const author = m.author ? (this.props.profiles[m.author] ? this.props.profiles[m.author].name.substring(0, 16) : m.author.substring(0, 16) + '...') : ''
        return <Message
          key={m.id}
          message={m}
          author={author}
          lastMessage={i > 0 ? this.props.messages[i - 1] : null}
          type={m.message.type}
          allowReact={this.props.allowReact}
          onNewFriend={this.onNewFriend.bind(this)} />
      })}
    </ul>
  }
}

export default Messages
