const _ = require('lodash');
const fs = require('fs');
const path = require('path');

let loader = (module.exports = {});

let load = (filepath, name, app) => {
    let func = () => {
        return name ? require(filepath + name) : require(filepath);
    };

    return (app && func()(app)) || func();
};

loader.base = __dirname;

loader.loadNames = (dir) => {
    let names = [];
    fs.readdirSync(path.join(__dirname, dir)).forEach((filename) => {
        if (!/\.js$/.test(filename)) return;
        names.push(path.basename(filename, '.js'));
    });
    return names;
};

loader.loadDir = (dir, app) => {
    let patcher = {};

    fs.readdirSync(path.join(__dirname, dir)).forEach((filename) => {
        if (!/\.js$/.test(filename)) return;
        let name = path.basename(filename, '.js');
        let _load = load.bind(null, './' + dir + '/', name, app);

        patcher.__defineGetter__(name, _load);
    });

    return patcher;
};

loader.loadText = (dir) => {
    let file = fs.readFileSync(path.join(__dirname, dir));
    return file.toString();
};
