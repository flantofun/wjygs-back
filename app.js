const express = require("express");
const path = require("path");
let async = require("async");
let app = express();
let http = require("http");
let port = normalizePort(process.env.PORT || "7619");
let router = require("./router");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
let counters = require("./libs/id_counters");
let bonusCat = require("./libs/bonus_cats");
let libsWithdraw = require("./libs/withdraw");
let cron = require("./libs/cron");
const middlePlatform = require("./libs/middlePlatform");

//设置跨域访问
app.all("*", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "content-type");
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By", " 3.2.1");
  res.header("Content-Type", "application/json;charset=utf-8");
  if (req.method.toLowerCase() == "options") res.send(200);
  //让options尝试请求快速结束
  else next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(function (error, req, res, next) {
  if (error) {
    console.error("解析错误1111111111", req.path, error);
  } else {
    next();
  }
});
app.use(cookieParser());

router(app);
// console.log(
// 	[
// 		'                   _ooOoo_',
// 		'                  o8888888o',
// 		'                  88" . "88',
// 		'                  (| -_- |)',
// 		'                  O\\  =  /O',
// 		"               ____/`---'\\____",
// 		"             .'  \\\\|     |//  `.",
// 		'            /  \\\\|||  :  |||//  \\',
// 		'           /  _||||| -:- |||||-  \\',
// 		'           |   | \\\\\\  -  /// |   |',
// 		"           | \\_|  ''\\---/''  |   |",
// 		'           \\  .-\\__  `-`  ___/-. /',
// 		"         ___`. .'  /--.--\\  `. . __",
// 		'      ."" \'<  `.___\\_<|>_/___.\'  >\'"".',
// 		'     | | :  `- \\`.;`\\ _ /`;.`/ - ` : | |',
// 		'     \\  \\ `-.   \\_ __\\ /__ _/   .-` /  /',
// 		"======`-.____`-.___\\_____/___.-`____.-'======",
// 		"                   `=---='",
// 		'^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
// 		'         佛祖保佑       永无BUG',
// 	].join('\n')
// );
/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  var addr = server.address();
  var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  console.log("系统启动成功，监听端口：" + bind);
}

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

//格式化日期
Date.prototype.Format = function (fmt) {
  let o = {
    "M+": this.getMonth() + 1, //月份
    "d+": this.getDate(), //日
    "h+": this.getHours(), //小时
    "m+": this.getMinutes(), //分
    "s+": this.getSeconds(), //秒
    S: this.getMilliseconds(), //毫秒
  };
  if (/(y+)/.test(fmt))
    fmt = fmt.replace(
      RegExp.$1,
      (this.getFullYear() + "").substr(4 - RegExp.$1.length)
    );
  for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt))
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length)
      );
  return fmt;
};

// 系统初始化启动
let server = http.Server(app);

async.series(
  {
    idCounters: (done) => {
      console.log("正在进行辅助模块[id生成器]初始化...");
      counters.checkIdCounter(done);
    },
    bonusCat: (done) => {
      console.log("正在进行辅助模块[分红信息]初始化...");
      bonusCat.bonusCat(done);
    },
    cleanVideoCoinsToday: (done) => {
      console.log("正在进行辅助模块[每日经验清零系统]初始化...");
      libsWithdraw.cleanVideoCoinsToday(done);
    },
    runWithdraw: (done) => {
      console.log("正在进行[提现模块]初始化...");
      cron.runWithdraw(done);
    },
    runAdCb: (done) => {
      console.log("正在进行[广告回调]初始化...");
      cron.runAdCb(done);
    },
    runBlackList: (done) => {
      console.log("正在进行[黑名单模块]初始化...");
      cron.runBlackList(done);
    },
    updateChannelConfig: (done) => {
      (async () => {
        console.log("正在进行[获取中台渠道配置]初始化...");
        await middlePlatform.updateChannelConfig();
        done();
      })();
    },
  },
  (err, result) => {
    if (err) console.log("初始化失败:", err);
    else {
      // 监听服务器
      console.log("系统初始化成功，开始启动api监听...");
      server.listen(port);
      server.on("error", onError);
      server.on("listening", onListening);
    }
  }
);
