const to = require("await-to-js").default;

const _ = require("lodash");
const async = require("async");
const moment = require("moment");
const stringRandom = require("string-random");

const { models } = require("../util/mongo_client");
const { isActivate } = require("../libs/channelActivationProportion");
const Wechat = require("../libs/wechat");
const secret = require("../secret");
const idCounters = require("../libs/id_counters");
const task = require("../libs/task");
const gameSystem = require("../files/System");
const onlinereward_all = require("../files/onlinereward_all.json");
const bonuslvup = require("../files/bonuslvup");
const eventexplimit = require("../files/eventexplimit_all.json");
const signFun = require("../util/sign");
const newSignFun = require("../util/newSign");
const deduction = require("../files/deduction.json");
const dailycashoutbox = require("../files/dailycashoutbox_all.json");
const { sendLoginEvent, sendRegisterEvent } = require("../libs/middlePlatform");
let blacklistUnionidArray = require("../files/blacklistUnionidArray.json");
let blacklistGuidArray = require("../files/blacklistGuidArray.json");

const userM = models.user;
const channelM = models.channel;

const {
  hmset,
  del,
  hgetall,
  hincrby,
  expire,
} = require("../util/redis_client");
const { random } = require("../libs/ranNum");

const initVideoEvent = [
  1, // 招揽客户
  2, // 打印传单
  3, // 修理故障
  4, // 特殊NPC-土豪
  5, // 特殊NPC-李总
  6, // 特殊NPC-千金
  7, // 收益翻倍
  8, // 每日任务
  9, // 充值双倍领取
  10, // 自动服务
  11, // 提现-全屏
  15, // 提现-补充
  19, // 离线双倍
  20, // 开业-双倍
  21, // 投资-10倍
  29,
  30,
  31,
  32,
  33, // 业务红包-暴击
  34, // 飞行红包-暴击
];

const initPassEvent = [
  100, // 免费用户
  102, // 打印订单
  120, // 开业-普通
  121, // 投资-普通
  124, // 一键满座
  133, // 业务红包
];

// 每日红包
let wechat = new Wechat(secret.wechat.appid, secret.wechat.appsecret);

const domain = "cysd2dot0.5188youxi.com/";
let persent = 0; // 热云激活比例

let getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"] || // 判断是否有反向代理 IP
    req.connection.remoteAddress || // 判断 connection 的远程 IP
    req.socket.remoteAddress || // 判断后端的 socket 的 IP
    null
    // req.connection.socket.remoteAddress
  );
};

// 统计系统录入
let addStatistic = (event, system, channel) => {
  if (!channel) channel = "null";
  let obj = { day: new Date(moment()).Format("yyyy-MM-dd"), channel: "all" };
  let setEvent = {
    $inc: { [`datas.${[event]}`]: 1 },
    $set: { channel: "all" },
  };
  let opt = { upsert: true };
  // console.log(obj, setEvent, opt);

  // 先记录一次总的
  if (system == "android") {
    models.eventStatistic.update(obj, setEvent, opt).exec((err) => {
      if (err)
        console.log("[eventStatistic]：android打点all信息统计录入错误：", err);
    });
  } else if (system == "ios") {
    models.eventStatisticIOS.update(obj, setEvent, opt).exec((err) => {
      if (err)
        console.log("[eventStatistic]：ios打点all信息统计录入错误：", err);
    });
  }
  // 再记录一次各自渠道的
  setEvent.$set = { channel };
  obj.channel = channel;
  if (system == "android") {
    models.eventStatistic.update(obj, setEvent, opt).exec((err) => {
      if (err)
        console.log(
          "[eventStatistic]：android打点channel信息统计录入错误：",
          err
        );
    });
  } else if (system == "ios") {
    models.eventStatisticIOS.update(obj, setEvent, opt).exec((err) => {
      if (err)
        console.log("[eventStatistic]：ios打点channel信息统计录入错误：", err);
    });
  }
};

// 邀请成功操作(给上游邀请人加次数)
let addInvation = (code) => {
  models.user.findOne({ userid: Number(code) }).exec((err, user) => {
    if (err) {
      console.error(
        "邀请成功操作(给上游邀请人加次数)失败，数据库错误，邀请人：",
        code,
        "，error:",
        err
      );
      return;
    }
    if (!user) {
      console.error(
        "邀请成功操作(给上游邀请人加次数)失败，邀请人不存在，邀请人：",
        code
      );
      return;
    }
    user.invitationTimes++;
    user.invitationTimesForGrade++;
    user.save((err) => {
      if (err)
        console.error(
          "邀请成功操作(给上游邀请人加次数)失败，保存数据库失败，邀请人：",
          code,
          "，error:",
          err
        );
    });
  });
};

