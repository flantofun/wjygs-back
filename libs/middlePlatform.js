const got = require("got");
const _ = require("lodash");
const to = require("await-to-js").default;
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const moment = require("moment");

const { models } = require("../util/mongo_client");
const { get, set } = require("../util/redis_client");
const gameSystem = require("../files/System");

// todo 写到配置中
const game = "cysd";
const getChannelInfoURL =
  "http://center.5188youxi.com:9000/api/v1/channel/getList";
const pushEventForMiddlePlatformURL =
  "http://center.5188youxi.com:9000/api/v1/event";
const signKey = "c034et3yoq5o2x8njot96ys32tdxcv9x";

const adCbUrl = "http://center.5188youxi.com:9001/api/v1/getAdvDatas?game=cysd";

let getAdInfo = async () => {
  if (process.env && process.env.pm_id && process.env.pm_id % 2 != 0) {
    console.log(
      "[广告回调模块]单数进程检测到定时任务模块，本进程不执行定时任务，会交给双数进程去执行，本进程pmid(进程id)为：" +
        process.env.pm_id
    );
    return;
  }

  console.log("[广告回调]");

  const lastIdKey = `CYSD_AD_LAST_ID`;

  let reqUrl;
  let last_id = 0;

  const [err, result] = await to(get(lastIdKey));
  if (err) {
    console.error("读取redis值错误", err);
  }
  console.log("resultresultresult", result);

  if (!result) {
    const [err, result] = await to(set(lastIdKey, last_id));
    if (err) {
      console.error("设置redis值错误", err);
      return;
    }
  } else {
    last_id = result;
  }

  console.log("err, result", err, result);

  if (last_id != 0) {
    reqUrl = `${adCbUrl}&last_id=${last_id}`;
  } else {
    reqUrl = adCbUrl;
  }

  console.log("reqUrl", reqUrl);

  let { body } = await got(reqUrl);

  console.log("返回body", body);

  try {
    body = JSON.parse(body);
  } catch (e) {
    console.log("请求回调解析错误", e);
    return;
  }

  const {
    error_code = "",
    remain = 0,
    last_id: res_last_id = "",
    datas = [],
  } = body;

  console.log("返回状态", error_code);

  if (error_code != "操作成功") {
    console.error("请求中台回调错误", body);
    return;
  }

  if (res_last_id != "") {
    const [setErr, setKeyResult] = await to(set(lastIdKey, res_last_id));
    if (setErr) {
      console.error("设置redisKey错误", setErr);
      return;
    }
    console.log("setKeyResult", setKeyResult);
  }

  for await (let e of datas) {
    console.log("处理广告回调", e);

    let { user_id, ecpm, trans_id } = e;

    user_id = Number(user_id);

    let err, adResult, userResult, saveResult;

    [err, adResult] = await to(
      models.ad.findOneAndUpdate(
        {
          transId: trans_id,
        },
        {
          transId: trans_id,
          userid: user_id,
          eCPM: ecpm,
        },
        {
          upsert: true,
          new: true,
        }
      )
    );

    if (err) {
      console.error(e, "查询广告数据错误", err);
      continue;
    }

    if (adResult.hasCb) {
      console.log("已处理", adResult);
      continue;
    }

    [err, userResult] = await to(models.user.findOne({ userid: user_id }));
    if (err) {
      console.error(e, "查询用户数据错误", err);
      continue;
    }

    if (!userResult) {
      console.error("广告回调 用户不存在", userResult);
      continue;
    }

    [err, ecpmResult] = await to(
      models.ecpm.findOne({ left: { $lt: +ecpm }, right: { $gte: +ecpm } })
    );

    const { proportion: ecpmProportion = 20 } = ecpmResult;

    if (err) {
      console.error("查询ecpm配置错误", err);
      continue;
    }

    let money = 0;
    let piggyBank = 0;
    let ecpmMoney = 0;
    let pumpingMoney = 0;
    let masterMoney = 0;
    let grandMasterMoney = 0;

    if (+ecpm <= 0) {
      console.error(user_id, "eCPM错误", ecpm);
      continue;
    }

    ecpmMoney = Number((+ecpm / 1000) * 10000);
    console.log(user_id, "ecpm价值", ecpmMoney);

    let discount = ecpmProportion / 100;
    console.log(user_id, "扣除比例", discount);

    money = Number((+ecpm / 1000) * ((100 - discount) / 100) * 10000);
    console.log(user_id, "ecpm抽水后金额", money);

    pumpingMoney = ecpmMoney - money;

    console.log(user_id, "empm 抽水金额", pumpingMoney);

    userResult.allMoney += money;

    console.log(user_id, "ecpm", ecpm);
    console.log(user_id, "ecpm现金", money);

    // ecpm 最大上限
    let topMone = gameSystem["daily_cashout_top_limit"] || 300;
    if (money > topMone) {
      console.log(user_id, "单次获得现金超过设定阈值", money, "top", topMone);

      userResult.deductMoney += money - topMone;
      pumpingMoney += money - topMone;
      money = topMone;
    }

    // 存钱罐比例
    let piggyBankProportion = gameSystem["bank_coin_ratio"] || 0;
    piggyBank = Math.round(money * piggyBankProportion);
    console.log(user_id, "存钱罐比例和钱", piggyBankProportion, piggyBank);

    // 师傅比例
    let masterProportion = gameSystem["master_bonus_ratio"] || 0;
    masterMoney = Math.round(money * masterProportion);
    console.log(user_id, "师傅比例和钱", masterProportion, masterMoney);
    const { master, grandMaster } = userResult;

    console.log(user_id, "master, grandMaster", master, grandMaster);

    // 给师傅加钱
    if (master && userResult.videoTimes >= 2) {
      console.log(user_id, "师傅", masterMoney);

      userResult.masterAllMoney += masterMoney;
      userResult.masterTimes++;
      userResult.masterTodayMoney += masterMoney;

      models.user.update(
        { userid: master },
        {
          $inc: {
            sonMoney: masterMoney,
          },
        },
        () => {}
      );

      models.contribution.update(
        {
          userid: master,
          time: new Date(moment()).Format("yyyy-MM-dd"),
        },
        { $inc: { son: masterMoney } },
        {
          new: true,
          upsert: true,
        },
        () => {}
      );
    }

    // 师公比例
    let grandMasterProportion = gameSystem["grandmaster_bonus_ratio"] || 0;
    grandMasterMoney = Math.round(money * grandMasterProportion);
    console.log(
      user_id,
      "师公比例和钱",
      grandMasterProportion,
      grandMasterMoney
    );

    // 给师公加钱
    if (grandMaster && userResult.videoTimes >= 2) {
      console.log(user_id, "师公", grandMasterMoney);
      userResult.grandMasterAllMoney += grandMasterMoney;
      userResult.grandMasterTimes++;
      userResult.grandMasterTodayMoney += grandMasterMoney;

      models.user.update(
        { userid: grandMaster },
        {
          $inc: {
            grandsonMoney: grandMasterMoney,
          },
        },
        () => {}
      );

      models.contribution.update(
        {
          userid: grandMaster,
          time: new Date(moment()).Format("yyyy-MM-dd"),
        },
        { $inc: { grandson: grandMasterMoney } },
        {
          new: true,
          upsert: true,
        },
        () => {}
      );
    }

    // 修改扣除比例
    money = Math.round(money - (piggyBank + masterMoney + grandMasterMoney));
    console.log(user_id, "去除存罐 师傅 师公的钱", money);

    let { piggyBank: piggyBankObj = {} } = userResult;
    let piggyBankObjTmp = JSON.parse(JSON.stringify(piggyBankObj));
    let today = new Date(moment()).Format("yyyy-MM-dd");
    if (!(today in piggyBankObj)) {
      piggyBankObjTmp[today] = piggyBank;
    } else {
      piggyBankObjTmp[today] += piggyBank;
    }

    console.log(user_id, "piggyBankObj", piggyBankObj);

    userResult.money += money;
    userResult.piggyBank = piggyBankObjTmp;
    userResult.allecpm += +ecpm;
    userResult.moneyAddCount += 1;

    // userResult.lastVideoTime = new Date(moment());

    // 记录流水
    models.water.create(
      {
        userid: user_id,
        type: "videoEvent",
        amount: money,
        channel: userResult.deviceInfo
          ? userResult.deviceInfo.channel
            ? userResult.deviceInfo.channel
            : null
          : null,
      },
      () => {}
    );

    adResult.hasCb = true;
    [err, adResult] = await to(adResult.save());
    if (err) {
      console.error("保存状态错误", err);
      return;
    }
    [err, saveResult] = await to(userResult.save());
    if (err) {
      console.error("保存用户数据", err);
      return;
    }
  }

  if (remain == 1) {
    try {
      await getAdInfo();
    } catch (e) {
      await getAdInfo();
      console.log("广告函数执行错误", e);
    }
  } else {
    console.log("无数据，定时访问");
    setTimeout(async () => {
      try {
        await getAdInfo();
      } catch (e) {
        await getAdInfo();
        console.log("广告函数执行错误", e);
      }
    }, 500);
  }
};

