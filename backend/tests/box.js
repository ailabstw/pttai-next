const hyperdrive = require('hyperdrive')
const ram = require('random-access-memory')
const tape = require('tape')
const box = require('../lib/box')

tape('encryption', function (t) {
  let a = hyperdrive(ram)
  let b = hyperdrive(ram)
  let c = hyperdrive(ram)

  a.on('ready', () => {
    b.on('ready', () => {
      c.on('ready', () => {
        let keyPairA = { publicKey: a.key, secretKey: a.metadata.secretKey }
        let keyPairB = { publicKey: b.key, secretKey: b.metadata.secretKey }
        let keyPairC = { publicKey: c.key, secretKey: c.metadata.secretKey }

        let msg = Buffer.from('hello')

        let { nonce, cipher } = box.encrypt(keyPairA.secretKey, keyPairB.publicKey, msg)

        let decrypted = box.decrypt(keyPairA.publicKey, keyPairB.secretKey, cipher, nonce)
        t.equal(msg.toString(), decrypted.toString())

        let failed = box.decrypt(keyPairA.publicKey, keyPairC.secretKey, cipher, nonce)
        t.equal(failed.toString(), '\x00\x00\x00\x00\x00')

        t.end()
      })
    })
  })
})
