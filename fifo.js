const getRedisClient = require('./redis')

class FIFO {
  constructor(key, config) {
    this.key = key
    this.queue = getRedisClient(config)
  }

  async enque(data, key = this.key) {
    return this.queue.rpush(key, data)
  }

  async deque(keys = [this.key]) {
    return (await this.queue.blpop(...keys, 0))[1]
  }

  async size(key = this.key) {
    return this.queue.llen(key)
  }
}

module.exports = FIFO
