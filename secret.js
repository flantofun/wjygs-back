module.exports = {
  wechat: {
    appid: "test",
    appsecret: "test",
    mchid: "test",
    mcnsecret: "test",
    kfappid: "test",
    kfappsecret: "test",
  },
  wxcompay: {
    clientIp: "47.114.4.233",
    showName: "虎锐科技",
    wishing: "《创业时代2.0》红包提现",
    mch_id: "test",
    wxkey: "test", //key为在微信商户平台(pay.weixin.qq.com)-->账户设置-->API安全-->密钥设置
    appid: "test", //微信支付app的appid
    // wxappid: 'wxfa6956dbc4c0eb4a', //微信公众号appid
    appsecret: "test", //公众号secret
  },
  sms: {
    accessKeyId: "test",
    accessKeySecret: "test",
    endpoint: "https://dysmsapi.aliyuncs.com",
    apiVersion: "2017-05-25",
    SignName: "虎锐",
    TemplateCode: "test",
    TemplateParam: JSON.stringify({ game: "创业时代2.0" }),
    PhoneNumbers: "17520330821", // 家伟，林成，肖总，培宇
  },
  smsMaxMoneyToday: {
    accessKeyId: "test",
    accessKeySecret: "test",
    endpoint: "https://dysmsapi.aliyuncs.com",
    apiVersion: "2017-05-25",
    SignName: "虎锐",
    TemplateCode: "test",
    TemplateParam: JSON.stringify({ game: "创业时代2.0" }),
    PhoneNumbers: "17520330821", // 家伟，林成，肖总，培宇
  },
};