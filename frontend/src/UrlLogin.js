import React, { Component } from 'react'
import axios from 'axios'
import { Redirect } from 'react-router-dom'

class URLLogin extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loggedIn: false
    }
  }

  componentDidMount () {
    let { token } = this.props.match.params
    this.login(token)
  }

  async login (token) {
    let resp = await axios.post('http://localhost:9988/login', { id_token: token })
    window.localStorage.setItem('token', resp.data.token)

    this.setState({ loggedIn: true })
  }

  render () {
    if (this.state.loggedIn) {
      return <Redirect to={{ pathname: '/chat' }} />
    }

    return <div className='flex items-center justify-center w-screen h-screen bg-gray-200' />
  }
}

export default URLLogin
