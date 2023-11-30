let wxcompay = require("../libs/wxcompay");
const to = require("await-to-js").default;
const _ = require("lodash");
let secret = require("../secret");
const { models } = require("../util/mongo_client");
const Wechat = require("../libs/wechat");
let task = require("../libs/task");
let async = require("async");
let invitation = require("../libs/invitation");
let moment = require("moment");
let cashOut = require("../files/cashOut.json");
let wechat = new Wechat(secret.wechat.appid, secret.wechat.appsecret);
let libsWithdraw = require("../libs/withdraw");
let sms = require("../libs/sms");
let blacklistUnionidArray = require("../files/blacklistUnionidArray.json");
const blacklistGuidArray = require("../files/blacklistGuidArray.json");
let dailycashout = require("../files/dailycashout.json");
const { sendTixianEvent } = require("../libs/middlePlatform");
const stringRandom = require("string-random");

let withdrawRun = (queueData, cb) => {
  let { amount, accessToken, openid } = queueData;
  const logid = `${stringRandom()} ${openid} 提现`;
  console.log(logid, "开始执行提现:", amount, accessToken, openid);
  async.waterfall(
    [
      (cbb) => {
        //查询用户是否存在，在缓存对比token，若失败则刷新token进行对比
        models.user.findOne({ openid }, (err, user) => {
          if (err)
            return cb({
              code: "查询用户失败",
              error: err,
            });
          if (!user)
            return cb({
              code: "用户不存在",
            });

          if (user.unionid) {
            if (blacklistUnionidArray.includes(user.unionid)) {
              models.blacklistLimit.create(
                {
                  data: user.unionid,
                  userid: user.userid,
                  deviceInfo: user.deviceInfo,
                  type: "提现",
                  source: "unionid",
                },
                () => {
                  console.log("提现黑名单");
                }
              );
              console.error(
                logid,
                "blacklistUnionidArray黑名单用户提现拒绝：",
                user.unionid
              );
              return cb("黑名单用户提现拒绝回调");
            }
          }

          if (user.deviceInfo && user.deviceInfo.guid) {
            if (blacklistGuidArray.includes(user.deviceInfo.guid)) {
              models.blacklistLimit.create(
                {
                  data: user.unionid,
                  userid: user.userid,
                  deviceInfo: user.deviceInfo,
                  type: "提现",
                  source: "guid",
                },
                () => {
                  console.log("提现黑名单");
                }
              );
              console.error(
                logid,
                "blacklistGuidArray：",
                user.deviceInfo.guid
              );
              return cb("黑名单用户提现拒绝回调");
            }
          }

          cbb(err, user, user.refreshToken);
        });
      },

      (user, userRefreshToken, cbb) => {
        wechat.getToken(openid, (err, tokenData) => {
          if (err || !tokenData || accessToken != tokenData.access_token) {
            wechat.refreshToken(userRefreshToken, (err, result) => {
              console.log(logid, "刷新用户token结果：", err, result);
              if (err || result.data.errcode)
                return cb({
                  code: "用户token失效",
                  error: err || result.data.errmsg,
                });
              cbb(err, user, result.data.access_token);
            });
          } else {
            cbb(err, user, tokenData.access_token);
          }
        });
      },
      (user, realToken, cbb) => {
        //判断用户token是否合法
        if (accessToken != realToken) {
          return cb({ code: "用户token错误" });
        } else {
          cbb(null, user, amount);
        }
      },
      (user, amount, cbb) => {
        // 判断是否非法
        if (user.errorAdvCount && user.errorAdvCount > 20) {
          return cb({ code: "非法用户" });
        } else {
          // 提现条件判断
          libsWithdraw.isCanWithdrawForvideoCoinsAndAmount(
            user.money,
            amount,
            (err) => {
              if (err) return cb({ code: err });
              cbb(null, user, amount);
            }
          );
        }
      },
    ],
    (err, user, amount) => {
      //进行真实提现
      //---------------测试时，提现不可超过5-----------------
      if (amount > 5) {
        // return res.send({ code: '测试环境提现不可超过5' });
        console.log(
          logid,
          "出现超过5元的合法提现申请，目前不可提现，已记录入库。"
        );
        models.withdraw.findOne(
          { openid, amount: amount * 100, fail_msg: "此金额需审核" },
          (err, w) => {
            if (!w) {
              models.withdraw.create(
                {
                  openid,
                  amount: amount * 100,
                  success: false,
                  fail_msg: "此金额需审核",
                  timesForLevel: user.timesForWithdrawGrade + 1 || 0,
                  timesForUser: user.withdrawSuccessCount + 1 || 0,
                },
                (err) => {
                  if (err)
                    console.log(
                      logid,
                      "[wxcompay]超过5元的提现记录入库失败！：",
                      openid,
                      amount,
                      false,
                      "此金额需审核"
                    );
                }
              );
            }
          }
        );

        return cb({ code: "此金额需等待人工审核" });
      }

      const sendAmount = amount;
      //---------------测试时，提现不可超过5-----------------
      amount = amount * 100; // 转换为微信通用金额单位：分
      let grade = 0;

      let system = "And";
      if (user.system && user.system == "iOs") {
        system = "ios";
      }
      wxcompay.wxcompay(
        openid,
        user.userid || 0,
        amount,
        system,
        user.timesForWithdrawGrade + 1 || 0,
        user.withdrawSuccessCount + 1 || 0,
        user.deviceInfo
          ? user.deviceInfo.channel
            ? user.deviceInfo.channel
            : null
          : null,
        async (err, result) => {
          console.log(
            logid,
            "[withdraw]微信提现结果：",
            err,
            result,
            "提现用户：",
            openid
          );
          if (err)
            console.log(
              logid,
              "[withdraw]严重错误！微信提现完成，但结果字符串解析失败"
            );

          if (result.result_code == "SUCCESS") {
            // 用户减💰

            let datas = dailycashout.RECORDS.find((v) => {
              return v.cash == `${amount / 100}`;
            });

            console.log(logid, "用户提现，读取系统配置：", datas);

            grade = datas.id;

            const withdrawMoney = datas["cost"] || amount * 10000;

            user.money -= +withdrawMoney;
            user.withdrawMoney += +withdrawMoney;

            let { withdrawGradeToday } = user;

            let withdrawGradeTodayTmp = JSON.parse(
              JSON.stringify(withdrawGradeToday)
            );

            if (!(datas.id in withdrawGradeTodayTmp)) {
              withdrawGradeTodayTmp[datas.id] = 0;
            }
            withdrawGradeTodayTmp[datas.id]++;

            console.log(logid, "withdrawGradeTodayTmp", withdrawGradeTodayTmp);

            user.withdrawGradeToday = withdrawGradeTodayTmp;
            user.lastWithdrawTime = new Date(moment());
            user.invitationTimesForGrade = 0;
            user.withdrawTimesToday++;

            // 热云 topon 计划
            let hotCloudPlan = "withdraw";
            let toponPlan = "signIn";
            let userChannel = user.deviceInfo
              ? user.deviceInfo.channel
                ? user.deviceInfo.channel
                : null
              : null;

            const [errChannel, resultChannel] = await to(
              models.channel.findOne({ channel: userChannel })
            );

            if (errChannel) console.log(logid, "查询渠道错误0", errChannel);

            if (resultChannel) {
              hotCloudPlan = resultChannel.hotCloudPlan;
              toponPlan = resultChannel.topOnPlan;
            }

            console.log(logid, "查询渠道详细0", resultChannel);

            user.hotCloudPlan = hotCloudPlan;
            user.toponPlan = toponPlan;

            if (user.hotCloudPlan == "withdraw" && !user.hotCloudIsProcessed) {
              user.hotCloudIsProcessed = true;
              user.hotCloudIsActivate = false;
              if (
                moment(user.lastWithdrawTime).format("YYYY-MM-DD") ==
                moment(user.createdAt).format("YYYY-MM-DD")
              ) {
                console.log(logid, "当天内提现用户", openid);
                user.hotCloudIsActivate = true;
              } else {
                console.log(logid, "非当天内提现用户，热云不给激活", openid);
              }
            }
            if (user.toponPlan == "withdraw" && !user.toponIsProcessed) {
              user.toponIsProcessed = true;
              user.toponIsActivate = true;
            }

            user.save((err) => {
              if (err)
                console.log(
                  logid,
                  "[withdraw]严重错误！用户提现完成后，保存用户表失败！openid/userid/amout:",
                  user.openid,
                  user.userid,
                  oldAmount
                );
            });
            // 今天的格式化时间：yyyy-MM-dd
            let dayFormat = new Date(moment(user.createdAt)).Format(
              "yyyy-MM-dd"
            );
            console.log(
              logid,
              "提现记录入统计库:",
              dayFormat,
              user.withdrawSuccessCount
            );
            models.withdrawTimesForUsers
              .update(
                {
                  day: dayFormat,
                  channel: "all",
                },
                {
                  $inc: {
                    [`datas.${[amount]}`]: 1,
                  },
                },
                { upsert: true }
              )
              .exec((err) => {
                if (err)
                  console.error(
                    logid,
                    dayFormat,
                    userChannel,
                    amount,
                    "提现记录入统计库失败：",
                    err
                  );
              });

            models.withdrawTimesForUsers
              .update(
                {
                  day: dayFormat,
                  channel: userChannel,
                },
                {
                  $inc: {
                    [`datas.${[amount]}`]: 1,
                  },
                },
                { upsert: true }
              )
              .exec((err) => {
                if (err)
                  console.error(
                    logid,
                    dayFormat,
                    userChannel,
                    amount,
                    "渠道提现记录入统计库失败：",
                    err
                  );
              });

            // 发送提现事件
            sendTixianEvent(
              user.openid,
              user.deviceInfo
                ? user.deviceInfo.guid
                  ? user.deviceInfo.guid
                  : ""
                : "",
              user.deviceInfo
                ? user.deviceInfo.channel
                  ? user.deviceInfo.channel
                  : ""
                : "",
              sendAmount,
              grade,
              Date.parse(new Date(moment(user.createdAt)))
            );

            models.water.create(
              {
                userid: user.userid,
                type: "withdraw",
                amount: -withdrawMoney,
                channel: user.deviceInfo
                  ? user.deviceInfo.channel
                    ? user.deviceInfo.channel
                    : null
                  : null,
              },
              () => {}
            );

            return cb(null, { code: "提现成功" });
          } else {
            if (result.err_code_des == "余额不足") {
              sms.sendSms();
            }
            if (result.err_code_des == "已达到该商户单日付款金额上限") {
              sms.sendSmsMaxMoneyToday();
            }
            return cb({
              code:
                "提现失败:" +
                  result.return_msg +
                  "，详情：" +
                  result.err_code_des || "",
              error: result.return_msg + "，详情：" + result.err_code_des || "",
            });
          }
        }
      );
    }
  );
};

