//每日任务
const _ = require('lodash');
const mongoose = require('mongoose');
const { Schema } = mongoose;
let { catdb, models } = require('../util/mongo_client');
/*
//id//天数	//类型	//参数		//奖励进度	//描述
id	days	type	parameter	points	description
1	1		1		10			5		900	喵喵达到%d级
2	1		2		5			5		901	观看视频%d次
3	1		3		2			5		902	完成每日任务%d次
4	1		4		2000		10		903	累计获得红包币%d
5	2		1		20			5		900	喵喵达到%d级
6	2		2		10			5		901	观看视频%d次
7	2		3		5			5		902	完成每日任务%d次
8	2		4		5000		10		903	累计获得红包币%d
9	3		1		25			2		900	喵喵达到%d级
10	3		2		20			2		901	观看视频%d次
11	3		3		10			2		902	完成每日任务%d次
12	3		4		10000		10		903	累计获得红包币%d
13	4		1		30			2		900	喵喵达到%d级
14	4		2		30			2		901	观看视频%d次
15	4		3		30			2		902	完成每日任务%d次
16	4		4		20000		5		903	累计获得红包币%d
17	5		1		35			2		900	喵喵达到%d级
18	5		2		50			1		901	观看视频%d次
19	5		3		40			1		902	完成每日任务%d次
20	5		4		30000		5		903	累计获得红包币%d
21	6		1		40			2		900	喵喵达到%d级
22	6		2		100			1		901	观看视频%d次
23	6		3		50			1		902	完成每日任务%d次
24	6		4		40000		5		903	累计获得红包币%d
25	7		2		1000		1		901	观看视频%d次
26	7		3		130			2		902	完成每日任务%d次
27	7		4		1000000		2		903	累计获得红包币%d
28	7		4		500000		5		903	累计获得红包币%d
*/
let DailyTasksSchema = new Schema({
	userid: {
		type: Number,
	}, // 用户id
	taskid: {
		type: Number,
	}, // 任务id
	taskProgress: {
		type: Number,
	}, // 任务进度
	points: {
		type: Number,
	}, // 奖励进度
	totalProgress: {
		type: Number,
	}, // 总进度
});

DailyTasksSchema.statics = {
	// 静态方法
};

module.exports = catdb.model('DailyTasks', DailyTasksSchema, 'dailyTasks');
