const getRedisClient = require('./redis')

/**
 * @class 互斥信号量
 */
class Mutex {
  /**
   *
   * @param {*} redisCfg
   * @param {*} redisCfg.nodes
   * @param {*} redisCfg.options
   * @param {*} cfg
   * @param {*} cfg.resourceId
   * @param {*} cfg.lockLeaseFactor
   * @param {*} cfg.lockExpire
   */
  constructor(redisCfg, cfg, logger) {
    this.logger = logger
    // 资源标识符
    this.resourceId = cfg.resourceId

    // 资源持有者
    this.keeper = getRedisClient(redisCfg)
    this.localLock = false
    // 自动续租定时器
    this.lockRenter = null

    // 续租频率因子, factor ∈ (0, 1)
    // 续租周期 = lockExpire * 1000 * factor
    this.lockLeaseFactor = cfg.lockLeaseFactor
    // 锁过期时间间隔 (s)
    this.lockExpire = cfg.lockExpire / 1e3
  }

  get STATE() {
    return {
      OCCUPY: 'occupy',
      FREE: 'free',
    }
  }

  get resourceLocation() {
    return this.resourceId
  }

  // 资源本地镜像是否被加锁
  get isLocked() {
    return !!this.localLock
  }

  // 资源本地镜像加锁
  lock() {
    this.localLock = true
  }

  // 解锁本地镜像
  unlock() {
    this.localLock = false
  }

  // 尝试给资源加锁
  async lockWithExpire() {
    try {
      // 通过 redis 模拟 CAS.
      await this.keeper.watch(this.resourceLocation)

      const status = await this.keeper.get(this.resourceLocation)
      if (status === this.STATE.OCCUPY) {
        const err = new Error(`已被锁定`)
        err.type = 'mutex_locked'
        throw err
      }

      const tx = await this.keeper.multi()
      const ret = await tx
        .set(this.resourceLocation, this.STATE.OCCUPY, 'ex', this.lockExpire)
        .exec()
      if (!ret) {
        const err = new Error(`已被锁定`)
        err.type = 'mutex_locked'
        throw err
      }
    } catch (err) {
      err.message = `资源 ${this.resourceId} 申请加锁失败, ${err.message}`
      throw err
    }
  }

  // 用心跳给互斥锁续租期
  heartbeat() {
    // 任务结束解锁后, 不再心跳
    if (!this.isLocked) return

    this.lockRenter = setTimeout(async () => {
      try {
        await this.keeper.set(this.resourceLocation, this.STATE.OCCUPY, 'ex', this.lockExpire)
      } catch (err) {
        this.logger.error(err, '资源 [%s] 锁续租失败, 重试中', this.resourceId)
      }

      this.heartbeat()
    }, this.lockExpire * 1000 * this.lockLeaseFactor)
  }

  // 锁定资源
  // 成功返回 null
  // 失败返回 Error
  async acquire() {
    if (this.isLocked) {
      return new Error(`资源 ${this.resourceId} 本地加锁失败, 已被锁定`)
    }

    // inner-process 内存互斥锁, 防止 redis 使用同一连接后事务失效.
    this.lock()

    try {
      // 设置过期时间, 防止意外死锁.
      await this.lockWithExpire()

      // 心跳
      this.heartbeat()
      return null
    } catch (err) {
      // 申请失败后释放本地锁
      this.unlock()
      return err
    }
  }

  // 释放资源
  async free() {
    this.unlock()
    clearTimeout(this.lockRenter)
    this.lockRenter = null
    await this.keeper.set(this.resourceLocation, this.STATE.FREE)
  }
}

module.exports = Mutex
