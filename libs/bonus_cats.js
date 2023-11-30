const { models } = require('../util/mongo_client');
const _ = require('lodash');

//分红猫
module.exports = {
	bonusCat: (cb) => {
		models.bonusCat.findOne({}, (err, counter) => {
			if (err) {
				console.log('分红猫数据查询错误：数据库查询出错！', err);
				return cb(err);
			} else if (!counter) {
				let datas = require('../files/bonuscat.json');
				let insertDatas = [];
				_(datas).forEach((data) => {
					insertDatas.push(
						new models.bonusCat({
							_id: data._id,
							cat_num_each_day: data.cat_num_each_day,
							total_num_last_day: data.total_num_last_day,
							each_bonus_last_day: data.each_bonus_last_day,
							total_bonus_last_day: data.total_bonus_last_day,
						})
					);
				});
				models.bonusCat.insertMany(insertDatas, (err) => {
					return cb(err || null);
				});
			} else return cb(null);
		});
	},
};
