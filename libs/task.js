const { models } = require('../util/mongo_client');
const _ = require('lodash');

//任务等级 g:档次 t:任务进度
let taskLevel = {
	g1t1: 2, // 签到 （算在signInTimes）
	g2t1: 15, // 签到
	g2t2: 10, // 邀请
	g3t2: 15, // 签到
	g3t3: 20, // 邀请
	g4t2: 1, // 分红猫
	g5t2: 1, // 分红猫
	invationFromDailyTask: 3, //7天每日任务需要邀请的人数
};

//提现等级对应金额
let withdrawLevel = {
	g1t1: 0.3,
	g2t1: -1, //不可提现
	g2t2: 15,
	g3t2: -1, //不可提现
	g3t3: 30,
	g4t2: 80,
	g5t2: 0,
	invationFromDailyTask: 5, //7天每日任务
};

//把等级往下一级升
let taskLevelUp = (level, amount) => {
	switch (level) {
		case 'g1t1':
			if (amount == 0.3) level = 'g2t1';
			break;
		case 'g2t2':
			if (amount == 15) level = 'g3t2';
			break;
		case 'g3t3':
			if (amount == 30) level = 'g4t2';
			break;
		case 'g4t2':
			if (amount == 80) level = 'g5t2';
			break;
		default:
			level = level;
	}
	return level;
};

module.exports = {
	taskLevel,
	withdrawLevel,
	taskLevelUp,
	// 任务升级：签到或者邀请人成功之后调用此接口
	// 参数：用户schema, 新增签到, 新增邀请
	levelUp: (user, signIn, invitation) => {
		// 根据用户等级判断此次是否需要增加进度
		switch (user.taskLevel) {
			// case 'g1t1':
			// 	user.taskProgress += signIn;
			// 	break;
			case 'g2t1':
				user.taskProgress += signIn;
				if (user.taskProgress >= taskLevel[user.taskLevel]) {
					user.taskLevel = 'g2t2';
					user.taskProgress = 0;
				}
				break;
			case 'g2t2':
				user.taskProgress += invitation;
				break;
			case 'g3t2':
				user.taskProgress += signIn;
				if (user.taskProgress >= taskLevel[user.taskLevel]) {
					user.taskLevel = 'g3t3';
					user.taskProgress = 0;
				}
				break;
			case 'g3t3':
				user.taskProgress += invitation;
				break;
			case 'g4t2':
				break;
			case 'g5t2':
				break;
			default:
		}
		// user.taskProgress += signIn + invitation;
		// 由于档次升级要求变更，此处写到提现结果后面去了
		// if (user.taskProgress >= taskLevel[user.taskLevel]) {
		// 	user.taskLevel = taskLevelUp(user.taskLevel);
		// 	user.taskProgress = 0;
		// }

        //给0.5元档次邀请阶段的用户增加邀请数
        if (invitation) {
            if (user.signInTimesLevel2 == 5 && !user.signInTimesLevel2)
			user.invationLevel2 = 0;

		if (user.signInTimesLevel2 == 5 && user.invationLevel2 < 2)
			user.invationLevel2 += invitation;
        }
		return user;
	},
};
