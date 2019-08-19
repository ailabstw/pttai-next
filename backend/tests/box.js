const hyperdrive = require('hyperdrive')
const ram = require('random-access-memory')
const tape = require('tape')
const box = require('../lib/box')

tape('encryption', function (t) {
  const a = hyperdrive(ram)
  const b = hyperdrive(ram)
  const c = hyperdrive(ram)

  a.on('ready', () => {
    b.on('ready', () => {
      c.on('ready', () => {
        const keyPairA = { publicKey: a.key, secretKey: a.metadata.secretKey }
        const keyPairB = { publicKey: b.key, secretKey: b.metadata.secretKey }
        const keyPairC = { publicKey: c.key, secretKey: c.metadata.secretKey }

        const msg = Buffer.from('hello')

        const { nonce, cipher } = box.encrypt(keyPairA.secretKey, keyPairB.publicKey, msg)

        const decrypted = box.decrypt(keyPairA.publicKey, keyPairB.secretKey, cipher, nonce)
        t.equal(msg.toString(), decrypted.toString())

        const failed = box.decrypt(keyPairA.publicKey, keyPairC.secretKey, cipher, nonce)
        t.equal(failed.toString(), '\x00\x00\x00\x00\x00')

        t.end()
      })
    })
  })
})
