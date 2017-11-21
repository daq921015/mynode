//首页
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var logError = param.logError;
    var authority = param.authority;
    var utils = param.utils;
    router.get('/', function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        if (!req.session.islogin) {
            res.redirect("/public/login" + "?_=" + Date.now());
        } else {
            Promise.all([
                //菜单栏
                authority.getUserSiderMenu(req),
                authority.getUserOperator(req, sider_id)
            ]).then(function (data) {
                var menu = data[0];
                var operator = data[1];

                var user_id = req.session.user["user_id"];
                res.render("home/homePage", {
                    title: "程序配置",
                    operator: operator,
                    menu: menu,
                    resTag: sider_id,
                    session: req.session
                });
            }).catch(function (err) {
                res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
            });
        }
    });
    return router;
};
