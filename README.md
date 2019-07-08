# PTT.ai-next

Experimental prototype to demostrate running a decentralized social network without trusting a centralized server.

This is still a WIP, check back later.

## Usage

Start 2 hub:

```
$ node backend/hub.js 3003
$ node backend/hub.js 3004
```

Start 2 user:

```
$ node backend/user.js 10000
$ node backend/user.js 10001
```

Start frontend
```
$ cd frontend && yarn start
```