module.exports = {
  withdrawRun,
  withdraw: (req, res) => {
    // 关闭提现
    // return res.send({ code: "提现成功，金额将在24小时内到账" });

    const logid = `${stringRandom()}-${req.path}`;

    let { amount, accessToken, openid } = req.body;
    console.log(logid, "收到用户提现请求：", req.body);
    if (!amount || !accessToken || !openid)
      return res.send({ code: "参数不全" });

    // 黑名单查询
    models.blackList.findOne({ openid: openid }, (err, blackUser) => {
      if (err) {
        console.log(logid, openid, "blackList数据库错误");
        return res.send({ code: "数据库错误" });
      }

      if (blackUser) {
        console.log(logid, openid, "用户存在黑名单");

        // 判断封号时间
        const { times = 1, updatedAt } = blackUser;
        const timeList = [0, 2, 12, 24];
        if (times > 3) {
          console.log(logid, openid, "用户永久封禁，不给提现");
          return res.send({
            code: "提现已申请",
          });
        }

        let timeDiff = moment().diff(moment(updatedAt), "seconds");

        if (timeDiff < +timeList[times] * 3600) {
          console.log(logid, openid, "用户处于封禁中", timeDiff);
          return res.send({ code: "提现已申请" });
        }
      }

      models.user.findOne({ openid }, (err, user) => {
        if (err) {
          console.log(logid, openid, "提现查询用户错误");
          return res.send({ code: "数据库错误" });
        }

        if (!user) {
          console.log(logid, openid, "提现 用户不存在");
          return res.send({ code: "数据库错误" });
        }

        if (+user.withdrawTimesToday >= 10) {
          console.log(logid, openid, "今日已达上限");
          return res.send({ code: "今天提现次数已达微信微信上限，请明日再提" });
        } else {
          models.withdrawQueue.findOne({ openid }, (err, w) => {
            if (err || w) {
              if (w) {
                models.withdrawQueueRedo.create(
                  { amount, accessToken, openid },
                  (err) => {
                    if (err)
                      console.error(
                        logid,
                        openid,
                        "提现插入Rodo失败！",
                        amount,
                        accessToken,
                        openid
                      );
                    else
                      console.log(
                        logid,
                        openid,
                        "请求入Rodo表成功",
                        amount,
                        accessToken,
                        openid
                      );
                  }
                );
              }
              return res.send({ code: "提现已申请" });
            } else {
              models.withdrawQueue.create(
                { amount, accessToken, openid },
                (err) => {
                  if (err)
                    console.error(
                      logid,
                      openid,
                      "提现插入失败！",
                      amount,
                      accessToken,
                      openid
                    );
                  else
                    console.log(
                      logid,
                      openid,
                      "请求入表成功",
                      amount,
                      accessToken,
                      openid
                    );
                  return res.send({
                    code: "提现成功，金额将在24小时内到账",
                  });
                }
              );
            }
          });
        }
      });
    });
  },

  check: (req, res) => {
    console.log("check 收到请求", req.body);
    let { openid } = req.body;
    models.user.findOne({ openid }, (err, user) => {
      if (err) return res.send({ code: "数据库错误", error: err });
      if (!user) return res.send({ code: "用户不存在" });

      let yesterday = new Date(moment().add(-1, "days")).Format("yyyy-MM-dd");
      let today = new Date(moment()).Format("yyyy-MM-dd");

      let piggyBankTmp = {};
      const { piggyBank = {} } = user;

      piggyBankTmp["today"] = piggyBank[today] || 0;
      piggyBankTmp["yesterday"] = piggyBank[yesterday] || 0;

      delete piggyBank[today];
      delete piggyBank[yesterday];

      // 扣除昨天之前的存钱罐
      let deduct = 0;
      for (let key in piggyBank) {
        deduct += +piggyBank[key];
      }
      console.log(openid, "存钱罐发霉的钱", deduct);

      user.save((err) => {
        if (err) {
          return res.send({
            code: "操作失败",
          });
        }
        return res.send({
          code: "查询成功",
          videoCoins: user.videoCoins,
          withdrawGrade: user.withdrawGrade,
          timesForWithdrawGrade: user.timesForWithdrawGrade,
          invitationTimesForGrade: user.invitationTimesForGrade,
          lastWithdrawTime: user.lastWithdrawTime,
          continuousLoginTimes: user.continuousLoginTimes,
          money: user.money,
          numRewardGradeToday: user.numRewardGradeToday,
          numRewardTimesToday: user.numRewardTimesToday,
          getRewardedGradeToday: user.getRewardedGradeToday,
          withdrawGradeToday: user.withdrawGradeToday,
          piggyBank: piggyBankTmp,
          openingReward: user.openingReward || 0,
          grandsonMoney: user.grandsonMoney || 0,
          sonMoney: user.sonMoney || 0,
        });
      });
    });
  },
  getCashOut: (req, res) => {
    if (cashOut)
      return res.send({ code: "操作成功", cashOut: cashOut.RECORDS });
    return res.send({ code: "操作失败", cashOut: [] });
  },
  //内部系统使用的提现接口 todo:还未区分安卓ios，还未给用户提现记录+1
  systemWithdraw: (req, res) => {
    console.log("收到操作审核提现请求:", req.body);
    console.log(
      "来源ip:",
      req.connection.remoteAddress,
      req.socket.remoteAddress
    );
    if (
      req.connection.remoteAddress == "::ffff:127.0.0.1" ||
      req.socket.remoteAddress == "::ffff:127.0.0.1"
    ) {
      let { _id, handle } = req.body;
      if (!_id && !handle) return res.send({ code: "参数错误" });
      if (handle != "pass" && handle != "refuse")
        return res.send({ code: "handle参数取值错误" });
      async.waterfall(
        [
          (next) => {
            models.withdraw.findOne({ _id }, (err, order) => {
              next(err, order);
            });
          },
          (order, next) => {
            if (!order) return next("不存在订单");
            if (handle == "refuse") {
              order.fail_msg = "人工审核不通过";
              order.save((err) => {
                return next(err || "已拒绝");
              });
            } else {
              wxcompay.wxcompay(
                order.openid,
                0,
                order.amount,
                "And",
                0,
                0,
                order.channel ? order.channel : null,
                (err, result) => {
                  next(null, err, order, result);
                }
              );
            }
          },
          (parseErr, order, result, next) => {
            console.log(
              "[withdraw]人工审核通过，微信提现结果：",
              parseErr,
              result
            );
            if (parseErr)
              console.log(
                "[withdraw]严重错误！人工审核通过，微信提现完成，但结果字符串解析失败"
              );
            if (result.result_code == "SUCCESS") {
              order.fail_msg = "审核通过，提现成功，已另生成提现成功记录";
              order.save((err) => {
                next(err);
              });
            } else {
              order.err_code_des = `${result.return_msg}${result.err_code_des}`;
              order.save((err) => {
                next(
                  err + `${result.return_msg}${result.err_code_des}` ||
                    "提现失败"
                );
              });
            }
          },
        ],
        (err) => {
          if (err == "已拒绝") return res.send({ code: "操作成功" });
          if (err) return res.send({ code: err });
          else return res.send({ code: "操作成功" });
        }
      );
    } else res.send({ code: "请求来源不合法" });
  },
};
