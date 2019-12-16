const sleep = require('await-sleep')
const Slot = require('./slot')
const Mutex = require('./mutex')
const TaskRequest = require('./task-request')
const TaskResponse = require('./task-response')

class Scheduler extends require('./discron') {
  /**
   * @param {Array<TaskConfig>} taskConfigList
   *
   * TaskConfig { type, timeout, delay }
   */
  constructor({
    requestKeyPrefix /** 请求队列名称前缀 */,
    responseKey /** 响应队列 */,
    backoffDuration /** 失败回退时间间隔 */,
    cleanerFrequency /** 过期任务清扫频率 */,
    grabLockFrequency /** 锁竞争频率 */,
    redisCfg /** redis client 配置 */,
    taskConfigList /** 任务配置列表 */,
    mutexCfg /** 互斥锁配置 */,
    logger,
  }) {
    super(requestKeyPrefix, taskConfigList.length, responseKey, redisCfg, logger)

    this.delaySlot = new Slot()
    this.mutex = new Mutex(redisCfg, mutexCfg, logger)
    this.TASK_CONFIG_LIST = taskConfigList
    this.BACK_OFF_DURATION = backoffDuration
    this.CLEANER_FREQUENCY = cleanerFrequency
    this.GRAB_LOCK_FREQUENCY = grabLockFrequency
  }

  async start() {
    if (!(await this.acquireMutex())) {
      this.graber = setTimeout(() => this.start(), this.GRAB_LOCK_FREQUENCY)
    } else if (this.stopped) {
      await this.freeMutex()
    } else {
      this.locked = true
      this.initDelay()
      this.runCleaner()
      this.runEventLoop()
      this.logger.info('调度器启动')
    }
  }

  async stop() {
    this.stopped = true
    clearTimeout(this.graber)
    this.graber = null

    clearTimeout(this.cleaner)
    this.cleaner = null

    if (this.locked) {
      await this.freeMutex()
    }
  }

  /**
   * 初始化生成一批延迟任务
   */
  initDelay() {
    this.TASK_CONFIG_LIST.forEach((_, taskType) => this.delay(taskType))
  }

  async acquireMutex() {
    const err = await this.mutex.acquire()
    if (err) {
      let level = 'error'
      if (err.type === 'mutex_locked') {
        level = 'debug'
      }

      // 如果已经上锁了, 日志等级仅为 debug
      this.logger[level](err, '调度器未取得互斥锁')
      return false
    }

    return true
  }

  async freeMutex() {
    try {
      await this.mutex.free()
    } catch (err) {
      this.logger.error(err, '释放互斥锁出错')
    }
  }

  async runEventLoop() {
    for (;;) {
      if (this.stopped) {
        break
      }

      // 监听响应队列
      const taskResponse = await this.getTaskResponse()

      if (taskResponse) {
        this.onRespond(taskResponse)
      }
    }
  }

  async getTaskResponse() {
    try {
      return TaskResponse.unpack(await this.responseQueue.deque())
    } catch (err) {
      // log
      this.logger.error(err, '解析任务响应包失败')
      await sleep(this.BACK_OFF_DURATION)
      return null
    }
  }

  onRespond(taskResponse) {
    const taskType = taskResponse.type
    const task = this.delaySlot.get(taskType)

    // 如果槽位中存在指定 id 的任务
    if (task && task.id === taskResponse.id) {
      this.nextTick(taskType)
    }
  }

  runCleaner() {
    this.cleaner = setTimeout(() => {
      const now = Date.now()
      for (const task of this.delaySlot) {
        if (task && task.queued) {
          this.onTimeout(now, task)
        }
      }
      this.cleaner.refresh()
    }, this.CLEANER_FREQUENCY)
  }

  onTimeout(now, task) {
    // 如果任务在槽里的存在时间太久, 这里会清除掉
    if (now - task.start > task.timeout) {
      this.nextTick(task.type)
    }
  }

  async nextTick(taskType) {
    // 置空槽位 (该任务类型为完成)
    this.delaySlot.markDone(taskType)
    // 调度下一轮延迟任务
    this.delay(taskType)
  }

  // @note 如果请求队列不为空, 则推迟到下一轮
  async delay(taskType) {
    const taskConfig = this.TASK_CONFIG_LIST[taskType]
    if (!taskConfig) {
      // log error: 未定义的任务类型
      this.logger.error('未定义的任务类型 %s', taskType)
      return null
    }

    const taskRequest = new TaskRequest(taskType, taskConfig)

    // 标记任务槽为占用
    this.delaySlot.markDelay(taskType, taskRequest)
    // 推迟 ms
    await sleep(taskRequest.delay)
    await this.prepareRequest(taskRequest)
  }

  async prepareRequest(taskRequest) {
    let size = 1
    try {
      size = await this.sizeofRequestQueue(taskRequest.type)
    } catch (err) {
      // log
      this.logger.error(err, '获取请求队列长度时出错, 任务请求: %j', taskRequest)
    }

    // 检查队列长度
    if (size < 1) {
      // 到达推迟时间, 入队
      await this.request(taskRequest)
    } else {
      // 如果队列中仍存在未被执行的任务, 则推迟本次任务分发
      this.delay(taskRequest.type)
    }
  }

  async request(taskRequest) {
    try {
      // 推到对应类型的请求队列里
      return await this.enqueRequestQueue(taskRequest.type, taskRequest.pack())
    } catch (err) {
      // request 失败可能由于:
      // 1. 网络隔离
      // 2. 入队失败
      // todo 失败策略
      // log
      this.logger.error(err, '发起任务请求失败')
      return null
    } finally {
      // 无论成功与否, 都标记任务已发出
      // (task 再次 delay 的时间点取决于 min(timeout [+ CLEANER_FREQUENCY], executing time))
      taskRequest.markSent()
    }
  }
}

module.exports = Scheduler
