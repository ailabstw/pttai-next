![Logo](https://raw.githubusercontent.com/ailabstw/pttai-next/master/github_assets/logo.png)

# PTT.ai-next

A decentralized data exchange platform. Currently implemented a slack-like chat room as a PoC.

For the ideas behind the project, check the website: [https://ptt.ai](https://ptt.ai).

<!-- Stability -->
<a href="https://nodejs.org/api/documentation.html#documentation_stability_index">
<img src="https://img.shields.io/badge/stability-experimental-orange.svg"
  alt="API stability" />
</a>

<!-- Build Status -->
<a href="https://travis-ci.org/choojs/choo">
<img src="https://travis-ci.org/ailabstw/pttai-next.svg?branch=master"
  alt="Build Status" />
</a>

<!-- Standard -->
<a href="https://standardjs.com">
<img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg"
  alt="Standard" />
</a>


## Usage

Requirements:

* [git](https://git-scm.com)
* [node](https://nodejs.org/en/)
* [yarn](https://yarnpkg.com/zh-Hant/)

1. clone repo and install dependencies

```
$ git clone git@github.com:ailabstw/pttai-next.git
$ cd pttai-next
$ yarn
```

2. Start services

```
# setup backend config
$ cp backend/env.example backend/.env
# setup frontend config
$ cp frontend/env.example frontend/.env

$ yarn hub
$ yarn gateway
$ yarn replicator
$ yarn frontend
```

## Architecture

PTT.ai is a network-agnostic, decentralized data exchange platform. Currently we implemented a slack-like chat room as a PoC.

PTT.ai is based on a [secure, realtime distributed file system](https://github.com/mafintosh/hyperdrive). It utilize a merkle-tree-based file index to efficiently replicate only the data you need.

![Architecture](https://raw.githubusercontent.com/ailabstw/pttai-next/master/github_assets/arch.png)

* **Node(P.me)**: A Node is a personal repository for your data.
* **Gateway**: A server which hosts multiple nodes. Anyone can run their own gateway instance. Multiple users can share a single gateway to reduce management cost or for authentication.
* **Hub**: A public server that acts as a "social hub". People discover each other through hubs. Users can freely switch to a new hub without losing their data whenever they want.
* **Replicator**: A server provides reliable replication for archives, used to replicate friend's archive.

Direct messages are encrypted. However, the keys used to encrypt is stored on the gateway server. To make sure your message is safe, you need to run your own gateway.

We're actively working on the encryption of group messages.

## API

### Gateway

The documentation is a work in progress. check `backend/gateway.js` for more detail.

##### `POST /login`

Login with an `id_token. PTT.ai doesn't require you to use a 3rd-party authentication. However, currently only Google oauth is implemented.

##### `GET /me?token=`

Get the current user's archive public key.

##### `GET /topics`

Get the list of topics of the current user have posted to.

##### `POST /topics`

Create a new topic

##### `GET /topics/:id`

Get all messages with a given topic.

##### `POST /topics/:id`

Post a new message to a given topic.

##### `PUT /topics/:id/:postID`

Update specified post.

##### `DELETE /topics/:id/:postID`

Delete specified post.
##### `GET /topics/:id/curators`

Get the list of curators the user trust of a given topic.

##### `POST /topics/:id/curators`

Add a new trusted user to the list of curators.

##### `POST /topics/:id/moderation`

Add a new personal moderation to the topic

##### `POST /topics/:id?reactions`

Add a new reaction to the topic.

##### `GET /friends`

Get the friend list

##### `POST /friends`

Add a new key to the friend list

##### `POST /dm`

Post a direct message to a friend as an encrypted gossip.

##### `GET /profile`

Get user's profile

##### `POST /profile`

Update user's profile

### Hub

##### `POST /join`

Add a new key to the hub.

## License

The MIT License
