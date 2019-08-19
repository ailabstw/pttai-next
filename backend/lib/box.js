const sodium = require('sodium-universal')

function encrypt (senderSecretKey, receiverPublicKey, msg) {
  const sk = Buffer.alloc(sodium.crypto_box_SECRETKEYBYTES)
  sodium.crypto_sign_ed25519_sk_to_curve25519(sk, senderSecretKey)
  const pk = Buffer.alloc(sodium.crypto_box_PUBLICKEYBYTES)
  sodium.crypto_sign_ed25519_pk_to_curve25519(pk, receiverPublicKey)

  const cipher = Buffer.alloc(msg.length + sodium.crypto_box_MACBYTES)
  const nonce = randomBytes(24)
  sodium.crypto_box_easy(cipher, msg, nonce, pk, sk)

  return { nonce, cipher }
}

function decrypt (senderPublicKey, receiverSecretKey, cipher, nonce) {
  const sk = Buffer.alloc(sodium.crypto_box_SECRETKEYBYTES)
  sodium.crypto_sign_ed25519_sk_to_curve25519(sk, receiverSecretKey)
  const pk = Buffer.alloc(sodium.crypto_box_PUBLICKEYBYTES)
  sodium.crypto_sign_ed25519_pk_to_curve25519(pk, senderPublicKey)

  const decrypted = Buffer.alloc(cipher.length - sodium.crypto_box_MACBYTES)
  sodium.crypto_box_open_easy(decrypted, cipher, nonce, pk, sk)
  return decrypted
}

function randomBytes (n) {
  var buf = Buffer.alloc(n)
  sodium.randombytes_buf(buf)
  return buf
}

module.exports = {
  encrypt, decrypt, randomBytes
}
