const axios = require('axios')

async function bench () {
  for (let i = 0; i < 5000; i++) {
    if (i % 100 === 0) console.log(i)
    await axios.request({
      method: 'post',
      url: 'http://localhost:9999/topics/tech',
      params: { token: i },
      data: { data: { id: Math.random(), body: Math.random() } }
    }
    )
  }
}

bench()
