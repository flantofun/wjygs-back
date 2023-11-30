const redis = require("redis");
const { redis_host, redis_port, redis_pwd } = require("../configs");
const client = redis.createClient(redis_port, redis_host, {
  password: redis_pwd,
  db: 0,
});
const { promisify } = require("util");

client.on("connect", function () {
  console.log("redis 链接成功");
});

const set = promisify(client.set).bind(client);
const get = promisify(client.get).bind(client);
const expire = promisify(client.expire).bind(client);
const hmset = promisify(client.hmset).bind(client);
const hgetall = promisify(client.hgetall).bind(client);
const del = promisify(client.del).bind(client);
const hincrby = promisify(client.hincrby).bind(client);

module.exports = {
  set,
  get,
  expire,
  hmset,
  del,
  hgetall,
  hincrby,
};
