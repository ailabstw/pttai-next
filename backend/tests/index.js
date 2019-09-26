const hyperdrive = require('hyperdrive')
const ram = require('random-access-memory')
const tape = require('tape')
const user = require('../lib')

tape('init', function (t) {
  t.plan(4)
  const a = hyperdrive(ram)
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
  const a = hyperdrive(ram)
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

tape('read, write, update, and delete in topic', function (t) {
  const a = hyperdrive(ram)
  a.on('ready', async () => {
    await user.init(a)

    await user.createTopic(a, 'foo')
    await user.postToTopic(a, 'foo', { id: 123, title: 'hello' })

    const posts = await user.getTopic(a, 'foo')
    t.same(posts[0].id, 123)
    t.same(posts[0].title, 'hello')
    t.same(posts[0].topic, 'foo')

    await user.updatePost(a, 'foo', 123, { id: 123, title: 'hello2' })
    const posts2 = await user.getTopic(a, 'foo')
    t.same(posts2[0].id, 123)
    t.same(posts2[0].title, 'hello2')
    t.same(posts2[0].topic, 'foo')

    await user.deletePost(a, 'foo', 123)
    const posts3 = await user.getTopic(a, 'foo')
    t.same(posts3.length, 0)

    t.end()
  })
})

tape('add, list, and get friend', function (t) {
  const a = hyperdrive(ram)
  a.on('ready', async () => {
    await user.init(a)

    let friends = await user.getFriends(a)
    t.same(friends, [])

    await user.createFriend(a, { id: 'abc', name: 'jack' })

    friends = await user.getFriends(a)
    t.same(friends, [{ id: 'abc', name: 'jack' }])

    const f = await user.getFriend(a, 'abc')
    t.same(f, { id: 'abc', name: 'jack' })

    t.end()
  })
})

tape('add & get curators', function (t) {
  const a = hyperdrive(ram)
  a.on('ready', async () => {
    await user.init(a)

    await user.createTopic(a, 'foo')
    let cs = await user.getCurators(a, 'foo')
    t.same(cs, [])

    await user.addCurator(a, 'foo', { id: 'x', name: 'bar' })

    cs = await user.getCurators(a, 'foo')
    t.same(cs, [{ id: 'x', name: 'bar', topic: 'foo' }])

    t.end()
  })
})

tape('post encrypted gossip', function (t) {
  const a = hyperdrive(ram)
  const b = hyperdrive(ram)
  a.on('ready', async () => {
    b.on('ready', async () => {
      await user.init(a)

      await user.postGossip(a, b.key, { text: 'foobar', id: 123 })
      const posts = await user.getTopic(a, '__gossiping')
      t.ok(posts[0].id, 'should have envelop id')
      t.ok(posts[0].nonce, 'should have nonce')
      t.ok(posts[0].cipher, 'should have cipher')

      t.end()
    })
  })
})
