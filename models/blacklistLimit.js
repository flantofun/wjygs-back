const _ = require("lodash");
const mongoose = require("mongoose");
const { Schema } = mongoose;
let { catdb, models } = require("../util/mongo_client");

let BlacklistLimitSchema = new Schema(
  {
    userid: {
      type: Number,
    },
    // guid 或者 unionid
    date: {
      type: String,
    },
    // 登陆或者注册
    type: {
      type: String,
    },
    // 来源 unionid 或者 guid
    source: {
      type: String,
    },
    // 设备详细
    deviceInfo: {},
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  }
);

BlacklistLimitSchema.statics = {
  // 静态方法
};
BlacklistLimitSchema.index({ createdAt: 1 });
module.exports = catdb.model(
  "BlacklistLimit",
  BlacklistLimitSchema,
  "blacklistLimit"
);
