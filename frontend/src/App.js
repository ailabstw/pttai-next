import React, { Component } from 'react'
import { HashRouter as Router, Route } from 'react-router-dom'

import Chat from './Chat'
import Login from './Login'
import URLLogin from './UrlLogin'

class App extends Component {
  render () {
    return <Router>
      <Route exact path='/' component={Login} />
      <Route path='/chat' component={Chat} />
      <Route path='/:token' component={URLLogin} />
    </Router>
  }
}

export default App
