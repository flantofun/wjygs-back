const mongoose = require('mongoose');
const configs = require('../configs');
const { loadDir } = require('../loader');

mongoose.Promise = require('bluebird');

let catConfig = configs.db.cat;
let catdb = mongoose.createConnection(catConfig.name, catConfig.opts);

module.exports = {
    models: loadDir('models'),
    catdb,
};
