const chance = require('chance')()

module.exports = class Task {
  constructor(app, loadCtx) {
    this.ctx = { app }
    this.loadCtx = loadCtx
  }

  async init() {
    await this.loadCtx(this.ctx, () => null)
    this.ctx.traceId = chance.guid()
    this.ctx.logger = this.ctx.app.log.child({ trace_id: this.ctx.traceId })
  }
}
