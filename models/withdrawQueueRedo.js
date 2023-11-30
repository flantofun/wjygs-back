const _ = require('lodash');
const mongoose = require('mongoose');
const { Schema } = mongoose;
let { catdb, models } = require('../util/mongo_client');

let WithdrawQueueRedoSchema = new Schema(
	{
		openid: {
			type: String,
			index: true,
        },
        accessToken: {
            type: String,
            index: true
        },
		amount: {
            type: Number,
            index: true
        },
        //备注
		remark: {
			type: String,
		},
	},
	{
		timestamps: {
			createdAt: 'createdAt',
			updatedAt: 'updatedAt',
		},
	}
);

WithdrawQueueRedoSchema.statics = {
	// 静态方法
};

module.exports = catdb.model('WithdrawQueueRedo', WithdrawQueueRedoSchema, 'withdrawQueueRedo');
