# PTT.ai-next

A decentralized social network.

## Usage

1. clone repo and install dependencies

```
$ git clone git@github.com:ailabstw/pttai-next.git
$ cd pttai-next
$ yarn
```

2. Setup backend, start backend server

```
$ cp backend/env.example backend/.env
$ node backend/gateway.js
$ node backend/hub.js
```

3. Start frontend

```
$ cp frontend/env.example frontend/.env
$ yarn && yarn build-style && yarn start
```

## How it works

* **Gateway**: A server hosting your personal data. Anyone can run his/her own gateway instance. Multiple user can share a single gateway instance for ease of management or special authentication requirement.
* **Hub**: A public server that acts like a "social hub". People discover each other through hubs. Users can freely switch to a new hub whenever they want.

## Security & Privacy

PTT.ai encrpyt direct messages with E2E encryption by default. However, the keys to preform the encryption is stored on the gateway server. To make sure your message is safe, you need to host your data with your own gateway server.

We're actively working on the encryption of group messages.

## License

The MIT License