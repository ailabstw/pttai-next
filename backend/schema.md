# PTT.ai File Schema

## How it works

* Every user has their own hyperdrive archive
* User publish content as files in the archive
* Encrypted gossip can be broadcasted via hubs

### Profile `/profile.json`

The user's profile, can have any key-value pairs.

```json
{
  "name": "<User nickname>"
}
```

### Topic `/topics/${topicID}/${messageID}`

The user's message in a topic.

### Gossiping `/topics/__gossiping/${gossipID}`

Encryped gossip for sending secure message to a specified user. e.g. direct message.

### Moderation `/topics/${topicID}/moderation/${modID}`

The user's suggestion of moderating a message in a given topic.

### Reaction `/topics/${topicID}/reactions/${reactionID}`

Emoji reactions for a message.

### Curator `/topics/${topicID}/curators/${curatorID}`

The list of trusted curators of a given user in a given topic.

Currently not implemented.

### Friends `/friends/${friendID}`

The list of friends of a user.

By default, the gateway will replicate friends' archive with `replicator`. A user can still connect to their friend without a hub.