module.exports = {
  //提现页面签到
  signIn: (req, res) => {
    let { openid, level } = req.body;
    console.log("收到签到接口请求", req.body);
    if (!level || !openid) return res.send({ code: "参数错误" });
    models.user.findOne({ openid }, (err, user) => {
      //查询错误or查不到用户直接失败
      if (err || !user) return res.send({ code: "签到失败" });

      if (level == 1 || level == 2 || level == 1.5) {
        if (level == 1) {
          //0.3元档次
          //若存在最后签到天数并且最后签到天数是今天则直接失败
          if (
            user.lastSignInByLevel1 &&
            new Date(user.lastSignInByLevel1).Format("yyyy-MM-dd") ==
              new Date(moment()).Format("yyyy-MM-dd")
          ) {
            return res.send({
              code: "今日已签到，请明日再来。",
              error: "已签到",
            });
          }
          if (user.signInTimes < 2) {
            user.signInTimes++;
            user.lastSignInByLevel1 = new Date(moment()).Format("yyyy-MM-dd");
          }
        }
        if (level == 1.5) {
          //0.5元档次
          //若存在最后签到天数并且最后签到天数是今天则直接失败
          if (
            user.lastSignInByLevel1 &&
            new Date(user.lastSignInByLevel1).Format("yyyy-MM-dd") ==
              new Date(moment()).Format("yyyy-MM-dd")
          ) {
            return res.send({
              code: "今日已签到，请明日再来。",
              error: "已签到",
            });
          }
          //若未提现0.3元则签到直接失败
          if (user.signInTimes != 3) {
            return res.send({
              code: "前一档次未提现",
              error: "前一档次未提现",
            });
          }
          if (!user.signInTimesLevel2) user.signInTimesLevel2 = 0;
          if (user.signInTimesLevel2 < 5) {
            user.signInTimesLevel2++;
            user.lastSignInByLevel1 = new Date(moment()).Format("yyyy-MM-dd");
          }
        }

        if (level == 2) {
          //15元以上档次用户提现任务等级判断
          //若存在最后签到天数并且最后签到天数是今天则直接失败
          if (
            user.lastSignIn &&
            new Date(user.lastSignIn).Format("yyyy-MM-dd") ==
              new Date(moment()).Format("yyyy-MM-dd")
          ) {
            return res.send({
              code: "今日已签到，请明日再来。",
              error: "已签到",
            });
          }
          user = task.levelUp(user, 1, 0);
          user.lastSignIn = new Date(moment()).Format("yyyy-MM-dd");
        }

        user.save((err) => {
          //保存签到信息错误直接失败
          if (err) return res.send({ code: "签到失败" });
          console.log("签到成功准备返回", req.body);
          return res.send({ code: "签到成功" });
        });
      } else return res.send({ code: "参数错误" });
    });
  },

  //新增android事件
  addEvent: async (req, res) => {
    let { userid, event, system, datas } = req.body;
    console.log("新增event", req.body);

    if (!userid || !event) return res.send({ code: "参数错误" });

    if (![...initVideoEvent, ...initPassEvent].includes(event)) {
      let err, userInfo, channelInfo;
      [err, userInfo] = await to(models.user.findOne({ userid }));
      if (err) {
        return res.send({ code: "查询用户失败" });
      }
      if (!userInfo) {
        return res.send({ code: "用户不存在" });
      }

      let { daily_limit = 0, total_limit = 0 } = eventexplimit[event.toString()]
        ? eventexplimit[event.toString()]
        : {};

      const { deviceInfo = {} } = userInfo;
      const { channel = "" } = deviceInfo;
      if (channel == "") {
        console.error(userid, "用户无渠道");
      } else {
        [err, channelInfo] = await to(channelM.findOne({ channel }));
        if (err) {
          console.error("数据库操作错误", err);
          return res.send({ code: "操作失败" });
        }

        if (!_.isNil(channelInfo)) {
          const { event: chlEvent = [] } = channelInfo;

          let chlE = chlEvent.find((e) => {
            return e.id == +event;
          });

          console.log("chlEvent", chlE);

          if (!_.isNil(chlE)) {
            daily_limit = chlE.dailyLimit || 0;
            total_limit = chlE.totalLimit || 0;
          }
        }
      }

      let eventTodayTimes = 0,
        eventTotalTimes = 0;

      if (
        userInfo.eventTodayTimes &&
        userInfo.eventTodayTimes[event.toString()]
      ) {
        eventTodayTimes = userInfo.eventTodayTimes[event.toString()];
      }

      if (
        userInfo.eventTotalTimes &&
        userInfo.eventTotalTimes[event.toString()]
      ) {
        eventTotalTimes = userInfo.eventTotalTimes[event.toString()];
      }

      if (+event == 121 || +event == 21) {
        if (
          daily_limit > 0 &&
          daily_limit <=
            (userInfo.eventTodayTimes[`${121}`] || 0) +
              (userInfo.eventTodayTimes[`${21}`] || 0)
        ) {
          console.log(
            logid,
            userid,
            "今天已达上限",
            daily_limit,
            eventTodayTimes
          );
          return res.send({ code: "今天已达上限" });
        }
      }

      // 开业
      if (+event == 20 || +event == 120) {
        if (
          (userInfo.eventTotalTimes[`${20}`] || 0) +
            (userInfo.eventTotalTimes[`${20}`] || 0) >=
          1
        ) {
          console.log(userid, "双倍开业已达上限");
          return res.send({ code: "总数已达上限" });
        }
      }

      if (daily_limit > 0 && daily_limit <= eventTodayTimes) {
        return res.send({ code: "今天已达上限" });
      }

      if (total_limit > 0 && total_limit <= eventTotalTimes) {
        return res.send({ code: "总数已达上限" });
      }

      userInfo.eventTodayTimes[event.toString()] = ++eventTodayTimes;
      userInfo.eventTotalTimes[event.toString()] = ++eventTotalTimes;

      userInfo.markModified("eventTodayTimes");
      userInfo.markModified("eventTotalTimes");

      userInfo.save();
    }

    let insertData = {
      userid,
      event,
    };
    if (system) {
      insertData.system = system;
    }
    if (datas) {
      insertData.datas = datas;
    }
    models.event.create(insertData, (err) => {
      if (err)
        console.log(
          "[user]新增事件记录入库失败！：",
          userid,
          event,
          system,
          datas,
          err
        );
    });
    let channel;
    if (datas && datas.channel) channel = datas.channel;
    //统计录入
    addStatistic(event, "android", channel);
    return res.send({ code: "记录完毕" });
  },

  //新增IOS事件
  addEventIOS: async (req, res) => {
    let { userid, event, system, datas } = req.body;
    if (!userid || !event) return res.send({ code: "参数错误" });

    let err, userInfo;
    [err, userInfo] = await to(models.user.findOne({ userid }));
    if (err) {
      return res.send({ code: "查询用户失败" });
    }
    if (!userInfo) {
      return res.send({ code: "用户不存在" });
    }

    const { daily_limit = 0, total_limit = 0 } = eventexplimit[event.toString()]
      ? eventexplimit[event.toString()]
      : {};

    let eventTodayTimes = 0,
      eventTotalTimes = 0;

    if (
      userInfo.eventTodayTimes &&
      userInfo.eventTodayTimes[event.toString()]
    ) {
      eventTodayTimes = userInfo.eventTodayTimes[event.toString()];
    }

    if (
      userInfo.eventTotalTimes &&
      userInfo.eventTotalTimes[event.toString()]
    ) {
      eventTotalTimes = userInfo.eventTotalTimes[event.toString()];
    }

    if (daily_limit > 0 && daily_limit <= eventTodayTimes) {
      return res.send({ code: "今天已达上限" });
    }

    if (total_limit > 0 && total_limit <= eventTotalTimes) {
      return res.send({ code: "总数已达上限" });
    }

    userInfo.eventTodayTimes[event.toString()] = ++eventTodayTimes;
    userInfo.eventTotalTimes[event.toString()] = ++eventTotalTimes;

    userInfo.markModified("eventTodayTimes");
    userInfo.markModified("eventTotalTimes");

    userInfo.save();

    let insertData = {
      userid,
      event,
    };
    if (system) {
      insertData.system = system;
    }
    if (datas) {
      insertData.datas = datas;
    }
    models.eventIOS.create(insertData, (err) => {
      if (err)
        console.log(
          "[user]新增事件记录入库失败！：",
          userid,
          event,
          system,
          datas,
          err
        );
    });
    let channel;
    if (datas && datas.channel) channel = datas.channel;
    //统计录入
    addStatistic(event, "ios", channel);

    return res.send({ code: "记录完毕" });
  },

  //登陆注册
  login: (req, res) => {
    const logid = `${stringRandom()}-${req.path}`;
    let {
      code,
      invitationCode,
      accessToken,
      openid,
      lastRunTime,
      deviceInfo,
      system,
      userBehavior,
    } = req.body;
    console.log(logid, "收到用户登陆/注册请求：", req.body);

    // ip 以服务端为准
    deviceInfo.ip = getClientIP(req) || null;

    if (accessToken && openid) {
      //存在accessToken和openid，进行判断登陆
      async.waterfall(
        [
          (cb) => {
            models.user.findOne({ openid }, (err, user) => {
              if (err)
                return res.send({
                  code: "查询用户失败",
                  error: err,
                });
              if (!user)
                return res.send({
                  code: "用户不存在",
                });

              // 黑名单查询
              models.blackList.findOne({ openid: user.openid }, (err, u) => {
                if (err) {
                  console.error(logid, "数据库查询错误", err);
                  return res.send({ code: "操作失败" });
                }
                if (u) {
                  // 判断封号时间
                  const { times = 1, updatedAt } = u;
                  const timeList = [0, 2, 12, 24];
                  if (times > 3) {
                    return res.send({
                      code: "非法用户",
                      msg: "您的账号多次数据异常，请联系 212562512@qq.com",
                    });
                  }

                  let timeDiff = moment().diff(moment(updatedAt), "seconds");

                  console.log(logid, "时间对比", timeDiff);

                  if (timeDiff < +timeList[times] * 3600) {
                    const resultData = {
                      code: "非法用户",
                      msg: `用户行为异常，请在 ${new Date(
                        moment(updatedAt).add(
                          +timeList[times] * 3600,
                          "seconds"
                        )
                      ).Format("yyyy-MM-dd hh:mm")} 后登陆`,
                    };
                    console.log(logid, user.openid, "用户被封禁", resultData);
                    return res.send(resultData);
                  }
                }
              });

              if (user.deviceInfo && user.deviceInfo.channel) {
                // 再次上传 channel 不修改原有 channel
                if (deviceInfo && deviceInfo.channel) {
                  if (deviceInfo.channel !== user.deviceInfo.channel) {
                    console.log(
                      logid,
                      `串渠道用户 userid: ${user.userid}, 原渠道：${user.deviceInfo.channel}, 现渠道：${deviceInfo.channel}`
                    );
                  }
                  deviceInfo.channel = user.deviceInfo.channel;
                }
              }

              // todo 万能公司先关闭
              // if (deviceInfo.channel == "te01") {
              //   console.error("不给登陆和注册");
              //   return res.send({
              //     code: "游戏紧急维护中",
              //   });
              // }

              cb(err, user, user.refreshToken);
            });
          },

          // 黑名单
          (user, userRefreshToken, cb) => {
            if (blacklistUnionidArray.includes(user.unionid)) {
              models.blacklistLimit.create(
                {
                  data: user.unionid,
                  userid: user.userid,
                  deviceInfo: user.deviceInfo,
                  type: "登陆",
                  source: "unionid",
                },
                () => {
                  console.log("提现黑名单");
                }
              );
              console.log(
                "blacklistUnionidArray,黑名单用户注册拒绝：",
                user.unionid
              );

              return res.send({
                code: "数据库错误",
              });
            } else if (
              user.deviceInfo &&
              user.deviceInfo.guid &&
              blacklistGuidArray.includes(user.deviceInfo.guid)
            ) {
              models.blacklistLimit.create(
                {
                  data: user.unionid,
                  userid: user.userid,
                  deviceInfo: user.deviceInfo,
                  type: "登陆",
                  source: "guid",
                },
                () => {
                  console.log("提现黑名单");
                }
              );
              console.log(
                "blacklistGuidArray,黑名单用户注册拒绝：",
                user.deviceInfo.guid
              );

              return res.send({
                code: "数据库错误",
              });
            } else {
              cb(null, user, userRefreshToken);
            }
          },

          (user, userRefreshToken, cb) => {
            // 热云 topon 计划
            let hotCloudPlan = "withdraw";
            let toponPlan = "signIn";
            let ablSwitch = false;
            let userChannel = user.deviceInfo
              ? user.deviceInfo.channel
                ? user.deviceInfo.channel
                : null
              : null;

            models.channel
              .findOne({ channel: userChannel })
              .exec((err, resultChannel) => {
                if (!user) return next("无此用户");

                if (err) console.log(logid, "查询渠道错误1", err);

                if (resultChannel) {
                  hotCloudPlan = resultChannel.hotCloudPlan;
                  toponPlan = resultChannel.topOnPlan;
                  ablSwitch = resultChannel.ablSwitch || false;
                }

                console.log(logid, "查询渠道详细1", resultChannel);

                user.hotCloudPlan = hotCloudPlan;
                user.toponPlan = toponPlan;

                if (
                  user.hotCloudPlan == "signIn" &&
                  !user.hotCloudIsProcessed
                ) {
                  user.hotCloudIsProcessed = true;
                  user.hotCloudIsActivate = isActivate(
                    resultChannel.activationProbability
                  );
                }

                if (user.toponPlan == "signIn" && !user.toponIsProcessed) {
                  user.toponIsProcessed = true;
                  user.toponIsActivate = true;
                }

                user.ablSwitch = ablSwitch;

                cb(null, user, userRefreshToken);
              });
          },

          (user, userRefreshToken, cb) => {
            // 防刷子用户登陆
            if (
              user.deviceInfo &&
              user.deviceInfo.ip &&
              user.deviceInfo.model
            ) {
              models.user
                .find({
                  "deviceInfo.ip": user.deviceInfo.ip,
                })
                .count()
                .exec((err, ipCount) => {
                  if (err) {
                    console.error("限制登陆 ip相同 查询错误", err);
                    return res.send({
                      code: "数据库错误：插入新用户出错",
                    });
                  }

                  if (ipCount >= 20) {
                    console.log(
                      logid,
                      "限制登陆 ip相同 存在相同ip",
                      ipCount,
                      req.body
                    );

                    models.limitUser.create(
                      { deviceInfo: user.deviceInfo, type: "登陆ip限制" },
                      () => {}
                    );

                    return res.send({
                      code: "数据库错误：插入新用户出错",
                    });
                  }

                  models.user
                    .find({
                      "deviceInfo.ip": user.deviceInfo.ip,
                      "deviceInfo.model": user.deviceInfo.model,
                    })
                    .count()
                    .exec((err, ipModelCount) => {
                      if (err) {
                        console.error(
                          logid,
                          "限制登陆 机型相同ip相同 查询错误",
                          err
                        );

                        return res.send({
                          code: "数据库错误：插入新用户出错",
                        });
                      }

                      if (ipModelCount >= 2) {
                        console.log(
                          logid,
                          user.deviceInfo.ip,
                          user.deviceInfo.model,
                          "限制登陆 机型相同ip相同 存在相同",
                          ipModelCount,
                          req.body
                        );

                        models.limitUser.create(
                          {
                            deviceInfo: user.deviceInfo,
                            type: "登陆ip机型限制",
                          },
                          () => {}
                        );

                        return res.send({
                          code: "数据库错误：插入新用户出错",
                        });
                      }
                      cb(null, user, userRefreshToken);
                    });
                });
            } else {
              cb(null, user, userRefreshToken);
            }
          },

          (user, userRefreshToken, cb) => {
            wechat.getToken(openid, (err, tokenData) => {
              if (err || !tokenData || accessToken != tokenData.access_token) {
                wechat.refreshToken(userRefreshToken, (err, result) => {
                  console.log(logid, result);

                  if (err || result.data.errcode)
                    console.log(
                      logid,
                      "用户token失效，刷新用户token接口失败：",
                      err || result.data.errmsg
                    );

                  return res.send({
                    code: "用户token失效",
                    error: err || result.data.errmsg,
                  });

                  // wechat.setToken(openid, result.data.access_token, () => {});

                  cb(err, user, result.data.access_token, userRefreshToken);
                });
              } else {
                cb(err, user, tokenData.access_token, userRefreshToken);
              }
            });
          },
        ],
        (err, user, realToken, userRefreshToken) => {
          if (accessToken == realToken) {
            if (
              moment().diff(moment(user.lastLogin), "days") < 15 &&
              moment().diff(moment(user.lastLogin), "days") >= 7
            ) {
              // returnUserInfo.code = '注册成功'
              models.specialEvent.create(
                {
                  event: "7-15正常登陆沉默用户回流",
                  info: {
                    userid: user.userid,
                    lastLogin: user.lastLogin,
                    channel: user.deviceInfo ? user.deviceInfo.channel : null,
                  },
                },
                (err) => {
                  if (err)
                    console.log(
                      logid,
                      "[user]:7-15正常登陆沉默用户回流打点失败！",
                      err
                    );
                }
              );
            }

            if (
              moment().diff(moment(user.lastLogin), "days") >= 15 &&
              moment().diff(moment(user.lastLogin), "days") < 31
            ) {
              // returnUserInfo.code = '注册成功'
              models.specialEvent.create(
                {
                  event: "正常登陆沉默用户回流",
                  info: {
                    userid: user.userid,
                    lastLogin: user.lastLogin,
                    channel: user.deviceInfo ? user.deviceInfo.channel : null,
                  },
                },
                (err) => {
                  if (err)
                    console.log(
                      logid,
                      "[user]:正常登陆沉默用户回流打点失败！",
                      err
                    );
                }
              );
            }

            if (moment().diff(moment(user.lastLogin), "days") >= 31) {
              // returnUserInfo.code = '注册成功'
              models.specialEvent.create(
                {
                  event: "31正常登陆沉默用户回流",
                  info: {
                    userid: user.userid,
                    lastLogin: user.lastLogin,
                    channel: user.deviceInfo ? user.deviceInfo.channel : null,
                  },
                },
                (err) => {
                  if (err)
                    console.log(
                      logid,
                      "[user]:31正常登陆沉默用户回流打点失败！",
                      err
                    );
                }
              );
            }

            const isTodayAgainLogin =
              new Date(user.lastLogin).Format("yyyy-MM-dd") ==
              new Date(moment()).Format("yyyy-MM-dd");

            if (!isTodayAgainLogin) {
              user.loginDays++;
            }

            // 连续登陆判断
            const isYesterdayLogin =
              !isTodayAgainLogin &&
              new Date(user.lastLogin).Format("yyyy-MM-dd") ==
                new Date(moment().add(-1, "day")).Format("yyyy-MM-dd");
            user.continuousLoginTimes = isYesterdayLogin
              ? user.continuousLoginTimes
              : 1;

            user.lastLogin = new Date(moment());
            user.loginTimes++;

            // userBehavior
            // 	? (user.userBehavior = userBehavior)
            // 	: userBehavior = null;
            //判断有没上传用户上次登陆时长，有的话累加进总的时长里面
            if (lastRunTime && lastRunTime > 0) {
              if (!user.runTime || user.runTime == 0) {
                user.runTime = 0;
                user.firstRuntime = lastRunTime;
              }
              user.runTime += lastRunTime;
            }

            user.save();

            // todo 热云注册事件发送
            if (
              user.hotCloudPlan !== "signIn" ||
              user.hotCloudIsActivate == false
            ) {
              user.hasSendHotCloudSignIn = false;
            }

            // todo 热云注册事件发送
            if (
              user.hotCloudPlan !== "signIn" ||
              user.hotCloudIsActivate == false
            ) {
              user.hasSendHotCloudSignIn = false;
            }

            let loginResDatas = {
              isFreeUsers: user.isFreeUsers ? user.isFreeUsers : false,
              name: user.name,
              userid: user.userid,
              openid: user.openid,
              invitationCode: user.invitationCode,
              headImgUrl: user.headImgUrl,
              code: "登陆成功",
              accessToken: realToken,
              refreshToken: userRefreshToken,
              userBehavior: user.userBehavior || {},
              createdAt: user.createdAt,
              channel: user.deviceInfo
                ? user.deviceInfo.channel
                  ? user.deviceInfo.channel
                  : null
                : null,
              domain,
              hotCloudPlan: user.hotCloudPlan,
              hotCloudIsProcessed: user.hotCloudIsProcessed,
              hotCloudIsActivate: user.hotCloudIsActivate,
              toponPlan: user.toponPlan,
              toponIsProcessed: user.toponIsProcessed,
              toponIsActivate: user.toponIsActivate,
              ablSwitch: user.ablSwitch,
              hasSendHotCloudSignIn: user.hasSendHotCloudSignIn,
            };
            console.log(logid, "用户登陆返回：", loginResDatas);
            sendLoginEvent(
              loginResDatas.openid,
              user.deviceInfo
                ? user.deviceInfo.guid
                  ? user.deviceInfo.guid
                  : ""
                : "",
              loginResDatas.channel,
              Date.parse(new Date(moment(user.createdAt)))
            );
            return res.send(loginResDatas);
          } else {
            console.log(
              logid,
              "用户token错误，token比对：",
              accessToken,
              realToken
            );
            return res.send({
              code: "用户token错误",
            });
          }
        }
      );
    } else if (code || invitationCode) {
      //则开始判断注册或登陆
      async.waterfall(
        [
          (cb) => {
            wechat.getAccessToken(code, (err, rst) => {
              if (err || rst.data.errmsg) {
                console.log(
                  logid,
                  "[wechat] 根据code获取accesstoken失败：",
                  err || rst.data.errmsg
                );
                return res.send({
                  code: "code无效",
                  error: err || rst.data.errmsg,
                });
              }
              cb(err, rst.data);
            });
          },

          (data, cb) => {
            if (data.openid == "oPOGK53AH9I7PdiUVwCQPJntnN4k") {
              console.log("oPOGK53AH9I7PdiUVwCQPJntnN4k1111111111111", code);
            }

            if (data.openid) {
              models.blackList.findOne({ openid: data.openid }, (err, u) => {
                if (err) {
                  console.error(logid, "数据库查询错误", err);
                  return res.send({ code: "操作失败" });
                }
                if (u) {
                  // 判断封号时间
                  const { times = 1, updatedAt } = u;
                  const timeList = [0, 2, 12, 24];
                  if (times > 3) {
                    return res.send({
                      code: "非法用户",
                      msg: "您的账号多次数据异常，请联系 212562512@qq.com",
                    });
                  }

                  let timeDiff = moment().diff(moment(updatedAt), "seconds");

                  console.log(logid, "时间对比", timeDiff);

                  if (timeDiff < +timeList[times] * 3600) {
                    const resultData = {
                      code: "非法用户",
                      msg: `用户行为异常，请在 ${new Date(
                        moment(updatedAt).add(
                          +timeList[times] * 3600,
                          "seconds"
                        )
                      ).Format("yyyy-MM-dd hh:mm")} 后登陆`,
                    };
                    console.log(logid, data.openid, "用户被封禁", resultData);
                    return res.send(resultData);
                  }
                }
                cb(null, data);
              });
            } else {
              cb(null, data);
            }
          },

          (data, cb) => {
            wechat.getUser(data.openid, (err, userInfo) => {
              if (err)
                console.log(
                  logid,
                  "[wechat] 根据accesstoken获取用户信息失败：",
                  err
                );
              cb(err, userInfo, data.access_token, data.refresh_token);
            });
          },

          // 根据 unionid 判断
          (userInfo, accessToken, refreshToken, cb) => {
            if (
              userInfo.unionid &&
              blacklistUnionidArray.includes(userInfo.unionid)
            ) {
              models.blacklistLimit.create(
                {
                  data: userInfo.unionid,
                  userid: userInfo.userid,
                  deviceInfo: userInfo.deviceInfo,
                  type: "注册",
                  source: "unionid",
                },
                () => {
                  console.log(logid, "提现黑名单");
                }
              );
              console.log(
                logid,
                "blacklistUnionidArray黑名单用户",
                userInfo.unionid
              );
              return res.send({ code: "系统错误" });
            } else if (
              userInfo.deviceInfo &&
              userInfo.deviceInfo.guid &&
              blacklistGuidArray.includes(userInfo.deviceInfo.guid)
            ) {
              models.blacklistLimit.create(
                {
                  data: userInfo.unionid,
                  userid: userInfo.userid,
                  deviceInfo: userInfo.deviceInfo,
                  type: "注册",
                  source: "guid",
                },
                () => {
                  console.log(logid, "提现黑名单");
                }
              );
              console.log(
                logid,
                "blacklistGuidArray黑名单用户",
                userInfo.deviceInfo.guid
              );
              return res.send({ code: "系统错误" });
            } else {
              cb(null, userInfo, accessToken, refreshToken);
            }
          },
        ],
        (err, userInfo, accessToken, refreshToken) => {
          if (err) return res.send({ code: "微信接口出错", error: err });

          console.log(logid, "[user]获得userInfo:", userInfo);

          //开始判断注册或者登陆

          let openid = userInfo.openid;
          models.user.findOne({ openid }, async (err, user) => {
            if (err)
              return res.send({
                code: "数据库查询错误",
                error: err,
              });
            if (user) {
              // ip 数量限制
              let [ipCountErr, ipCount] = await to(
                models.user
                  .find({ "deviceInfo.ip": user.deviceInfo.ip })
                  .count()
              );
              if (ipCountErr) {
                console.error("查询ip重复的用户错误", ipCountErr);
                return res.send({
                  code: "数据库错误",
                });
              }
              if (ipCount >= 20) {
                console.error("该用户存在20个相同ip", user.userid);
                models.limitUser.create(
                  { deviceInfo: user.deviceInfo, type: "登陆ip限制" },
                  () => {}
                );
                return res.send({
                  code: "系统错误",
                });
              }

              // 限制机型和ip 不超过 2
              const [ipModelCountErr, ipModelCount] = await to(
                models.user
                  .find({
                    "deviceInfo.ip": user.deviceInfo.ip,
                    "deviceInfo.model": user.deviceInfo.model,
                  })
                  .count()
              );
              if (ipModelCountErr) {
                console.err("相同ip设备查询错误", ipModelCountErr);
                return res.send({
                  code: "数据库错误",
                });
              }

              if (ipModelCount > 2) {
                console.log(
                  user.deviceInfo.ip,
                  user.deviceInfo.model,
                  "限制登陆 机型相同ip相同 存在相同",
                  ipModelCount,
                  req.body
                );

                models.limitUser.create(
                  { deviceInfo: user.deviceInfo, type: "登陆ip机型限制" },
                  () => {}
                );

                return res.send({
                  code: "数据库错误：插入新用户出错",
                });
              }

              //登陆
              let returnUserInfo = {
                hotCloudPlan: user.hotCloudPlan,
                hotCloudIsProcessed: user.hotCloudIsProcessed,
                hotCloudIsActivate: user.hotCloudIsActivate,
                toponPlan: user.toponPlan,
                toponIsProcessed: user.toponIsProcessed,
                toponIsActivate: user.toponIsActivate,
                name: user.name,
                userid: user.userid,
                openid: user.openid,
                invitationCode: user.invitationCode,
                headImgUrl: user.headImgUrl,
                code: "登陆成功",
                accessToken,
                refreshToken,
                userBehavior: user.userBehavior || {},
                createdAt: user.createdAt,
                channel: user.deviceInfo
                  ? user.deviceInfo.channel
                    ? user.deviceInfo.channel
                    : null
                  : null,
                domain,
                ablSwitch: user.ablSwitch,
                hasSendHotCloudSignIn: user.hasSendHotCloudSignIn || true,
              };

              const [errChannel, resultChannel] = await to(
                models.channel.findOne({ channel: returnUserInfo.channel })
              );

              if (errChannel) console.log(logid, "查询渠道错误", err);

              if (resultChannel) {
                returnUserInfo.ablSwitch = resultChannel.ablSwitch || false;
              }

              if (
                moment().diff(moment(user.lastLogin), "days") < 15 &&
                moment().diff(moment(user.lastLogin), "days") >= 7
              ) {
                // returnUserInfo.code = '注册成功'
                models.specialEvent.create(
                  {
                    event: "7-15沉默用户回流",
                    info: {
                      userid: user.userid,
                      lastLogin: user.lastLogin,
                    },
                  },
                  (err) => {
                    if (err)
                      console.log(
                        logid,
                        "[user]:7-15沉默用户回流打点失败！",
                        err
                      );
                  }
                );
              }
              if (
                moment().diff(moment(user.lastLogin), "days") >= 15 &&
                moment().diff(moment(user.lastLogin), "days") < 31
              ) {
                // returnUserInfo.code = '注册成功'
                models.specialEvent.create(
                  {
                    event: "沉默用户回流",
                    info: {
                      userid: user.userid,
                      lastLogin: user.lastLogin,
                    },
                  },
                  (err) => {
                    if (err)
                      console.log(logid, "[user]:沉默用户回流打点失败！", err);
                  }
                );
              }
              if (moment().diff(moment(user.lastLogin), "days") >= 31) {
                // returnUserInfo.code = '注册成功'
                models.specialEvent.create(
                  {
                    event: "31沉默用户回流",
                    info: {
                      userid: user.userid,
                      lastLogin: user.lastLogin,
                    },
                  },
                  (err) => {
                    if (err)
                      console.log(
                        logid,
                        "[user]:31沉默用户回流打点失败！",
                        err
                      );
                  }
                );
              }

              const isTodayAgainLogin =
                new Date(user.lastLogin).Format("yyyy-MM-dd") ==
                new Date(moment()).Format("yyyy-MM-dd");

              if (!isTodayAgainLogin) {
                user.loginDays++;
              }

              // 连续登陆判断
              const isYesterdayLogin =
                !isTodayAgainLogin &&
                new Date(user.lastLogin).Format("yyyy-MM-dd") ==
                  new Date(moment().add(-1, "day")).Format("yyyy-MM-dd");
              user.continuousLoginTimes = isYesterdayLogin
                ? user.continuousLoginTimes
                : 1;

              user.lastLogin = new Date(moment());
              user.loginTimes++;
              user.refreshToken = refreshToken;
              // userBehavior
              //     ? (user.userBehavior = userBehavior)
              //     : userBehavior = null;
              //判断有没上传用户上次登陆时长，有的话累加进总的时长里面
              if (lastRunTime && lastRunTime > 0) {
                if (!user.runTime || user.runTime == 0) {
                  user.runTime = 0;
                  user.firstRuntime = lastRunTime;
                }
                user.runTime += lastRunTime;
              }
              user.save();
              console.log(logid, "登陆返回：", returnUserInfo);
              sendLoginEvent(
                returnUserInfo.openid,
                user.deviceInfo
                  ? user.deviceInfo.guid
                    ? user.deviceInfo.guid
                    : ""
                  : "",
                returnUserInfo.channel,
                Date.parse(new Date(moment(user.createdAt)))
              );
              return res.send(returnUserInfo);
            } else {
              // 注册
              console.log(logid, "新用户开始注册:", req.body);
              // 判断设备是否注册过1个账号
              models.user
                .find({
                  "deviceInfo.guid": deviceInfo.guid
                    ? deviceInfo.guid
                    : "meiyouguid",
                })
                .count()
                .exec((err, guidDeviceCount) => {
                  if (err)
                    console.error(
                      logid,
                      "用户注册查询guid注册设备数错误：",
                      err
                    );
                  if (guidDeviceCount > 1) {
                    console.log(
                      logid,
                      "用户注册guid设备大于1，拒绝注册：",
                      deviceInfo.guid
                    );
                    return res.send({
                      code: "设备上限",
                    });
                  }
                  // 生成id
                  idCounters.getNextSequenceValue("userid", (err, userid) => {
                    if (err) {
                      console.log(logid, "[user]生成用户id失败：", err);
                      return res.send({
                        code: "生成用户id失败",
                        error: err,
                      });
                    }

                    const openingReward = gameSystem["opening_gift_cash"] || 0;

                    let newUserInfo = new models.user({
                      // todo 默认热云注册事件不发送
                      hasSendHotCloudSignIn: false,
                      unionid: userInfo.unionid,
                      userid: userid,
                      name: userInfo.nickname,
                      openid: userInfo.openid,
                      invitationCode: userid,
                      lastLogin: new Date(moment()),
                      headImgUrl: userInfo.headimgurl,
                      sex: userInfo.sex,
                      city: userInfo.city,
                      country: userInfo.country,
                      openingReward: openingReward,
                      refreshToken,
                    });
                    //若是存在邀请人则记录入库,并给上游邀请人加次数

                    if (invitationCode) {
                      if (_.isNaN(Number(invitationCode))) {
                        console.error(logid, "邀请码错误");
                      } else {
                        addInvation(invitationCode);
                        newUserInfo.master = +invitationCode;

                        // 查找师公
                        models.user
                          .findOne({ userid: +invitationCode })
                          .exec((err, grandUser) => {
                            if (err) {
                              console.log(logid, userid, "查找邀请错误", err);
                            } else {
                              if (_.isNil(grandUser)) {
                                console.log(
                                  logid,
                                  userid,
                                  "邀请成功操作(给上游邀请人加次数)失败，邀请人不存在，邀请人："
                                );
                              } else {
                                if (grandUser.invitationFrom) {
                                  newUserInfo.grandMaster =
                                    grandUser.invitationFrom;
                                }
                              }
                            }
                          });

                        newUserInfo.invitationFrom = invitationCode;
                      }
                    }
                    //若是存在手机系统则记录入库
                    if (system) newUserInfo.system = system;
                    //若是存在设备硬件信息则记录入库
                    if (deviceInfo) {
                      newUserInfo.deviceInfo = deviceInfo;
                    }
                    if (!newUserInfo.deviceInfo) newUserInfo.deviceInfo = {};
                    //ip入库
                    newUserInfo.deviceInfo.ip = getClientIP(req) || null;

                    models.user
                      .find({
                        "deviceInfo.ip": newUserInfo.deviceInfo.ip
                          ? newUserInfo.deviceInfo.ip
                          : "nortfindip",
                      })
                      .count()
                      .exec(async (err, ipCount) => {
                        if (err)
                          console.error(
                            logid,
                            "用户注册查询ip注册设备数错误：",
                            err
                          );
                        if (ipCount > 14) {
                          console.log(
                            logid,
                            "用户注册ip设备大于15，拒绝注册：",
                            newUserInfo.deviceInfo
                          );
                          return res.send({
                            code: "达到上限",
                          });
                        }

                        // 热云 topon 计划
                        let hotCloudPlan = "withdraw";
                        let toponPlan = "signIn";
                        let userChannel = "";

                        if (deviceInfo && deviceInfo.channel) {
                          channel = deviceInfo.channel;
                          userChannel = channel;
                        }

                        const [errChannel, resultChannel] = await to(
                          models.channel.findOne({ channel: userChannel })
                        );

                        if (errChannel)
                          console.log(logid, "查询渠道错误2", err);

                        newUserInfo.ablSwitch = false;

                        if (resultChannel) {
                          hotCloudPlan = resultChannel.hotCloudPlan;
                          toponPlan = resultChannel.topOnPlan;
                          newUserInfo.ablSwitch =
                            resultChannel.ablSwitch || false;
                        }

                        console.log(logid, "查询渠道详细2", resultChannel);

                        newUserInfo.hotCloudPlan = hotCloudPlan;
                        newUserInfo.toponPlan = toponPlan;

                        if (newUserInfo.hotCloudPlan == "signIn") {
                          newUserInfo.hotCloudIsProcessed = true;
                          newUserInfo.hotCloudIsActivate = isActivate(
                            resultChannel
                              ? resultChannel.activationProbability
                                ? resultChannel.activationProbability
                                : 0
                              : 0
                          );
                        }
                        if (newUserInfo.toponPlan == "signIn") {
                          newUserInfo.toponIsProcessed = true;
                          newUserInfo.toponIsActivate = true;
                        }

                        // 防刷子用户注册
                        let [ipCountErrr, ipCountt] = await to(
                          models.user
                            .find({
                              "deviceInfo.ip": newUserInfo.deviceInfo.ip,
                            })
                            .count()
                        );
                        if (ipCountErrr) {
                          console.error("限制注册 ip相同 查询错误", err);
                          return res.send({
                            code: "数据库错误",
                          });
                        }
                        if (ipCountt >= 20) {
                          console.log(
                            "限制注册 ip相同 存在相同ip",
                            ipCount,
                            req.body
                          );

                          models.limitUser.create(
                            {
                              deviceInfo: deviceInfo,
                              type: "注册ip限制",
                            },
                            () => {}
                          );
                          return res.send({
                            code: "数据库错误：插入新用户出错",
                          });
                        }

                        const [ipModelCountErr, ipModelCount] = await to(
                          models.user
                            .find({
                              "deviceInfo.ip": newUserInfo.deviceInfo.ip,
                              "deviceInfo.model": newUserInfo.deviceInfo.model,
                            })
                            .count()
                        );
                        if (ipModelCountErr) {
                          console.err("相同ip设备查询错误", ipModelCountErr);
                          return res.send({
                            code: "数据库错误",
                          });
                        }

                        if (ipModelCount >= 2) {
                          console.log(
                            "限制注册 机型相同ip相同 存在相同",
                            ipModelCount,
                            req.body
                          );

                          models.limitUser.create(
                            {
                              deviceInfo: deviceInfo,
                              type: "注册ip机型限制",
                            },
                            () => {}
                          );

                          return res.send({
                            code: "数据库错误：插入新用户出错",
                          });
                        }

                        models.user.create(newUserInfo, (err) => {
                          if (err) {
                            console.log(
                              logid,
                              "[user]数据库操作：插入新用户出错：",
                              err
                            );
                            return res.send({
                              code: "数据库错误：插入新用户出错",
                            });
                          }
                          let resMsg = {
                            userid: newUserInfo.userid,
                            name: newUserInfo.name,
                            openid: newUserInfo.openid,
                            invitationCode: newUserInfo.invitationCode,
                            headImgUrl: newUserInfo.headImgUrl,
                            channel: newUserInfo.deviceInfo
                              ? newUserInfo.deviceInfo.channel
                                ? newUserInfo.deviceInfo.channel
                                : null
                              : null,
                            code: "注册成功",
                            accessToken,
                            refreshToken,
                            createdAt: new Date(moment()),
                            domain,
                            persent,
                            hotCloudPlan: newUserInfo.hotCloudPlan,
                            hotCloudIsProcessed:
                              newUserInfo.hotCloudIsProcessed,
                            hotCloudIsActivate: newUserInfo.hotCloudIsActivate,
                            toponPlan: newUserInfo.toponPlan,
                            toponIsProcessed: newUserInfo.toponIsProcessed,
                            toponIsActivate: newUserInfo.toponIsActivate,
                            ablSwitch: newUserInfo.ablSwitch,
                            hasSendHotCloudSignIn:
                              newUserInfo.hasSendHotCloudSignIn,
                          };
                          if (invitationCode)
                            resMsg.invitationFrom = invitationCode;
                          //若是存在手机系统则发送回前端
                          if (system) resMsg.system = system;

                          let channel;
                          if (deviceInfo && deviceInfo.channel)
                            channel = deviceInfo.channel;
                          //统计录入
                          if (system && system == "iOS") {
                            addStatistic("newUser", "ios", channel);
                          } else addStatistic("newUser", "android", channel);
                          let dayFormat = new Date(moment()).Format(
                            "yyyy-MM-dd"
                          );
                          models.withdrawTimesForUsers
                            .update(
                              {
                                day: dayFormat,
                                channel: "all",
                              },
                              {
                                $inc: {
                                  "datas.newUser": 1,
                                },
                              },
                              {
                                upsert: true,
                              }
                            )
                            .exec((err) => {
                              if (err)
                                console.error(
                                  logid,
                                  "注册记录入提现统计库失败：",
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
                                  "datas.newUser": 1,
                                },
                              },
                              {
                                upsert: true,
                              }
                            )
                            .exec((err) => {
                              if (err)
                                console.error(
                                  logid,
                                  "注册记录入提现统计库失败：",
                                  err
                                );
                            });
                          // console.log(
                          // 	'用户注册返回：',
                          // 	resMsg
                          // )

                          sendRegisterEvent(
                            resMsg.openid,
                            newUserInfo.deviceInfo
                              ? newUserInfo.deviceInfo.guid
                                ? newUserInfo.deviceInfo.guid
                                : ""
                              : "",
                            resMsg.channel,
                            Date.parse(new Date())
                          );

                          return res.send(resMsg);
                        });
                      });
                  });
                });
            }
          });
        }
      );
    }

    // 参数错误
    else {
      return res.send({
        code: "请求参数错误",
      });
    }
  },

  //每日任务完成进度打点
  dailyTasks: (req, res) => {
    let { userid, taskid, taskProgress, points, totalProgress } = req.body;
    if (!userid || !taskid || !taskProgress || !points || !totalProgress)
      return res.send({ code: "参数错误" });

    models.dailyTasks.create(
      { userid, taskid, taskProgress, points, totalProgress },
      (err) => {
        if (err) return res.send({ code: "操作失败" });
        return res.send({ code: "操作成功" });
      }
    );
  },

  //查询用户注册时间和7日活动更新时间
  checkDailyTasksTime: (req, res) => {
    let { userid } = req.body;
    let dailyTaskTime = new Date("2021-03-08T00:00:00");
    if (!userid) return res.send({ code: "操作成功", dailyTaskTime });
    models.user.findOne({ userid }, (err, user) => {
      if (err) return res.send({ code: "操作失败" });
      if (user) {
        return res.send({
          code: "操作成功",
          createdAt: user.createdAt,
          dailyTaskTime,
        });
      }
      return res.send({ code: "操作成功", dailyTaskTime });
    });
  },

  // 计划开启
  planState: (req, res) => {
    let { openid } = req.body;
    models.user.findOne({ openid }, async (err, user) => {
      if (err) return res.send({ code: "数据库错误", error: err });
      if (!user) return res.send({ code: "用户不存在" });

      // 热云 topon 计划
      const userChannel = user.deviceInfo
        ? user.deviceInfo.channel
          ? user.deviceInfo.channel
          : null
        : null;

      let {
        hotCloudPlan = "withdraw",
        toponPlan = "signIn",
        hotCloudIsProcessed = false,
        hotCloudIsActivate = false,
        toponIsProcessed = false,
        toponIsActivate = false,
        ecpmIsProcessed = false,
        ecpmIsActivate = false,
        allecpmIsProcessed = false,
        allecpmIsActivate = false,
        hasSendHotCloudSignIn = true,
      } = user;
      let ecpmEvent = "";
      let allecpmEvent = "";

      const [errChannel, resultChannel] = await to(
        models.channel.findOne({ channel: userChannel })
      );

      if (errChannel) console.log("查询渠道错误6", err);

      if (resultChannel) {
        ecpmEvent = resultChannel.ecpmEvent;
        allecpmEvent = resultChannel.allecpmEvent;
        hotCloudPlan = resultChannel.hotCloudPlan;
        toponPlan = resultChannel.topOnPlan;
      }

      return res.send({
        code: "查询成功",
        hotCloudPlan,
        hotCloudIsProcessed,
        hotCloudIsActivate,
        toponPlan,
        toponIsProcessed,
        toponIsActivate,
        ecpmIsProcessed,
        ecpmIsActivate,
        allecpmIsProcessed,
        allecpmIsActivate,
        ecpmEvent,
        allecpmEvent,
        hasSendHotCloudSignIn,
      });
    });
  },

  // 计划开启
  planStateOpen: (req, res) => {
    console.log("用户计划状态开启请求：", req.body);
    let { openid, planType } = req.body;
    models.user.findOne({ openid }, async (err, user) => {
      if (err) return res.send({ code: "数据库错误", error: err });
      if (!user) return res.send({ code: "用户不存在" });

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

      if (errChannel) console.log("查询渠道错误3", err);

      if (resultChannel) {
        hotCloudPlan = resultChannel.hotCloudPlan;
        toponPlan = resultChannel.topOnPlan;
      }

      console.log("查询渠道详细3", resultChannel);

      user.hotCloudPlan = hotCloudPlan;
      user.toponPlan = toponPlan;

      let resCode = "开启成功";
      if (planType == "hotCloud") {
        if (
          user.hotCloudPlan == "incentiveAd" ||
          user.hotCloudPlan == "withdraw"
        ) {
          user.hotCloudIsProcessed = true;
          user.hotCloudIsActivate = true;
        } else {
          resCode = `状态开启失败：当前计划不允许${user.hotCloudPlan}开启`;
        }
      } else if (planType == "topon") {
        if (user.toponPlan == "withdraw") {
          user.toponIsProcessed = true;
          user.toponIsActivate = true;
        } else {
          resCode = `状态开启失败：当前计划${user.toponPlan}不允许上报开启`;
        }
      } else {
        resCode = `状态开启失败:该计划${planType}未配置`;
      }
      user.save((err) => {
        if (err) {
          return res.send({ code: "数据库错误", error: err });
        } else {
          return res.send({ code: resCode });
        }
      });
    });
  },
  //用户游戏信息上报
  updateUserBehavior: (req, res) => {
    let { userid, userBehavior } = req.body;
    if (!userid || !userBehavior) return res.send({ code: "参数错误" });
    models.user.update({ userid }, { $set: { userBehavior } }).exec((err) => {
      if (err) return res.send({ code: "操作失败", error: err });
      return res.send({ code: "操作成功" });
    });
  },

  //用户游戏信息上报
  cleanGameDatas: (req, res) => {
    let { userid } = req.body;
    console.log("用户注销请求", req.body);
    if (!userid) return res.send({ code: "参数错误" });
    models.user
      .update(
        { userid },
        { $set: { userBehavior: {}, videoCoins: 0, money: 0 } }
      )
      .exec((err) => {
        if (err) return res.send({ code: "操作失败", error: err });

        return res.send({ code: "操作成功" });
      });
  },

  //特殊打点android
  addSpecialEvent: async (req, res) => {
    let { event, info } = req.body;
    if (!event || !info) return res.send({ code: "参数错误" });

    // let err, userInfo;
    // [err, userInfo] = await to(models.user.findOne({ userid }));
    // if (err) {
    //   return res.send({ code: "查询用户失败" });
    // }
    // if (!userInfo) {
    //   return res.send({ code: "用户不存在" });
    // }
    //
    // const { daily_limit = 0, total_limit = 0 } = eventexplimit[event.toString()]
    //   ? eventexplimit[event.toString()]
    //   : {};
    //
    // let eventTodayTimes = 0,
    //   eventTotalTimes = 0;
    //
    // if (
    //   userInfo.eventTodayTimes &&
    //   userInfo.eventTodayTimes[event.toString()]
    // ) {
    //   eventTodayTimes = userInfo.eventTodayTimes[event.toString()];
    // }
    //
    // if (
    //   userInfo.eventTotalTimes &&
    //   userInfo.eventTotalTimes[event.toString()]
    // ) {
    //   eventTotalTimes = userInfo.eventTotalTimes[event.toString()];
    // }
    //
    // if (daily_limit > 0 && daily_limit <= eventTodayTimes) {
    //   return res.send({ code: "今天已达上限" });
    // }
    //
    // if (total_limit > 0 && total_limit <= eventTotalTimes) {
    //   return res.send({ code: "总数已达上限" });
    // }
    //
    // userInfo.eventTodayTimes[event.toString()] = ++eventTodayTimes;
    // userInfo.eventTotalTimes[event.toString()] = ++eventTotalTimes;
    //
    // userInfo.markModified("eventTodayTimes");
    // userInfo.markModified("eventTotalTimes");
    //
    // userInfo.save();

    models.specialEvent.create({ event, info }, (err) => {
      if (err) return res.send({ code: "操作失败" });
      return res.send({ code: "操作成功" });
    });
  },

  //特殊打点IOS
  addSpecialEventIOS: async (req, res) => {
    let { event, info } = req.body;
    if (!event || !info) return res.send({ code: "参数错误" });

    // let err, userInfo;
    // [err, userInfo] = await to(models.user.findOne({ userid }));
    // if (err) {
    //   return res.send({ code: "查询用户失败" });
    // }
    // if (!userInfo) {
    //   return res.send({ code: "用户不存在" });
    // }
    //
    // const { daily_limit = 0, total_limit = 0 } = eventexplimit[event.toString()]
    //   ? eventexplimit[event.toString()]
    //   : {};
    //
    // let eventTodayTimes = 0,
    //   eventTotalTimes = 0;
    //
    // if (
    //   userInfo.eventTodayTimes &&
    //   userInfo.eventTodayTimes[event.toString()]
    // ) {
    //   eventTodayTimes = userInfo.eventTodayTimes[event.toString()];
    // }
    //
    // if (
    //   userInfo.eventTotalTimes &&
    //   userInfo.eventTotalTimes[event.toString()]
    // ) {
    //   eventTotalTimes = userInfo.eventTotalTimes[event.toString()];
    // }
    //
    // if (daily_limit > 0 && daily_limit <= eventTodayTimes) {
    //   return res.send({ code: "今天已达上限" });
    // }
    //
    // if (total_limit > 0 && total_limit <= eventTotalTimes) {
    //   return res.send({ code: "总数已达上限" });
    // }
    //
    // userInfo.eventTodayTimes[event.toString()] = ++eventTodayTimes;
    // userInfo.eventTotalTimes[event.toString()] = ++eventTotalTimes;
    //
    // userInfo.markModified("eventTodayTimes");
    // userInfo.markModified("eventTotalTimes");
    //
    // userInfo.save();

    models.specialEventIOS.create({ event, info }, (err) => {
      if (err) return res.send({ code: "操作失败" });
      return res.send({ code: "操作成功" });
    });
  },

  // 最新视频激励打点

  lastAddVideoEvent: async (req, res) => {
    const logid = `${stringRandom()}-${req.path}`;

    let { userid, event, sign, lockingKey, sdkKey, eCPM, transId } = req.body;

    console.log(logid, userid, "视频激励打点：", req.body);

    if (!userid || !event || !sign || !lockingKey || !sdkKey || !eCPM) {
      console.log(logid, userid, "参数错误：");
      return res.send({ code: "参数错误" });
    }

    if (!initVideoEvent.includes(event)) {
      console.log(logid, userid, "最新激励视频打点event请求错误：", event);
      return res.send({ code: "此广告不可获得人数" });
    }

    let has_ch_imint = false;
    let ch_total_limit = 0;
    let ch_daily_limit = 0;

    // 判断用户是否n秒内打过点1，判断用户今日获取人数有没有达到上线1，然后给用户今日和总获取以及当前剩余人数+1，返回给前端人数获取成功1
    let returnInvestment = 0;
    async.waterfall(
      [
        (next) => {
          models.user.findOne({ userid }).exec((err, user) => {
            if (!user) {
              console.log(logid, userid, "用户错误", event);
              return res.send({ code: "用户错误" });
            }
            next(err, user);
          });
        },
        (user, next) => {
          // 热云 topon 计划
          let hotCloudPlan = "withdraw";
          let toponPlan = "signIn";
          let userChannel = user.deviceInfo
            ? user.deviceInfo.channel
              ? user.deviceInfo.channel
              : null
            : null;
          models.channel
            .findOne({ channel: userChannel })
            .exec((err, resultChannel) => {
              if (err) console.log(logid, userid, "查询渠道错误4", err);

              if (resultChannel) {
                if ("event" in resultChannel) {
                  let chlE = resultChannel.event.find((e) => {
                    return e.id == +event;
                  });

                  if (!_.isNil(chlE)) {
                    has_ch_imint = true;
                    ch_total_limit = chlE.totalLimit || 0;
                    ch_daily_limit = chlE.dailyLimit || 0;
                  }
                }

                hotCloudPlan = resultChannel.hotCloudPlan;
                toponPlan = resultChannel.topOnPlan;
              }

              console.log(logid, userid, "查询渠道详细4", resultChannel);

              user.hotCloudPlan = hotCloudPlan;
              user.toponPlan = toponPlan;

              let { buyQuantity = "D1" } = resultChannel;

              if (!user.buyQuantity) {
                user.buyQuantity = buyQuantity;
              }

              if (user.hotCloudPlan == "incentiveAd") {
                user.hotCloudIsProcessed = true;
                user.hotCloudIsActivate = true;
              }
              if (user.toponPlan == "incentiveAd") {
                user.toponIsProcessed = true;
                user.toponIsActivate = true;
              }

              console.log(
                logid,
                userid,
                "user.allecpmIsProcessed",
                user.allecpmIsProcessed
              );
              console.log(
                logid,
                userid,
                "user.ecpmIsProcessed",
                user.allecpmIsProcessed
              );

              // todo 热云注册事件发送判定, 100 ecpm 两次
              if (
                user.hotCloudPlan == "signIn" &&
                user.hotCloudIsActivate == true &&
                user.hasSendHotCloudSignIn == false
              ) {
                if (+eCPM >= 100) {
                  user.hasSendHotCloudSignInTimes++;
                }
                if (user.hasSendHotCloudSignInTimes >= 2) {
                  user.hasSendHotCloudSignIn = true;
                }

                console.log(
                  logid,
                  userid,
                  "热云注册事件发送判定",
                  +eCPM,
                  user.hasSendHotCloudSignIn,
                  user.hasSendHotCloudSignInTimes
                );
              }

              // 都未处理
              if (!user.allecpmIsProcessed && !user.ecpmIsProcessed) {
                console.log(logid, userid, "都未处理", buyQuantity);

                // ecpm 买量方式
                if (buyQuantity == "ecpm" || buyQuantity == "D1") {
                  const {
                    ecpmNum = 0,
                    ecpmTimes = 0,
                    ecpmProbability = 0,
                    ecpmHasTodayUser = false,
                  } = resultChannel;

                  if (ecpmNum > 0 && ecpmTimes > 0) {
                    console.log(
                      logid,
                      userid,
                      "用户ecpm命中配置",
                      ecpmNum,
                      ecpmTimes,
                      ecpmProbability,
                      buyQuantity
                    );

                    if (!user.ecpmIsProcessed) {
                      if (ecpmHasTodayUser) {
                        if (
                          new Date(user.createdAt).Format("yyyy-MM-dd") ==
                          new Date(moment()).Format("yyyy-MM-dd")
                        ) {
                          if (+eCPM >= ecpmNum) {
                            user.ecpmPlanTimes++;
                          }
                          console.log(
                            logid,
                            userid,
                            "用户ecpm命中次数",
                            user.ecpmPlanTimes
                          );
                          if (user.ecpmPlanTimes >= ecpmTimes) {
                            user.ecpmIsProcessed = true;
                            user.ecpmIsActivate = isActivate(ecpmProbability);

                            models.ecpmEvent.create(
                              { userid: userid, activate: user.ecpmIsActivate },
                              () => {}
                            );
                          }
                        } else {
                          console.log(logid, userid, "非24小时内的用户");
                          user.ecpmIsProcessed = true;
                        }
                      } else {
                        if (+eCPM >= ecpmNum) {
                          user.ecpmPlanTimes++;
                        }
                        console.log(
                          logid,
                          userid,
                          "用户ecpm命中次数",
                          user.ecpmPlanTimes
                        );
                        if (user.ecpmPlanTimes >= ecpmTimes) {
                          user.ecpmIsProcessed = true;
                          user.ecpmIsActivate = isActivate(ecpmProbability);

                          models.ecpmEvent.create(
                            { userid: userid, activate: user.ecpmIsActivate },
                            () => {}
                          );
                        }
                      }
                    }
                  }
                }

                // allecpm买量方式
                if (buyQuantity == "allecpm") {
                  const {
                    allecpmNum = 0,
                    allecpmProbability = 0,
                    allecpmHasTodayUser = false,
                  } = resultChannel;

                  if (allecpmNum > 0) {
                    console.log(
                      logid,
                      userid,
                      "用户allecpm命中配置",
                      allecpmNum,
                      allecpmProbability,
                      buyQuantity
                    );

                    if (!user.allecpmIsProcessed) {
                      if (allecpmHasTodayUser) {
                        if (
                          new Date(user.createdAt).Format("yyyy-MM-dd") ==
                          new Date(moment()).Format("yyyy-MM-dd")
                        ) {
                          if (+user.allecpm >= allecpmNum) {
                            user.allecpmIsProcessed = true;
                            user.allecpmIsActivate =
                              isActivate(allecpmProbability);

                            models.ecpmEvent.create(
                              {
                                userid: userid,
                                activate: user.allecpmIsActivate,
                              },
                              () => {}
                            );
                          } else {
                            user.allecpmPlanTimes++;
                          }
                          console.log(
                            logid,
                            userid,
                            "用户allecpm次数",
                            user.allecpmPlanTimes
                          );
                        } else {
                          console.log(logid, userid, "allecpm非24小时内的用户");
                          user.allecpmIsProcessed = true;
                        }
                      } else {
                        if (+user.allecpm >= allecpmNum) {
                          user.allecpmIsProcessed = true;
                          user.allecpmIsActivate =
                            isActivate(allecpmProbability);
                          models.ecpmEvent.create(
                            {
                              userid: userid,
                              activate: user.allecpmIsActivate,
                            },
                            () => {}
                          );
                        } else {
                          user.allecpmPlanTimes++;
                        }
                      }
                    }
                  }
                }
              }
              next(err, user);
            });
        },

        (user, next) => {
          // 事件打点次数上限判断
          let { daily_limit = 0, total_limit = 0 } = eventexplimit[
            event.toString()
          ]
            ? eventexplimit[event.toString()]
            : {};

          if (has_ch_imint) {
            daily_limit = ch_daily_limit;
            total_limit = ch_total_limit;
          }

          let eventTodayTimes = 0,
            eventTotalTimes = 0;

          if (user.eventTodayTimes && user.eventTodayTimes[event.toString()]) {
            eventTodayTimes = user.eventTodayTimes[event.toString()];
          }

          if (user.eventTotalTimes && user.eventTotalTimes[event.toString()]) {
            eventTotalTimes = user.eventTotalTimes[event.toString()];
          }

          // 开业
          if (+event == 20) {
            if (eventTotalTimes + (user.eventTotalTimes[`${120}`] || 0) >= 1) {
              console.log(
                logid,
                userid,
                "双倍开业已达上限",
                eventTotalTimes + (user.eventTotalTimes[`${120}`] || 0)
              );
              return res.send({ code: "总数已达上限" });
            }
            console.log(
              logid,
              userid,
              "user.openingReward",
              user.openingReward
            );

            models.water.create(
              {
                userid: userid,
                type: "opening",
                amount: user.openingReward,
                channel: user.deviceInfo
                  ? user.deviceInfo.channel
                    ? user.deviceInfo.channel
                    : null
                  : null,
              },
              () => {}
            );

            user.money += user.openingReward;
            user.allMoney += user.openingReward;
            user.afterOpeningReward = user.openingReward;
            user.openingReward = 0;
          }

          // 投资
          if (+event == 21) {
            if (
              daily_limit > 0 &&
              daily_limit <=
                eventTodayTimes + (user.eventTodayTimes[`${121}`] || 0)
            ) {
              console.log(
                logid,
                userid,
                "今天已达上限",
                daily_limit,
                eventTodayTimes
              );
              return res.send({ code: "今天已达上限" });
            }
          }

          if (daily_limit > 0 && daily_limit <= eventTodayTimes) {
            console.log(
              logid,
              userid,
              "今天已达上限",
              daily_limit,
              eventTodayTimes
            );
            return res.send({ code: "今天已达上限" });
          }

          if (total_limit > 0 && total_limit <= eventTotalTimes) {
            console.log(
              logid,
              userid,
              "总数已达上限",
              total_limit,
              eventTotalTimes
            );
            return res.send({ code: "总数已达上限" });
          }

          user.eventTodayTimes[event.toString()] = ++eventTodayTimes;
          user.eventTotalTimes[event.toString()] = ++eventTotalTimes;

          user.markModified("eventTodayTimes");
          user.markModified("eventTotalTimes");

          if (!user.lockingKey || user.lockingKey == "-1") {
            console.log(logid, userid, "用户无凭证");
            user.errorAdvCount++;
            return next("用户无凭证", user);
          }

          //判断签名:1把临时凭证换成用户真正的临时凭证
          req.body.lockingKey = user.lockingKey;
          //2:把新的请求包拿去做签名比对
          if (!newSignFun.checkSign(req.body)) {
            console.log(
              logid,
              userid,
              "签名错误：用户获取人数失败，userid",
              user.userid
            );
            user.errorAdvCount++;
            return next("签名错误", user);
          }

          //3:sdk签名比对
          if (!newSignFun.checkSDKSign(req.body)) {
            console.log(
              logid,
              userid,
              "sdk签名错误：用户获取人数失败，userid",
              user.userid
            );
            user.errorAdvCount++;
            return next("签名错误", user);
          }

          // 修改广告状态

          models.ad.findOneAndUpdate(
            {
              transId,
            },
            {
              hasFinish: true,
            },
            {},
            (err, doc) => {
              if (err) {
                console.error("写入广告表错误", v.openid);
              } else {
                console.log("写入广告表结果", doc);
              }
            }
          );

          // models.ad.update(
          //   { _id: lockingKey },
          //   {
          //     $set: {
          //       transId,
          //       hasFinish: true,
          //     },
          //   }
          // );

          if (user.lastVideoTime) {
            let timeOfDifference = moment().diff(
              moment(user.lastVideoTime),
              "seconds"
            );
            console.log(
              logid,
              userid,
              "两次领取人数间隔比较结果：",
              timeOfDifference,
              "用户id:",
              user.userid || "获取不到用户id"
            );
            let shouldTime = gameSystem["video_coin_interval"] || 10;

            // todo 35秒内做记录
            if (timeOfDifference <= 35) {
              console.log(logid, userid, "35秒内激励打点");
              models.warningVideoCoinEvent.create(
                {
                  userid,
                  event,
                  ecpm: +eCPM,
                  deductMoney: 0,
                  channel: user.deviceInfo
                    ? user.deviceInfo.channel
                      ? user.deviceInfo.channel
                      : null
                    : null,
                },
                (err) => {
                  if (err)
                    console.log(
                      logid,
                      userid,
                      "[user]35秒内激励打点激励失败！：",
                      userid,
                      event,
                      err
                    );
                }
              );

              user.errorAdvCount++;

              console.log(
                logid,
                userid,
                console.log(
                  logid,
                  userid,
                  "两次领取人数间隔太短 35 秒内",
                  timeOfDifference,
                  "用户id:",
                  user.userid || "获取不到用户id"
                )
              );

              return next("两次领取人数间隔太短", user);
            }

            if (timeOfDifference < shouldTime) {
              user.errorAdvCount++;
              console.log(
                logid,
                userid,
                console.log(
                  logid,
                  userid,
                  "两次领取人数间隔太短",
                  timeOfDifference,
                  "用户id:",
                  user.userid || "获取不到用户id"
                )
              );
              return next("两次领取人数间隔太短", user);
            }
          } else {
            console.log(
              logid,
              userid,
              "新用户第一次看视频打点",
              user.userid || "获取不到用户id"
            );
          }

          // let shouldGetCoinsToday =
          //   gameSystem["video_coin_limit_each_day"] || 500;
          //
          // console.log(
          //   logid,
          //   userid,
          //   "用户获取人数比较：用户获取/今日上限",
          //   user.getVideoCoinsToday,
          //   shouldGetCoinsToday
          // );
          //
          // if (user.getVideoCoinsToday >= shouldGetCoinsToday)
          //   return next("今日人数获取已达上限", user);
          next(null, user);
        },
        (user, next) => {
          models.ecpm.findOne(
            { left: { $lt: +eCPM }, right: { $gte: +eCPM } },
            (err, result) => {
              if (err) {
                console.log(
                  logid,
                  userid,
                  "[id_counters]id生成器查询错误：数据库查询出错！",
                  err
                );
                next("查询ecpm错误", user);
              } else if (!result) {
                next("查询ecpm为空", user);
              } else {
                user.ecpmProportion = result.proportion || 20;
                next(null, user);
              }
            }
          );
        },
      ],

      (err, user) => {
        if (err) {
          console.log(logid, userid, "激励打点新增人数失败：", err);
          if (
            err == "两次领取人数间隔太短" ||
            err == "用户无凭证" ||
            err == "签名错误"
          ) {
            user.save((error) => {
              if (error)
                console.error(logid, userid, "激励打点异常保存失败：", error);
            });
          }
          return res.send({
            code: err,
            getVideoCoinsToday: user.getVideoCoinsToday,
          });
        } else {
          user.lastVideoTime = new Date(moment());
          user.lockingKey = "-1";

          // 根据 ecpm 新增🧧

          if (!deduction || !deduction.RECORDS) {
            console.log(logid, userid, "读取配置表错误");
            return res.send({ code: "读取配置表错误" });
          }

          let money = 0;
          let piggyBank = 0;
          let ecpmMoney = 0;
          let pumpingMoney = 0;
          let masterMoney = 0;
          let grandMasterMoney = 0;
          if (gameSystem["video_coin_get_list"].includes(event)) {
            if (+eCPM <= 0) {
              console.log(logid, userid, "eCPM错误", eCPM);
              return res.send({ code: "参数错误" });
            }

            ecpmMoney = Number((+eCPM / 1000) * 10000);
            console.log(logid, userid, "ecpm价值", ecpmMoney);

            let discount = user.ecpmProportion / 100;
            console.log(logid, userid, "扣除比例", discount);

            money = Number((+eCPM / 1000) * ((100 - discount) / 100) * 10000);
            console.log(logid, userid, "ecpm抽水后金额", money);

            pumpingMoney = ecpmMoney - money;

            console.log(logid, userid, "empm 抽水金额", pumpingMoney);

            user.allMoney += money;

            console.log(logid, userid, "ecpm", eCPM);
            console.log(logid, userid, "ecpm现金", money);

            let topMone = gameSystem["daily_cashout_top_limit"] || 300;

            if (money > topMone) {
              console.log(
                logid,
                userid,
                "单次获得现金超过设定阈值",
                money,
                "top",
                topMone
              );
              user.deductMoney += money - topMone;
              pumpingMoney += money - topMone;
              money = topMone;
            }

            // 存钱罐比例
            let piggyBankProportion = gameSystem["bank_coin_ratio"] || 0;
            piggyBank = Math.round(money * piggyBankProportion);
            console.log(
              logid,
              userid,
              "存钱罐比例和钱",
              piggyBankProportion,
              piggyBank
            );

            // 师傅比例
            let masterProportion = gameSystem["master_bonus_ratio"] || 0;
            masterMoney = Math.round(money * masterProportion);
            console.log(
              logid,
              userid,
              "师傅比例和钱",
              masterProportion,
              masterMoney
            );
            const { master, grandMaster } = user;

            console.log(
              logid,
              userid,
              "master, grandMaster",
              master,
              grandMaster
            );

            // 给师傅加钱
            // 有效用户
            if (master && user.videoTimes >= 2) {
              console.log(logid, userid, "师傅", masterMoney);
              // user.masterAllMoney += masterMoney;
              // user.masterTimes++;
              // user.masterTodayMoney += masterMoney;

              // models.user.update(
              //   { userid: master },
              //   {
              //     $inc: {
              //       sonMoney: masterMoney,
              //     },
              //   },
              //   () => {}
              // );
              //
              // models.contribution.update(
              //   {
              //     userid: master,
              //     time: new Date(moment()).Format("yyyy-MM-dd"),
              //   },
              //   { $inc: { son: masterMoney } },
              //   {
              //     new: true,
              //     upsert: true,
              //   },
              //   () => {}
              // );
            }

            // 师公比例
            let grandMasterProportion =
              gameSystem["grandmaster_bonus_ratio"] || 0;
            grandMasterMoney = Math.round(money * grandMasterProportion);
            console.log(
              logid,
              userid,
              "师公比例和钱",
              grandMasterProportion,
              grandMasterMoney
            );
            // 给师公加钱
            // 有效用户
            if (grandMaster && user.videoTimes >= 2) {
              console.log(logid, userid, "师公", grandMasterMoney);
              // user.grandMasterAllMoney += grandMasterMoney;
              // user.grandMasterTimes++;
              // user.grandMasterTodayMoney += grandMasterMoney;

              // models.user.update(
              //   { userid: grandMaster },
              //   {
              //     $inc: {
              //       grandsonMoney: grandMasterMoney,
              //     },
              //   },
              //   () => {}
              // );
              //
              // models.contribution.update(
              //   {
              //     userid: grandMaster,
              //     time: new Date(moment()).Format("yyyy-MM-dd"),
              //   },
              //   { $inc: { grandson: grandMasterMoney } },
              //   {
              //     new: true,
              //     upsert: true,
              //   },
              //   () => {}
              // );
            }

            // 修改扣除比例
            money = Math.round(
              money - (piggyBank + masterMoney + grandMasterMoney)
            );
            console.log(logid, userid, "去除存罐 师傅 师公的钱", money);

            let { piggyBank: piggyBankObj = {} } = user;
            let piggyBankObjTmp = JSON.parse(JSON.stringify(piggyBankObj));
            let today = new Date(moment()).Format("yyyy-MM-dd");
            if (!(today in piggyBankObj)) {
              piggyBankObjTmp[today] = piggyBank;
            } else {
              piggyBankObjTmp[today] += piggyBank;
            }

            console.log(logid, userid, "piggyBankObj", piggyBankObj);

            // user.money += money;
            // user.piggyBank = piggyBankObjTmp;
            // user.allecpm += +eCPM;
          }

          user.lastVideoTime = new Date(moment());
          user.lockingKey = "-1";

          // 记录流水
          // models.water.create(
          //   {
          //     userid: userid,
          //     type: "videoEvent",
          //     amount: money,
          //     channel: user.deviceInfo
          //       ? user.deviceInfo.channel
          //         ? user.deviceInfo.channel
          //         : null
          //       : null,
          //   },
          //   () => {}
          // );

          // 投资
          if (+event == 21) {
            const { id = 0 } = req.body;
            const data = onlinereward_all.RECORDS.find((e) => e.id === `${id}`);
            if (data) {
              const { cash = 0 } = data;
              if (+cash > 0) {
                user.money += +cash;
                user.afterReturnInvestment += +cash;
                returnInvestment = +cash;
                // 记录流水
                models.water.create(
                  {
                    userid: userid,
                    type: `${event}`,
                    amount: +cash,
                    channel: user.deviceInfo
                      ? user.deviceInfo.channel
                        ? user.deviceInfo.channel
                        : null
                      : null,
                  },
                  () => {}
                );
              }
            } else {
              console.log(logid, userid, "找不到投资回报配置");
            }
          }

          // 视频次数
          user.videoTimes++;

          user.save(async (err) => {
            if (err) {
              console.error(logid, userid, "激励打点新增人数入库失败：", err);
              return res.send({
                code: "激励打点新增人数入库失败：" + err,
              });
            }

            let herr, hresult;
            let Hkey = `${userid}_${event}_${lockingKey}`;
            [herr, hresult] = await to(hgetall(Hkey));
            if (herr) {
              console.log(logid, userid, `读取${Hkey}错误`, Hkey);
              return res.send({
                code: "操作失败",
              });
            }

            if (hresult == null) {
              console.log(logid, userid, `非法验证${Hkey}`);
              return res.send({
                code: "操作失败",
              });
            }

            let { num = 0, addNum = 0, hasCheck = 0 } = hresult;
            if (+hasCheck == 0) {
              [herr, hresult] = await to(hmset(Hkey, { hasCheck: 1 }));
              if (herr) {
                console.log(logid, userid, `读取${Hkey}错误`, Hkey);
                return res.send({
                  code: "操作失败",
                });
              }
            } else {
              console.log(logid, userid, "非法请求", Hkey, hresult);
              return res.send({
                code: "操作失败",
              });
            }

            // 激励打点
            if (user.system && user.system == "iOS") {
              models.videoCoinEventIOS.create(
                {
                  userid,
                  event,
                  ecpm: +eCPM,
                  deductMoney: pumpingMoney,
                  channel: user.deviceInfo
                    ? user.deviceInfo.channel
                      ? user.deviceInfo.channel
                      : null
                    : null,
                },
                (err) => {
                  if (err)
                    console.error(
                      logid,
                      userid,
                      "[user]ios新人数打点激励视频记录入库失败！：",
                      userid,
                      event,
                      err
                    );
                }
              );
            } else {
              models.videoCoinEvent.create(
                {
                  userid,
                  event,
                  ecpm: +eCPM,
                  deductMoney: pumpingMoney,
                  channel: user.deviceInfo
                    ? user.deviceInfo.channel
                      ? user.deviceInfo.channel
                      : null
                    : null,
                },
                (err) => {
                  if (err)
                    console.log(
                      logid,
                      userid,
                      "[user]新人数打点激励视频记录入库失败！：",
                      userid,
                      event,
                      err
                    );
                }
              );
            }

            const resBody = {
              code: "获取人数成功",
              getVideoCoinsToday: user.getVideoCoinsToday,
              addMoney: money,
              addPiggyBankMoney: piggyBank,
              returnInvestment: returnInvestment,
            };

            console.log(
              logid,
              userid,
              "成功结果",
              "请求内容",
              req.body,
              "返回",
              resBody
            );
            return res.send(resBody);
          });
        }
      }
    );
  },

  //普通激励打点
  addPassVideoEvent: (req, res) => {
    let money = 0;
    const logid = `${stringRandom()}-${req.path}`;
    let { userid, event, sign, passingKey } = req.body;
    console.log(logid, userid, event, "通关激励打点：", req.body);

    if (!userid || !event || !sign || !passingKey) {
      console.log(logid, userid, "参数错误");
      return res.send({ code: "参数错误" });
    }

    if (!initPassEvent.includes(event)) {
      console.log(logid, userid, "最新通关打点event请求错误：", event, userid);
      return res.send({ code: "此通关不可获得人数" });
    }

    let has_ch_imint = false;
    let ch_total_limit = 0;
    let ch_daily_limit = 0;

    // 判断用户是否n秒内打过点1，判断用户今日获取人数有没有达到上线1，然后给用户今日和总获取以及当前剩余人数+1，返回给前端人数获取成功1

    let returnInvestment = 0;
    async.waterfall(
      [
        (next) => {
          models.user.findOne({ userid }).exec((err, user) => {
            if (!user) {
              console.log(logid, userid, "无此用户");
              return next("无此用户");
            }
            next(err, user);
          });
        },

        (user, next) => {
          if (!user.deviceInfo || !user.deviceInfo.channel) {
            console.log(logid, userid, "无渠道信息");
            return next("无渠道信息", user);
          }

          let userChannel = user.deviceInfo
            ? user.deviceInfo.channel
              ? user.deviceInfo.channel
              : null
            : null;

          models.channel
            .findOne({ channel: userChannel })
            .exec((err, resultChannel) => {
              if (err) console.log(logid, userid, "查询渠道错误4", err);
              if (resultChannel) {
                if ("event" in resultChannel) {
                  let chlE = resultChannel.event.find((e) => {
                    return e.id == +event;
                  });

                  if (!_.isNil(chlE)) {
                    has_ch_imint = true;
                    ch_total_limit = chlE.totalLimit || 0;
                    ch_daily_limit = chlE.dailyLimit || 0;
                  }
                }
              }
              next(err, user);
            });
        },

        (user, next) => {
          // 事件打点次数上限判断
          let { daily_limit = 0, total_limit = 0 } = eventexplimit[
            event.toString()
          ]
            ? eventexplimit[event.toString()]
            : {};

          if (has_ch_imint) {
            daily_limit = ch_daily_limit;
            total_limit = ch_total_limit;
          }

          let eventTodayTimes = 0,
            eventTotalTimes = 0;

          if (user.eventTodayTimes && user.eventTodayTimes[event.toString()]) {
            eventTodayTimes = user.eventTodayTimes[event.toString()];
          }
          if (user.eventTotalTimes && user.eventTotalTimes[event.toString()]) {
            eventTotalTimes = user.eventTotalTimes[event.toString()];
          }

          // 开业
          if (+event == 120) {
            if (eventTotalTimes + (user.eventTotalTimes[`${20}`] || 0) >= 1) {
              console.log(
                logid,
                userid,
                "普通开业已达上限",
                eventTotalTimes + (user.eventTotalTimes[`${20}`] || 0)
              );
              return res.send({ code: "总数已达上限" });
            } else {
              console.log(
                logid,
                userid,
                "user.openingReward",
                user.openingReward
              );

              models.water.create(
                {
                  userid: userid,
                  type: "opening",
                  amount: user.openingReward,
                  channel: user.deviceInfo
                    ? user.deviceInfo.channel
                      ? user.deviceInfo.channel
                      : null
                    : null,
                },
                () => {}
              );

              user.money += user.openingReward;
              user.allMoney += user.openingReward;
              user.afterOpeningReward = user.openingReward;
              user.openingReward = 0;
            }
          }

          // 投资
          if (+event == 121) {
            if (
              daily_limit > 0 &&
              daily_limit <=
                eventTodayTimes + (user.eventTodayTimes[`${21}`] || 0)
            ) {
              console.log(
                logid,
                userid,
                "今天已达上限",
                daily_limit,
                eventTodayTimes
              );
              return res.send({ code: "今天已达上限" });
            }
          }

          if (daily_limit > 0 && daily_limit <= eventTodayTimes) {
            console.log(
              logid,
              userid,
              "今天已达上限",
              daily_limit,
              eventTodayTimes
            );
            return res.send({ code: "今天已达上限" });
          }

          if (total_limit > 0 && total_limit <= eventTotalTimes) {
            console.log(
              logid,
              userid,
              "今天已达上限",
              total_limit,
              eventTotalTimes
            );
            return res.send({ code: "总数已达上限" });
          }

          user.eventTodayTimes[event.toString()] = ++eventTodayTimes;
          user.eventTotalTimes[event.toString()] = ++eventTotalTimes;

          user.markModified("eventTodayTimes");
          user.markModified("eventTotalTimes");

          if (!user.passingKey || user.passingKey == -1) {
            console.log(
              logid,
              userid,
              "用户无凭证：用户获取人数失败，userid",
              user.userid
            );
            user.errorPassCount++;
            return next("用户无凭证", user);
          }
          // //判断签名:1把临时凭证换成用户真正的临时凭证
          req.body.passingKey = user.passingKey;
          //2:把新的请求包拿去做签名比对
          if (!signFun.checkSign(req.body)) {
            console.log("签名错误：用户获取人数失败，userid", user.userid);
            user.errorAdvCount++;
            return next("签名错误", user);
          }

          // if (user.lastPassTime) {
          //   let timeOfDifference = moment().diff(
          //     moment(user.lastPassTime),
          //     "seconds"
          //   );
          //   console.log(
          //     logid,
          //     userid,
          //     "两次领取人数间隔比较结果：",
          //     timeOfDifference,
          //     "用户id:",
          //     user.userid || "获取不到用户id"
          //   );
          //
          //   let shouldTime = 1;
          //   if (timeOfDifference < shouldTime) {
          //     user.errorPassCount++;
          //     console.log(
          //       logid,
          //       userid,
          //       "两次领取人数间隔太短",
          //       timeOfDifference,
          //       "用户id:",
          //       user.userid || "获取不到用户id"
          //     );
          //     return next("两次领取人数间隔太短", user);
          //   }
          // } else {
          //   console.log(
          //     logid,
          //     userid,
          //     "新用户第一次看视频打点",
          //     user.userid || "获取不到用户id"
          //   );
          // }

          // 到这里已经算请求合法了，视频记录入库
          // if (user.system && user.system == "iOS") {
          //   models.videoCoinEventIOS.create({ userid, event }, (err) => {
          //     if (err)
          //       console.error(
          //         "[user]ios新人数打点激励视频记录入库失败！：",
          //         userid,
          //         event,
          //         err
          //       );
          //   });
          // } else {
          //   models.videoCoinEvent.create({ userid, event }, (err) => {
          //     if (err)
          //       console.error(
          //         "[user]新人数打点激励视频记录入库失败！：",
          //         userid,
          //         event,
          //         err
          //       );
          //   });
          // }

          // let shouldGetCoinsToday =
          //   gameSystem["video_coin_limit_each_day"] || 500;
          // console.log(
          //   logid,
          //   userid,
          //   "用户获取人数比较：用户获取/今日上限",
          //   user.getVideoCoinsToday,
          //   shouldGetCoinsToday
          // );
          // if (user.getVideoCoinsToday >= shouldGetCoinsToday) {
          //   console.log(logid, userid, "今日人数已达上限");
          //   return next("今日人数获取已达上限", user);
          // }

          next(null, user);
        },
      ],
      (err, user) => {
        if (err) {
          console.log(logid, userid, "激励打点新增人数失败：", err);
          if (
            err == "两次领取人数间隔太短" ||
            err == "用户无凭证" ||
            err == "无渠道信息" ||
            err == "该渠道不合法" ||
            err == "签名错误"
          ) {
            user.save((error) => {
              if (error)
                console.error(logid, userid, "激励打点异常保存失败：", error);
            });
          }

          return res.send({
            code: err,
            getVideoCoinsToday: user.getVideoCoinsToday
              ? user.getVideoCoinsToday
              : 0,
          });
        } else {
          user.assTime = new Date(moment());
          user.passingKey = -1;

          // 投资
          if (+event == 121) {
            const { id = 0 } = req.body;
            const data = onlinereward_all.RECORDS.find((e) => e.id === `${id}`);
            if (data) {
              const { cash = 0 } = data;
              if (+cash > 0) {
                user.money += +cash;
                user.afterReturnInvestment += +cash;
                returnInvestment = +cash;
                // 记录流水
                models.water.create(
                  {
                    userid: userid,
                    type: `${event}`,
                    amount: +cash,
                    channel: user.deviceInfo
                      ? user.deviceInfo.channel
                        ? user.deviceInfo.channel
                        : null
                      : null,
                  },
                  () => {}
                );
              } else {
                console.log(logid, userid, "找不到投资回报配置");
              }
            }
          }

          // 业务红包
          if (+event == 133) {
            let mix_133, max_133;
            [mix_133 = 0, max_133 = 0] = gameSystem[
              "business_complete_cash_reward"
            ] || [0, 0];

            const redNum = random(mix_133, max_133);

            user.money += +redNum;
            user.afterReturnInvestment += +redNum;
            returnInvestment = +redNum;
            // 记录流水
            models.water.create(
              {
                userid: userid,
                type: `${event}`,
                amount: +redNum,
                channel: user.deviceInfo
                  ? user.deviceInfo.channel
                    ? user.deviceInfo.channel
                    : null
                  : null,
              },
              () => {}
            );
          }

          // 一键满座
          if (+event == 124) {
            console.log(logid, userid, "一键满座");
            const awardMoney = gameSystem.attract_customer_free_cash || 2000;
            user.money += +awardMoney;
            money = awardMoney;
            user.after124 += +awardMoney;
            // 记录流水
            models.water.create(
              {
                userid: userid,
                type: `${event}`,
                amount: +awardMoney,
                channel: user.deviceInfo
                  ? user.deviceInfo.channel
                    ? user.deviceInfo.channel
                    : null
                  : null,
              },
              () => {}
            );
          }

          user.save(async (err) => {
            if (err) {
              console.error(logid, userid, "激励打点新增人数入库失败：", err);
              return res.send({
                code: "激励打点新增人数入库失败：" + err,
              });
            }

            let herr, hresult;
            let Hkey = `${userid}_${event}_${passingKey}`;
            [herr, hresult] = await to(hgetall(Hkey));
            if (herr) {
              console.log(logid, userid, `读取${Hkey}错误`, Hkey);
              return res.send({
                code: "操作失败",
              });
            }

            if (hresult == null) {
              console.log(logid, userid, `非法验证${Hkey}`);
              return res.send({
                code: "操作失败",
              });
            }

            let { num = 0, addNum = 0, hasCheck = 0 } = hresult;
            if (+hasCheck == 0) {
              [herr, hresult] = await to(hmset(Hkey, { hasCheck: 1 }));
              if (herr) {
                console.log(logid, userid, `读取${Hkey}错误`, Hkey);
                return res.send({
                  code: "操作失败",
                });
              }
            } else {
              console.log(logid, userid, "非法请求", Hkey, hresult);
              return res.send({
                code: "操作失败",
              });
            }

            const resultData = {
              code: "获取人数成功",
              getVideoCoinsToday: user.getVideoCoinsToday,
              returnInvestment: returnInvestment,
              addMoney: money,
            };

            console.log(logid, userid, "返回数据", resultData);
            return res.send(resultData);
          });
        }
      }
    );
  },

  // 封号
  abl: (req, res) => {
    console.log("请求封号接口：", req.body);
    let { openid } = req.body;
    models.blackList.findOneAndUpdate(
      { openid },
      { $inc: { times: 1 } },
      { new: true, upsert: true },
      (err, doc) => {
        if (err) {
          console.error("[router]：黑名单写入失败！", v.openid);
          return res.send({ code: "操作失败" });
        } else {
          console.log("doc", doc);
          return res.send({ code: "操作成功" });
        }
      }
    );
  },

  // 增加人数
  addNum: async (req, res) => {
    const logid = `${stringRandom()}-${req.path}`;
    let { userid, event, key, system = "", datas = {} } = req.body;

    console.log(logid, userid, "增加人数请求", req.body);

    if (!userid || Number(userid) < 1000000 || !event || !key) {
      console.log(logid, userid, "参数错误", req.body);
      return res.send({ code: "参数错误" });
    }

    let err, Hvalue, result;
    let Hkey = `${userid}_${event}_${key}`;
    [err, Hvalue] = await to(hgetall(Hkey));
    if (err) {
      console.log(logid, userid, `读取${Hkey}错误`, Hkey, err);
      return res.send({
        code: "操作失败",
      });
    }

    if (Hvalue == null) {
      console.log(logid, userid, "Hvalue未核验", Hvalue);
      return res.send({
        code: "操作失败",
      });
    }
    let { num = 0, addNum = 0, hasCheck = 0 } = Hvalue;

    if (+hasCheck == 0) {
      console.log(logid, userid, `读取该key未核验错误`, Hkey, Hvalue);
      return res.send({
        code: "操作失败",
      });
    }

    if (+addNum >= +num) {
      console.log(logid, userid, `已超过人数上限`, Hkey, Hvalue);
      return res.send({
        code: "操作失败",
      });
    }

    [err, addNum] = await to(hincrby(Hkey, "addNum", 1));
    if (err) {
      console.log(logid, userid, `读取${Hkey}错误`, Hkey, err);
      return res.send({
        code: "操作失败",
      });
    }

    console.log(logid, userid, "+addNum >= num", +addNum, num);
    console.log(logid, userid, "+addNum >= num", +addNum >= num);
    if (+addNum >= num) {
      await del(Hkey);
      [err, result] = await to(
        models.event.create({
          userid,
          event: +event + 1000,
          system,
          datas,
        })
      );

      console.log(logid, userid, "result", result);

      if (err) {
        console.log(logid, userid, "创建完结事件失败", err);
        return res.send({
          code: "操作失败",
        });
      }
    }

    [err] = await to(
      models.user.updateOne(
        { userid },
        {
          $inc: {
            getVideoCoinsToday: 1,
            getVideoCoinsForAll: 1,
            videoCoins: 1,
          },
        }
      )
    );

    if (err) {
      console.log(logid, userid, `修改用户人数错误 ${err}`);
      return res.send({ code: "数据库错误" });
    }

    return res.send({ code: "操作成功" });
  },

  // 获取普通凭证
  initPass: (req, res) => {
    const logid = `${stringRandom()}-${req.path}`;
    const { userid, event, id = 0 } = req.body;

    console.log(logid, userid, event, "获取通关凭证请求", req.body);

    if (!userid || Number(userid) < 1000000 || !event) {
      console.log(logid, userid, event, "参数错误");
      return res.send({ code: "参数错误" });
    }

    if (!initPassEvent.includes(event)) {
      console.log(logid, userid, "最新通关打点event请求错误：", event, userid);
      return res.send({ code: "该事件不可获得人数" });
    }

    let passingKey = Math.floor(Math.random() * 1000000);

    console.log(
      logid,
      userid,
      "获取临时凭证请求：",
      req.body,
      "凭证：",
      passingKey
    );

    let num = 0;

    switch (event) {
      case 100:
        num = 1;
        break;
      case 102:
        num = 1;
        break;
      case 120: // 开业
        num = gameSystem["opening_gift_customer"] || 0;
        break;
      case 121: // 投资
        const ConfigData121 = onlinereward_all.RECORDS.find(
          (e) => e.id === `${id}`
        );
        if (ConfigData121) {
          num = +ConfigData121.customer || 0;
        }
        break;
    }

    models.user
      .update(
        { userid: userid },
        {
          $set: { passingKey: passingKey },
          $inc: { initPassTimes: 1 },
        }
      )
      .exec(async (err) => {
        if (err) {
          console.error(logid, userid, "普通凭证入库失败", err);
          return res.send({ code: "数据库错误" });
        }

        let query = {
          day: new Date(moment()).Format("yyyy-MM-dd"),
          channel: "all",
        };
        let setEvent = { $inc: { "datas.initPass": 1 } };
        let opt = { upsert: true };
        models.eventStatistic.update(query, setEvent, opt).exec((err) => {
          if (err)
            console.log(
              logid,
              userid,
              "[eventStatistic]用户获取普通凭证记录入库失败",
              err
            );
        });

        let Hkey = `${userid}_${event}_${passingKey}`;
        let Hvalue = {
          num,
          addNum: 0,
          hasCheck: 0,
        };

        const [hmsetErr, hmsetResult] = await to(hmset(Hkey, Hvalue));
        if (err) {
          console.log(logid, userid, "num 创建数据错误", hmsetErr);
        }
        if (hmsetResult !== "OK") {
          console.log(logid, userid, "num 创建数据失败", hmsetResult);
        }
        await expire(Hkey, 60 * 10);

        return res.send({ code: "操作成功", passingKey, num });
      });
  },

  // 获取视频凭证（开始看广告）
  initVideo: async (req, res) => {
    const logid = `${stringRandom()}-${req.path}`;
    let { userid, event, id = 0 } = req.body;

    console.log(logid, userid, event, "获取视频凭证请求", req.body);

    if (!userid || Number(userid) < 1000000 || !event) {
      console.log(logid, userid, event, "参数错误");
      return res.send({ code: "参数错误" });
    }

    if (!initVideoEvent.includes(event)) {
      console.log(logid, userid, "最新通关打点event请求错误：", event, userid);
      return res.send({ code: "该事件不可获得人数" });
    }

    let [err, result] = await to(
      models.ad.create({ userid, event, hasInit: true })
    );

    if (err) {
      console.error(logid, "广告数据写入数据库错误", err);
      return res.send({ code: "数据库错误" });
    }

    const { _id } = result;

    let lockingKey = _id;
    console.log(
      logid,
      userid,
      "获取临时凭证（开始看广告）请求：",
      req.body,
      "凭证：",
      lockingKey
    );

    let num = 0;
    switch (event) {
      case 1: // 招揽客户
        num = gameSystem["customer_num_each_video"] || 0;
        break;
      case 2: // 打印传单
        num =
          gameSystem["leaflet_click_num_each_video"] /
          gameSystem["leaflet_click_times"];
        break;
      case 3: // 修理故障
        const [min_1003 = 0, max_1003 = 0] = gameSystem[
          "repair_computer_customer_interval"
        ] || [0, 0];
        num = random(min_1003, max_1003);
        break;
      case 5: // 特殊NPC-李总
        num =
          (gameSystem["opening_gift_customer"] || 0) *
          (gameSystem["opening_gift_ratio"] || 0);
        break;

      case 20: // 开业
        const [min_1005 = 0, max_1005 = 0] = gameSystem[
          "customer_npc_num_one_time"
        ] || [0, 0];
        num = random(min_1005, max_1005);
        break;

      case 21: // 投资
        const ConfigData21 = onlinereward_all.RECORDS.find(
          (e) => e.id === `${id}`
        );
        if (ConfigData21) {
          num = (+ConfigData21.customer || 0) * (+ConfigData21.mul_ratio || 0);
        }
        break;
    }

    models.user
      .update(
        { userid: userid },
        {
          $set: {
            lockingKey: lockingKey,
          },
          $inc: {
            initVideosTimes: 1,
          },
        }
      )
      .exec(async (err) => {
        if (err) {
          console.error(
            logid,
            userid,
            "用户获取临时凭证（开始看广告）入库失败：",
            err
          );
          return res.send({ code: "数据库错误" });
        }

        let query = {
          day: new Date(moment()).Format("yyyy-MM-dd"),
          channel: "all",
        };
        let setEvent = { $inc: { "datas.initVideo": 1 } };
        let opt = { upsert: true };
        models.eventStatistic.update(query, setEvent, opt).exec((err) => {
          if (err)
            console.log(
              logid,
              userid,
              "[eventStatistic]：用户获取临时凭证（开始看广告）入统计库失败：：",
              err
            );
        });

        let Hkey = `${userid}_${event}_${lockingKey}`;
        let Hvalue = {
          num: num,
          addNum: 0,
          hasCheck: 0,
        };

        const [hmsetErr, hmsetResult] = await to(hmset(Hkey, Hvalue));

        console.log(
          logid,
          userid,
          "hmsetErr, hmsetResult",
          hmsetErr,
          hmsetResult
        );
        if (err) {
          console.log(logid, userid, "num 创建数据错误", hmsetErr);
          return res.send({ code: "操作失败" });
        }
        if (hmsetResult !== "OK") {
          console.log(logid, userid, "num 创建数据错误", hmsetResult);
          console.log(logid, userid, "操作失败", hmsetResult);
        }
        await expire(Hkey, 60 * 10);

        return res.send({ code: "操作成功", lockingKey, num });
      });
  },

  //分红树消耗人数
  treeUsedCoin: (req, res) => {
    console.log("分红树消耗人数请求：", req.body);
    let { userid, level } = req.body;
    if (!userid || !level) return res.send({ code: "参数错误" });

    if (!bonuslvup || !bonuslvup.RECORDS)
      return res.send({ code: "读取系统配置错误" });
    let datas = bonuslvup.RECORDS.find((v) => {
      return Number(v.id) == level;
    });
    if (!datas || !datas["cost_each_time"]) {
      return res.send({ code: "当前等级的系统配置错误" });
    }
    models.user.findOne({ userid }).exec((err, user) => {
      if (err || !user) return res.send({ code: "查找不到用户" });
      if (
        user.treeUsedCoinToday + Number(datas["cost_each_time"]) >
        gameSystem["video_coin_bonuslvup_limit_each_day"]
      ) {
        return res.send({
          code: `今日分红树使用的人数达上限，已使用${user.treeUsedCoinToday}个人数`,
        });
      } else {
        user.treeUsedCoinToday += Number(datas["cost_each_time"]);
        user.treeUsedCoin += Number(datas["cost_each_time"]);
        user.videoCoins -= Number(datas["cost_each_time"]);
        user.save((err) => {
          if (err) return res.send({ code: "操作失败" });
          return res.send({
            code: "操作成功",
          });
        });
      }
    });
  },

  // 砸存钱罐
  hitPiggyBank: async (req, res) => {
    const logid = `${stringRandom()}-${req.path}`;
    console.log(logid, "砸存钱罐", req.body);
    let { userid } = req.body;
    if (!userid) {
      console.log(logid, "参数错误", req.body);
      return res.send({ code: "参数错误" });
    }

    const [err, userInfo] = await to(models.user.findOne({ userid }));

    if (err) {
      console.log(logid, userid, "查询用户失败");
      return res.send({ code: "操作失败" });
    }

    if (!userInfo) {
      console.log(logid, userid, "用户不存在");
      return res.send({ code: "参数错误" });
    }

    let yesterday = new Date(moment().add(-1, "days")).Format("yyyy-MM-dd");
    let today = new Date(moment()).Format("yyyy-MM-dd");

    let { piggyBank = {} } = userInfo;

    if (!piggyBank[yesterday] || piggyBank[yesterday] == 0) {
      console.log(logid, userid, "存钱罐无余额", piggyBank);
      return res.send({ code: "存钱罐无余额" });
    }

    let piggyBankTmp = {};

    piggyBankTmp[today] = piggyBank[today] || 0;
    const balance = piggyBank[yesterday] || 0;

    delete piggyBank[today];
    delete piggyBank[yesterday];

    // 扣除昨天之前的存钱罐
    let deduct = 0;
    for (let key in piggyBank) {
      deduct += +piggyBank[key];
    }
    console.log(userid, "存钱罐发霉的钱", deduct);
    userInfo.deductMoney += deduct;
    userInfo.money += balance;
    userInfo.piggyBank = piggyBankTmp;

    let [saveErr] = await to(userInfo.save());

    if (saveErr) {
      console.log(logid, userid, "保存数据错误", saveErr);
      return res.send({ code: "操作失败" });
    }

    // 记录流水
    models.water.create(
      {
        userid: userid,
        type: "hitPiggyBank",
        amount: balance,
        channel: userInfo.deviceInfo
          ? userInfo.deviceInfo.channel
            ? userInfo.deviceInfo.channel
            : null
          : null,
      },
      () => {}
    );

    console.log(logid, userid, `砸罐成功：userid:${userid} ${balance} `);

    return res.send({ code: "操作成功" });
  },

  // 次数奖励
  numReward: async (req, res) => {
    const logid = `${stringRandom()}-${req.path}`;
    console.log(logid, "次数奖励", req.body);
    let { userid } = req.body;
    if (!userid) {
      console.log(logid, userid, "参数错误");
      return res.send({ code: "参数错误" });
    }

    const [err, userInfo] = await to(models.user.findOne({ userid }));

    if (err) {
      console.log(logid, userid, "数据库查询错误", err);
      return res.send({ code: "操作失败" });
    }

    if (!userInfo) {
      console.log(logid, userid, "无数据");
      return res.send({ code: "参数错误" });
    }

    let numRewardGradeToday = userInfo.numRewardGradeToday || 1001;

    console.log("numRewardGradeToday", numRewardGradeToday);

    const data = dailycashoutbox.RECORDS.find((item) => {
      return item.type == "1" && item.id == numRewardGradeToday.toString();
    });

    if (!data) {
      console.log(logid, userid, "找不到该数据");
      return res.send({ code: "操作失败" });
    }

    console.log("data", data);

    const { reward = [] } = data;
    if (reward.length == 0) {
      console.log(logid, userid, "找不到奖励数据");
      return res.send({ code: "操作失败" });
    }

    const { withdrawTimesToday = 0 } = userInfo;

    console.log(logid, userid, "withdrawTimesToday", withdrawTimesToday);

    // 次数判断
    if (withdrawTimesToday < +data.parameter) {
      console.log(
        logid,
        userid,
        "奖励次数不足",
        withdrawTimesToday,
        data.parameter
      );
      return res.send({
        code: "提现次数不足",
        withdrawTimesToday: userInfo.withdrawTimesToday,
        numRewardTimesToday: userInfo.numRewardTimesToday,
      });
    }

    // 权重处理
    const rewardArr = [];
    reward.forEach((e) => {
      rewardArr.push({
        reward: e[0],
        weight: e[1],
      });
    });

    for (let i in rewardArr) {
      for (let j = 0; j < rewardArr[i].weight; j++) {
        rewardArr.push(rewardArr[i].reward);
      }
    }
    let rewardMoney = rewardArr[Math.floor(Math.random() * rewardArr.length)];
    console.log(logid, userid, "次数奖励的金钱", rewardMoney);

    // 记录流水
    models.water.create(
      {
        userid: userid,
        type: "num",
        amount: rewardMoney,
        channel: userInfo.deviceInfo
          ? userInfo.deviceInfo.channel
            ? userInfo.deviceInfo.channel
            : null
          : null,
      },
      () => {}
    );

    userInfo.money += rewardMoney;
    userInfo.numRewardMoney += rewardMoney;
    userInfo.numRewardGradeToday++;
    userInfo.numRewardTimes++;
    userInfo.numRewardTimesToday++;

    let [saveErr] = await to(userInfo.save());

    if (saveErr) {
      console.log(logid, userid, "保存数据出错");
      return res.send({ code: "操作失败" });
    }

    console.log(logid, userid, `次数奖励：userid:${userid},${rewardMoney}`);

    return res.send({
      code: "操作成功",
      addMoney: rewardMoney,
      numRewardTimesToday: userInfo.numRewardTimesToday,
      numRewardGradeToday: userInfo.numRewardGradeToday,
    });
  },

  // 档次奖励
  gradeReward: async (req, res) => {
    const logid = `${stringRandom()}-${req.path}`;
    console.log(logid, "档次请求", req.body);
    let { userid } = req.body;
    if (!userid) {
      console.log(logid, "参数错误");
      return res.send({ code: "参数错误" });
    }
    const [err, userInfo] = await to(models.user.findOne({ userid }));
    if (err) {
      console.log(logid, userid, "查询用户失败");
      return res.send({ code: "操作失败" });
    }
    if (!userInfo) {
      console.log(logid, userid, "用户不存在");
      return res.send({ code: "参数错误" });
    }

    let { withdrawGradeToday = {}, getRewardedGradeToday = {} } = userInfo;

    let withdrawGradeTodayTmp = JSON.parse(JSON.stringify(withdrawGradeToday));
    let getRewardedGradeTodayTmp = JSON.parse(
      JSON.stringify(getRewardedGradeToday)
    );

    for (let key in withdrawGradeTodayTmp) {
      if (key in getRewardedGradeTodayTmp) {
        delete withdrawGradeTodayTmp[key];
      }
    }
    console.log(logid, userid, "可奖励的档次", withdrawGradeTodayTmp);

    let rewardKeys = Object.keys(withdrawGradeTodayTmp);

    if (rewardKeys.length == 0) {
      console.log(logid, userid, "无奖励条件");
      return res.send({ code: "无奖励条件 " });
    }

    let rewardGrade;
    let data;

    for (let i = 0; i < rewardKeys.length; i++) {
      data = dailycashoutbox.RECORDS.find((item) => {
        return item.type == "2" && item.parameter == rewardKeys[i].toString();
      });

      if (!_.isNil(data)) {
        console.log(logid, userid, "data", data);
        rewardGrade = rewardKeys[i];
        break;
      }
    }

    console.log(logid, userid, "rewardGrade", rewardGrade);

    if (_.isNil(data)) {
      console.log(logid, userid, "无奖励条件");
      return res.send({ code: "无奖励条件" });
    }

    const { reward = [] } = data;
    if (reward.length == 0) {
      console.log(logid, userid, "无奖励条件", reward);
      return res.send({ code: "操作失败" });
    }

    // 权重处理
    const rewardArr = [];
    reward.forEach((e) => {
      rewardArr.push({
        reward: e[0],
        weight: e[1],
      });
    });

    for (let i in rewardArr) {
      for (let j = 0; j < rewardArr[i].weight; j++) {
        rewardArr.push(rewardArr[i].reward);
      }
    }
    let rewardMoney = rewardArr[Math.floor(Math.random() * rewardArr.length)];
    console.log(logid, userid, "档次奖励的金钱", rewardMoney);

    // 记录流水
    models.water.create(
      {
        userid: userid,
        type: "grade",
        amount: rewardMoney,
        channel: userInfo.deviceInfo
          ? userInfo.deviceInfo.channel
            ? userInfo.deviceInfo.channel
            : null
          : null,
      },
      () => {}
    );

    getRewardedGradeTodayTmp[rewardGrade] = 1;
    userInfo.getRewardedGradeToday = getRewardedGradeTodayTmp;
    userInfo.money += +rewardMoney;
    userInfo.gradeRewardTimes++;
    userInfo.gradeRewardMoney += +rewardMoney;

    let [saveErr] = await to(userInfo.save());

    if (saveErr) {
      console.log(logid, userid, "保存数据错误");
      return res.send({ code: "操作失败" });
    }

    console.log(`档次奖励：userid:${userid},${rewardMoney}`);

    return res.send({
      code: "操作成功",
      addMoney: rewardMoney,
      getRewardedGradeToday: userInfo.getRewardedGradeToday,
      withdrawGradeToday: userInfo.withdrawGradeToday,
    });
  },
};
