import React, { Component } from 'react'
import { HashRouter as Router, Route } from 'react-router-dom'

import Chat from './Chat'
import Login from './Login'
import TestLogin from './TestLogin'

class App extends Component {
  render () {
    return <Router>
      <Route exact path='/' component={TestLogin} />
      <Route path='/login' component={Login} />
      <Route path='/chat' component={Chat} />
    </Router>
  }
}

export default App
