const _ = require("lodash");
const mongoose = require("mongoose");
const { Schema } = mongoose;
let { catdb, models } = require("../util/mongo_client");

let Cysd_advDatasSchema = new Schema(
  {
    trans_id: {
      type: String,
    },
    ecpm: {
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

Cysd_advDatasSchema.statics = {
  // 静态方法
};

module.exports = catdb.model(
  "Cysd_advDatas",
  Cysd_advDatasSchema,
  "wngs_advDatas"
);
