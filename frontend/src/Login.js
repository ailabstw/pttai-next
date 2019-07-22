import React, { Component } from 'react'
import axios from 'axios'
import { GoogleLogin } from 'react-google-login'

import { Redirect } from 'react-router-dom'

class Login extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loggedIn: false
    }
  }

  onLogin (resp) {
    console.log(resp)

    this.login(resp.tokenObj)
  }

  async login (token) {
    let resp = await axios.post(`${process.env.REACT_APP_GATEWAY_URL}/login`, { id_token: token })
    window.localStorage.setItem('token', resp.data.result.token)

    this.setState({ loggedIn: true })
  }

  render () {
    if (this.state.loggedIn) {
      return <Redirect to={{ pathname: '/chat' }} />
    }

    return <div className='flex items-center justify-center w-screen h-screen bg-gray-200' >
      <GoogleLogin
        clientId={process.env.REACT_APP_GOOGLE_SIGNIN_CLIENT_ID}
        buttonText='Login'
        onSuccess={this.onLogin.bind(this)}
        onFailure={this.onLogin.bind(this)}
        cookiePolicy={'single_host_origin'}
      />
    </div>
  }
}

export default Login
