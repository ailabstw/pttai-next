import React, { Component } from 'react'
import Button from '@material-ui/core/Button'
import Dialog from '@material-ui/core/Dialog'
import DialogTitle from '@material-ui/core/DialogTitle'
import DialogActions from '@material-ui/core/DialogActions'

class AlertDialog extends Component {
  constructor (props) {
    super()
  }

  render () {
    return (
      <div>
      <Dialog
        open={this.props.open}
        onClose={this.props.handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{this.props.message}</DialogTitle>
        <DialogActions>
          <Button className='focus:outline-none' onClick={this.props.handleClose} color="primary">
            Ok
          </Button>
        </DialogActions>
      </Dialog>
      </div>
    );
  }
}

export default AlertDialog
