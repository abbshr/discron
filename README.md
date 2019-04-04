Discron
===

一款分布式延时任务框架. 适用于希望固定相邻任务的起止间隔的场景, 如: "前次任务结束后, T时间后再来一次" 这种往复的周期性任务.

## 特性

- 任务的固定启停间隔保障
- 多点运行高可用

### 工作图示

```
|taskA run 10min | <fix interval> | taskA run 2min | <fix interval> | taskA run 5min | ...
    |taskB run 1min | <fix interval> | taskB run 1min | <fix interval> | taskB run 10s | ...
...
```

## 快速开始

1. 编写任务类及其定时配置

2. 初始化调度器

3. 初始化执行器

## 配置

### `Task` 配置

```js
class MyTask {
  /**
   * @static
   * @return {Number}
   * @desc 标识任务种类
   */
  static get type() {
    0
  }

  /**
   * @static
   * @return {Object {delay: Number, timeout: Number}}
   * @desc 任务的延迟和超时配置
   */
  static get config() {
    return {
      delay: 10e3,
      timeout: 120e3
    }
  }
}
```

```yml
config:
  requestKeyPrefix: 'request:{queue}' # 请求队列名公共前缀
  responseKey: 'response:{queue}' # 响应队列名
  backOffDuration: 2000 # 失败回退时间间隔
  scheduler: # 调度器
    cleanerFrequency: 1000 # 过期任务清扫频率
    grabLockFrequency: 1000 # 锁竞争频率
    mutexCfg: # 互斥锁配置
      resourceId: 'scheduler:mutex'
      lockLeaseFactor: 0.5
      lockExpire: 10000
  redisCfg: # redis 配置, 见 https://github.com/luin/ioredis#cluster
    nodes:
      - host: 172.16.0.1
        port: 6379
      - host: 172.16.0.2
        port: 6379
    options: {}
```

## API

### `Discron.Scheduler`

调度器类.

#### `Scheduler` 配置

```js
const schedulerConfig = {
  requestKeyPrefix: config.requestKeyPrefix /** 请求队列名公共前缀 */,
  responseKey: config.responseKey /** 响应队列名 */,
  backoffDuration: config.backOffDuration /** 失败回退时间间隔 */,
  cleanerFrequency: config.scheduler.cleanerFrequency /** 过期任务清扫频率 */,
  grabLockFrequency: config.scheduler.grabLockFrequency /** 锁竞争频率 */,
  redisCfg: config.redisCfg /** redis client 配置 */,
  mutexCfg: config.scheduler.mutexCfg /** 互斥锁配置 */,
  taskConfigList/** 任务配置列表 */,
  logger, /** 日志对象 */
}
```

##### `taskConfigList`

Task 的配置数组, 如: `taskConfigList: [MyTask.config, ...]`

```js
const scheduler = new Discron.Scheduler(schedulerConfig)
await scheduler.start()
```

### `Discron.Runner`

执行器类.

#### `Runner` 配置

```js
const runnerConfig = {
  requestKeyPrefix: config.requestKeyPrefix /** 请求队列名公共前缀 */,
  responseKey: config.responseKey /** 响应队列名 */,
  backOffDuration: config.backOffDuration /** */,
  redisCfg: config.redisCfg /** redis 配置 */,
  taskClasses /** 任务类定义列表 */,
  logger, /** 日志对象 */
}
```

##### `taskClasses`

Task 类的数组, 如: `taskClasses: [MyTask, ...]`

```js
const runner = new Discron.Runner(runnerConfig)
await runner.start()
```

### 搭建高可用任务集群

HA 模式需要至少两个调度器节点和两个执行器节点分布于两台机器上. 可以分别将一个调度器和一个执行器组合放到一个机器上.

启动后调度器选主成功后只有一个调度节点可以工作, 另一个节点监听. 如果其中一个节点失效, 在配置的互斥锁过期时间达到后, 另一个节点会晋升为主节点, 仍然可以维持工作.

两个执行器都可以工作, 但对外依然表现为任务具备固定的执行周期. 如果其中起一个节点失效, 另一个仍然可以正常工作.

#### 一些不能保证的情况

- 依赖 redis, 如果 redis 不可用 (包括但不限于 redis 自身无法服务, 节点与 redis 之间的连接有问题), 则任务集群无法正常工作.

## 框架设计

定时任务系统的核心分为:

- 调度器 (Scheduler)
- 执行器 (Runner)

执行器可以是任意个节点集群, 从任务请求队列里竞争任务请求. 取到任务后立即执行, 执行完毕后生成任务响应放到任务响应队列.

调度器透过 mutex 组件, 可以做成一个 HA 的集群, 多个调度器节点启动后竞争 mutex, 优先得到者成为主节点. 同一时间内只有主节点可以工作.

未能成为主节点的调度器, 将定期低频索要 mutex.

成为主节点的调度器, 将以略高的频次 (短于 mutex 的过期时间) 心跳, 给申请到的 mutex 续租, 以维持自身的主节点地位.

调度器主节点根据任务类型的配置, 定期创建任务请求并推入任务请求队列, 同时在本地存储到一个 slot 中, 并打 timeout 设置.

主节点中存在一个定期清扫 timer, 以很高的频次扫描 slot, 检查其 timeout 设置, 如果超时则清除掉, 然后重新调度该类型的任务.

此外, 主节点长期监听任务响应队列, 以便在本地 slot 内的任务请求超时之前, 得知任务的执行情况, 及时开始下一次调度.

每次调度都生成一个延迟任务: 插入本地 slot, 等待固定的时间后, 同时推入任务请求队列.

为了防止在没有执行器的情况下会产生任务请求队列堆积导致执行器接入时任务并发执行, discron 根据任务类型创建多种请求队列, 调度器每次派发任务前先检查对应队列长度是否不为空, 如果是则跳过本次派发, 启动下次延迟派发.

### 实现

请求/响应队列: Redis List (rpush + blpop)
mutex: Redis CAS