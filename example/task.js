const Discron = require('./discron')

// 启动调度器
function startScheduler(tasks, config, logger) {
  new Discron.Scheduler({
    requestKeyPrefix: config.requestKeyPrefix /** 请求队列 */,
    responseKey: config.responseKey /** 响应队列 */,
    backoffDuration: config.backOffDuration /** 失败回退时间间隔 */,
    cleanerFrequency: config.scheduler.cleanerFrequency /** 过期任务清扫频率 */,
    grabLockFrequency: config.scheduler.grabLockFrequency /** 锁竞争频率 */,
    redisCfg: config.redisCfg /** redis client 配置 */,
    mutexCfg: config.scheduler.mutexCfg /** 互斥锁配置 */,
    taskConfigList: tasks.map(t => t.config) /** 任务配置列表 */,
    logger,
  }).start()
}

// 启动执行器
function startExecutor(tasks, config, logger) {
  new Discron.Runner({
    requestKeyPrefix: config.requestKeyPrefix /** 请求队列 */,
    responseKey: config.responseKey /** 响应队列 */,
    backOffDuration: config.backOffDuration /** */,
    redisCfg: config.redisCfg /** redis 配置 */,
    taskClasses: tasks /** 任务类定义列表 */,
    logger,
  }).start()
}

/**
 * @desc Task 必须按照固定的编号顺序加载
 * @param {*} ctx
 */
function loadTasks(app, loadCtx) {
  return [
    require('./task/container-heartbeat-check.task.0')(app, loadCtx),
    require('./task/gateway-routers-dispatch.task.1')(app, loadCtx),
  ]
}

/**
 * 初始化任务机制
 */
module.exports = async app => {
  const loadCtx = await autoLoad(app, __dirname)
  const tasks = loadTasks(app, loadCtx)

  startScheduler(tasks, app.config.discron, app.log)
  startExecutor(tasks, app.config.discron, app.log)
}
