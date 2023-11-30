let config = require('../secret')
let request = require('request')
let xml2js = require('xml2js')
let fs = require('fs')
let https = require('https')
const { models } = require('../util/mongo_client')

let fnCreateXml = function (json) {
  let _xml = ''
  for (let key in json) {
    _xml += '<' + key + '>' + json[key] + '</' + key + '>'
  }
  return _xml
}

/*

生成url串用于微信md5校验

*/

let fnCreateUrlParam = function (json) {
  let _str = ''
  let _arr = []
  for (let key in json) {
    _arr.push(key + '=' + json[key])
  }
  return _arr.join('&')
}

/*

生成微信红包数据

*/

let fnGetWeixinBonus = function (option) {
  let amount = option.amount, //红包总金额 例：100
    openid = option.openid, //红包发送的目标用户 例：'opVfe0pFBNN65Dn-PE_SEEjr0MHY'
    system = option.system
  let now = new Date()
  let showName = config.wxcompay.showName
  let clientIp = config.wxcompay.clientIp
  let desc = system + config.wxcompay.wishing
  let mch_id = config.wxcompay.mch_id
  let mch_appid = config.wxcompay.appid,
    wxkey = config.wxcompay.wxkey
  let date_time =
    now.getFullYear() + '' + (now.getMonth() + 1) + '' + now.getDate()
  let date_no = (now.getTime() + '').substr(-8) //生成8为日期数据，精确到毫秒
  let random_no = Math.floor(Math.random() * 99)

  if (random_no < 10) {
    //生成位数为2的随机码

    random_no = '0' + random_no
  }

  let nonce_str = Math.random().toString(36).substr(2, 15)
  let partner_trade_no = mch_id + date_time + date_no + random_no
  let xmlTemplate = '<xml>{content}</xml>'
  let contentJson = {}

  contentJson.amount = amount // '100';
  contentJson.check_name = 'NO_CHECK' // '强制验证名字';FORCE_CHECK
  contentJson.desc = desc //'恭喜发财';
  contentJson.mch_appid = mch_appid //商户appid
  contentJson.mchid = mch_id
  contentJson.nonce_str = nonce_str
  contentJson.openid = openid // 'opVfe0v30XbCW7LE2j-7ruENJFS0'; //openid // 'onqOjjmM1tad-3ROpncN-yUfa6uI';
  contentJson.partner_trade_no = partner_trade_no //订单号为 mch_id + yyyymmdd+10位一天内不能重复的数字; //+201502041234567893';

  // contentJson.re_user_name = showName;

  contentJson.spbill_create_ip = clientIp
  contentJson.key = wxkey
  let contentStr = fnCreateUrlParam(contentJson)
  console.log('content=' + contentStr)
  let crypto = require('crypto')
  contentJson.sign = crypto
    .createHash('md5')
    .update(contentStr, 'utf8')
    .digest('hex')
    .toUpperCase()

  // //生成sign

  // contentJson.sign = paysign(mch_appid, mch_id, nonce_str, partner_trade_no, openid, clientIp, "NO_CHECK",amount,desc);

  //删除 key (key不参与签名)

  delete contentJson.key
  let xmlData = fnCreateXml(contentJson)
  let sendData = '<xml>' + xmlData + '</xml>' //_xmlTemplate.replace(/{content}/)
  return sendData
  console.log('xml=' + sendData)
}

function paysign (
  mch_appid,
  mch_id,
  nonce_str,
  partner_trade_no,
  openid,
  clientIp,
  amount,
  desc
) {
  let ret = {
    mch_appid: mch_appid,
    mchid: mch_id,
    nonce_str: nonce_str,
    partner_trade_no: partner_trade_no,
    openid: openid,
    spbill_create_ip: clientIp,
    check_name: 'NO_CHECK',
    amount: amount,
    desc: desc,
  }

  let string = raw(ret)
  let key = config.wxcompay.wxkey //微信商户密钥
  string = string + '&key=' + key //key为在微信商户平台(pay.weixin.qq.com)-->账户设置-->API安全-->密钥设置
  let crypto = require('crypto')
  let sign = crypto.createHash('md5').update(string, 'utf8').digest('hex')
  return sign.toUpperCase()
}

function raw (args) {
  let keys = Object.keys(args)
  keys = keys.sort()
  let newArgs = {}

  keys.forEach(function (key) {
    newArgs[key.toLowerCase()] = args[key]
  })

  let string = ''

  for (let k in newArgs) {
    string += '&' + k + '=' + newArgs[k]
  }

  string = string.substr(1)
  console.log(string)

  return string
}

//微信企业支付到零钱

exports.wxcompay = function (openid, userid, amount, system, timesForWithdrawGrade, withdrawSuccessCount, channel = null, callback) {
  // https://api.mch.weixin.qq.com/mmpaymkttransfers/promotion/transfers

  let host = 'api.mch.weixin.qq.com'
  let path = '/mmpaymkttransfers/promotion/transfers'
  let opt = {
    host: host,
    port: '443',
    method: 'POST',
    path: path,
    key: fs.readFileSync('./cert/apiclient_key.pem'), //将微信生成的证书放入 cert目录下
    cert: fs.readFileSync('./cert/apiclient_cert.pem'),
  }

  let body = ''
  opt.agent = new https.Agent(opt)

  let req = https
    .request(opt, function (res) {
      console.log('[wxcompay]Got response: ' + res.statusCode)

      res.on('data', function (d) {
        body += d
      }).on('end', function () {
        //console.log(res.headers);
        console.log('[wxcompay]微信返回消息')
        console.log(body)

        let parser = new xml2js.Parser({
          trim: true,
          explicitArray: false,
          explicitRoot: false,
        }) //解析签名结果xml转json

        parser.parseString(body, function (err, result) {
          if (typeof callback == 'function') {
            let success =
              result['result_code'] == 'SUCCESS' ? true : false
            models.withdraw.create(
              {
                channel,
                openid,
                userid,
                amount,
                success,
                fail_msg: result['return_msg'] || '',
                partner_trade_no: result['partner_trade_no'],
                payment_no: result['payment_no'],
                err_code_des: result['err_code_des'] || '',
                timesForLevel: timesForWithdrawGrade || 0,
                timesForUser: withdrawSuccessCount || 0
              },
              (err) => {
                if (err)
                  console.log(
                    '[wxcompay]提现记录入库失败！：',
                    openid,
                    userid,
                    amount,
                    success,
                    'partner_trade_no:' +
                    result['partner_trade_no'],
                    'payment_no:' + result['payment_no'],
                    'err_code_des' + result['err_code_des']
                  )
              }
            )
            callback(err, {
              return_code: result['return_code'],
              return_msg: result['return_msg'],
              result_code: result['result_code'],
              err_code_des: result['err_code_des'],
            })
          }
        })
      })
    })
    .on('error', function (e) {
      console.log('[wxcompay]微信请求 error: ' + e.message)
    })

  let option = { amount, openid, system }
  let sendData = fnGetWeixinBonus(option)

  req.write(sendData)
  req.end()
}
