const Core = require('@alicloud/pop-core')
const secret = require('../secret')
const { models } = require('../util/mongo_client')
const moment = require('moment')

var client = new Core({
	accessKeyId: secret.sms.accessKeyId,
	accessKeySecret: secret.sms.accessKeySecret,
	endpoint: secret.sms.endpoint,
	apiVersion: secret.sms.apiVersion,
})

let sendSms = () => {
	models.sms
		.findOne({ msg: secret.sms.TemplateCode })
		.sort({ _id: -1 })
		.exec((err, s) => {
			if (s && moment().diff(moment(s.createdAt), 'seconds') < 900) {
				console.log(
					'余额不足，用户提现失败，短信已发送，冷却中，再次发送短信时间：',
					900 - moment().diff(moment(s.createdAt), 'seconds')
				)
			} else {
				if (err)
					console.error(
						'余额不足，短信系统查询数据库失败，短信无法发送'
					)
				else {
					let params = {
						// RegionId: 'cn-hangzhou',
						PhoneNumbers: secret.sms.PhoneNumbers,
						SignName: secret.sms.SignName,
						TemplateCode: secret.sms.TemplateCode,
						TemplateParam: secret.sms.TemplateParam,
					}

					let requestOption = {
						method: 'POST',
					}

					client.request('SendSms', params, requestOption).then(
						(result) => {
							console.log(
								'短信服务返回：',
								JSON.stringify(result)
							)
							models.sms.create({
								phone: params.PhoneNumbers,
								msg: params.TemplateCode,
							})
						},
						(ex) => {
							console.error('短信服务发送失败：', ex)
						}
					)
				}
			}
		})
}

let sendSmsMaxMoneyToday = () => {
	models.sms
		.findOne({ msg: secret.smsMaxMoneyToday.TemplateCode })
		.sort({ _id: -1 })
		.exec((err, s) => {
			if (s && moment().diff(moment(s.createdAt), 'seconds') < 900) {
				console.log(
					'商户余额上限，用户提现失败，短信已发送，冷却中，再次发送短信时间：',
					900 - moment().diff(moment(s.createdAt), 'seconds')
				)
			} else {
				if (err)
					console.error(
						'余额不足，短信系统查询数据库失败，短信无法发送'
					)
				else {
					let params = {
						// RegionId: 'cn-hangzhou',
						PhoneNumbers: secret.smsMaxMoneyToday.PhoneNumbers,
						SignName: secret.smsMaxMoneyToday.SignName,
						TemplateCode: secret.smsMaxMoneyToday.TemplateCode,
						TemplateParam: secret.smsMaxMoneyToday.TemplateParam,
					}

					let requestOption = {
						method: 'POST',
					}

					client.request('SendSms', params, requestOption).then(
						(result) => {
							console.log(
								'短信服务返回：',
								JSON.stringify(result)
							)
							models.sms.create({
								phone: params.PhoneNumbers,
								msg: params.TemplateCode,
							})
						},
						(ex) => {
							console.error('短信服务发送失败：', ex)
						}
					)
				}
			}
		})
}

module.exports = {
	sendSms,
	sendSmsMaxMoneyToday,
}
