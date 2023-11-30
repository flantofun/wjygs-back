const _ = require('lodash');
const mongoose = require('mongoose');
const { Schema } = mongoose;
let { catdb, models } = require('../util/mongo_client');

let SpecialEventIOSSchema = new Schema(
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

SpecialEventIOSSchema.statics = {
	// 静态方法
};

SpecialEventIOSSchema.index({createdAt: 1})

module.exports = catdb.model('SpecialEventIOS', SpecialEventIOSSchema, 'specialEventIOS');
