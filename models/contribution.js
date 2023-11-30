const _ = require("lodash");
const mongoose = require("mongoose");
const { Schema } = mongoose;
let { catdb, models } = require("../util/mongo_client");

let ContributionSchema = new Schema(
  {
    userid: {
      type: Number,
      index: true,
    },
    time: {
      type: String,
    },
    son: {
      type: Number,
      default: 0,
    },
    grandson: {
      type: Number,
      default: 0,
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

ContributionSchema.statics = {
  // 静态方法
};

module.exports = catdb.model(
  "contribution",
  ContributionSchema,
  "contribution"
);
