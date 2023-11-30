const _ = require("lodash");
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;
let { catdb, models } = require("../util/mongo_client");

/**
 * 平台用户
 * @class User
 * @property {String} name - 用户名
 * @property {String} mobile - 用户手机
 * @property {String} openid - openid
 * @property {String} unionid - unionid
 * @property {Number} userid - userid
 * @property {Number} sex - 姓别
 * @property {String} city - 城市
 * @property {String} country - 乡镇
 * @property {String} invitationCode - 邀请码
 * @property {Date} lastLogin - 上次登陆时间
 * @property {Number} loginTimes - 登陆次数
 * @property {Number} loginDays - 登陆天数
 * @property {Number} continuousLoginTimes - 连续登陆次数
 * @property {Number} signInTimes - 0.3元签到登陆次数,值为0，1，2时表示签到次数并且未提现，值为3时表示签到够了并且已经提现
 * @property {Date} lastSignInByLevel1 - 0.3元档次签到的上次签到时间
 * @property {Date} lastSignIn - 上次签到时间
 * @property {String} invitationFrom - 上游邀请人
 * @property {String} headImgUrl - 用户头像
 * @property {String} chennel - 渠道
 * @property {String} taskLevel - 提现任务等级
 * @property {Number} taskProgress - 提现任务等级对应的进度
 * @property {String} refreshToken - 缓存刷新凭证
 * @property {Object} mobile, - deviceInfo
 * @property {Number} firstRuntime - 总运行时长
 * @property {Number} runTime - 总运行时长
 * @property {Number} signInTimesLevel2 - 0.5元签到登陆次数,值为0，1，2，3，4，5时表示签到次数并且未提现，值为6时表示签到够了邀请够了并且已经提现
 * @property {Number} invationLevel2 - 0.5元签到邀请次数,值为0，1，2时表示邀请次数并且未提现，值为3时表示签到够了邀请够了并且已经提现
 * @property {Number} invationFromDailyTask - 7天每日活动最终任务的邀请人数
 * @property {Date} createdAt - 注册时间
 * @property {String} system - 手机系统
 * @property {Object} userBehavior - 用户行为
 * @property {Number} videoCoins - 现有的经验
 * @property {Number} withdrawGrade - 目前提现档次
 * @property {Number} timesForWithdrawGrade - 当前提现档次的提现次数
 * @property {Number} getVideoCoinsToday - 今日获取的经验
 * @property {Number} getVideoCoinsForAll - 总共获取的经验
 * @property {Number} withdrawSuccessCount - 提现成功次数
 * @property {Number} errorAdvCount - 异常广告次数
 * @property {Number} errorPassCount - 异常通关次数
 * @property {Number} lockingKey - 开始看广告凭证
 * @property {Number} passingKey - 开始通关凭证
 * @property {Date} lastVideoTime - 最新看广告时间
 * @property {Date} lastPassTime - 最新通关时间
 * @property {Number} initVideosTimes - 请求凭证次数
 * @property {Number} initPassTimes - 通关凭证请求次数
 * @property {Number} treeUsedCoinToday - 今日分红树消耗的经验
 * @property {Number} treeUsedCoin - 总分红树消耗的经验
 * @property {Date} lastWithdrawTime - 上次提现成功时间
 * @property {Number} invitationTimes - 总已邀请人数
 * @property {Number} invitationTimesForGrade - 本提现档次（小）已邀请人数
 * @property {String} hotCloudPlan -  热云计划 signIn(服务端比例激活) incentiveAd(客户端激励视频激活) withdraw(首次提现后激活)
 * @property {boolean} hotCloudIsProcessed -  热云激活处理状态
 * @property {boolean} hotCloudIsActivate - 热云激活状态
 * @property {String} toponPlan - topon计划 signIn(服务端开启)  withdraw(首次提现后激活)
 * @property {boolean} toponIsProcessed - topon激活处理状态
 * @property {boolean} toponIsActivate - topon激活状态
 * @property {Object} eventTodayTimes - 今天事件打点数
 * @property {Object} eventTotalTimes - 打点数总计
 * @property {Object} numRewardGrade - 次数奖励的档位
 * @property {Object} withdrawGradeToday - 今天提现档位
 * @property {Number} withdrawTimesToday - 今天成功提现次数
 */

