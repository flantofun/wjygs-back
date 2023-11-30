const middlePlatform = require("../libs/middlePlatform");

module.exports = {
  // 更新渠道数据
  channelUpdateHook: async (req, res) => {
    console.log("「中台回调」更新渠道数据");
    res.send({
      code: 0,
    });

    await middlePlatform.updateChannelConfig();
  },
};
