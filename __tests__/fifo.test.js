const FIFO = require('../fifo')

describe('FIFO QUEUE', () => {
  it('#async enque(data, key) should push data to the tail of the queue', async () => {
    const fifo = new FIFO('queue-key', {
      schema: 'client:maersk:fifo:',
      env: 'test',
    })

    expect(fifo.queue.list._getList('queue-key').length).toBe(0)
    await fifo.enque('data-1')
    expect(fifo.queue.list._getList('queue-key').length).toBe(1)
    expect(fifo.queue.list._getList('queue-key')[0]).toBe('data-1')
    await fifo.enque('data-2')
    expect(fifo.queue.list._getList('queue-key').length).toBe(2)
    expect(fifo.queue.list._getList('queue-key')[0]).toBe('data-1')
    expect(fifo.queue.list._getList('queue-key')[1]).toBe('data-2')
    await fifo.deque()
    await fifo.deque()
  })

  it('#async deque(key) should return the elem on the head of the queue', async () => {
    const fifo = new FIFO('queue-key', {
      schema: 'client:maersk:fifo:',
      env: 'test',
    })

    expect(fifo.queue.list._getList('queue-key').length).toBe(0)
    await fifo.enque('data-1')
    await fifo.enque('data-2')
    expect(await fifo.deque()).toBe('data-1')
    expect(await fifo.deque()).toBe('data-2')
  })

  it('#size(key) should return the queue size', async () => {
    const fifo = new FIFO('queue-key', {
      schema: 'client:maersk:fifo:',
      env: 'test',
    })

    expect(await fifo.size()).toBe(0)
    await fifo.enque('data-1')
    await fifo.enque('data-2')
    expect(await fifo.size()).toBe(2)
  })
})
