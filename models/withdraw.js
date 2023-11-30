const _ = require("lodash");
const mongoose = require("mongoose");
const { Schema } = mongoose;
let { catdb, models } = require("../util/mongo_client");

let WithdrawSchema = new Schema(
  {
    openid: {
      type: String,
      index: true,
    },
    userid: {
      type: Number,
      index: true,
    },
    //充值额度：单位分
    amount: {
      type: Number,
      index: true,
    },
    //充值成功与否
    success: {
      type: Boolean,
      index: true,
    },
    //若充值失败，微信给出的原因(非必须)
    fail_msg: {
      type: String,
      index: true,
    },
    //商户订单号
    partner_trade_no: {
      type: String,
    },
    //微信付款单号
    payment_no: {
      type: String,
    },
    //若充值失败，微信给出的具体错误(非必须)
    err_code_des: {
      type: String,
    },
    //此用户在此档次的第几次提现
    timesForLevel: {
      type: Number,
      index: true,
    },
    //此用户的第几次提现
    timesForUser: {
      type: Number,
      index: true,
    },
    // 渠道
    channel: {
      type: String,
    },
    //备注
    remark: {
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

WithdrawSchema.statics = {
  // 静态方法
};
WithdrawSchema.index({ createdAt: 1 });
module.exports = catdb.model("Withdraw", WithdrawSchema, "withdraw");
