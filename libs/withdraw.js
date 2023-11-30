const { models } = require("../util/mongo_client");
const moment = require("moment");
const gameSystem = require("../files/System");
const dailycashout = require("../files/dailycashout.json");
const _ = require("lodash");
const schedule = require("node-schedule");

let cleanVideoCoinsToday = (cb) => {
  schedule.scheduleJob("0 0 0 * * *", () => {
    // 先要判断进程，只允许一个进程去跑（todo：要考虑分布式以后的协作定时任务模块问题
    // 然后要找到昨天的0点和24点，用这个时间去统计
    // 最后格式化昨天的年月日字符串，用这个做条件写进统计表
    if (process.env && process.env.pm_id && process.env.pm_id % 2 != 0) {
      console.log(
        "[cron]单数进程检测到定时任务模块，本进程不执行定时任务，会交给双数进程去执行，本进程pmid(进程id)为：" +
          process.env.pm_id
      );
      return;
    }
    models.user
      .update(
        {},
        {
          $set: {
            getVideoCoinsToday: 0,
            withdrawTimesToday: 0, // 今天提现次数
            eventTodayTimes: {},
            numRewardTimesToday: 0, // 今天奖励次数
            numRewardGradeToday: 1001, // 今天次数奖励档位
            withdrawGradeToday: {}, // 今天提现档次分布
            getRewardedGradeToday: {}, // 今天已获得档位奖励
            grandMasterTodayMoney: 0, // 今天贡献师傅的钱
            masterTodayMoney: 0, // 今天贡献给师公的钱
          },
        },
        { multi: true }
      )
      .exec((err) => {
        if (err)
          console.error(
            "[cron]：严重错误！定时清除用户今日获得经验失败！",
            err
          );
      });

    // 清除人数判断表
    models.num.remove({ isFull: true }).exec((err) => {
      if (err) console.error("[cron]：严重错误！定时清除人数判断表！", err);
    });
  });
  cb();
};

