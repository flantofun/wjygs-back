module.exports = {
  wechat: {
    appid: "wx86aee56017aeec46",
    appsecret: "d7dbc969ddc4a734cc1a4ae44430c0ab",
    mchid: "test",
    mcnsecret: "test",
    kfappid: "test",
    kfappsecret: "test",
  },
  wxcompay: {
    clientIp: "47.114.4.233",
    showName: "虎锐科技",
    wishing: "《创业时代2.0》红包提现",
    mch_id: "1601743953",
    wxkey: "QwEr1TyUi2IoP3ZxC4VbNm5AsDfGhJkL", //key为在微信商户平台(pay.weixin.qq.com)-->账户设置-->API安全-->密钥设置
    appid: "wx86aee56017aeec46", //微信支付app的appid
    // wxappid: 'wxfa6956dbc4c0eb4a', //微信公众号appid
    appsecret: "d7dbc969ddc4a734cc1a4ae44430c0ab", //公众号secret
  },
  sms: {
    accessKeyId: "LTAI4GK4CGGPEG7jQ7gsQL8o",
    accessKeySecret: "zjvb3is3hKqk1LDOu8z5JGxse6VOVY",
    endpoint: "https://dysmsapi.aliyuncs.com",
    apiVersion: "2017-05-25",
    SignName: "虎锐",
    TemplateCode: "SMS_209162952",
    TemplateParam: JSON.stringify({ game: "创业时代2.0" }),
    PhoneNumbers: "15920075096,17520330821,13724389777,18565430412", // 家伟，林成，肖总，培宇
  },
  smsMaxMoneyToday: {
    accessKeyId: "LTAI4GK4CGGPEG7jQ7gsQL8o",
    accessKeySecret: "zjvb3is3hKqk1LDOu8z5JGxse6VOVY",
    endpoint: "https://dysmsapi.aliyuncs.com",
    apiVersion: "2017-05-25",
    SignName: "虎锐",
    TemplateCode: "SMS_211486089",
    TemplateParam: JSON.stringify({ game: "创业时代2.0" }),
    PhoneNumbers: "15920075096,17520330821,13724389777,18565430412", // 家伟，林成，肖总，培宇
  },
};