# PTT.ai-next

A decentralized social network without trusting a centralized server.

## Usage

1. clone repo

```
$ git clone git@github.com:ailabstw/pttai-next.git
$ cd pttai-next
```

2. Setup backend, install dependencies, start backend server

```
$ cd backend
$ yarn
$ node backend/gateway.js
$ node backend/hub.js
```

3. Start frontend
```
$ cd frontend && yarn && yarn start
```

## How it works

* **Gateway**: A server hosting your personal data. Anyone can run his/her own gateway instance. Multiple user can share a single gateway instance for ease of management or special authentication requirement.
* **Hub**: A public server that acts like a "social hub". People discover each other through hubs. Users can freely switch to a new hub whenever they want.

## License

The MIT License