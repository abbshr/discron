const sleep = require('await-sleep')
const TaskRequest = require('./task-request')
const TaskResponse = require('./task-response')

class Runner extends require('./discron') {
  /**
   *
   * @param {Array<Task>} taskClasses
   */
  constructor({
    requestKeyPrefix /** 请求队列名称前缀 */,
    responseKey /** 响应队列 */,
    backOffDuration /** */,
    redisCfg /** redis 配置 */,
    taskClasses /** 任务类定义列表 */,
    logger,
  }) {
    super(requestKeyPrefix, taskClasses.length, responseKey, redisCfg, logger)
    this.TASK_CLASSES = taskClasses
    this.BACK_OFF_DURATION = backOffDuration
  }

  start() {
    this.runEventLoop()
    this.logger.debug('执行器启动')
  }

  stop() {
    this.stopped = true
  }

  async runEventLoop() {
    for (;;) {
      if (this.stopped) {
        break
      }

      const taskRequest = await this.getTaskRequest()

      if (taskRequest) {
        await this.onRequest(taskRequest)
      }
    }
  }

  async getTaskRequest() {
    try {
      // 等待多个队列, 从多个队列里顺序选择一个就绪的
      return TaskRequest.unpack(await this.dequeRequestQueue())
    } catch (err) {
      // log
      this.logger.error(err, '获取任务请求包时出错')
      await sleep(this.BACK_OFF_DURATION)
      return null
    }
  }

  async onRequest(taskRequest) {
    const taskEntry = this.dispatchTask(taskRequest)

    if (!taskEntry) {
      return
    }

    const receipt = await this.execute(taskEntry)
    const taskResponse = new TaskResponse(taskRequest, receipt)
    await this.respond(taskResponse)
  }

  dispatchTask(taskRequest) {
    try {
      if (this.TASK_CLASSES[taskRequest.type]) {
        return new this.TASK_CLASSES[taskRequest.type](taskRequest)
      } else {
        throw new Error(`未找到相关任务: ${taskRequest.type}`)
      }
    } catch (err) {
      // log
      this.logger.error(err, '查找任务类时出错')
      return null
    }
  }

  async execute(task) {
    try {
      return await task.run()
    } catch (err) {
      // log
      this.logger.error(err, '执行任务时出错')
      return null
    }
  }

  async respond(taskResponse) {
    try {
      return await this.responseQueue.enque(taskResponse.pack())
    } catch (err) {
      // log
      this.logger.error(err, '发送任务响应时出错')
      return null
    }
  }
}

module.exports = Runner
