import React, { Component } from 'react'
import Dialog from '@material-ui/core/Dialog'
import Switch from '@material-ui/core/Switch'
import Chip from '@material-ui/core/Chip'
import Avatar from '@material-ui/core/Avatar'
import TextField from '@material-ui/core/TextField'
import Autocomplete from '@material-ui/lab/Autocomplete'

class FormDialog extends Component {
  constructor (props) {
    super()
    this.state = {
      newChannelNameInEdit: '',
      isPrivate: false,
      selectedFriends: []
    }
  }

  componentDidUpdate (prevProps) {
    if (prevProps.open && !this.props.open) {
      this.setState({
        newChannelNameInEdit: '',
        isPrivate: false,
        selectedFriends: []
      })
    }
  }

  onNewChannelNameChange (e) {
    this.setState({ newChannelNameInEdit: e.target.value })
  }

  onSwitchPrivacy (event) {
    this.setState({ isPrivate: event.target.checked })
  }

  onSelectedFriends (event, value) {
    this.setState({ selectedFriends: value })
  }

  render () {
    const friends = this.props.friends.filter(
      (f) => f.key in this.props.profiles).filter(
      (f) => !this.state.selectedFriends.map(frd => Object.values(frd)[0]).includes(f.key)).map(
      (f) => ({
        key: f.key,
        name: this.props.profiles[f.key].name
      }))

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
                <div className='text-sm mb-2'>Channel Name</div>
                <input className='w-64 px-1 h-10 focus:outline-none border border-dialogue-color-normal rounded' onChange={this.onNewChannelNameChange.bind(this)} value={this.state.newChannelNameInEdit} />
              </div>
              <div className='flex flex-col p-2 text-font-color'>
                <div className='text-sm mb-1'>Privacy</div>
                <div className='flex flex-row'>
                  <Switch
                    checked={this.state.isPrivate}
                    onChange={this.onSwitchPrivacy.bind(this)}
                    color='default'
                    inputProps={{ 'aria-label': 'checkbox with default color' }}
                  />
                  <div className='text-sm p-2 align-middle'>Private</div>
                </div>
              </div>
              {
                this.state.isPrivate
                  ? <div className='flex flex-col p-2 text-font-color'>
                    <div className='text-sm mb-2'>Member</div>
                    <Autocomplete
                      multiple
                      id='fixed-tags-demo'
                      options={friends}
                      getOptionLabel={option => option.name}
                      defaultValue={[{
                        key: this.props.me.key,
                        name: this.props.profiles[this.props.me.key].name
                      }]}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            avatar={<Avatar alt='avatar' src='/icon_avatar.svg' />}
                            label={option.name}
                            {...getTagProps({ index })}
                            disabled={option.key === this.props.me.key}
                          />
                        ))
                      }
                      style={{ width: 500 }}
                      renderInput={params => {
                        return (
                          <TextField
                            {...params}
                            size='small'
                            variant='outlined'
                            placeholder='Invite'
                            fullWidth
                          />)
                      }}
                      onChange={this.onSelectedFriends.bind(this)}
                      disableClearable
                    />
                  </div> : null
              }
              <div className='hidden flex flex-col p-2' />
            </div>
            <div className='flex flex-row p-4'>
              <div className='ml-auto p-2 w-24 h-8 bg-create-btn-color hover:bg-create-btn-color-hover cursor-pointer text-center text-sm leading-none rounded text-font-color focus:outline-none'
                onClick={(e) => {
                  this.props.handleSubmit({
                    name: this.state.newChannelNameInEdit,
                    isPrivate: this.state.isPrivate,
                    selectedFriends: this.state.selectedFriends
                  })
                }}>Create</div>
            </div>
          </div>
        </Dialog>
      </div>
    )
  }
}

export default FormDialog
