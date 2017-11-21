//supervisor 进程控制路由
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var authority = param.authority;
    var async = param.async;
    var path = param.path;
    var _ = param.underscore._;
    var fs = param.fs;
    var utils = param.utils;
    var publicmethod = param.publicmethod;
    var Sequelize = param.Sequelize;
    var logError = param.publicmethod.logError;
    router.get("/getDeployAppConf", function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        var from_data = _.pick(form_fields, "env_name", "group_name", "program_name");
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id),
            authority.getUserTomcatResource(req, 8)
        ]).then(function (data) {
            var menu = data[0];
            var operator = data[1];
            var tomcats = data[2];
            res.render(routeDir + "deployAppConf/index", {
                operator: operator,
                tomcats: tomcats,
                menu: menu,
                title: "程序配置",
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
                            {conf_key: {$like: "%" + (form_fields["search_condition"] || "") + "%"}},
                            {conf_value: {$like: "%" + (form_fields["search_condition"] || "") + "%"}}
                        ]
                    }
                }
                var user_id = req.session.user["user_id"] || 0;
                deploy_app_config.findAndCountAll({
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
                            where: {user_id: user_id, privilege_code: 8},
                            required: true,
                            attributes: []
                        }
                    },
                    // attributes: ["id", "conf_key", "conf_value"],
                    where: deploy_app_config_where,
                    limit: ~~form_fields["limit"] || 0,
                    offset: ~~form_fields["offset"] || 0,
                    order: [[deploy_res_info, "group_name", 'asc'], [deploy_res_info, "program_name", 'asc']],
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
                authority.getUserTomcatResource(req, 8).then(function (data) {
                    res.render(routeDir + "deployAppConf/add", {
                        tomcats: data
                    });
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'edit': {
                deploy_app_config.findOne({
                    include: {
                        model: deploy_res_info,
                        attributes: [
                            Sequelize.literal("`deploy_res_info`.`env_name`"),
                            Sequelize.literal("`deploy_res_info`.`group_name`"),
                            Sequelize.literal("`deploy_res_info`.`program_name`")],
                        required: true
                    },
                    where: {id: ~~form_fields["edit_id"] || 0},
                    raw: true
                }).then(function (data) {
                    res.render(routeDir + "deployAppConf/edit", {
                        editData: data
                    });
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'del': {
                deploy_app_config.destroy({'where': {'id': form_fields["del_id"] || 0}}).then(function (result) {
                    res.end(JSON.stringify({"status": "success", "msg": "删除成功。"}));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'getConfFiles': {
                var appconfdir = path.join(__dirname, '..', '..', 'config', 'tomcat', 'appconf',
                    form_fields["group_name"] + "/" + form_fields["program_name"]);
                publicmethod.getLocalReadDir(appconfdir, function (err, files) {
                    if (err) {
                        logError(err);
                        res.end(JSON.stringify({"status": "success", "msg": "", "data": []}));
                        return;
                    }
                    var extname = ".properties.xml.yml.groovy";
                    var filter_files = {};
                    for (var i = 0, j = files.length; i < j; i++) {
                        if (extname.indexOf(path.extname(files[i])) >= 0) {
                            var file_name = path.basename(files[i]);
                            filter_files[file_name] = files[i];
                        }
                    }
                    res.end(JSON.stringify({"status": "success", "msg": "", "data": filter_files}));
                });
            }
                break;
            case 'readConfFile': {
                var file_path = typeof req.query["file_path"] !== "undefined" && req.query["file_path"].trim() !== "" ? req.query["file_path"].trim() : null;
                if (file_path === null) {
                    res.end("the conf path is not exists");
                    return;
                }
                //读取模板配置
                fs.readFile(file_path, {encoding: 'utf-8'}, function (err, data) {
                    if (err) {
                        logError(err);
                        res.end(logError(err));
                        return;
                    }
                    res.end(data);
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
                            return deploy_app_config.create(form_fields)
                        }
                    }).then(function (resource) {
                        res.end(JSON.stringify({"status": "success", "msg": "程序配置添加成功。"}));
                    }).catch(function (err) {
                        res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                    });
                }
                    break;
                case 'edit': {
                    deploy_app_config.update(form_fields, {
                        where: {id: ~~form_fields["edit_id"] || 0}
                    }).then(function (data) {
                        res.end(JSON.stringify({"status": "success", "msg": "程序配置修改成功"}));
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