module.exports = {
  cleanVideoCoinsToday,
  // 检查是否有足够的经验
  isCanWithdrawForvideoCoinsAndAmount: (videoCoins, amount, cb) => {
    if (!dailycashout || !dailycashout.RECORDS) return cb("读取系统配置错误");
    let datas = dailycashout.RECORDS.find((v) => {
      return v.cash == `${amount}`;
    });
    console.log("用户提现，读取系统配置：", datas);
    if (!datas || !datas["cash"] || !datas["cost"]) {
      return cb("系统配置错误:没有找到对应提现档次");
    }
    if (videoCoins < +datas["cost"]) {
      return cb("余额不足");
    }
    return cb();
  },
  // 检查提现次数
  isCanWithdrawForTimesToday: (openid, cb) => {
    if (!gameSystem) return cb("读取系统配置错误");
    if (gameSystem["cash_out_times_today"] == 0) return cb();
    if (gameSystem["cash_out_times_today"] > 0) {
      models.withdraw.find(
        {
          openid,
          createdAt: {
            $gte: new Date(moment()).Format("yyyy-MM-dd"),
          },
          success: true,
        },
        (err, w) => {
          if (err) {
            console.log("[withdraw]提现条件查询数据库错误：", err);
            return cb("[查询提现次数]数据库错误");
          }
          if (w.length >= gameSystem["cash_out_times_today"]) {
            return cb("今天提现次数已达上限，请明天再来");
          }
          return cb();
        }
      );
    } else return cb("读取系统配置错误");
  },
  // 检查提现时间和邀请人数
  checkWithdrawOtherConditions: (user, cb) => {
    // 检查提现时间间隔
    if (!cashOut || !cashOut.RECORDS) return cb("读取系统配置错误");
    let datas = cashOut.RECORDS.find((v) => {
      return v.id == user.withdrawGrade;
    });
    if (
      !datas ||
      !datas["cd_time"] ||
      datas["cd_time"][user.timesForWithdrawGrade] == undefined ||
      datas["cd_time"][user.timesForWithdrawGrade] == null
    ) {
      return cb("系统配置错误:没有找到对应提现档次的时限数据");
    }
    let sholdTime = datas["cd_time"][user.timesForWithdrawGrade];
    let time = moment().diff(moment(sholdTime), "seconds");
    if (time < sholdTime) {
      return cb(
        `${user.userid}提现失败，离上次提现时间间隔太短，应间隔${sholdTime}秒，实际间隔${time}秒。`
      );
    }

    // 检查邀请人数
    if (
      !datas ||
      !datas["invite_nums"] ||
      datas["invite_nums"][user.timesForWithdrawGrade] == undefined ||
      datas["invite_nums"][user.timesForWithdrawGrade] == null
    ) {
      return cb("系统配置错误:没有找到对应提现档次的应邀请人数数据");
    }
    let shouldInvationTimes = datas["invite_nums"][user.timesForWithdrawGrade];
    if (user.invitationTimesForGrade < shouldInvationTimes) {
      return cb(
        `${user.userid}提现失败，邀请人数太少，应邀请${shouldInvationTimes}人，实际邀请${user.invitationTimesForGrade}人。`
      );
    }

    return cb();
  },

  // 检查前置条件
  checkFormerId(user, cb) {
    if (!cashOut || !cashOut.RECORDS) return cb("读取系统配置错误");
    let datas = cashOut.RECORDS.find((v) => {
      return v.id == user.withdrawGrade;
    });

    if (
      !datas ||
      datas["former_id"] == undefined ||
      datas["former_id"] == null
    ) {
      return cb("系统配置错误:没有找到对应提现档次的前置条件数据");
    }

    let former_id = +datas["former_id"];

    if (former_id != user.formerId) {
      return cb(
        `${user.userid}提现失败，前置条件错误${former_id}, 目前条件${user.formerId}`
      );
    }

    return cb();
  },

  // 检查连续登陆
  checkContinuousLoginTimes: (user, cb) => {
    if (!cashOut || !cashOut.RECORDS) return cb("读取系统配置错误");
    let datas = cashOut.RECORDS.find((v) => {
      return v.id == user.withdrawGrade;
    });

    if (
      !datas ||
      !datas["login_days"] ||
      datas["login_days"][user.timesForWithdrawGrade] == undefined ||
      datas["login_days"][user.timesForWithdrawGrade] == null
    ) {
      return cb("系统配置错误:没有找到对应提现档次的连续登陆数据");
    }

    if (
      user.continuousLoginTimes <
      datas["login_days"][`${user.timesForWithdrawGrade}`]
    ) {
      return cb(
        `${user.userid}提现失败，需连续登陆${
          datas["login_days"][`${user.timesForWithdrawGrade}`]
        }, 目前已连续登陆${user.continuousLoginTimes}`
      );
    }

    return cb();
  },

  // 判断提现升档
  levelUp: (user) => {
    if (!cashOut || !cashOut.RECORDS) return cb("读取系统配置错误");
    let datas = cashOut.RECORDS.find((v) => {
      return v.id == user.withdrawGrade;
    });
    if (!datas) {
      return cb("系统配置错误:没有找到对应提现档次", user);
    }
    // // 扣除经验
    // user.videoCoins -=
    // 	datas['video_coin_num'][user.timesForWithdrawGrade] || 0
    // 判断升档还是增加提现次数
    console.log("user.timesForWithdrawGrade", user.timesForWithdrawGrade);
    console.log('datas["times"]', datas["times"]);
    console.log('datas["former_id"]', datas["former_id"]);
    if (user.timesForWithdrawGrade + 1 >= +datas["times"]) {
      user.formerId = user.withdrawGrade;
      user.withdrawGrade++;
      user.timesForWithdrawGrade = 0;
    } else {
      user.timesForWithdrawGrade++;
    }
    return user;
  },
};
