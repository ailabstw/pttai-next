import React, { Component } from 'react'
import axios from 'axios'
import { Redirect } from 'react-router-dom'

class TestLogin extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loggedIn: false,
      input: ''
    }
  }

  async login (token) {
    let resp = await axios.post(`${process.env.REACT_APP_GATEWAY_URL}/login`, { id_token: token, name: token })
    window.localStorage.setItem('token', resp.data.result.token)

    this.setState({ loggedIn: true })
  }

  handleChange (e) {
    this.setState({ input: e.target.value })
  }

  async handleInputChange (e) {
    if (e.key === 'Enter') {
      e.target.value = ''
      await this.login(this.state.input)
    }
  }

  render () {
    if (this.state.loggedIn) {
      return <Redirect to={{ pathname: '/chat' }} />
    }

    return <div className='flex items-center justify-center w-screen h-screen bg-gray-200'>
      <div className='bg-white flex flex-col justify-between items-center rounded-lg p-4'>
        <h2 className='text-lg'>nickname</h2>
        <input className='p-1 border border-gray-500 rounded font-mono text-xs w-full' value={this.state.input} onChange={this.handleChange.bind(this)} onKeyPress={this.handleInputChange.bind(this)} />
      </div>
    </div>
  }
}

export default TestLogin