let UserSchema = new Schema(
  {
    name: {
      type: String,
    },
    mobile: {
      type: String,
    },
    deviceInfo: {
      type: Object,
    },
    openid: {
      type: String,
      index: true,
      unique: true,
    },
    unionid: {
      type: String,
      index: true,
    },
    userid: {
      type: Number,
      index: true,
      unique: true,
    },
    sex: {
      type: Number,
    },
    firstRuntime: {
      type: Number,
      default: 0,
    },
    runTime: {
      type: Number,
      default: 0,
    },
    signInTimesLevel2: {
      type: Number,
      default: 0,
    },
    invationLevel2: {
      type: Number,
      default: 0,
    },
    city: {
      type: String,
    },
    country: {
      type: String,
    },
    invitationCode: {
      type: String,
      index: true,
    },
    lastLogin: {
      type: Date,
      index: true,
    },
    loginTimes: {
      type: Number,
      default: 1,
    },
    continuousLoginTimes: {
      type: Number,
      default: 1,
    },
    loginDays: {
      type: Number,
      default: 1,
    },
    signInTimes: {
      type: Number,
      default: 0,
    },
    lastSignIn: {
      type: Date,
    },
    lastSignInByLevel1: {
      type: Date,
    },
    invitationFrom: {
      type: String,
      index: true,
    },
    headImgUrl: {
      type: String,
    },
    taskLevel: {
      type: String,
      default: "g2t1",
    },
    taskProgress: {
      type: Number,
      default: 0,
    },
    chennel: {
      type: String,
      index: true,
    },
    refreshToken: {
      type: String,
    },
    invationFromDailyTask: {
      type: Number,
      default: 0,
    },
    system: {
      type: String,
      index: true,
    },
    userBehavior: {
      type: Object,
    },
    videoCoins: {
      type: Number,
      default: 0,
    },
    withdrawGrade: {
      type: Number,
      default: 1001,
    },
    // 前置条件
    formerId: {
      type: Number,
      default: 0,
    },
    timesForWithdrawGrade: {
      type: Number,
      default: 0,
    },
    getVideoCoinsToday: {
      type: Number,
      default: 0,
    },
    getVideoCoinsForAll: {
      type: Number,
      default: 0,
    },
    withdrawSuccessCount: {
      type: Number,
      default: 0,
    },
    errorAdvCount: {
      type: Number,
      default: 0,
    },
    errorPassCount: {
      type: Number,
      default: 0,
    },
    lastVideoTime: {
      type: Date,
    },
    lastPassTime: {
      type: Date,
    },
    lockingKey: {
      type: String,
    },
    passingKey: {
      type: Number,
    },
    initVideosTimes: {
      type: Number,
      default: 0,
    },
    initPassTimes: {
      type: Number,
      default: 0,
    },
    treeUsedCoinToday: {
      type: Number,
      default: 0,
    },
    treeUsedCoin: {
      type: Number,
      default: 0,
    },
    lastWithdrawTime: {
      type: Date,
    },
    invitationTimes: {
      type: Number,
      default: 0,
    },
    invitationTimesForGrade: {
      type: Number,
      default: 0,
    },
    hotCloudPlan: {
      type: String,
    },
    hotCloudIsProcessed: {
      type: Boolean,
      default: false,
    },
    hotCloudIsActivate: {
      type: Boolean,
      default: false,
    },
    ecpmIsProcessed: {
      type: Boolean,
      default: false,
    },
    allecpmIsProcessed: {
      type: Boolean,
      default: false,
    },
    ecpmIsActivate: {
      type: Boolean,
      default: false,
    },
    allecpmIsActivate: {
      type: Boolean,
      default: false,
    },
    toponPlan: {
      type: String,
    },
    toponIsProcessed: {
      type: Boolean,
      default: false,
    },
    toponIsActivate: {
      type: Boolean,
      default: false,
    },
    eventTodayTimes: {
      type: Object,
      default: {},
    },
    eventTotalTimes: {
      type: Object,
      default: {},
    },

    // 钱
    money: {
      type: Number,
      default: 0,
    },

    // 扣除的钱
    deductMoney: {
      type: Number,
      default: 0,
    },

    // 获钱次数
    moneyAddCount: {
      type: Number,
      default: 0,
    },

    // 总共获得的钱  视频广告拿到的
    allMoney: {
      type: Number,
      default: 0,
    },

    // 提现金额
    withdrawMoney: {
      type: Number,
      default: 0,
    },
    // 存钱罐
    piggyBank: {
      type: Object,
      default: {},
    },

    // 今天次数奖励档位 , 提现时写入， 0 点置为 1001
    numRewardGradeToday: {
      type: Number,
      default: 1001,
    },

    // 今天次数奖励次数 ， 0 点置为 0
    numRewardTimesToday: {
      type: Number,
      default: 0,
    },

    // 今天提现档次分布, 提现时写入， 0 点置空
    withdrawGradeToday: {
      type: Object,
      default: {},
    },
    // 今天成功提现次数， 0 点置空
    withdrawTimesToday: {
      type: Object,
      default: 0,
    },

    // 今天档次奖励分布, 奖励时写入， 0 点置空
    getRewardedGradeToday: {
      type: Object,
      default: {},
    },

    // 今天次数奖励档位 , 提现时写入， 0 点置为 1001
    allecpm: {
      type: Number,
      default: 0,
    },

    // 次数任务奖励
    numRewardMoney: {
      type: Number,
      default: 0,
    },

    // 次数任务奖励次数
    numRewardTimes: {
      type: Number,
      default: 0,
    },

    // 档次任务奖励
    gradeRewardMoney: {
      type: Number,
      default: 0,
    },
    // 档次任务奖励次数
    gradeRewardTimes: {
      type: Number,
      default: 0,
    },

    // 开业红包奖励
    openingReward: {
      type: Number,
      default: 0,
    },

    // 已领取开业奖励
    afterOpeningReward: {
      type: Number,
      default: 0,
    },

    // 已领取投资奖励
    afterReturnInvestment: {
      type: Number,
      default: 0,
    },

    // 已领一键满座奖励
    after124: {
      type: Number,
      default: 0,
    },

    // 命中次数
    ecpmPlanTimes: {
      type: Number,
      default: 0,
    },
    // 命中次数
    allecpmPlanTimes: {
      type: Number,
      default: 0,
    },

    // 黑名单开关
    balSwitch: {
      type: Boolean,
      default: false,
    },

    // 师傅
    master: {
      type: Number,
      default: 0,
    },

    // 师公
    grandMaster: {
      type: Number,
      default: 0,
    },

    // 贡献给师傅的钱
    masterTodayMoney: {
      type: Number,
      default: 0,
    },

    // 贡献给师公的钱
    grandMasterTodayMoney: {
      type: Number,
      default: 0,
    },

    // 贡献给师傅所用的钱
    masterAllMoney: {
      type: Number,
      default: 0,
    },

    // 贡献给师公的钱
    grandMasterAllMoney: {
      type: Number,
      default: 0,
    },

    // 贡献给师傅的次数
    masterTimes: {
      type: Number,
      default: 0,
    },

    // 贡献给师公的次数
    grandMasterTimes: {
      type: Number,
      default: 0,
    },

    // 徒弟贡献的钱
    sonMoney: {
      type: Number,
      default: 0,
    },

    // 徒孙贡献的钱
    grandsonMoney: {
      type: Number,
      default: 0,
    },

    // 图像验证开关
    ablSwitch: {
      type: Boolean,
      default: false,
    },

    // 视频次数
    videoTimes: {
      type: Number,
      default: 0,
    },
    buyQuantity: {
      type: String,
    },

    // 热云注册事件发送状态
    hasSendHotCloudSignIn: {
      type: Boolean,
      default: true,
    },

    // 热云注册事件发送状态命中次数
    hasSendHotCloudSignInTimes: {
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

UserSchema.statics = {
  // 静态方法
};

UserSchema.index({ createdAt: 1 });
UserSchema.index({ "deviceInfo.guid": 1 });
UserSchema.index({ "deviceInfo.ip": 1 });

module.exports = catdb.model("User", UserSchema, "user");
