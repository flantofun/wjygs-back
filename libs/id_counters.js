const { models } = require('../util/mongo_client');

module.exports = {
	checkIdCounter: (cb) => {
		models.counters.findOne({}, (err, counter) => {
			if (err) {
				console.log(
					'[id_counters]id生成器查询错误：数据库查询出错！',
					err
				);
				return cb(err);
			} else if (!counter) {
				let user = new models.counters({
					_id: 'userid',
				});
				user.save((err, u) => {
					if (err) {
						console.log(
							'[id_counters]id生成器初始化错误：数据库插入出错！',
							err
						);
						return cb(err);
					} else {
						return cb(null);
					}
				});
			} else return cb(null);
		});
	},
	getNextSequenceValue: (sequenceName, cb) => {
		models.counters.findOneAndUpdate(
			{ _id: sequenceName },
			{ $inc: { sequence_value: 1 } },
			{ new: true },
			(err, result) => {
				if (err)
					console.log(
						'[id_counters]严重警告！id生成器出错，数据库查询不到历史值',
						err
					);
				console.log('id生成：', result.sequence_value);
				return cb(err, result.sequence_value);
			}
		);
		// let sequenceDocument = models.counters.findOneAndUpdate(
		//    {
		//       query:{_id: sequenceName },
		//       update: {$inc:{sequence_value:1}},
		//       "new":true
		//    });
		// return sequenceDocument.sequence_value
	},
};
