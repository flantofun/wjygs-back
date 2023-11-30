const crypto = require("crypto");
let configs = require("../configs");
let reverse = (str) => {
  return str.split("").reverse().join("");
};

/**
 * 生成sign
 * @param data 生成sign的数据(参数加key进去从小到大排序，然后md5，把结果反序再md5)
 */

let getSign = (data, key, wxKey) => {
  _data = Object.assign({}, data);
  delete _data.sign;

  _data.appkey = key;
  _data.wxKey = wxKey;

  let keys = Object.keys(_data).sort();

  let signString = "";
  keys.forEach((i) => {
    signString = `${signString}${_data[i]}`;
  });
  // console.log(`生成签名内容${signString}`);
  let md5First = crypto.createHash("md5").update(signString).digest("hex");
  let reverseMd5 = reverse(md5First);
  return crypto.createHash("md5").update(reverseMd5).digest("hex");
};

let getSignLast = (data, key, wxKey) => {
  _data = Object.assign({}, data);
  delete _data.sign;

  _data.appkey = key;
  _data.wxKey = wxKey;

  let keys = Object.keys(_data).sort();

  let signString = "";
  keys.forEach((i) => {
    signString = `${signString}${_data[i]}`;
  });
  // console.log(`生成签名内容${signString}`);
  // let md5First = crypto.createHash('md5').update(signString).digest('hex')
  // let reverseMd5 = reverse(md5First)
  return crypto.createHash("md5").update(signString).digest("hex");
};

let checkSign = (data) => {
  let realSign = getSign(data, configs.appkey, configs.wxKey);
  // console.log('签名对比：', realSign, data.sign, realSign == data.sign);
  if (realSign == data.sign) return true;
  return false;
};

let checkSignLast = (data) => {
  let realSign = getSignLast(data, configs.appkey, configs.wxKey);
  // console.log('签名对比：', realSign, data.sign, realSign == data.sign);
  if (realSign == data.sign) return true;
  return false;
};

let getSDKSign = (lockingKey, sdkkey) => {
  // 1 凭证计算md5
  let lockingKeyMd5 = crypto
    .createHash("md5")
    .update(lockingKey + "")
    .digest("hex");
  // 2 sdk盐计算md5
  let sdkkeyMd5 = crypto.createHash("md5").update(sdkkey).digest("hex");
  // 3 反序sdk盐的md5
  let reverseSdkkeyMd5 = reverse(sdkkeyMd5);
  // 4 凭证md5拼接反序sdk盐md5的结果，再计算md5
  let realKey = crypto
    .createHash("md5")
    .update(`${lockingKeyMd5}${reverseSdkkeyMd5}`)
    .digest("hex");
  // 返回结果用于比对
  return realKey;
};

let checkSDKSign = (data) => {
  let realKey = getSDKSign(data.lockingKey, configs.sdkkey);
  if (realKey == data.sdkKey) return true;
  return false;
};

module.exports = {
  getSign,
  checkSignLast,
  checkSign,
  checkSDKSign,
};
