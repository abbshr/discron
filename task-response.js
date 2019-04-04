class TaskResponse {
  static unpack(packedTaskResponse) {
    const unpacked = JSON.parse(packedTaskResponse)
    return new TaskResponse(unpacked, unpacked.receipt)
  }

  constructor(taskRequest, receipt) {
    this.id = taskRequest.id
    this.type = taskRequest.type
    this.receipt = receipt
  }

  pack() {
    return JSON.stringify(this)
  }
}

module.exports = TaskResponse
