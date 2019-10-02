import React, { Component } from 'react'
import QRCode from 'qrcode.react'

export default class QR extends Component {
  render () {
    const params = new URLSearchParams(this.props.location.search)
    const q = decodeURIComponent(params.get('q'))
    console.log(q)
    return <div className='w-screen h-screen flex justify-center items-center'><QRCode value={params.get('q')} size={256} /></div>
  }
}
