//分红猫
const _ = require('lodash');
const mongoose = require('mongoose');
const { Schema } = mongoose;
let { catdb, models } = require('../util/mongo_client');

let BonusCatSchema = new Schema({
	//天数
	_id: {
		type: String,
	},
	//今日分红猫数量
	cat_num_each_day: {
		type: Number,
	},
	//昨日全网总数
	total_num_last_day: {
		type: Number,
	},
	//单只分红猫分红金额
	each_bonus_last_day: {
		type: Number,
	},
	//昨日玩家分红
	total_bonus_last_day: {
		type: Number,
    },
    test: {
        type: {type: Number}
    }
});

BonusCatSchema.statics = {
	// 静态方法
};

module.exports = catdb.model('BonusCat', BonusCatSchema, 'bonusCat');
