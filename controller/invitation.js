const _ = require("lodash");
const moment = require("moment");
const stringRandom = require("string-random");
const to = require("await-to-js").default;

const {models} = require("../util/mongo_client");

const userM = models.user;
const contributionM = models.contribution;

module.exports = {
    // 邀请码邀请
    masterCode: async (req, res) => {
        const logid = `${stringRandom()}-${req.path}`;

        console.log(logid, "师傅邀请码请求", req.body);
        const {openid, userid, masterCode} = req.body;

        if (_.isNil(openid) || _.isNil(masterCode) || _.isNil(userid)) {
            console.log(logid, "参数错误", req.body);
            return res.send({code: "参数错误"});
        }

        if (+userid == +masterCode) {
            return res.send({code: "邀请失败"});
        }

        let err, userInfo, masterInfo;
        [err, userInfo] = await to(userM.findOne({openid}));
        if (err) {
            console.error(logid, "数据库操作错误", err);
            return res.send({code: "操作失败"});
        }
        if (_.isNil(userInfo)) {
            console.error(logid, userid, "用户不存在", userInfo);
            return res.send({code: "用户不存在"});
        }
        const {master = 0, createdAt} = userInfo;

        if (
            new Date(createdAt).Format("yyyy-MM-dd") !=
            new Date(moment()).Format("yyyy-MM-dd")
        ) {
            console.error(logid, userid, "已过24小时,无法邀请用户", masterInfo);
            return res.send({code: "您已过24小时无法邀请"});
        }

        if (master == 0) {
            userInfo.master = masterCode;
        } else {
            console.error(logid, "已有师傅", master);
            return res.send({code: "已有师傅"});
        }

        [err, masterInfo] = await to(userM.findOne({userid: masterCode}));
        if (err) {
            console.error(logid, "数据错误", err);
            return res.send({code: "操作失败"});
        }
        if (_.isNil(masterInfo)) {
            console.error(logid, userid, "邀请用户不存在", masterInfo);
            return res.send({code: "邀请码错误"});
        }

        const {master: grandMaster = 0, grandMaster: grandGrandMaster = 0} =
            masterInfo;

        masterInfo.invitationTimes++;
        masterInfo.invitationTimesForGrade++;

        if (grandMaster != 0) {
            userInfo.grandMaster = grandMaster;
        }

        if (grandMaster == userid) {
            console.error(logid, "师傅的师傅是自己", master);
            return res.send({code: "玩家无法被邀请"});
        }

        if (grandGrandMaster == userid) {
            console.error(logid, "师傅的师公是自己", master);
            return res.send({code: "玩家无法被邀请"});
        }

        [err] = await to(masterInfo.save());
        if (err) {
            console.error(logid, "数据库操作错误", err);
            return res.send({code: "操作失败"});
        }

        [err] = await to(userInfo.save());

        if (err) {
            console.error(logid, "数据库操作错误", err);
            return res.send({code: "操作失败"});
        }

        return res.send({code: "操作成功"});
    },

    // 我的师傅
    master: async (req, res) => {
        const logid = `${stringRandom()}-${req.path}`;

        console.log(logid, "师傅邀请码请求", req.body);
        const {userid} = req.body;

        if (_.isNil(userid)) {
            console.log(logid, "参数错误", req.body);
            return res.send({code: "参数错误"});
        }

        let err, userInfo, masterInfo;
        [err, userInfo] = await to(userM.findOne({userid}));
        if (err) {
            console.error(logid, "数据库操作错误", err);
            return res.send({code: "操作失败"});
        }
        if (_.isNil(userInfo)) {
            console.error(logid, userid, "用户不存在", userInfo);
            return res.send({code: "用户不存在"});
        }
        const {master = 0} = userInfo;

        if (master == 0) {
            console.error(logid, "无师傅", master);
            return res.send({code: "无师傅"});
        }

        [err, masterInfo] = await to(userM.findOne({userid: master}));
        if (err) {
            console.error(logid, "查询师傅数据错误", err);
            return res.send({code: "操作失败"});
        }
        if (_.isNil(masterInfo)) {
            console.error(logid, userid, "无师傅详细数据", masterInfo);
            return res.send({code: "操作失败"});
        }

        const {name, headImgUrl} = masterInfo;

        return res.send({code: "操作成功", name, headImgUrl, userid: master});
    },

    // 获取徒弟徒孙贡献
    getContributionMap: async (req, res) => {
        const logid = `${stringRandom()}-${req.path}`;
        console.log(logid, "获取徒弟徒孙贡献", req.body);

        const {userid, openid} = req.body;

        if (_.isNil(userid) || _.isNil(openid)) {
            console.log(logid, "参数错误", req.body);
            return res.send({code: "参数错误"});
        }

        const [err, results] = await to(
            Promise.all([
                userM
                    .find(
                        {master: +userid, videoTimes: {$gte: 2}},
                        {_id: 0, name: 1, userid: 1, headImgUrl: 1, masterTodayMoney: 1}
                    )
                    .sort({masterTodayMoney: 1})
                    .limit(3),
                userM
                    .find(
                        {grandMaster: +userid, videoTimes: {$gte: 2}},
                        {
                            _id: 0,
                            name: 1,
                            userid: 1,
                            headImgUrl: 1,
                            grandMasterTodayMoney: 1,
                        }
                    )
                    .sort({grandMasterTodayMoney: 1})
                    .limit(6),
            ])
        );

        if (err) {
            console.error(logid, "操作错误", err);
            return res.send({code: "操作错误"});
        }

        console.log("resultsresults", results);

        const [son, grandson] = results;

        const result = {
            code: "操作成功",
            son,
            grandson,
        };
        console.log(logid, userid, "数据返回", result);
        return res.send(result);
    },

    // 获取贡献列表
    getContributionList: async (req, res) => {
        const logid = `${stringRandom()}-${req.path}`;
        console.log(logid, "获取贡献列表", req.body);

        const {userid} = req.body;

        if (_.isNil(userid)) {
            console.log(logid, "参数错误", req.body);
            return res.send({code: "参数错误"});
        }

        const [err, result] = await to(
            contributionM
                .find({userid}, {_id: 0, time: 1, son: 1, grandson: 1})
                .sort({time: -1})
                .limit(7)
        );

        if (err) {
            console.error(logid, "操作错误", err);
            return res.send({code: "操作错误"});
        }

        return res.send({code: "操作成功", data: result});
    },

    // 把徒弟徒孙贡献加入到存钱罐中
    getContribution: async (req, res) => {
        const logid = `${stringRandom()}-${req.path}`;
        console.log(logid, "一键领取徒弟徒孙的贡献", req.body);

        const {userid, openid} = req.body;

        if (_.isNil(userid) || _.isNil(openid)) {
            console.log(logid, "参数错误", req.body);
            return res.send({code: "参数错误"});
        }

        let err, result;

        [err, result] = await to(models.user.findOne({openid}));

        if (err) {
            console.error(logid, userid, "查询用户失败", err);
            return res.send({code: "操作失败"});
        }

        if (!result) {
            console.log(logid, userid, "用户不存在");
            return res.send({code: "参数错误"});
        }

        let today = new Date(moment()).Format("yyyy-MM-dd");

        let {piggyBank = {}, sonMoney = 0, grandsonMoney = 0} = result;
        if (sonMoney + grandsonMoney <= 0) {
            return res.send({code: "无贡献可领取"});
        }

        let piggyBankTmp = {}

        try {
            piggyBankTmp = JSON.parse(JSON.stringify(piggyBank));
        } catch (e) {
            console.error(logid, userid, "JSONparse错误", e)
        }


        console.log(logid, userid, "存钱罐", piggyBankTmp);

        if (!(today in piggyBankTmp)) {
            piggyBankTmp[today] = 0;
        }

        console.log(logid, userid, "子孙贡献", sonMoney, grandsonMoney);

        piggyBankTmp[today] += sonMoney + grandsonMoney;

        console.log(logid, userid, "存钱罐", piggyBankTmp);

        result.piggyBank = piggyBankTmp;
        result.sonMoney = 0;
        result.grandsonMoney = 0;

        [err] = await to(result.save());
        if (err) {
            console.log(logid, userid, "保存数据错误", err);
            return res.send({code: "操作失败"});
        }

        return res.send({code: "操作成功"});
    },
};
