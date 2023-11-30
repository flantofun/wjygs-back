const _ = require('lodash');
const mongoose = require('mongoose');
const { Schema } = mongoose;
let { catdb, models } = require('../util/mongo_client');

let SpecialEventSchema = new Schema(
	{
		event: {
			type: String,
			index: true,
		},
		info: {
            type: Object,
            index: true,
		},
	},
	{
		timestamps: {
			createdAt: 'createdAt',
			updatedAt: 'updatedAt',
		},
	}
);

SpecialEventSchema.statics = {
	// 静态方法
};

SpecialEventSchema.index({createdAt: 1})

module.exports = catdb.model('SpecialEvent', SpecialEventSchema, 'specialEvent');
