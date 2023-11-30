let fs = require('fs');
let OAuth = require('wechat-oauth');

class Wechat {
	//拿到配置文件里的appid和appSecret
	constructor(appId, appSecret) {
		this.appId = appId;
		this.appSecret = appSecret;
		this.client = new OAuth(
			this.appId,
			this.appSecret,
			this.getToken,
			this.setToken
		);
	}
	//从缓存中获取用户的assets token
	getToken(openid, callback) {
		let file = `runtime/access_token_${openid}.txt`;
		if (!fs.existsSync(file)) {
			return callback(null);
		}
		fs.readFile(file, 'utf8', function (err, txt) {
			if (err) {
				console.log('[wechat] get token err', err);
				return callback(err);
			}
			callback(null, JSON.parse(txt));
		});
	}
	//如果没获取到token就把token设置到缓存中
	setToken(openid, token, callback) {
		let file = `runtime/access_token_${openid}.txt`;
		fs.writeFile(file, JSON.stringify(token), callback);
	}

	//获取用户的accessToken
	getAccessToken(code, callback) {
		this.client.getAccessToken(code, callback);
	}
	//通过openid获取到用户信息
	getUser(openid, callback) {
		this.client.getUser(openid, callback);
	}
	//刷新token todo:可能存在的优化方向：这个值究竟是自己缓存还是第三方依赖会帮忙缓存？有空看一下api文档
	refreshToken(retoken, callback) {
		this.client.refreshAccessToken(retoken, callback);
	}
}

module.exports = Wechat;
