const storage = require('dat-storage')

module.exports = function (id, opts) {
  return storage(id, opts)
}
