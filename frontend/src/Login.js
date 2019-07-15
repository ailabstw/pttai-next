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

  componentDidMount () {
    let { token } = this.props.match.params
    this.login(token)
  }

  onLogin (resp) {
    console.log(resp)

    this.login(resp.id_token)
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

    return <div className='flex items-center justify-center w-screen h-screen bg-gray-200' >
      <GoogleLogin
        clientId='347531889221-gm36qi5lrlep23b0jcrb2t8dd0d7h68f.apps.googleusercontent.com'
        buttonText='Login'
        onSuccess={this.onLogin.bind(this)}
        onFailure={this.onLogin.bind(this)}
        cookiePolicy={'single_host_origin'}
      />
    </div>
  }
}

export default Login
