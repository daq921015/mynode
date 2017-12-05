//supervisor 进程控制路由
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var authority = param.authority;
    var utils = param.utils;
    var _ = param.underscore._;
    var Sequelize = param.Sequelize;
    var async = param.async;
    var logError = param.publicmethod.logError;
    router.get("/getDeployAppServer", function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        var from_data = _.pick(form_fields, "env_name", "group_name", "program_name");
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id),
            authority.getUserTomcatResource(req, 9)
        ]).then(function (data) {
            var menu = data[0];
            var operator = data[1];
            var tomcats = data[2];
            res.render(routeDir + "deployAppServer/index", {
                operator: operator,
                tomcats: tomcats,
                menu: menu,
                title: "程序部署服务器",
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
                var deploy_res_info_where = _.pick(form_fields, 'env_name', 'group_name', "program_name");
                var deploy_app_config_where;
                if (form_fields["search_condition"]) {
                    deploy_app_config_where = {
                        $or: [
                            {alias: {$like: "%" + (form_fields["search_condition"] || "") + "%"}},
                            {host_ip: {$like: "%" + (form_fields["search_condition"] || "") + "%"}}
                        ]
                    }
                }
                var user_id = req.session.user["user_id"] || 0;
                deploy_app_server.findAndCountAll({
                    include: {
                        model: deploy_res_info,
                        required: true,
                        attributes: [
                            Sequelize.literal("`deploy_res_info`.`env_name`"),
                            Sequelize.literal("`deploy_res_info`.`group_name`"),
                            Sequelize.literal("`deploy_res_info`.`program_name`")
                        ],
                        where: deploy_res_info_where,
                        include: {
                            model: deploy_user_res,
                            where: {user_id: user_id, privilege_code: 9},
                            required: true,
                            attributes: []
                        }
                    },
                    where: deploy_app_config_where,
                    limit: ~~form_fields["limit"] || 0,
                    offset: ~~form_fields["offset"] || 0,
                    order: [[deploy_res_info, "group_name", 'asc'], [deploy_res_info, "program_name", 'asc'], "alias"],
                    raw: true
                }).then(function (data) {
                    //手动生成 合并数据列，程序访问地址,测试地址
                    var rows = data["rows"];
                    for (var i = 0, j = rows.length; i < j; i++) {
                        rows[i]["inner_connect_test_path"] = "http://" + rows[i]["host_ip"] + ":" + rows[i]["map_tomcat_port"] + rows[i]["tomcat_path"] + rows[i]["connect_test_path"];
                    }
                    res.end(JSON.stringify({
                        "status": "success",
                        "msg": "",
                        "data": {"total": data["count"], "rows": rows}
                    }));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'add': {
                authority.getUserTomcatResource(req, 9).then(function (data) {
                    res.render(routeDir + "deployAppServer/add", {
                        tomcats: data
                    });
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'edit': {
                deploy_app_server.findOne({
                    include: {
                        model: deploy_res_info,
                        attributes: [
                            Sequelize.literal("`deploy_res_info`.`env_name`"),
                            Sequelize.literal("`deploy_res_info`.`group_name`"),
                            Sequelize.literal("`deploy_res_info`.`program_name`")],
                        required: true
                    },
                    where: {id: ~~form_fields["edit_id"] || 0},
                    attributes: {include: [["id", "edit_id"]]},
                    raw: true
                }).then(function (data) {
                    res.render(routeDir + "deployAppServer/edit", {
                        editData: data
                    });
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'del': {
                deploy_app_server.destroy({'where': {'id': form_fields["del_id"] || 0}}).then(function (result) {
                    res.end(JSON.stringify({"status": "success", "msg": "删除成功。"}));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            default:
                res.end(JSON.stringify({"status": "error", "msg": "the addr of get request is not exist"}));
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
            form_fields["is_disable"] = ~~form_fields["is_disable"];
            switch (action) {
                case 'add': {
                    form_fields["created_by"] = login_name;
                    var deploy_res_info_where = _.pick(form_fields, "env_name", "group_name", "program_name");
                    //找出程序id
                    deploy_res_info.findOne({
                        where: deploy_res_info_where
                    }).then(function (resource) {
                        if (!resource) {
                            return Promise.reject("没有找到对应的程序");
                        } else {
                            form_fields["res_info_id"] = resource.get("id");
                            return deploy_app_server.create(form_fields)
                        }
                    }).then(function (resource) {
                        res.end(JSON.stringify({"status": "success", "msg": "部署服务器添加成功。"}));
                    }).catch(function (err) {
                        res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                    });
                }
                    break;
                case 'edit': {
                    console.log(form_fields);
                    deploy_app_server.update(form_fields, {
                        where: {id: ~~form_fields["edit_id"] || 0}
                    }).then(function (data) {
                        res.end(JSON.stringify({"status": "success", "msg": "部署服务器修改成功"}));
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