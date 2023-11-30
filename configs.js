module.exports = {
    env: "cat",
    desc: "cat config file.",
    db: {
        cat: {
            // name: "mongodb://cysd2dot0:cysd2dot0555@dds-bp1a9cf8cec32f841.mongodb.rds.aliyuncs.com:3717,dds-bp1a9cf8cec32f842.mongodb.rds.aliyuncs.com:3717/cysd2dot0?replicaSet=mgset-41911902",
            name: "mongodb://localhost/hnyp",
            // name:
            // 'mongodb://root:Hr123456$$@dds-bp1541b1cbb50c841.mongodb.rds.aliyuncs.com:3717,dds-bp1541b1cbb50c842.mongodb.rds.aliyuncs.com:3717/admin?replicaSet=mgset-34983529',
            opts: { useNewUrlParser: true, useUnifiedTopology: true },
        },
    },
    redis_host: "r-bp1xr3r2pyl2gyzf7e.redis.rds.aliyuncs.com",
    redis_port: 6379,
    redis_pwd: "hr!Z@X3c4v",
    appkey: "60c87631e5a91422eb60bee2",
    sdkkey: "60c874efe5a91422eb60be89",
    wxKey: "c1046fdddcfd6ac1f74a4c916dd6ef79"
    // redis: {
    //     queue: {
    //         host: '127.0.0.1',
    //         port: 6379,
    //         db: 0
    //     },
    //     session: {
    //         host: '127.0.0.1',
    //         port: 6379,
    //         db: 1
    //     },
    //     pubsub: {
    //         host: '127.0.0.1',
    //         port: 6379,
    //         db: 2
    //     },
    // },
};
