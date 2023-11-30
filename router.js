const user = require("./controller/user");
const util = require("./controller/util");
const withdraw = require("./controller/withdraw");
const channel = require("./controller/channel");
const invitation = require("./controller/invitation");
const abl = require("./controller/abl");
const event = require("./controller/event");



module.exports = (app) => {
  // 暂用的路由
  app.get("/", (req, res) => {
    res.send("helloword!");
  });
  app.get("/getTime", util.getTime); // 对时
  app.post("/get/:fileName", util.file); // 获取配置文件

  app.get("/util/cashlevel_all", util.cashlevel_all);
  app.get("/util/system", util.system);
  app.post("/signIn", user.signIn); // 注册
  app.post("/updateUserBehavior", user.updateUserBehavior); // 游戏数据上报
  app.post("/withdraw", withdraw.withdraw); // 提现
  app.post("/getCashOut", withdraw.getCashOut); // 获取提现设置
  app.post("/user/login", user.login); // 登陆
  app.post("/planStateOpen", user.planStateOpen); // 计划状态开启
  app.post("/withdraw/check", withdraw.check); // 提现条件查询
  app.post("/addEvent", user.addEvent); // 打点
//   app.post("/addEventIOS", user.addEventIOS); // ios打点
  app.post("/dailyTasks", user.dailyTasks); // 每日任务：废弃
  app.post("/checkDailyTasksTime", user.checkDailyTasksTime); // 获取每日任务开始时间：废弃
//   app.post("/systemWithdraw", withdraw.systemWithdraw); // 手动提现
  app.post("/addSpecialEvent", user.addSpecialEvent); // 特殊打点
//   app.post("/addSpecialEventIOS", user.addSpecialEventIOS); // ios特殊打点
  // app.post('/addVideoEvent', user.addVideoEvent) // 激励打点
  app.post("/cleanGameDatas", user.cleanGameDatas); // 注销，清除游戏数据和当前经验
  // app.post('/newAddVideoEvent', user.newAddVideoEvent) // 新激励打点

  app.post("/addNum", user.addNum); // 本游戏独有，加人数

  app.post("/initPass", user.initPass); // 获取凭证（不用看广告）
  app.post("/lastPassEvent", user.addPassVideoEvent); // 凭证校验

  app.post("/initVideo", user.initVideo); // 获取视频凭证（开始看广告）
  app.post("/lastAddVideoEvent", user.lastAddVideoEvent); // 视频凭证校验

//   app.post("/treeUsedCoin", user.treeUsedCoin); // 分红树消耗经验
  app.post("/planState", user.planState); // 服务端计划状态
  app.post("/timingTask", user.planState); // 服务端计划状态

  app.post("/user/hitPiggyBank", user.hitPiggyBank); // 砸存钱罐
  app.post("/user/reward/num", user.numReward); // 次数奖励
  app.post("/user/reward/grade", user.gradeReward); // 档次奖励

  app.post("/channel/hook/update", channel.channelUpdateHook); // 中台渠道回调
  app.get("/channel/hook/update", channel.channelUpdateHook);

  app.post("/abl", user.abl); // 封号
  app.post("/abl/info", abl.info); // 图像验证开关详细

  app.post("/invitation/master", invitation.masterCode); // 邀请师傅
  app.post("/invitation/masterInfo", invitation.master); // 获取徒弟徒孙贡献
  app.post("/invitation/contributionMap", invitation.getContributionMap); // 获取徒弟徒孙贡献
  app.post("/invitation/contributionList", invitation.getContributionList); // 贡献列表
  app.post("/invitation/getContribution", invitation.getContribution); // 领取贡献

  // 特殊业务接口
  app.post("/event/limit", event.limit); // 事件限制
};
