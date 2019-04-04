module.exports = (app, loadCtx) =>
  class GatewayRoutersDispatchTask extends require('./task') {
    constructor() {
      super(app, loadCtx)
    }

    static get type() {
      return 1
    }

    static get config() {
      return app.config.tasks[this.type]
    }

    async run() {
      await this.init()
      await this.ctx.service.router.syncRouter()
    }
  }
