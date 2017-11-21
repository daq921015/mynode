//注册控制
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    router.get('/', function (req, res, next) {
        res.render(routeDir + "register", {
            title: "注册页",
            session: req.session
        })
    }).post('/', function (req, res, next) {
        res.end("over");
    });
    return router;
};