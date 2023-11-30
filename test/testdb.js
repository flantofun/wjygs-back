let { models } = require("../util/mongo_client");
const mongoose = require("mongoose");

models.user
  .findOneAndUpdate(
    {
      userid: 999,
    },
    {
      $inc: {
        [`datas.${[2]}`]: 1,
      },
    }
  )
  .exec((err, res) => {
    console.log("err, res", err, res);
  });
