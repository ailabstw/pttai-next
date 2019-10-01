import React, { Component } from 'react'
import { HashRouter as Router, Route } from 'react-router-dom'

import Chat from './Chat'
import Login from './Login'
import QR from './QR'
import TestLogin from './TestLogin'

import { library } from '@fortawesome/fontawesome-svg-core'
import { faBars, faCoffee } from '@fortawesome/free-solid-svg-icons'

library.add(faBars, faCoffee)

class App extends Component {
  render () {
    return <Router>
      <Route exact path='/' component={Login} />
      {process.env.REACT_APP_ENABLE_TEST_LOGIN ? <Route path='/test-login' component={TestLogin} /> : ''}
      <Route path='/chat' component={Chat} />
      <Route path='/qr' component={QR} />
    </Router>
  }
}

export default App
