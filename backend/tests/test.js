const hyperdrive = require('hyperdrive')
const ram = require('random-access-memory')
const tape = require('tape')
const user = require('../lib')

tape('init', function (t) {
  t.plan(4)
  let a = hyperdrive(ram)
  a.on('ready', async () => {
    await user.init(a)

    a.stat('/topics', (err, s) => {
      t.error(err)
      t.ok(s.isDirectory())
    })
    a.stat('/friends', (err, s) => {
      t.error(err)
      t.ok(s.isDirectory())
    })
  })
})

tape('list and create topic', function (t) {
  let a = hyperdrive(ram)
  a.on('ready', async () => {
    await user.init(a)

    let topics = await user.getTopics(a)
    t.same(topics, [])

    await user.createTopic(a, 'foo')
    topics = await user.getTopics(a)
    t.same(topics, ['foo'])

    t.end()
  })
})

tape('read and write in topic', function (t) {
  let a = hyperdrive(ram)
  a.on('ready', async () => {
    await user.init(a)

    await user.createTopic(a, 'foo')
    await user.postToTopic(a, 'foo', { id: 123, title: 'hello' })

    let posts = await user.getTopic(a, 'foo')
    t.same(posts[0].id, 123)
    t.same(posts[0].title, 'hello')
    t.same(posts[0].topic, 'foo')

    t.end()
  })
})

tape('add, list, and get friend', function (t) {
  let a = hyperdrive(ram)
  a.on('ready', async () => {
    await user.init(a)

    let friends = await user.getFriends(a)
    t.same(friends, [])

    await user.createFriend(a, { id: 'abc', name: 'jack' })

    friends = await user.getFriends(a)
    t.same(friends, [ { id: 'abc', name: 'jack' } ])

    let f = await user.getFriend(a, 'abc')
    t.same(f, { id: 'abc', name: 'jack' })

    t.end()
  })
})

tape('add & get curators', function (t) {
  let a = hyperdrive(ram)
  a.on('ready', async () => {
    await user.init(a)

    await user.createTopic(a, 'foo')
    let cs = await user.getCurators(a, 'foo')
    t.same(cs, [])

    await user.addCurator(a, 'foo', { id: 'x', name: 'bar' })

    cs = await user.getCurators(a, 'foo')
    t.same(cs, [ { id: 'x', name: 'bar', topic: 'foo' } ])

    t.end()
  })
})
