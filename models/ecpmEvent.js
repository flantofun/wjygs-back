const _ = require("lodash");
const mongoose = require("mongoose");
const { Schema } = mongoose;
let { catdb, models } = require("../util/mongo_client");
/**
【引导任务】 id=1
引导任务视频次数打点
【合成】id=2
合成触发大额红包的视频次数增加打点
【自动合成】id=3
通过广告激活自动合成增加视频次数打点
【随机红包】 id=4
随机小红包触发插屏-图片广告增加打点
【引导任务】id=5
引导任务直接领取成功观看插屏-视频 增加打点
 */
let EcpmEventSchema = new Schema(
  {
    userid: {
      type: Number,
    },
    activate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  }
);

EcpmEventSchema.statics = {
  // 静态方法
};

EcpmEventSchema.index({ createdAt: 1 });

module.exports = catdb.model("EcpmEvent", EcpmEventSchema, "ecpmEvent");
