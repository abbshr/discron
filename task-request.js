const chance = require('chance')()
class TaskRequest {
  static unpack(packedTaskRequest) {
    const unpacked = JSON.parse(packedTaskRequest)
    return new TaskRequest(unpacked.type, unpacked, unpacked.params)
  }

  constructor(taskType, taskConfig, params = null) {
    this.type = taskType
    this.start = taskConfig.start
    this.id = taskConfig.id || this.generateId()
    this.params = params

    this.timeout = taskConfig.timeout
    this.delay = taskConfig.delay

    // 是否已经入队
    this.queued = false
  }

  markSent() {
    this.queued = true
    this.start = Date.now()
  }

  // uuid 防止失败恢复产生相同的 id
  generateId() {
    return chance.guid()
  }

  pack() {
    return JSON.stringify(this)
  }
}

module.exports = TaskRequest
