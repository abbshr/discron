/**
 * @class 使用数组实现的延迟任务槽, 根据类型存放任务请求
 *
 * task_type | task_request
 * -----------------------
 *     0     | { start, id, type, timeout, delay, params }
 *     1     | { start, id, type, timeout, delay, params }
 *     2     | { start, id, type, timeout, delay, params }
 * ...
 *
 * @implements Iterator
 */
class Slot {
  /**
   *
   * @param {Array<String>} ENUM_TASK_TYPES 枚举任务类型
   */
  constructor(/** */) {
    this.slot = []
  }

  [Symbol.iterator]() {
    return this.slot[Symbol.iterator]()
  }

  markDone(taskType) {
    this.slot[taskType] = null
  }

  markDelay(taskType, taskRequest) {
    this.slot[taskType] = taskRequest
  }

  hasDone(taskType) {
    return !this.slot[taskType]
  }

  get(taskType) {
    return this.slot[taskType]
  }
}

module.exports = Slot
