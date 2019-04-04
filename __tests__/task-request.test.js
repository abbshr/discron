jest.mock('chance', () => () => ({
  guid() {
    return 1
  },
}))
const TaskRequest = require('../task-request')

describe('Task Request', () => {
  it('should create an TaskRequest object', () => {
    const fakeNow = Date.now()
    const tmp = Date.now
    Date.now = () => fakeNow
    const treq = new TaskRequest(0, { delay: 1e3, timeout: 2e3 })
    expect(treq.type).toBe(0)
    expect(treq.start).toBe(fakeNow)
    expect(treq.id).toBe(1)
    expect(treq.params).toBe(null)
    expect(treq.timeout).toBe(2e3)
    expect(treq.delay).toBe(1e3)
    Date.now = tmp
  })
  it('should create an TaskRequest object', () => {
    const fakeNow = Date.now()
    const treq = new TaskRequest(0, { id: 2, start: fakeNow, delay: 1e3, timeout: 2e3 }, {})
    expect(treq.type).toBe(0)
    expect(treq.start).toBe(fakeNow)
    expect(treq.id).toBe(2)
    expect(treq.params).toEqual({})
    expect(treq.timeout).toBe(2e3)
    expect(treq.delay).toBe(1e3)
  })
  it('#pack should create an packed string from the TaskRequest object', () => {
    const treq = new TaskRequest(0, {
      delay: 1e3,
      timeout: 2e3,
    })

    expect(treq.pack()).toEqual(JSON.stringify(treq))
  })
  it('TaskRequest.unpack should create a new TaskRequest from the string', () => {
    const treq = new TaskRequest(0, {
      delay: 1e3,
      timeout: 2e3,
    })
    const packed = treq.pack()

    expect(TaskRequest.unpack(packed)).toEqual(treq)
  })
})
