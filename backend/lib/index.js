module.exports = {
  init,
  readFile,

  getTopics,
  getTopic,
  createTopic,
  postToTopic,
  moderate,
  react,

  getFriends,
  getFriend,
  createFriend,

  getProfile,
  setProfile,

  addCurator,
  getCurators
}

function init (archive) {
  return new Promise((resolve, reject) => {
    archive.mkdir('/topics', (err) => {
      if (err) return reject(err)
      archive.mkdir('/friends', (err) => {
        if (err) return reject(err)

        archive.writeFile('/profile.json', JSON.stringify({ name: archive.key.toString('hex') }), (err) => {
          if (err) return reject(err)
          resolve()
        })
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

function getTopic (archive, id) {
  return new Promise((resolve, reject) => {
    archive.readdir(`/topics/${id}`, async (err, list) => {
      if (err) return reject(err)

      let result = []
      for (let i = 0; i < list.length; i++) {
        if (list[i] === 'curators') continue
        if (list[i] === 'moderation') continue
        if (list[i] === 'reactions') continue

        let data = await readFile(archive, `/topics/${id}/${list[i]}`)

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

    if (!data.date) data.date = Date.now()
    archive.writeFile(`/topics/${id}/${data.id}`, JSON.stringify(data), (err) => {
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

function setProfile (archive, profile) {
  return new Promise((resolve, reject) => {
    if (!profile.name) return reject(new Error('undefined profile.name'))

    archive.writeFile(`/profile.json`, JSON.stringify(profile), (err) => {
      if (err) return reject(err)

      resolve()
    })
  })
}

function getProfile (archive) {
  return new Promise(async (resolve, reject) => {
    let data = await readFile(archive, '/profile.json')
    resolve(JSON.parse(data))
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
