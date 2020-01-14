import React, { Component } from 'react'
import Dialog from '@material-ui/core/Dialog'

class UploadDialog extends Component {
  constructor (props) {
    super()
  }

  renderFile () {
    if (!this.props.data) {
      return null
    }
    console.log('file type:', this.props.data)
    if (this.props.data.type.startsWith('image/')) {
      return (
        <div className='flex flex-col'>
          <img className='h-12 w-12 object-cover rounded' alt='uploaded file' src={this.props.data.dataUrl} />
          <div className='h-full text-sm ml-1'>{this.props.data.name}</div>
        </div>
      )
    } else {
      let iconFile = ''
      if (this.props.data.type.startsWith('video/')) {
        iconFile = './icon_videofile.svg'
      } else if (this.props.data.type === 'application/zip') {
        iconFile = './icon_zipfile.svg'
      } else {
        iconFile = './icon_txtfile.svg'
      }
      return (
        <div className='flex flex-row'>
          <div className='h-10 w-10 p-2 bg-upload-file-color-2 rounded-l' alt='uploaded file'>
            <img className='h-6 w-6' alt='file icon' src={iconFile} />
          </div>
          <div className='h-10 w-auto p-3 bg-upload-file-color-3 text-white text-xs rounded-r'>{this.props.data.name}</div>
        </div>
      )
    }
  }

  render () {
    return (
      <div>
        <Dialog open={this.props.open} onClose={this.props.handleClose}>
          <div className='flex flex-col'>
            <div className='flex flex-row justify-between h-10 p-2 text-center text-font-color font-bold bg-modal-header-color'>
              <div className='mr-auto w-4 mx-2'> </div>
              <div className='my-auto'>Upload file</div>
              <img id='icon_close' className='w-7 ml-auto cursor-pointer' src='/icon_close.svg' alt='close modal'
                onClick={() => this.props.handleClose()}
                onMouseOver={(e) => { e.target.src = '/icon_close_hover.svg' }}
                onMouseOut={(e) => { e.target.src = '/icon_close.svg' }} />
            </div>
            <div className='flex flex-col p-2'>
              <div className='flex flex-col p-2 text-font-color'>
                <div className='w-full h-20 p-2 rounded bg-upload-file-color'>
                  {
                    this.renderFile()
                  }
                </div>
              </div>
              <div className='hidden flex flex-col p-2' />
            </div>
            <div className='flex flex-row p-4'>
              <div className='ml-auto p-2 mr-2 w-24 h-8 bg-cancel-btn-color hover:bg-cancel-btn-color-hover cursor-pointer text-center text-sm leading-none rounded text-font-color focus:outline-none'
                onClick={(e) => this.props.handleClose()} >Cancel</div>
              <div className='ml-auto p-2 w-24 h-8 bg-confirm-btn-color hover:bg-confirm-btn-color-hover cursor-pointer text-center text-sm leading-none rounded text-white focus:outline-none'
                onClick={(e) => {
                  this.props.handleSubmit()
                  this.props.handleClose()
                }}>Confirm</div>
            </div>
          </div>
        </Dialog>
      </div>
    )
  }
}

export default UploadDialog
