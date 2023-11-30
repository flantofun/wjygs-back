const _ = require("lodash");
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;
let { catdb, models } = require("../util/mongo_client");

/**
 * 渠道
 * @class Channel
 * @property {String} channel - 用户名
 * @property {String} buyQuantity - 买量方式
 * @property {String} putPlatform 投放平台
 * @property {String} hotCloudPlan 热云计划
 * @property {String} topOnPlan topOn计划
 * @property {String}activationProbability 热云激活扣量比例
 * @property {String} remark

 */
let ChannelSchema = new Schema(
  {
    channel: {
      type: String,
      index: true,
    },
    buyQuantity: {
      type: String,
    },
    putPlatform: {
      type: String,
    },
    remark: {
      type: String,
    },
    hotCloudPlan: {
      //  signIn(服务端比例激活) incentiveAd(客户端激励视频激活) withdraw(首次提现后激活)  ecmp(ecpm计划)
      type: String,
      default: "withdraw",
    },
    topOnPlan: {
      // signIn(服务端开启)  withdraw(首次提现后激活)
      type: String,
      default: "signIn",
    },
    activationProbability: {
      type: Number,
      default: 0,
    },
    ecpmProbability: {
      type: Number,
      default: 0,
    },
    allecpmProbability: {
      type: Number,
      default: 0,
    },
    ecpmHasTodayUser: {
      type: Boolean,
      default: false,
    },
    allecpmHasTodayUser: {
      type: Boolean,
      default: false,
    },
    // ecpm 命中阈值
    ecpmNum: {
      type: Number,
      default: 0,
    },
    allecpmNum: {
      type: Number,
      default: 0,
    },
    // ecpm 命中次数
    ecpmTimes: {
      type: Number,
      default: 0,
    },
    allecpmTimes: {
      type: Number,
      default: 0,
    },

    ecpmEvent: {
      type: String,
      default: "",
    },

    allecpmEvent: {
      type: String,
      default: "",
    },

    ablSwitch: {
      type: Boolean,
      default: false,
    },

    // 图像验证错误次数
    ablErrNum: {
      type: Number,
      default: 0,
    },

    // 图像验证错误次数
    ablInterval: {
      type: Array,
      default: [],
    },

    // 事件控制
    event: [
      {
        id: { type: Number },
        dailyLimit: { type: Number, default: 0 },
        totalLimit: { type: Number, default: 0 },
        remark: { type: String },
      },
    ],
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  }
);

ChannelSchema.statics = {
  // 静态方法
};

ChannelSchema.index({ createdAt: 1 });

module.exports = catdb.model("Channel", ChannelSchema, "channel");
