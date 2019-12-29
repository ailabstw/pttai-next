import React, { Component } from 'react'
import Dialog from '@material-ui/core/Dialog'

class FormDialog extends Component {
  constructor (props) {
    super()
    this.state = {
      newChannelNameInEdit: ''
    }
  }

  onNewChannelNameChange (e) {
    this.setState({ newChannelNameInEdit: e.target.value })
  }

  render () {
    return (
      <div>
        <Dialog open={this.props.open} onClose={this.props.handleClose}>
          <div className='flex flex-col'>
            <div className='flex flex-row justify-between h-10 p-2 text-center text-font-color font-bold bg-modal-header-color'>
              <div className='mr-auto w-4 mx-2'> </div>
              <div className='my-auto'>Create a Channel</div>
              <img id='icon_close' className='w-7 ml-auto cursor-pointer' src='/icon_close.svg' alt='close modal'
                onClick={() => this.props.handleClose()}
                onMouseOver={(e) => { e.target.src = '/icon_close_hover.svg' }}
                onMouseOut={(e) => { e.target.src = '/icon_close.svg' }} />
            </div>
            <div className='flex flex-col p-2'>
              <div className='flex flex-col p-2 text-font-color'>
                <div className='text-sm mb-1'>Channel Name</div>
                <input className='w-64 px-1 h-7 focus:outline-none border border-dialogue-color-normal rounded' onChange={this.onNewChannelNameChange.bind(this)} value={this.state.newChannelNameInEdit} />
              </div>
              <div className='hidden flex flex-col p-2' />
            </div>
            <div className='flex flex-row p-4'>
              <div className='ml-auto p-2 w-24 h-8 bg-create-btn-color hover:bg-create-btn-color-hover cursor-pointer text-center text-sm leading-none rounded text-font-color focus:outline-none'
                onClick={(e) => {
                  this.props.handleSubmit({ name: this.state.newChannelNameInEdit })
                  this.setState({ newChannelNameInEdit: '' })
                }}>Create</div>
            </div>
          </div>
        </Dialog>
      </div>
    )
  }
}

export default FormDialog
