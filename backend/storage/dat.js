const storage = require('dat-storage')

module.exports = function (token) {
  return storage(token)
}
