const _ = require("lodash");
const mongoose = require("mongoose");
const { Schema } = mongoose;
let { catdb, models } = require("../util/mongo_client");

let WaterSchema = new Schema(
  {
    userid: {
      type: String,
      index: true,
    },
    type: {
      type: String,
    },
    //充值额度：单位分
    amount: {
      type: Number,
    },
    // 渠道
    channel: {
      type: String,
    },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  }
);

WaterSchema.statics = {
  // 静态方法
};
WaterSchema.index({ createdAt: 1 });
module.exports = catdb.model("Water", WaterSchema, "water");
