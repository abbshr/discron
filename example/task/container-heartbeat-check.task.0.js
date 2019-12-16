module.exports =
  class ContainerHeartbeatCheckTask {
    static get type() {
      return 0
    }

    static get config() {
      return {
        delay: 50e3,
        timeout: 5e3,
      }
    }

    async run() {
      console.log("ContainerHeartbeatCheckTask start", new Date())
      await new Promise(resolve => setTimeout(resolve, 6e3))
      console.log("ContainerHeartbeatCheckTask done", new Date())
    }
  }
