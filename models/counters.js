//此表用作id生成器唯一索引
const _ = require('lodash');
const mongoose = require('mongoose');
const { Schema } = mongoose;
let { catdb, models } = require('../util/mongo_client');

let CountersSchema = new Schema({
    _id: {
        type: String,
        default: 'userid',
    },
    //当前最大值id数
    sequence_value: {
        type: Number,
        default: 1000000,
    },
});

CountersSchema.statics = {
    // 静态方法
};

module.exports = catdb.model('Counters', CountersSchema, 'counters');
