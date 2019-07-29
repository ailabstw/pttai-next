import React, { Component } from 'react'

class Reactions extends Component {
  render () {
    let rs = this.props.reactions
    if (!rs || rs.length === 0) return ''

    let counted = rs.reduce((sum, x) => {
      if (!sum[x.react]) sum[x.react] = 0
      sum[x.react] += 1

      return sum
    }, {})

    let fromMe = rs.filter(x => x.author === this.props.myKey).map(x => x.react)
    console.log('counted', counted)

    let ret = []

    for (let r in counted) {
      let hl = fromMe.indexOf(r) !== -1 ? 'border-2 border-blue-400' : ''
      ret.push(
        <span className={`cursor-pointer border-box text-sm py-1 px-2 mr-1 bg-gray-200 rounded-full w-auto ${hl}`} key={r}>
          <span>{r}</span>
          <span className='text-xs'>{counted[r]}</span>
        </span>
      )
    }

    console.log(ret)

    return ret

    // return rs.map(r => {
    //   return <span className='text-sm py-1 px-2 mr-1 bg-gray-200 rounded-full w-auto' key={r.id}>{r.react}</span>
    // })
  }
}

export default Reactions
