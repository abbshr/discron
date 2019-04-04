jest.mock(
  '../mutex',
  () =>
    class {
      async acquire() {
        return null
      }

      async free() {}
    },
)

const TaskRequest = require('../task-request')
const TaskResponse = require('../task-response')
const Scheduler = require('../scheduler')
const sleep = require('await-sleep')

const logger = {
  error() {},
  debug() {},
  warn() {},
  info() {},
}

describe('Scheduler', () => {
  it('should return a Scheduler object', () => {
    const sched = new Scheduler({
      requestKeyPrefix: 'request-queue-key' /** 请求队列 */,
      responseKey: 'response-queue-key' /** 响应队列 */,
      backoffDuration: 1e3 /** 失败回退时间间隔 */,
      cleanerFrequency: 1e3 /** 过期任务清扫频率 */,
      grabLockFrequency: 1e3 /** 锁竞争频率 */,
      redisCfg: {
        schema: 'client:maersk:',
      } /** redis client 配置 */,
      mutexCfg: {
        resourceId: 'mutex-resource-id',
        lockLeaseFactor: 0.1,
        lockExpire: 10,
      } /** 互斥锁配置 */,
      taskConfigList: [
        { delay: 1e3, timeout: 10e3 },
        { delay: 0.5e3, timeout: 10e3 },
      ] /** 任务配置列表 */,
      logger,
    })

    expect(sched.TASK_CONFIG_LIST).toEqual([
      {
        delay: 1e3,
        timeout: 10e3,
      },
      {
        delay: 0.5e3,
        timeout: 10e3,
      },
    ])

    expect(sched.BACK_OFF_DURATION).toBe(1e3)
    expect(sched.CLEANER_FREQUENCY).toBe(1e3)
    expect(sched.GRAB_LOCK_FREQUENCY).toBe(1e3)
  })

  it('#initDelay should occupy the slot posision', async () => {
    const sched = new Scheduler({
      requestKeyPrefix: 'request-queue-key',
      /** 请求队列 */
      responseKey: 'response-queue-key',
      /** 响应队列 */
      backoffDuration: 1e3,
      /** 失败回退时间间隔 */
      cleanerFrequency: 1e3,
      /** 过期任务清扫频率 */
      grabLockFrequency: 1e3,
      /** 锁竞争频率 */
      redisCfg: {
        schema: 'client:maersk:',
      },
      /** redis client 配置 */
      mutexCfg: {
        resourceId: 'mutex-resource-id',
        lockLeaseFactor: 0.1,
        lockExpire: 10,
      },
      /** 互斥锁配置 */
      taskConfigList: [
        {
          delay: 1e3,
          timeout: 10e3,
        },
        {
          delay: 0.5e3,
          timeout: 10e3,
        },
      ],
      /** 任务配置列表 */
      logger,
    })

    expect(sched.delaySlot.slot.filter(e => e).length).toBe(0)
    sched.initDelay()
    await sleep(0.1e3)
    expect(sched.delaySlot.slot.filter(e => e).length).toBe(2)
    let i = 0
    for (const x of sched.delaySlot) {
      expect(x.delay).toBe(sched.TASK_CONFIG_LIST[i++].delay)
    }
  })

  it('#runEventLoop() should exit when #stopped is true', async () => {
    const sched = new Scheduler({
      requestKeyPrefix: 'request-queue-key',
      /** 请求队列 */
      responseKey: 'response-queue-key',
      /** 响应队列 */
      backoffDuration: 1e3,
      /** 失败回退时间间隔 */
      cleanerFrequency: 1e3,
      /** 过期任务清扫频率 */
      grabLockFrequency: 1e3,
      /** 锁竞争频率 */
      redisCfg: {
        schema: 'client:maersk:',
      },
      /** redis client 配置 */
      mutexCfg: {
        resourceId: 'mutex-resource-id',
        lockLeaseFactor: 0.1,
        lockExpire: 10,
      },
      /** 互斥锁配置 */
      taskConfigList: [
        {
          delay: 1e3,
          timeout: 10e3,
        },
        {
          delay: 0.5e3,
          timeout: 10e3,
        },
      ],
      /** 任务配置列表 */
      logger,
    })

    sched.initDelay()
    await sleep(0.1e3)
    const taskRequest = sched.delaySlot.get(0)
    const taskResponse = new TaskResponse(taskRequest)

    setTimeout(() => {
      sched.responseQueue.enque(taskResponse.pack())
      sched.stop()
    }, 0.1e3)

    await sched.runEventLoop()
    expect(sched.stopped).toBeTruthy()
  })

  it('should be ok if get task response failed', async () => {
    const sched = new Scheduler({
      requestKeyPrefix: 'request-queue-key',
      /** 请求队列 */
      responseKey: 'response-queue-key',
      /** 响应队列 */
      backoffDuration: 1e3,
      /** 失败回退时间间隔 */
      cleanerFrequency: 1e3,
      /** 过期任务清扫频率 */
      grabLockFrequency: 1e3,
      /** 锁竞争频率 */
      redisCfg: {
        schema: 'client:maersk:',
      },
      /** redis client 配置 */
      mutexCfg: {
        resourceId: 'mutex-resource-id',
        lockLeaseFactor: 0.1,
        lockExpire: 10,
      },
      /** 互斥锁配置 */
      taskConfigList: [
        {
          delay: 1e3,
          timeout: 10e3,
        },
        {
          delay: 0.5e3,
          timeout: 10e3,
        },
      ],
      /** 任务配置列表 */
      logger,
    })

    setTimeout(() => {
      sched.responseQueue.enque('invalid response')
      sched.stop()
    }, 0.1e3)

    await sched.runEventLoop()
    expect(sched.stopped).toBeTruthy()
  })
  it('should be ok if it is not able to get a task request from slot', async () => {
    const sched = new Scheduler({
      requestKeyPrefix: 'request-queue-key',
      /** 请求队列 */
      responseKey: 'response-queue-key',
      /** 响应队列 */
      backoffDuration: 1e3,
      /** 失败回退时间间隔 */
      cleanerFrequency: 1e3,
      /** 过期任务清扫频率 */
      grabLockFrequency: 1e3,
      /** 锁竞争频率 */
      redisCfg: {
        schema: 'client:maersk:',
      },
      /** redis client 配置 */
      mutexCfg: {
        resourceId: 'mutex-resource-id',
        lockLeaseFactor: 0.1,
        lockExpire: 10,
      },
      /** 互斥锁配置 */
      taskConfigList: [
        {
          delay: 1e3,
          timeout: 10e3,
        },
        {
          delay: 0.5e3,
          timeout: 10e3,
        },
      ],
      /** 任务配置列表 */
      logger,
    })

    const taskRequest = new TaskRequest(0, {
      delay: 1e3,
      timeout: 10e3,
    })
    const taskResponse = new TaskResponse(taskRequest)
    setTimeout(() => {
      sched.responseQueue.enque(taskResponse.pack())
      sched.stop()
    }, 0.1e3)

    await sched.runEventLoop()
    expect(sched.stopped).toBeTruthy()
  })
  it('should be ok if it is not able to get the task config from the #TASK_CONFIG_LIST', async () => {
    const sched = new Scheduler({
      requestKeyPrefix: 'request-queue-key',
      /** 请求队列 */
      responseKey: 'response-queue-key',
      /** 响应队列 */
      backoffDuration: 1e3,
      /** 失败回退时间间隔 */
      cleanerFrequency: 1e3,
      /** 过期任务清扫频率 */
      grabLockFrequency: 1e3,
      /** 锁竞争频率 */
      redisCfg: {
        schema: 'client:maersk:',
      },
      /** redis client 配置 */
      mutexCfg: {
        resourceId: 'mutex-resource-id',
        lockLeaseFactor: 0.1,
        lockExpire: 10,
      },
      /** 互斥锁配置 */
      taskConfigList: [
        {
          delay: 1e3,
          timeout: 10e3,
        },
        {
          delay: 0.5e3,
          timeout: 10e3,
        },
      ],
      /** 任务配置列表 */
      logger,
    })

    const taskRequest = new TaskRequest(3, {
      delay: 1e3,
      timeout: 10e3,
    })
    sched.delaySlot.markDelay(3, taskRequest)

    const taskResponse = new TaskResponse(taskRequest)
    setTimeout(() => {
      sched.responseQueue.enque(taskResponse.pack())
      sched.stop()
    }, 0.1e3)

    await sched.runEventLoop()
    expect(sched.stopped).toBeTruthy()
  })

  it('should be ok if #request failed', async () => {
    const sched = new Scheduler({
      requestKeyPrefix: 'request-queue-key',
      /** 请求队列 */
      responseKey: 'response-queue-key',
      /** 响应队列 */
      backoffDuration: 1e3,
      /** 失败回退时间间隔 */
      cleanerFrequency: 1e3,
      /** 过期任务清扫频率 */
      grabLockFrequency: 1e3,
      /** 锁竞争频率 */
      redisCfg: {
        schema: 'client:maersk:',
      },
      /** redis client 配置 */
      mutexCfg: {
        resourceId: 'mutex-resource-id',
        lockLeaseFactor: 0.1,
        lockExpire: 10,
      },
      /** 互斥锁配置 */
      taskConfigList: [
        {
          delay: 1e3,
          timeout: 10e3,
        },
        {
          delay: 0.5e3,
          timeout: 10e3,
        },
      ],
      /** 任务配置列表 */
      logger,
    })

    sched.initDelay()
    await sleep(0.1e3)

    const taskRequest = new TaskRequest(0, {
      delay: 1e3,
      timeout: 10e3,
    })

    const taskResponse = new TaskResponse(taskRequest)
    setTimeout(() => {
      sched.enqueRequestQueue = () => {
        throw new Error()
      }
      sched.responseQueue.enque(taskResponse.pack())
      sched.stop()
    }, 0.1e3)

    await sched.runEventLoop()
    expect(sched.stopped).toBeTruthy()
  })
  it('#runCleaner() should set a timer #cleaner', async () => {
    const sched = new Scheduler({
      requestKeyPrefix: 'request-queue-key',
      /** 请求队列 */
      responseKey: 'response-queue-key',
      /** 响应队列 */
      backoffDuration: 1e3,
      /** 失败回退时间间隔 */
      cleanerFrequency: 0.5e3,
      /** 过期任务清扫频率 */
      grabLockFrequency: 1e3,
      /** 锁竞争频率 */
      redisCfg: {
        schema: 'client:maersk:',
      },
      /** redis client 配置 */
      mutexCfg: {
        resourceId: 'mutex-resource-id',
        lockLeaseFactor: 0.1,
        lockExpire: 10,
      },
      /** 互斥锁配置 */
      taskConfigList: [
        {
          delay: 1e3,
          timeout: 0.1e3,
        },
        {
          delay: 0.5e3,
          timeout: 10e3,
        },
      ],
      /** 任务配置列表 */
      logger,
    })

    sched.initDelay()
    await sleep(0.5e3)
    const taskreqs = Array.from(sched.delaySlot.slot)
    sched.runCleaner()
    expect(sched.cleaner).toBeDefined()
    await sleep(0.6e3)
    expect(sched.delaySlot.slot[0].start).not.toBe(taskreqs[0].start)
    expect(sched.delaySlot.slot[0].id).not.toBe(taskreqs[0].id)
    expect(sched.delaySlot.slot[1].start).toBe(taskreqs[1].start)
    expect(sched.delaySlot.slot[1].id).toBe(taskreqs[1].id)
    await sched.stop()
  })

  it('#acquireMutex() should return true if success', async () => {
    const sched = new Scheduler({
      requestKeyPrefix: 'request-queue-key',
      /** 请求队列 */
      responseKey: 'response-queue-key',
      /** 响应队列 */
      backoffDuration: 1e3,
      /** 失败回退时间间隔 */
      cleanerFrequency: 0.5e3,
      /** 过期任务清扫频率 */
      grabLockFrequency: 1e3,
      /** 锁竞争频率 */
      redisCfg: {
        schema: 'client:maersk:',
      },
      /** redis client 配置 */
      mutexCfg: {
        resourceId: 'mutex-resource-id',
        lockLeaseFactor: 0.1,
        lockExpire: 10,
      },
      /** 互斥锁配置 */
      taskConfigList: [
        {
          delay: 1e3,
          timeout: 0.1e3,
        },
        {
          delay: 0.5e3,
          timeout: 10e3,
        },
      ],
      /** 任务配置列表 */
      logger,
    })

    await expect(sched.acquireMutex()).resolves.toBeTruthy()
  })

  it('#acquireMutex() should return err if failed', async () => {
    const sched = new Scheduler({
      requestKeyPrefix: 'request-queue-key',
      /** 请求队列 */
      responseKey: 'response-queue-key',
      /** 响应队列 */
      backoffDuration: 1e3,
      /** 失败回退时间间隔 */
      cleanerFrequency: 0.5e3,
      /** 过期任务清扫频率 */
      grabLockFrequency: 1e3,
      /** 锁竞争频率 */
      redisCfg: {
        schema: 'client:maersk:',
      },
      /** redis client 配置 */
      mutexCfg: {
        resourceId: 'mutex-resource-id',
        lockLeaseFactor: 0.1,
        lockExpire: 10,
      },
      /** 互斥锁配置 */
      taskConfigList: [
        {
          delay: 1e3,
          timeout: 0.1e3,
        },
        {
          delay: 0.5e3,
          timeout: 10e3,
        },
      ],
      /** 任务配置列表 */
      logger,
    })

    sched.mutex.acquire = () => new Error()
    await expect(sched.acquireMutex()).resolves.toBeFalsy()
  })
  it('#freeMutex() should be ok if failed', async () => {
    const sched = new Scheduler({
      requestKeyPrefix: 'request-queue-key',
      /** 请求队列 */
      responseKey: 'response-queue-key',
      /** 响应队列 */
      backoffDuration: 1e3,
      /** 失败回退时间间隔 */
      cleanerFrequency: 0.5e3,
      /** 过期任务清扫频率 */
      grabLockFrequency: 1e3,
      /** 锁竞争频率 */
      redisCfg: {
        schema: 'client:maersk:',
      },
      /** redis client 配置 */
      mutexCfg: {
        resourceId: 'mutex-resource-id',
        lockLeaseFactor: 0.1,
        lockExpire: 10,
      },
      /** 互斥锁配置 */
      taskConfigList: [
        {
          delay: 1e3,
          timeout: 0.1e3,
        },
        {
          delay: 0.5e3,
          timeout: 10e3,
        },
      ],
      /** 任务配置列表 */
      logger,
    })

    sched.mutex.free = () => {
      throw new Error()
    }
    await expect(sched.freeMutex()).resolves.toBeUndefined()
  })
  it('#start() should be ok', async () => {
    const sched = new Scheduler({
      requestKeyPrefix: 'request-queue-key',
      /** 请求队列 */
      responseKey: 'response-queue-key',
      /** 响应队列 */
      backoffDuration: 1e3,
      /** 失败回退时间间隔 */
      cleanerFrequency: 0.5e3,
      /** 过期任务清扫频率 */
      grabLockFrequency: 1e3,
      /** 锁竞争频率 */
      redisCfg: {
        schema: 'client:maersk:',
      },
      /** redis client 配置 */
      mutexCfg: {
        resourceId: 'mutex-resource-id',
        lockLeaseFactor: 0.1,
        lockExpire: 10,
      },
      /** 互斥锁配置 */
      taskConfigList: [
        {
          delay: 1e3,
          timeout: 0.1e3,
        },
        {
          delay: 0.5e3,
          timeout: 10e3,
        },
      ],
      /** 任务配置列表 */
      logger,
    })

    sched.mutex.acquire = () => sleep(0.2e3)
    const x = sched.start()
    await sched.stop()
    await x
    expect(sched.stopped).toBeTruthy()
  })
  it('#start() should be ok', async () => {
    const sched = new Scheduler({
      requestKeyPrefix: 'request-queue-key',
      /** 请求队列 */
      responseKey: 'response-queue-key',
      /** 响应队列 */
      backoffDuration: 1e3,
      /** 失败回退时间间隔 */
      cleanerFrequency: 0.5e3,
      /** 过期任务清扫频率 */
      grabLockFrequency: 1e3,
      /** 锁竞争频率 */
      redisCfg: {
        schema: 'client:maersk:',
      },
      /** redis client 配置 */
      mutexCfg: {
        resourceId: 'mutex-resource-id',
        lockLeaseFactor: 0.1,
        lockExpire: 10,
      },
      /** 互斥锁配置 */
      taskConfigList: [
        {
          delay: 1e3,
          timeout: 0.1e3,
        },
        {
          delay: 0.5e3,
          timeout: 10e3,
        },
      ],
      /** 任务配置列表 */
      logger,
    })

    // sched.mutex.acquire = () => sleep(0.2e3)
    expect(sched.locked).toBeUndefined()
    await sched.start()
    expect(sched.locked).toBeTruthy()
    await sched.stop()
  })
  it('#start() should be ok', async () => {
    const sched = new Scheduler({
      requestKeyPrefix: 'request-queue-key',
      /** 请求队列 */
      responseKey: 'response-queue-key',
      /** 响应队列 */
      backoffDuration: 1e3,
      /** 失败回退时间间隔 */
      cleanerFrequency: 0.5e3,
      /** 过期任务清扫频率 */
      grabLockFrequency: 1e3,
      /** 锁竞争频率 */
      redisCfg: {
        schema: 'client:maersk:',
      },
      /** redis client 配置 */
      mutexCfg: {
        resourceId: 'mutex-resource-id',
        lockLeaseFactor: 0.1,
        lockExpire: 10,
      },
      /** 互斥锁配置 */
      taskConfigList: [
        {
          delay: 1e3,
          timeout: 0.1e3,
        },
        {
          delay: 0.5e3,
          timeout: 10e3,
        },
      ],
      /** 任务配置列表 */
      logger,
    })

    sched.mutex.acquire = () => new Error()
    expect(sched.locked).toBeUndefined()
    expect(sched.graber).toBeUndefined()
    await sched.start()
    expect(sched.graber).toBeDefined()
    expect(sched.locked).toBeUndefined()
    await sched.stop()
  })
})
