const _ = require("lodash");
const file = require("../files/index");

let cashlevel_all = require("../files/cashlevel_all.json");
let system = require("../files/System.json");

module.exports = {
  //对时
  getTime: (req, res) => {
    return res.send({ time: new Date() });
  },
  cashlevel_all: (req, res) => {
    if (cashlevel_all) return res.send({ code: "操作成功", cashlevel_all });
    else res.send({ code: "操作失败", cashlevel_all });
  },

  system: (req, res) => {
    if (system) return res.send({ code: "操作成功", system });
    else res.send({ code: "操作失败", RECORDS: null });
  },

  file: (req, res) => {
    const { fileName } = req.params;

    if (_.isNil(fileName)) {
      console.log("请求文件参数错误");
      return res.send({ code: "参数错误" });
    }

    console.log("文件名", fileName);

    if (!file[fileName]) {
      console.log("文件不存在");
      return res.send({ code: "参数错误" });
    }

    if (!file[fileName].RECORDS) {
      return res.send({ code: "操作成功", data: file[fileName] });
    }

    return res.send({ code: "操作成功", data: file[fileName].RECORDS });
  },
};
