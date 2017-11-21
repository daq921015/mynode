//supervisor 进程控制路由
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var async = param.async;
    var utils = param.utils;
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
            res.render(routeDir + "regList", {
                title: "句式查看",
                operator: operator,
                menu: menu,
                resTag: sider_id,
                session: req.session
            });
        }).catch(function (err) {
            res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
        });
    });
    //todo 权限限制，不只需要登录权限还需要判断该用户是否有删除改天数据的权限。
    router.get('/:action', function (req, res, next) {
        var action = req.params.action;
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        switch (action) {
            case 'list': {
                var toutiao_headline_reg_where = {};
                if (form_fields["search_condition"]) {
                    toutiao_headline_reg_where["reg_info"] = {
                        $like: "%" + form_fields["search_condition"].toString() + "%"
                    };
                }
                toutiao_headline_reg.findAndCountAll({
                    where: toutiao_headline_reg_where,
                    limit: ~~form_fields["limit"] || 0,
                    offset: ~~form_fields["offset"] || 0,
                    order: [[form_fields["sortName"] || "created_at", form_fields["sortOrder"] || "desc"]],
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
            case 'add': {
                res.render(routeDir + "regAdd", {});
            }
                break;
            case 'edit': {
                toutiao_headline_reg.findOne({
                    where: {id: ~~form_fields["edit_id"] || 0},
                    raw: true
                }).then(function (data) {
                    res.render(routeDir + "regEdit", {
                        editData: data
                    });
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'del': {
                toutiao_headline_reg.destroy({'where': {'id': form_fields["del_id"] || 0}}).then(function (result) {
                    res.end(JSON.stringify({"status": "success", "msg": "删除成功。"}));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            default:
                res.end(JSON.stringify({"status": "error", "msg": "the addr of get request is not exist。"}));
        }
    }).post("/:action", function (req, res, next) {
        var action = req.params.action;
        async.auto({
            form_data: function (callback) {
                utils.postForm(req, function (err, form_data) {
                    callback(err, form_data);
                });
            }
        }, function (err, results) {
            var form_fields = results["form_data"]["fields"];
            var login_name = req.session.user["login_name"];
            var user_id = req.session.user["user_id"] || 0;
            form_fields["updated_by"] = login_name;
            switch (action) {
                case 'add': {
                    form_fields["created_by"] = login_name;
                    toutiao_headline_reg.create(form_fields).then(function (data) {
                        res.end(JSON.stringify({"status": "success", "msg": "头条句式添加成功。"}));
                    }).catch(function (err) {
                        res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                    });
                }
                    break;
                case 'edit': {
                    toutiao_headline_reg.update(form_fields, {
                        where: {id: ~~form_fields["edit_id"] || 0}
                    }).then(function (data) {
                        res.end(JSON.stringify({"status": "success", "msg": "头条句式修改成功"}));
                    }).catch(function (err) {
                        res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                    });
                }
                    break;
                default:
                    res.end(JSON.stringify({"status": "error", "msg": "the addr of post request is not exist"}));
            }
        });
    });
    return router;
};