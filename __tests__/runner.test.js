const Runner = require('../runner')
const TaskRequest = require('../task-request')
const TaskResponse = require('../task-response')

const logger = {
  error() {},
  debug() {},
  warn() {},
  info() {},
}

describe('Runner', () => {
  it('will create a Runner object', () => {
    const taskClasses = [
      class T1 {
        async run() {}
      },
      class T2 {
        async run() {}
      },
    ]
    const runner = new Runner({
      taskClasses,
      requestKeyPrefix: 'request-queue-key',
      responseKey: 'resposne-queue-key',
      backOffDuration: 1e3,
      redisCfg: {
        schema: 'client:maersk:',
        env: 'test',
      },
      logger,
    })
    expect(runner.TASK_CLASSES).toEqual(taskClasses)
  })

  it('#runEventLoop() should exit when #stopped is true', async () => {
    const taskClasses = [
      class T1 {
        async run() {}
      },
      class T2 {
        async run() {}
      },
    ]
    const runner = new Runner({
      taskClasses,
      requestKeyPrefix: 'request-queue-key',
      responseKey: 'resposne-queue-key',
      backOffDuration: 1e3,
      redisCfg: {
        schema: 'client:maersk:',
        env: 'test',
      },
      logger,
    })

    const taskRequest = new TaskRequest(0, {
      delay: 10e3,
      timeout: 20e3,
    })
    setTimeout(() => {
      runner.enqueRequestQueue(taskRequest.type, taskRequest.pack())
      runner.stop()
    }, 0.1e3)

    await runner.runEventLoop()
    expect(runner.stopped).toBeTruthy()
  })

  it('should send the response when run done or failure', async () => {
    const taskClasses = [
      class T1 {
        async run() {}
      },
      class T2 {
        async run() {}
      },
    ]
    const runner = new Runner({
      taskClasses,
      requestKeyPrefix: 'request-queue-key',
      responseKey: 'resposne-queue-key',
      backOffDuration: 1e3,
      redisCfg: {
        schema: 'client:maersk:',
        env: 'test',
      },
      logger,
    })

    const taskRequest = new TaskRequest(0, {
      delay: 10e3,
      timeout: 20e3,
    })
    runner.start()

    setTimeout(() => {
      runner.enqueRequestQueue(taskRequest.type, taskRequest.pack())
      runner.stop()
    }, 0.1e3)

    const packedResponse = new TaskResponse(taskRequest).pack()
    await expect(runner.responseQueue.deque()).resolves.toEqual(packedResponse)
  })

  it('should be ok if it is not able to create the TaskResponse', async () => {
    const taskClasses = [
      class T1 {
        async run() {}
      },
      class T2 {
        async run() {}
      },
    ]
    const runner = new Runner({
      taskClasses,
      requestKeyPrefix: 'request-queue-key',
      responseKey: 'resposne-queue-key',
      backOffDuration: 1e3,
      redisCfg: {
        schema: 'client:maersk:',
        env: 'test',
      },
      logger,
    })

    setTimeout(() => {
      runner.enqueRequestQueue(0, 'invalid packet')
      runner.stop()
    }, 0.1e3)

    await runner.runEventLoop()
    expect(runner.stopped).toBeTruthy()
  })

  it('should be ok if not found the Task Class', async () => {
    const taskClasses = [
      class T1 {
        async run() {}
      },
      class T2 {
        async run() {}
      },
    ]
    const runner = new Runner({
      taskClasses,
      requestKeyPrefix: 'request-queue-key',
      responseKey: 'resposne-queue-key',
      backOffDuration: 1e3,
      redisCfg: {
        schema: 'client:maersk:',
        env: 'test',
      },
      logger,
    })

    const taskRequest = new TaskRequest(3, {
      delay: 10e3,
      timeout: 20e3,
    })
    setTimeout(() => {
      runner.enqueRequestQueue(1, taskRequest.pack())
      runner.stop()
    }, 0.1e3)

    await runner.runEventLoop()
    expect(runner.stopped).toBeTruthy()
  })

  it('should be ok if task run threw', async () => {
    const taskClasses = [
      class T1 {
        async run() {
          throw new Error()
        }
      },
      class T2 {
        async run() {}
      },
    ]
    const runner = new Runner({
      taskClasses,
      requestKeyPrefix: 'request-queue-key',
      responseKey: 'resposne-queue-key',
      backOffDuration: 1e3,
      redisCfg: {
        schema: 'client:maersk:',
        env: 'test',
      },
      logger,
    })

    const taskRequest = new TaskRequest(0, {
      delay: 10e3,
      timeout: 20e3,
    })
    setTimeout(() => {
      runner.enqueRequestQueue(taskRequest.type, taskRequest.pack())
      runner.stop()
    }, 0.1e3)

    await runner.runEventLoop()
    expect(runner.stopped).toBeTruthy()
  })

  it('should be ok if enque failed', async () => {
    const taskClasses = [
      class T1 {
        async run() {}
      },
      class T2 {
        async run() {}
      },
    ]
    const runner = new Runner({
      taskClasses,
      requestKeyPrefix: 'request-queue-key',
      responseKey: 'resposne-queue-key',
      backOffDuration: 1e3,
      redisCfg: {
        schema: 'client:maersk:',
        env: 'test',
      },
      logger,
    })

    const taskRequest = new TaskRequest(0, {
      delay: 10e3,
      timeout: 20e3,
    })
    setTimeout(() => {
      runner.responseQueue.enque = () => {
        throw new Error()
      }
      runner.enqueRequestQueue(taskRequest.type, taskRequest.pack())
      runner.stop()
    }, 0.1e3)

    await runner.runEventLoop()
    expect(runner.stopped).toBeTruthy()
  })
})
