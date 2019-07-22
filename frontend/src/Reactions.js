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

    console.log('counted', counted)

    let ret = []

    for (let r in counted) {
      ret.push(
        <span className='text-sm py-1 px-2 mr-1 bg-gray-200 rounded-full w-auto' key={r}>
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
