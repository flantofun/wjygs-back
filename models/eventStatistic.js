const _ = require('lodash');
const mongoose = require('mongoose');
const { Schema } = mongoose;
let { catdb, models } = require('../util/mongo_client');

let EventStatisticSchema = new Schema({
	day: {
		type: String,
		index: true,
	},
	datas: {
		type: Object,
    },
    channel: {
        type: String,
		index: true,
    }
});

EventStatisticSchema.statics = {
	// 静态方法
};

module.exports = catdb.model(
	'EventStatistic',
	EventStatisticSchema,
	'eventStatistic'
);
