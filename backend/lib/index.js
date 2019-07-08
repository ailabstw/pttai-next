const crypto = require('hypercore-crypto')
const blake2b = require('blake2b')

module.exports = {
  init,
  readFile,
  getTopics,
  getTopic,
  createTopic,
  postToTopic,

  getFriends,
  getFriend,
  createFriend,

  addCurator,
  getCurators
}

function init (archive) {
  return new Promise((resolve, reject) => {
    archive.mkdir('/topics', (err) => {
      if (err) return reject(err)
      archive.mkdir('/friends', (err) => {
        if (err) return reject(err)

        resolve()
      })
    })
  })
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

        resolve()
      })
    })
  })
}

function getTopic (archive, id) {
  return new Promise((resolve, reject) => {
    archive.readdir(`/topics/${id}`, async (err, list) => {
      if (err) return reject(err)

      let result = []
      for (let i = 0; i < list.length; i++) {
        if (list[i] === 'curators') continue

        let data = await readFile(archive, `/topics/${id}/${list[i]}`)

        let { sig, payload } = JSON.parse(data)
        let author = JSON.parse(payload).author
        let out = new Uint8Array(64)
        let hash = blake2b(out.length).update(payload).digest('hex')
        if (crypto.verify(Buffer.from(hash, 'hex'), Buffer.from(sig, 'hex'), Buffer.from(author, 'hex'))) {
          result.push(JSON.parse(payload))
        } else {
          console.error('failed to verify sig')
        }
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

      let result = []
      for (let i = 0; i < list.length; i++) {
        let data = await readFile(archive, `/topics/${topicID}/curators/${list[i]}`)
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

    if (!data.author) data.author = archive.key.toString('hex')
    if (!data.date) data.date = Date.now()

    let payload = JSON.stringify(data)
    let out = new Uint8Array(64)
    let hash = blake2b(out.length).update(payload).digest('hex')
    let sig = crypto.sign(Buffer.from(hash, 'hex'), archive.metadata.secretKey).toString('hex')

    let s = JSON.stringify({ payload, sig })

    archive.writeFile(`/topics/${id}/${data.id}`, s, (err) => {
      if (err) return reject(err)

      resolve()
    })
  })
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

      let result = []
      for (let i = 0; i < list.length; i++) {
        let data = await getFriend(archive, list[i])
        result.push(data)
      }

      resolve(result)
    })
  })
}

function createFriend (archive, friend) {
  return new Promise((resolve, reject) => {
    if (!friend.id) return reject(new Error('undefined friend.id'))

    archive.writeFile(`/friends/${friend.id}`, JSON.stringify(friend), (err) => {
      if (err) return reject(err)

      resolve()
    })
  })
}

function getFriend (archive, id) {
  return new Promise(async (resolve, reject) => {
    try {
      let data = await readFile(archive, `/friends/${id}`)
      resolve(JSON.parse(data))
    } catch (e) {
      reject(e)
    }
  })
}
