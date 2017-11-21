//登出控制，清空session中的内容
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    router.get('/', function (req, res, next) {
        req.session.destroy();
        req.session = null;
        res.redirect("/public/index" + "?_=" + Date.now());
    });
    return router;
};