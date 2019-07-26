const storage = require('dat-storage')

module.exports = function (token, opts) {
  return storage(token, opts)
}
