const { models } = require('../util/mongo_client');
const _ = require('lodash');
let task = require('./task');
const { result } = require('lodash');

module.exports = {
	invitationSucess: (invitationFrom) => {
		if (invitationFrom) {
			models.user.findOne(
				{ invitationCode: invitationFrom },
				(err, fatherUser) => {
					if (err)
						console.log(
							'[user]用户提现0.3元，给邀请码父用户增加有效邀请失败：',
							err
						);
					if (fatherUser) {
						fatherUser = task.levelUp(fatherUser, 0, 1);
						//给每日任务进行到邀请阶段的用户增加邀请数
						models.dailyTasks
							.find({ userid: fatherUser.userid })
							.sort({ totalProgress: -1 })
							.limit(1)
							.exec((err, result) => {
								if (err)
									console.log(
										'[invitation]查询每日任务进度失败：',
										err
									);
								else if (result[0]) {
									if (
										result[0].totalProgress &&
										result[0].totalProgress >= 100
									) {
										if (!fatherUser.invationFromDailyTask)
											fatherUser.invationFromDailyTask = 0;
										fatherUser.invationFromDailyTask++;
									}
								}
								fatherUser.save((err) => {
									if (err)
										console.log(
											'[user]用户提现0.3元，给邀请码父用户增加有效邀请失败：',
											err
										);
								});
							});
					}
				}
			);
		}
	},
};
