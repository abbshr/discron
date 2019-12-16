module.exports = 
  class GatewayRoutersDispatchTask {
    static get type() {
      return 1
    }

    static get config() {
      return {
        delay: 30e3,
        timeout: 120e3,
      }
    }

    async run() {
    }
  }
