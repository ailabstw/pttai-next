const box = require('./box')
const uuid = require('uuid/v4')

module.exports = {
  init,
  readFile,

  getTopics,
  getTopic,
  createTopic,
  postToTopic,
  postGossip,
  postGossipToMany,
  moderate,
  react,
  deletePost,
  updatePost,

  getFriends,
  getFriend,
  createFriend,

  getPChannels,
  getPChannel,
  createPChannel,

  getProfile,
  setProfile,

  addCurator,
  getCurators
}

function init (archive) {
  const createTopics = new Promise((resolve, reject) => {
    archive.stat('/topics', (err, stat) => {
      if (!err) return reject(err)
      archive.mkdir('/topics', (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  })

  const createFriends = new Promise((resolve, reject) => {
    archive.stat('/friends', (err, stat) => {
      if (!err) return reject(err)
      archive.mkdir('/friends', (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  })

  const createPChannels = new Promise((resolve, reject) => {
    archive.stat('/pchannels', (err, stat) => {
      if (!err) return reject(err)
      archive.mkdir('/pchannels', (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  })

  const writeProfile = new Promise((resolve, reject) => {
    archive.stat('/profile.json', (err, stat) => {
      if (!err) return reject(err)
      archive.writeFile('/profile.json', JSON.stringify({ name: archive.key.toString('hex') }), (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  })

  return Promise.all([createTopics, createFriends, createPChannels, writeProfile])
}

function getTopics (archive) {
  return new Promise((resolve, reject) => {
    archive.readdir('/topics', (err, list) => {
      if (err) return reject(err)
      resolve(list)
    })
  })
}

function createTopic (archive, topic) {
  return new Promise((resolve, reject) => {
    archive.mkdir(`/topics/${topic}`, (err) => {
      if (err) return reject(err)

      archive.mkdir(`/topics/${topic}/curators`, (err) => {
        if (err) return reject(err)

        archive.mkdir(`/topics/${topic}/moderation`, (err) => {
          if (err) return reject(err)

          archive.mkdir(`/topics/${topic}/reactions`, (err) => {
            if (err) return reject(err)

            resolve()
          })
        })
      })
    })
  })
}

function moderate (archive, topicID, action) {
  return new Promise((resolve, reject) => {
    if (!action.id) return reject(new Error('undefined action.id'))

    if (!action.topic) action.topic = topicID
    archive.writeFile(`/topics/${topicID}/moderation/${action.id}`, JSON.stringify(action), (err) => {
      if (err) return reject(err)

      resolve()
    })
  })
}

function react (archive, topicID, react) {
  return new Promise((resolve, reject) => {
    if (!react.id) return reject(new Error('undefined action.id'))

    if (!react.topic) react.topic = topicID
    archive.writeFile(`/topics/${topicID}/reactions/${react.id}`, JSON.stringify(react), (err) => {
      if (err) return reject(err)

      resolve()
    })
  })
}

function deletePost (archive, topicID, postID) {
  return new Promise((resolve, reject) => {
    archive.unlink(`/topics/${topicID}/${postID}`, (err) => {
      if (err) return reject(err)

      resolve()
    })
  })
}

function updatePost (archive, topicID, postID, data) {
  return new Promise((resolve, reject) => {
    if (!data.id) return reject(new Error('undefined data.id'))
    if (!data.topic) data.topic = topicID
    if (!data.date) data.date = Date.now()

    archive.writeFile(`/topics/${topicID}/${postID}`, JSON.stringify(data), (err) => {
      if (err) return reject(err)

      resolve()
    })
  })
}

function getTopic (archive, id) {
  return new Promise((resolve, reject) => {
    archive.readdir(`/topics/${id}`, async (err, list) => {
      if (err) return reject(err)

      const result = []
      for (let i = 0; i < list.length; i++) {
        if (list[i] === 'curators') continue
        if (list[i] === 'moderation') continue
        if (list[i] === 'reactions') continue

        const data = await readFile(archive, `/topics/${id}/${list[i]}`)

        result.push(JSON.parse(data))
      }

      resolve(result)
    })
  })
}

function addCurator (archive, topicID, curator) {
  return new Promise((resolve, reject) => {
    if (!curator.id) return reject(new Error('undefined curator.id'))

    if (!curator.topic) curator.topic = topicID
    archive.writeFile(`/topics/${topicID}/curators/${curator.id}`, JSON.stringify(curator), (err) => {
      if (err) return reject(err)

      resolve()
    })
  })
}

function getCurators (archive, topicID) {
  return new Promise((resolve, reject) => {
    archive.readdir(`/topics/${topicID}/curators`, async (err, list) => {
      if (err) return reject(err)

      const result = []
      for (let i = 0; i < list.length; i++) {
        const data = await readFile(archive, `/topics/${topicID}/curators/${list[i]}`)
        result.push(JSON.parse(data))
      }

      resolve(result)
    })
  })
}

function postToTopic (archive, id, data) {
  return new Promise((resolve, reject) => {
    if (!data.id) return reject(new Error('undefined data.id'))

    if (!data.topic) data.topic = id

    if (!data.date) data.date = Date.now()
    archive.writeFile(`/topics/${id}/${data.id}`, JSON.stringify(data), (err) => {
      if (err) return reject(err)

      resolve()
    })
  })
}

async function postGossip (archive, receiverPublicKey, message) {
  let msg = message
  if (!msg.date) msg.date = Date.now()
  msg = Buffer.from(JSON.stringify(msg))

  // console.log('sending dm', { receiver: receiverPublicKey, secretKey: archive.metadata.secretKey })

  const b = box.encrypt(archive.metadata.secretKey, receiverPublicKey, msg)

  await postToTopic(
    archive,
    '__gossiping',
    {
      id: Date.now(),
      nonce: b.nonce.toString('hex'),
      cipher: b.cipher.toString('hex')
    })
}

async function postGossipToMany (archive, receiverPublicKeys, message) {
  let msg = message
  if (!msg.date) msg.date = Date.now()
  msg = Buffer.from(JSON.stringify(msg))

  const messageId = uuid()
  for (const idx in receiverPublicKeys) {
    const receiverPublicKey = receiverPublicKeys[idx]
    const b = box.encrypt(archive.metadata.secretKey, receiverPublicKey, msg)

    await postToTopic(
      archive,
      '__gossiping',
      {
        id: Date.now(),
        messageId: messageId,
        nonce: b.nonce.toString('hex'),
        cipher: b.cipher.toString('hex')
      })
  }
}

function readFile (archive, fn) {
  return new Promise((resolve, reject) => {
    archive.readFile(fn, (err, data) => {
      if (err) return reject(err)

      resolve(data)
    })
  })
}

function getFriends (archive) {
  return new Promise((resolve, reject) => {
    archive.readdir(`/friends`, async (err, list) => {
      if (err) return reject(err)

      const result = []
      for (let i = 0; i < list.length; i++) {
        const data = await getFriend(archive, list[i])
        result.push(data)
      }

      resolve(result)
    })
  })
}

function getPChannels (archive) {
  return new Promise((resolve, reject) => {
    archive.readdir(`/pchannels`, async (err, list) => {
      if (err) return reject(err)

      const result = []
      for (let i = 0; i < list.length; i++) {
        const data = await getPChannel(archive, list[i])
        result.push(data)
      }

      resolve(result)
    })
  })
}

function createFriend (archive, friend) {
  return new Promise((resolve, reject) => {
    if (!friend.id) return reject(new Error('undefined friend.id'))

    const b = box.encrypt(archive.metadata.secretKey, archive.key, Buffer.from(JSON.stringify(friend)))

    archive.writeFile(`/friends/${friend.id}`, JSON.stringify({ nonce: b.nonce.toString('hex'), cipher: b.cipher.toString('hex') }), (err) => {
      if (err) return reject(err)

      resolve()
    })
  })
}

function createPChannel (archive, pchannel) {
  return new Promise((resolve, reject) => {
    if (!pchannel.id) return reject(new Error('undefined channel.id'))

    const b = box.encrypt(archive.metadata.secretKey, archive.key, Buffer.from(JSON.stringify(pchannel)))

    archive.writeFile(`/pchannels/${pchannel.id}`, JSON.stringify({ nonce: b.nonce.toString('hex'), cipher: b.cipher.toString('hex') }), (err) => {
      if (err) return reject(err)

      resolve()
    })
  })
}

function setProfile (archive, profile) {
  return new Promise((resolve, reject) => {
    if (!profile.name) return reject(new Error('undefined profile.name'))

    archive.writeFile(`/profile.json`, JSON.stringify(profile), (err) => {
      if (err) return reject(err)

      resolve()
    })
  })
}

async function getProfile (archive) {
  const data = await readFile(archive, '/profile.json')
  return JSON.parse(data)
}

async function getFriend (archive, id) {
  const b = await readFile(archive, `/friends/${id}`)
  const { nonce, cipher } = JSON.parse(b)

  const data = box.decrypt(archive.key, archive.metadata.secretKey, Buffer.from(cipher, 'hex'), Buffer.from(nonce, 'hex'))

  return JSON.parse(data)
}

async function getPChannel (archive, id) {
  const b = await readFile(archive, `/pchannels/${id}`)
  const { nonce, cipher } = JSON.parse(b)

  const data = box.decrypt(archive.key, archive.metadata.secretKey, Buffer.from(cipher, 'hex'), Buffer.from(nonce, 'hex'))

  return JSON.parse(data)
}