async function tryGetAdInfo() {
  try {
    await getAdInfo();
  } catch (e) {
    console.log("执行错误", e);
    return await tryGetAdInfo();
  }
}

module.exports = {
  tryGetAdInfo,
  updateChannelConfig: async () => {
    const { body } = await got.post(getChannelInfoURL, {
      json: {
        game: game,
      },
      responseType: "json",
    });

    const { code = "", data = [] } = body;

    if (code == "操作成功" && !_.isNil(data) && data.length > 0) {
      for await (let item of data) {
        const {
          hotCloudPlan = "signIn",
          topOnPlan = "signIn",
          activationProbability = 0,
          channel = "",
          buyQuantity = "",
          putPlatform = "",
          remark = "",
        } = item;

        console.log("准备更新渠道配置", channel);

        const update = {
          hotCloudPlan,
          topOnPlan,
          activationProbability,
          buyQuantity,
          putPlatform,
          remark,
        };

        const [err, result] = await to(
          models.channel.update({ channel }, update, { upsert: true })
        );
        if (err) {
          console.log(channel, "中台配置保存错误", err);
        } else {
          console.log("已更新渠道配置", channel);
        }
      }
    } else {
      console.log("已更新渠道配置", body);
    }
  },
  sendRegisterEvent: async (openid, guid, channel, user_register_time) => {
    await sendEvevt({
      openid,
      guid,
      channel,
      user_register_time,
      event_type: "register",
    });
  },
  sendLoginEvent: async (openid, guid, channel, user_register_time) => {
    await sendEvevt({
      openid,
      guid,
      channel,
      user_register_time,
      event_type: "login",
    });
  },
  sendTixianEvent: async (
    openid,
    guid,
    channel,
    value, // 金额
    event_sub_type, // 档次
    user_register_time
  ) => {
    await sendEvevt({
      openid,
      guid,
      channel,
      event_sub_type,
      value,
      user_register_time,
      event_type: "tixian",
    });
  },
};

async function sendEvevt(data = {}) {
  data.event_id = uuidv4();
  data.game = game;
  data.sign = sign(data);
  console.log(data.openid, "中台事件打点", data.event_type, data);
  const { body } = await got.post(pushEventForMiddlePlatformURL, {
    json: data,
    responseType: "json",
  });

  console.log(data.openid, "中台事件打点返回", data.event_type, body);
  return body;
}

let sign = (data) => {
  const key = signKey;
  let _data = Object.assign({}, data);
  delete _data.sign;
  _data.appkey = key;
  let keys = Object.keys(_data).sort();
  let signString = "";
  keys.forEach((i) => {
    if (typeof _data[i] != "object") signString = `${signString}${_data[i]}`;
  });
  console.log(`生成签名内容${signString}`);
  return crypto.createHash("md5").update(signString).digest("hex");
};
