const Discovery = require('hyperdiscovery')

var disc

function add (archive) {
  if (!disc) {
    console.log('initing discovery', archive.key.toString('hex'))
    disc = Discovery(archive)
  } else {
    console.log('joining discovery', archive.key.toString('hex'))
    disc.add(archive)
  }
}

module.exports = add
