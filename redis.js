const { Cluster: RedisCluster } = require('ioredis')
module.exports = ({ nodes, options }) => new RedisCluster(nodes, options)