const FIFO = require('./fifo')

/**
 * @class 分布式定时调度任务
 */
class Discron {
  /**
   *
   * @param {*} requestKeyPrefix
   * @param {*} taskTypeCount
   * @param {*} responseKey
   * @param {*} redisCfg
   */
  constructor(requestKeyPrefix, taskTypeCount, responseKey, redisCfg, logger) {
    this.logger = logger

    this.requestQueueNameList = []

    // 根据任务种类数建立一一映射的队列
    for (let type = 0; type < taskTypeCount; type++) {
      const requestKey = `${requestKeyPrefix}:${type}`
      this.requestQueueNameList[type] = requestKey
    }

    // 轮转优先级列表
    this.rrList = Array.from(this.requestQueueNameList)

    this.requestQueueList = new FIFO(null, redisCfg)
    this.responseQueue = new FIFO(responseKey, redisCfg)

    this.stopped = false
  }

  getRequestQueueName(taskType) {
    return this.requestQueueNameList[taskType]
  }

  // 防止特殊情况下时间片被第一个队列连续占用
  rr() {
    this.rrList.push(this.rrList.shift())
    return this.rrList
  }

  dequeRequestQueue() {
    return this.requestQueueList.deque(this.rr())
  }

  enqueRequestQueue(taskType, data) {
    return this.requestQueueList.enque(data, this.getRequestQueueName(taskType))
  }

  sizeofRequestQueue(taskType) {
    return this.requestQueueList.size(this.getRequestQueueName(taskType))
  }
}

module.exports = Discron
