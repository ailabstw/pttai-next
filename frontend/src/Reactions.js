import React, { Component } from 'react'

class Reactions extends Component {
  addReaction (react, fromMe) {
    if (fromMe) return () => {}

    return () => {
      this.props.onAddReaction(react, this.props.message)
    }
  }

  render () {
    const rs = this.props.reactions
    if (!rs || rs.length === 0) return ''

    const counted = rs.reduce((sum, x) => {
      if (!sum[x.react]) sum[x.react] = 0
      sum[x.react] += 1

      return sum
    }, {})

    const fromMe = rs.filter(x => x.author === this.props.myKey).map(x => x.react)
    const ret = []

    for (const r in counted) {
      const hl = fromMe.indexOf(r) !== -1 ? 'border-2 border-blue-400' : 'border-2 border-gray-200'
      ret.push(
        <span className={`inline-block cursor-pointer border-box text-sm py-1 px-2 mr-1 bg-gray-200 rounded-full w-auto ${hl}`} key={r} onClick={this.addReaction(r, fromMe.indexOf(r) !== -1).bind(this)}>
          <span>{r}</span>
          <span className='text-xs'>{counted[r]}</span>
        </span>
      )
    }

    return ret

    // return rs.map(r => {
    //   return <span className='text-sm py-1 px-2 mr-1 bg-gray-200 rounded-full w-auto' key={r.id}>{r.react}</span>
    // })
  }
}

export default Reactions
