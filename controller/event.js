const _ = require("lodash");
const stringRandom = require("string-random");
const to = require("await-to-js").default;
const eventexplimit = require("../files/eventexplimit_all.json");

const { models } = require("../util/mongo_client");

const userM = models.user;
const channelM = models.channel;

module.exports = {
  // 事件限制
  limit: async (req, res) => {
    const logid = `${stringRandom()}-${req.path}`;

    console.log(logid, "事件限制接口请求", req.body);

    const { userid, event } = req.body;

    if (_.isNil(userid) || _.isNil(event)) {
      console.log(logid, "参数错误", req.body);
      return res.send({ code: "参数错误" });
    }

    let result = {
      code: "操作成功",
      dailyLimit: -1,
      totalLimit: -1,
      dailyNum: 0,
      totalNum: 0,
    };

    if (eventexplimit[event.toString()]) {
      const { daily_limit = 0, total_limit = 0 } =
        eventexplimit[event.toString()];
      result.dailyLimit = daily_limit;
      result.totalLimit = total_limit;
    }

    let err, userInfo, channelInfo;

    [err, userInfo] = await to(userM.findOne({ userid }));
    if (err) {
      console.error(logid, "数据库操作错误", err);
      return res.send({ code: "操作失败" });
    }

    if (_.isNil(userInfo)) {
      console.error(logid, userid, "用户不存在", userInfo);
      return res.send({ code: "用户不存在" });
    }

    const {
      deviceInfo = {},
      eventTodayTimes = {},
      eventTotalTimes = {},
    } = userInfo;

    if (eventTodayTimes[`${event}`]) {
      result.dailyNum = eventTodayTimes[`${event}`];
    }
    if (eventTotalTimes[`${event}`]) {
      result.totalNum = eventTotalTimes[`${event}`];
    }

    const { channel = "" } = deviceInfo;
    if (channel == "") {
      console.error(logid, userid, "用户无渠道", user);
      return res.send(result);
    }

    [err, channelInfo] = await to(channelM.findOne({ channel }));
    if (err) {
      console.error(logid, "数据库操作错误", err);
      return res.send({ code: "操作失败" });
    }

    if (_.isNil(channelInfo)) {
      console.error(logid, "找不到该渠道数据", err);
      return res.send(result);
    }

    const { event: chlEvent = [] } = channelInfo;

    let chlE = chlEvent.find((e) => {
      return e.id == +event;
    });

    console.log("chlEvent", chlE);

    if (!_.isNil(chlE)) {
      result.dailyLimit = chlE.dailyLimit || 0;
      result.totalLimit = chlE.totalLimit || 0;
    }

    console.log(logid, userid, "返回", result);
    return res.send(result);
  },
};
