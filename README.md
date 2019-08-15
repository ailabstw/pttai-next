# PTT.ai-next

A decentralized data exchange platform.

For the ideas behind the project, check the website: [https://ptt.ai](https://ptt.ai).

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
$ yarn start
```

## Architecture

PTT.ai is a network-agnostic, decentralized data exchange platform. Currently we implemented a slack-like chat room as a PoC.

PTT.ai is based on a [secure, realtime distributed file system](https://github.com/mafintosh/hyperdrive). It utilize a merkle-tree-based file index to efficiently replicate only the data you need.

* **Node**: A Node is a personal repository for your data.
* **Gateway**: A server which hosts multiple nodes. Anyone can run their own gateway instance. Multiple users can share a single gateway to reduce management cost or for authentication.
* **Hub**: A public server that acts as a "social hub". People discover each other through hubs. Users can freely switch to a new hub without losing their data whenever they want.

## Security & Privacy

Direct messages are encrypted. However, the keys to preform the encryption is stored on the gateway server. To make sure your message is safe, you need to host your data with your own gateway server.

We're actively working on the encryption of group messages.

## License

The MIT License
