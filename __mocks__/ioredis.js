const { EventEmitter } = require('events')
const pEvent = require('p-event')

/**
 * 模拟 Redis Block List
 */
class List extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(Infinity)
    this.listMap = new Map()
  }

  size(key) {
    const list = this._getList(key)
    return list.length
  }

  async pop(...keys) {
    const lists = keys.map(key => [key, this._getList(key)])

    for (const [key, list] of lists) {
      if (list.length > 0) {
        return [key, list.shift()]
      }
    }

    for (;;) {
      const key = await pEvent(this, 'push')
      if (keys.includes(key)) {
        return this.pop(key)
      }
    }
  }

  push(data, key) {
    const list = this._getList(key)
    list.push(data)
    this.emit('push', key)
  }

  _getList(key) {
    let list = this.listMap.get(key)
    if (!list) {
      list = []
      this.listMap.set(key, list)
    }
    return list
  }
}

module.exports = {
  Cluster: class {
    constructor() {
      const store = new Map()
      const list = new List()

      return new class extends EventEmitter {
        get store() {
          return store
        }
        get list() {
          return list
        }
        async set(k, v) {
          store.set(k, `${v}`)
          return 'OK'
        }
        async get(k) {
          return store.get(k) || null
        }
        async del(k) {
          store.delete(k)
          return 'OK'
        }
        async rpush(key, data) {
          return list.push(data, key)
        }
        async blpop(...keys) {
          keys.pop()
          return list.pop(...keys)
        }
        async llen(key) {
          return list.size(key)
        }

        async watch() {}

        async multi() {}
      }()
    }
  }
}