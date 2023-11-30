const _ = require('lodash');
const mongoose = require('mongoose');
const { Schema } = mongoose;
let { catdb, models } = require('../util/mongo_client');
/**
【引导任务】 id=1
引导任务视频次数打点
【合成】id=2
合成触发大额红包的视频次数增加打点
【自动合成】id=3
通过广告激活自动合成增加视频次数打点
【随机红包】 id=4
随机小红包触发插屏-图片广告增加打点
【引导任务】id=5
引导任务直接领取成功观看插屏-视频 增加打点
 */
let EventSchema = new Schema(
	{
		userid: {
			type: Number,
			index: true,
		},
		//事件：1看完了一次广告
		event: {
			type: Number,
			index: true,
        },
        datas: {
            type: Object,
            index: true,
        },
		system: {
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

EventSchema.statics = {
	// 静态方法
};

EventSchema.index({createdAt: 1})

module.exports = catdb.model('Event', EventSchema, 'event');
