const _ = require('lodash');
const mongoose = require('mongoose');
const { Schema } = mongoose;
let { catdb, models } = require('../util/mongo_client');

let SmsSchema = new Schema(
	{
		phone: {
			type: String,
			index: true,
		},
		msg: {
			type: String,
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

SmsSchema.statics = {
	// 静态方法
};

SmsSchema.index({createdAt: 1})

module.exports = catdb.model('Sms', SmsSchema, 'sms');
