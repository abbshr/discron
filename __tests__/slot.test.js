const Slot = require('../slot')

describe('Slot', () => {
  it('#markDelay(taskType, taskRequest) should set the taskRequest on the taskType posision', () => {
    const slot = new Slot()
    slot.markDelay(0, { id: 'x' })
    slot.markDelay(1, { id: 'y' })
    slot.markDelay(2, { id: 'z' })

    expect(slot.slot.length).toBe(3)
    expect(slot.slot[0]).toEqual({ id: 'x' })
    expect(slot.slot[1]).toEqual({ id: 'y' })
    expect(slot.slot[2]).toEqual({ id: 'z' })
  })
  it('slot should be an iterable object', () => {
    const slot = new Slot()
    const tasks = [
      {
        id: 'x',
      },
      {
        id: 'y',
      },
      {
        id: 'z',
      },
    ]
    slot.markDelay(0, tasks[0])
    slot.markDelay(1, tasks[1])
    slot.markDelay(2, tasks[2])

    let i = 0
    for (const taskreq of slot) {
      expect(taskreq).toEqual(tasks[i++])
    }
  })

  it('#markDone(taskType) should mark the posision taskType as null (Done)', () => {
    const slot = new Slot()
    const tasks = [
      {
        id: 'x',
      },
      {
        id: 'y',
      },
      {
        id: 'z',
      },
    ]
    slot.markDelay(0, tasks[0])
    slot.markDelay(1, tasks[1])
    slot.markDelay(2, tasks[2])

    slot.markDone(1)
    expect(slot.slot[1]).toBeNull()
  })

  it('#hasDone(taskType) should tell if the task of taskType has finished', () => {
    const slot = new Slot()
    const tasks = [
      {
        id: 'x',
      },
      {
        id: 'y',
      },
      {
        id: 'z',
      },
    ]
    slot.markDelay(0, tasks[0])
    slot.markDelay(1, tasks[1])
    slot.markDelay(2, tasks[2])

    expect(slot.hasDone(1)).toBe(false)
    slot.markDone(1)
    expect(slot.hasDone(1)).toBe(true)
  })

  it('#get(taskType) should get the taskRequest object from the slot', () => {
    const slot = new Slot()
    const tasks = [
      {
        id: 'x',
      },
      {
        id: 'y',
      },
      {
        id: 'z',
      },
    ]
    slot.markDelay(0, tasks[0])
    slot.markDelay(1, tasks[1])
    slot.markDelay(2, tasks[2])
    slot.markDone(1)
    expect(slot.get(0)).toBe(tasks[0])
    expect(slot.get(1)).not.toBe(tasks[1])
    expect(slot.get(2)).toBe(tasks[2])
  })
})
