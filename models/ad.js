const _ = require("lodash");
const mongoose = require("mongoose");
const { Schema } = mongoose;
let { catdb, models } = require("../util/mongo_client");

let AdSchema = new Schema(
  {
    userid: {
      type: Number,
    },
    hasInit: {
      type: Boolean,
      default: false,
    },
    hasCb: {
      type: Boolean,
      default: false,
    },
    hasFinish: {
      type: Boolean,
      default: false,
    },
    eCPM: {
      type: Number,
      default: 0,
    },
    event: {
      type: Number,
    },
    transId: {
      type: String,
      index: true,
    },
    lastId: {
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

AdSchema.statics = {
  // 静态方法
};

module.exports = catdb.model("Ad", AdSchema, "ad");
