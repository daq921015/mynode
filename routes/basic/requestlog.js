//supervisor 进程控制路由
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var utils = param.utils;
    var authority = param.authority;
    var logError = param.publicmethod.logError;
    router.get("/index", function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id)
        ]).then(function (data) {
            var menu = data[0];
            var operator = data[1];
            res.render(routeDir + "requestloglist", {
                title: "请求日志",
                operator: operator,
                menu: menu,
                resTag: sider_id,
                session: req.session
            });
        }).catch(function (err) {
            res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
        });
    });
    router.get('/:action', function (req, res, next) {
        var action = req.params.action;
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        switch (action) {
            case 'list': {
                sys_request_log.findAndCountAll({
                    where: {
                        $or: [
                            {login_name: {$like: "%" + (form_fields["search_condition"] || "") + "%"}},
                            {user_name: {$like: "%" + (form_fields["search_condition"] || "") + "%"}}
                        ]
                    },
                    offset: form_fields["offset"] ? ~~form_fields["offset"] : 0,
                    limit: form_fields["limit"] ? ~~form_fields["limit"] : 0,
                    order: [
                        [form_fields["sortName"] || "created_at", form_fields["sortOrder"] || 'DESC']
                    ],
                    raw: true
                }).then(function (data) {
                    res.end(JSON.stringify({
                        "status": "success",
                        "msg": "",
                        "data": {"total": data["count"], "rows": data["rows"]}
                    }));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            default:
                res.end(JSON.stringify({"status": "error", "msg": "the addr of get request is not exist。"}));
        }
    }).post("/:action", function (req, res, next) {
        res.end(JSON.stringify({"status": "error", "msg": "the addr of post request is not exist。"}));
    });
    return router;
};