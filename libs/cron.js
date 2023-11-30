const { models } = require("../util/mongo_client");
const async = require("async");
const schedule = require("node-schedule");
const libsWithdraw = require("../controller/withdraw");
const { tryGetAdInfo } = require("../libs/middlePlatform");

// 广告回调
let runAdCb = async (cb) => {
  cb();
  try {
    await tryGetAdInfo();
  } catch (e) {
    console.error("广告回调错误", e);
  }
};

let runWithdraw = (cb) => {
  // 定义规则
  let rule = new schedule.RecurrenceRule();
  rule.second = [
    0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57,
  ]; // 每隔 3 秒执行一次

  schedule.scheduleJob(rule, () => {
    // 先要判断进程，只允许一个进程去跑（todo：要考虑分布式以后的协作定时任务模块问题
    if (process.env && process.env.pm_id && process.env.pm_id % 2 != 0) {
      console.log(
        "[提现模块]单数进程检测到定时任务模块，本进程不执行定时任务，会交给双数进程去执行，本进程pmid(进程id)为：" +
          process.env.pm_id
      );
      return;
    }
    console.log("[提现模块]开始执行");
    models.withdrawQueue
      .find({})
      .sort({ _id: 1 })
      .exec((err, ws) => {
        if (err) {
          console.error("[cron]：查询提现队列失败！", err);
          return;
        } else {
          if (!ws || ws.length < 1) return;

          let lastId = ws[ws.length - 1]._id || -1;
          models.withdrawQueue
            .remove({
              _id: { $lte: lastId },
            })
            .exec((err) => {
              if (err) {
                console.error("[cron]：删除提现队列失败！");
                return;
              }
              async.mapSeries(ws, (w, cbb) => {
                libsWithdraw.withdrawRun(w, (err, result) => {
                  if (err)
                    console.error(
                      "用户提现失败：具体信息 ",
                      JSON.stringify(err)
                    );
                  else console.log("用户提现成功");
                  cbb();
                });
              });
            });
        }
      });
  });
  cb();
};

let runBlackList = (cb) => {
  // 定义规则
  let rule = new schedule.RecurrenceRule();
  rule.minute = [9, 19, 29, 39, 49, 59];
  schedule.scheduleJob(rule, function () {
    // 先要判断进程，只允许一个进程去跑（todo：要考虑分布式以后的协作定时任务模块问题
    if (process.env && process.env.pm_id && process.env.pm_id % 1 != 0) {
      console.log(
        "[黑名单模块]双数进程检测到定时任务模块，本进程不执行定时任务，会交给单数进程去执行，本进程pmid(进程id)为：" +
          process.env.pm_id
      );
      return;
    }
    console.log("[黑名单模块]开始执行");
    models.withdrawQueueRedo
      .aggregate([
        { $group: { _id: "$openid", total: { $sum: 1 } } },
        { $match: { total: { $gte: 30 } } },
      ])
      .exec((err, ws) => {
        if (err) {
          console.error("[cron]：查询提现redo队列失败！", err);
          return;
        } else {
          if (!ws || ws.length < 1) return;
          models.withdrawQueueRedo.remove({}).exec((err) => {
            if (err) {
              console.error("[cron]：删除提现redo队列失败！");
              return;
            }
            ws.forEach((v) => {
              models.blackList.create({ openid: v._id }, (err) => {
                console.log("[cron]：黑名单写入失败！", v.openid);
              });
            });
          });
        }
      });
  });
  cb();
};

module.exports = {
  runAdCb,
  runWithdraw,
  runBlackList,
};
