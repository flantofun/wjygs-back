const _ = require("lodash");
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;
let { catdb, models } = require("../util/mongo_client");

/**
 * 人数合法性验证
 * @class Number
 * @property {Boolean} isCheck - 合法性是否已检查
 * @property {String} key - 凭证
 * @property {Number} userid - 用户
 * @property {Number} num - 人数
 * @property {Number} addNum - 已添加人数
 */
let NumSchema = new Schema(
  {
    isCheck: {
      type: Boolean,
      default: false,
    },
    isFull: {
      type: Boolean,
      default: false,
    },
    key: {
      type: Number,
    },
    userid: {
      type: Number,
    },
    num: {
      type: Number,
      default: 1,
    },
    addNum: {
      type: Number,
      default: 0,
    },
    event: {
      type: Number,
    },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  }
);

NumSchema.statics = {
  // 静态方法
};

NumSchema.index({ userid: 1, key: 1, event: 1, isCheck: 1, isFull: 1 });

module.exports = catdb.model("num", NumSchema, "num");
