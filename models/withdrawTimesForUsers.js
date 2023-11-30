const _ = require('lodash')
const mongoose = require('mongoose')
const { Schema } = mongoose
let { catdb, models } = require('../util/mongo_client')

let WithdrawTimesForUsersSchema = new Schema({
  day: {
    type: String,
    index: true,
  },
  datas: {
    type: Object,
  },
  channel: {
    type: String
  }
})

WithdrawTimesForUsersSchema.statics = {
  // 静态方法
}

module.exports = catdb.model(
  'WithdrawTimesForUsers',
  WithdrawTimesForUsersSchema,
  'withdrawTimesForUsers'
)
