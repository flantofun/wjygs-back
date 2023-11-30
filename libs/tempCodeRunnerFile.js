const got = require("got");
const _ = require("lodash");
const to = require("await-to-js");
const { models } = require("../util/mongo_client");

const getChannelInfoURL =
  "http://center.5188youxi.com:9000/api/v1/channel/getList";

(async () => {
  const { body } = await got.post(getChannelInfoURL, {
    json: {
      game: "cysd2dot0",
    },
    responseType: "json",
  });

  if (!_.isNil(body.data) && body.data.length > 0) {
    for await (let item of body.data) {
      const {
        hotCloudPlan = "signIn",
        topOnPlan = "signIn",
        activationProbability = 0,
        channel = "",
        buyQuantity = "",
        putPlatform = "",
        remark = "",
      } = body.data;

      const update = {
        hotCloudPlan,
        topOnPlan,
        activationProbability,
        buyQuantity,
        putPlatform,
        remark,
      };

      console.log(channel, "中台请求渠道配置", update);
      const [err, result] = await to(
        models.channel.update({ channel }, update, { upsert: true })
      );
      if (err) {
        console.log(channel, "中台配置保存错误", err);
      }
    }
  }
})();

// module.exports = {
//   getChannelInfo: () => {},
//   sendEvent: (data) => {},
// };
