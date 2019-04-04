const TaskRequest = require('../task-request')
const TaskResponse = require('../task-response')

describe('Task Response', () => {
  it('should create an TaskResponse object', () => {
    const treq = new TaskRequest(0, {
      delay: 1e3,
      timeout: 2e3,
    })
    const tres = new TaskResponse(treq, null)
    expect(tres.id).toBe(treq.id)
    expect(tres.type).toBe(treq.type)
    expect(tres.receipt).toBe(null)
  })
  it('#pack should create an packed string from the TaskResponse object', () => {
    const treq = new TaskRequest(0, {
      delay: 1e3,
      timeout: 2e3,
    })
    const tres = new TaskResponse(treq, null)

    expect(tres.pack()).toEqual(JSON.stringify(tres))
  })
  it('TaskResponse.unpack should create a new TaskResponse from the string', () => {
    const treq = new TaskRequest(0, {
      delay: 1e3,
      timeout: 2e3,
    })
    const tres = new TaskResponse(treq, null)
    const packed = tres.pack()

    expect(TaskResponse.unpack(packed)).toEqual(tres)
  })
})
