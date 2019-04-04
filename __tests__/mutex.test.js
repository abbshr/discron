const mockMutil = {
  exec() {},
  execOK() {
    return 'OK'
  },
  execConnError() {
    throw new Error()
  },
  execHasBeenModified() {
    return null
  },
}

jest.mock(
  'ioredis',
  () => ({
    Cluster: class {
      async watch() {}
      async watchOK() {}
      async watchConnError() {
        throw new Error()
      }

      async get() {}
      async getOccupy() {
        return 'occupy'
      }
      async getNotOccupy() {
        return 'free'
      }
      async getConnError() {
        throw new Error()
      }

      async multi() {
        return {
          set() {
            return mockMutil
          },
        }
      }

      async set() {}
      async setOK() {
        return 'OK'
      }
      async setConnError() {
        throw new Error()
      }
    }
  })
)

const Mutex = require('../mutex')
const logger = {
  error() {},
  debug() {},
  warn() {},
  info() {},
}

describe('when mutex acquire failure', () => {
  it('#acquire() should failed when mutex was occupied', async () => {
    const resourceId = 'resource'
    const mutex = new Mutex(
      {
        schema: 'client:maersk:',
        env: 'test',
      },
      {
        resourceId,
        lockLeaseFactor: 0.5,
        lockExpire: 10,
      },
      logger,
    )

    mutex.keeper.get = mutex.keeper.getOccupy
    mutex.keeper.watch = mutex.keeper.watchOK
    mockMutil.exec = mockMutil.execOK

    expect(await mutex.acquire()).toBeInstanceOf(Error)
  })

  it('#acquire() should failed when mutex was occupied in concurrent acquiring', async () => {
    const resourceId = 'resource'
    const mutex = new Mutex(
      {
        schema: 'client:maersk:',
        env: 'test',
      },
      {
        resourceId,
        lockLeaseFactor: 0.5,
        lockExpire: 10,
      },
      logger,
    )

    mutex.keeper.get = mutex.keeper.getNotOccupy
    mutex.keeper.watch = mutex.keeper.watchOK
    mockMutil.exec = mockMutil.execHasBeenModified

    expect(await mutex.acquire()).toBeInstanceOf(Error)
  })
})
