/**
 * Created by Administrator on 2017-08-20.
 */
//tomcat部署
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var authority = param.authority;
    var _ = param.underscore._;
    var utils = param.utils;
    var logError = param.publicmethod.logError;
    router.get("/getDeployAppHistory", function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        var from_data = _.pick(form_fields, "env_name", "group_name", "program_name");
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id),
            authority.getUserTomcatResource(req, 7)
        ]).then(function (data) {
            var menu = data[0];
            var operator = data[1];
            var tomcats = data[2];
            res.render(routeDir + "deployAppHistory/index", {
                operator: operator,
                tomcats: tomcats,
                menu: menu,
                title: "部署历史",
                resTag: sider_id,
                session: req.session,
                from_data: from_data
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
                var deploy_app_history_where = _.pick(form_fields, 'env_name', 'group_name', "program_name");
                if (form_fields["search_condition"]) {
                    deploy_app_history_where["$or"] = [
                        {host_ip: {$like: "%" + (form_fields["search_condition"] || "") + "%"}},
                        {host_alias: {$like: "%" + (form_fields["search_condition"] || "") + "%"}},
                        {user_name: {$like: "%" + (form_fields["search_condition"] || "") + "%"}}
                    ]
                }
                if (form_fields["start_time"] && form_fields["end_time"]) {
                    deploy_app_history_where["deploy_time"] = {
                        "$between": [form_fields["start_time"], form_fields["end_time"]]
                    }
                }
                var user_id = req.session.user["user_id"] || 0;
                deploy_app_history.findAndCountAll({
                    include: {
                        model: deploy_user_res,
                        attributes: [],
                        required: true,
                        where: {user_id: user_id, privilege_code: 7}
                    },
                    where: deploy_app_history_where,
                    order: [[form_fields["sortName"] || "deploy_time", form_fields["sortOrder"] || 'desc']],
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
                res.end(JSON.stringify({"status": "error", "msg": "the addr of get request is not exist"}));
        }
    }).post("/:action", function (req, res, next) {
        res.end(JSON.stringify({"status": "error", "msg": "the addr of post request is not exist。"}));
    });
    return router;
};
