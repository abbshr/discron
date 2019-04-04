module.exports = (app, loadCtx) =>
  class ContainerHeartbeatCheckTask extends require('./task') {
    constructor() {
      super(app, loadCtx)
    }

    static get type() {
      return 0
    }

    static get config() {
      return app.config.tasks[this.type]
    }

    async run() {
      await this.init()
      await this.ctx.service.netlink.checkNetLinkStatus()
    }
  }
