const _ = require("lodash");
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;
let { catdb, models } = require("../util/mongo_client");

/**
 *
 */
let EcpmSchema = new Schema(
  {
    proportion: {
      type: Number,
      default: 0,
    },
    left: {
      type: Number,
      default: 0,
    },
    right: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  }
);

EcpmSchema.statics = {
  // 静态方法
};

EcpmSchema.index({ left: 1, right: 1 });

module.exports = catdb.model("ecpm", EcpmSchema, "ecpm");
