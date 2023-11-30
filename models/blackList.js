const _ = require("lodash");
const mongoose = require("mongoose");
const { Schema } = mongoose;
let { catdb, models } = require("../util/mongo_client");

let BlackListSchema = new Schema(
  {
    openid: {
      type: String,
      index: true,
    },
    ip: {
      type: String,
      index: true,
    },
    unionid: {
      type: String,
      index: true,
    },
    times: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  }
);

BlackListSchema.statics = {
  // 静态方法
};

module.exports = catdb.model("BlackList", BlackListSchema, "blackList");
