//登录控制
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var utils = param.utils;
    var authority = param.authority;
    var async = param.async;
    var logError = param.publicmethod.logError;
    var logInfo = param.publicmethod.logInfo;
    router.get('/', function (req, res, next) {
        if (!req.session.islogin) {
            res.render(routeDir + "login", {
                title: "登录页",
                session: req.session
            });
        } else {
            res.redirect("/public/index" + "?_=" + Date.now());
        }
    }).post('/', function (req, res, next) {
        var loginName = typeof req.body.name !== "undefined" && req.body.name.trim() !== "" ? req.body.name.trim() : null;
        var loginPwd = typeof req.body.pwd !== "undefined" && req.body.pwd.trim() !== "" ? req.body.pwd.trim() : null;
        logInfo("开始登陆系统----loginName=" + loginName + ",loginPwd=" + loginPwd);
        //用户登录成功，设置session信息后重定向到首页
        async.waterfall([
            function (callback) {
                if (loginName === null || loginPwd === null) {
                    callback(new Error("登录失败:登录名或密码不能为空！"));
                } else {
                    callback(null);
                }
            },
            function (callback) {
                //获取登录用户信息
                sys_user.findOne({
                    where: {
                        login_name: loginName,
                        login_pwd: loginPwd,
                        status: 0
                    }
                }).then(function (data) {
                    if (!data) {
                        return Promise.reject("用户名或密码不正确");
                    } else {
                        data.last_login_ip = utils.getClientIp(req).replace(/[^,\.\d]/g, "").split(",")[0];
                        data.last_login_time = new Date();
                        return data.save();
                    }
                }).then(function (data) {
                    callback(null, data.dataValues);
                }).catch(function (err) {
                    callback(err);
                });
            }, function (data, callback) {
                /*
                 * 登录白名单黑名单限制
                 * */
                if (!data) {
                    callback(new Error("登录失败:用户名或密码错误"));
                    return;
                }
                var white_list_str = data["white_list"];
                var black_list_str = data["black_list"];
                //最初请求真实ip（客户端ip）(反向代理注意设置real_ip头)
                var client_ip = utils.getClientIp(req).replace(/[^\.\d]/g, "").split(",")[0];
                var host_domain = req.hostname;//请求主机 域名/ip（服务端地址）
                //不设置白名单默认不允许登录
                if (typeof white_list_str === "object" || (typeof white_list_str === "string" && white_list_str.trim() === "")) {
                    callback(new Error("登录地点不被允许，登录失败"));
                    return;
                }
                //登录黑名单过滤，只要有一条满足就不允许登录
                if (typeof black_list_str === "string" && black_list_str.trim() !== "") {
                    //获取黑名单多条规则数组
                    var black_list = black_list_str.split(",");
                    for (var i = 0, j = black_list.length; i < j; i++) {
                        var regBlack = new RegExp(black_list[i]);
                        if (regBlack.test(client_ip)) {
                            callback(new Error("登录地点被加入黑名单，登录失败"));
                            return;
                        }
                    }
                }
                //白名单特殊设置 白名单中含有完整主机域名\ip的通过
                var regHost = new RegExp(host_domain);
                if (!regHost.test(white_list_str)) {
                    //获取黑名单多条规则数组
                    var pass = 1;
                    var white_list = white_list_str.split(",");
                    for (var i = 0, j = white_list.length; i < j; i++) {
                        var regWhite = new RegExp(white_list[i]);
                        var reg_result = client_ip.match(regWhite, "g");
                        if (!reg_result) {
                            continue;
                        }
                        if (reg_result[0] == client_ip) {
                            pass = 0;
                            break;
                        }
                    }
                    if (pass == 1) {
                        callback(new Error("登录地点未被允许，登录失败"));
                        return;
                    }
                }
                //登录成功设置用户信息到session
                var user = data;
                user["user_id"] = user["id"];
                req.session.user = user;
                req.session.islogin = true;

                callback(null);
            }
        ], function (err, result) {
            if (err) {
                res.render(routeDir + "login", {
                    error: logError(err),
                    title: "登录页",
                    session: req.session
                });
                return;
            }
            logInfo("系统登录成功----loginName=" + loginName + ",loginPwd=" + loginPwd);
            res.redirect("/public/index" + "?_=" + Date.now());
        });
    });
    return router;
};









