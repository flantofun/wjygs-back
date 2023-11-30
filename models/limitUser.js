const _ = require("lodash");
const mongoose = require("mongoose");
const { Schema } = mongoose;
let { catdb, models } = require("../util/mongo_client");

let LimitUserSchema = new Schema(
  {
    userid: {
      type: Number,
    },
    type: {
      type: String,
    },

    deviceInfo: {},
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  }
);

LimitUserSchema.statics = {
  // 静态方法
};

module.exports = catdb.model("LimitUser", LimitUserSchema, "limitUser");
