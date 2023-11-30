const _ = require("lodash");
const stringRandom = require("string-random");
const to = require("await-to-js").default;

const { models } = require("../util/mongo_client");

const userM = models.user;
const channelM = models.channel;

module.exports = {
  // 图像验证开关详细
  info: async (req, res) => {
    const logid = `${stringRandom()}-${req.path}`;

    console.log(logid, "图像验证开关状态请求", req.body);
    const { userid } = req.body;

    if (_.isNil(userid)) {
      console.log(logid, userid, "参数错误");
      return res.send({ code: "参数错误" });
    }

    let result = {
      code: "操作成功",
      switch: false,
      errNum: 5,
      interval: [
        [5, 5],
        [5, 10],
      ],
    };

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

    const { ablSwitch = false, deviceInfo = {} } = userInfo;

    if (ablSwitch) {
      result.switch = true;
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

    const {
      ablSwitch: channelSwitch = false,
      ablInterval = [],
      ablErrNum = 0,
    } = channelInfo;

    if (channelSwitch) {
      result.switch = true;
      result.interval = ablInterval;
      result.errNum = ablErrNum;
      return res.send(result);
    }

    return res.send(result);
  },
};
