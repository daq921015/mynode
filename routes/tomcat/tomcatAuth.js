module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var authority = param.authority;
    var utils = param.utils;
    var _ = param.underscore._;
    var Sequelize = param.Sequelize;
    var async = param.async;
    var logError = param.publicmethod.logError;
    router.get("/getTomcatAuth", function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        var from_data = _.pick(form_fields, "env_name", "group_name", "program_name");
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id),
            deploy_res_info.findAll({
                include: {
                    model: deploy_env_config,
                    required: true
                },
                attributes: ["env_name", "group_name", "program_name"],
                raw: true
            })
        ]).then(function (data) {
            var menu = data[0];
            var operator = data[1];
            var tomcats = {};
            _.each(data[2], function (item) {
                if (!_.has(tomcats, item["env_name"])) {
                    tomcats[item["env_name"]] = {};
                }
                if (!_.has(tomcats[item["env_name"]], item["group_name"])) {
                    tomcats[item["env_name"]][item["group_name"]] = [];
                }
                tomcats[item["env_name"]][item["group_name"]].push(item["program_name"]);
            });
            res.render(routeDir + "tomcatAuth/index", {
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
                var sys_user_where;
                if (form_fields["search_condition"]) {
                    sys_user_where = {
                        $or: [
                            {login_name: {$like: "%" + (form_fields["search_condition"] || "") + "%"}},
                            {user_name: {$like: "%" + (form_fields["search_condition"] || "") + "%"}}
                        ]
                    }
                }
                var user_id = req.session.user["user_id"] || 0;
                deploy_user_res.findAndCountAll({
                    include: [{
                        model: deploy_res_info,
                        required: true,
                        attributes: [
                            Sequelize.literal("`deploy_res_info`.`env_name`"),
                            Sequelize.literal("`deploy_res_info`.`group_name`"),
                            Sequelize.literal("`deploy_res_info`.`program_name`")
                        ],
                        where: deploy_res_info_where
                    }, {
                        model: sys_user,
                        required: true,
                        attributes: [
                            Sequelize.literal("`sys_user`.`login_name`"),
                            Sequelize.literal("`sys_user`.`user_name`")
                        ],
                        where: sys_user_where
                    }, {
                        model: deploy_privilege,
                        required: true,
                        attributes: [Sequelize.literal("`deploy_privilege`.`privilege_name`")],
                        where: {privilege_type: 1}
                    }],
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
                Promise.all([
                    deploy_res_info.findAll({
                        include: {
                            model: deploy_env_config,
                            attributes: [],
                            required: true
                        },
                        attributes: ["env_name", "group_name", "program_name"],
                        raw: true
                    }),
                    sys_user.findAll({
                        raw: true,
                        attributes: ["id", "login_name", "user_name"],
                        order: ["login_name"]
                    }),
                    deploy_privilege.findAll({
                        where: {
                            privilege_type: 1
                        },
                        order: ["privilege_code"],
                        attributes: ["privilege_code", "privilege_name"],
                        raw: true
                    })
                ]).then(function (data) {
                    var tomcats = {};
                    _.each(data[0], function (item) {
                        if (!_.has(tomcats, item["env_name"])) {
                            tomcats[item["env_name"]] = {};
                        }
                        if (!_.has(tomcats[item["env_name"]], item["group_name"])) {
                            tomcats[item["env_name"]][item["group_name"]] = [];
                        }
                        tomcats[item["env_name"]][item["group_name"]].push(item["program_name"]);
                    });
                    var users = data[1];
                    var privileges = data[2];
                    res.render(routeDir + "tomcatAuth/add", {
                        tomcats: tomcats,
                        users: users,
                        privileges: privileges
                    });
                });
            }
                break;
            case 'edit': {
                Promise.all([
                    deploy_user_res.findOne({
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
                    }),
                    deploy_privilege.findAll({
                        where: {
                            privilege_type: 1
                        },
                        order: ["privilege_code"],
                        attributes: ["privilege_code", "privilege_name"],
                        raw: true
                    })
                ]).then(function (data) {
                    res.render(routeDir + "tomcatAuth/edit", {
                        editData: data[0],
                        privileges: data[1]
                    });
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'del': {
                deploy_user_res.destroy({'where': {'id': form_fields["del_id"] || 0}}).then(function (result) {
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
                            return deploy_user_res.findOne({
                                where: {
                                    user_id: user_id,
                                    res_info_id: form_fields["res_info_id"],
                                    privilege_code: form_fields["privilege_code"]
                                }
                            })
                        }
                    }).then(function (data) {
                        if (data) {
                            return Promise.reject("该用户已经添加此程序的指定权限，请勿重复添加");
                        } else {
                            return deploy_user_res.create(form_fields);
                        }
                    }).then(function (data) {
                        res.end(JSON.stringify({"status": "success", "msg": "程序权限添加成功。"}));
                    }).catch(function (err) {
                        res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                    });
                }
                    break;
                case 'edit': {
                    deploy_user_res.findOne({
                        where: {
                            user_id: user_id,
                            res_info_id: form_fields["res_info_id"],
                            privilege_code: form_fields["privilege_code"]
                        }
                    }).then(function (data) {
                        if (data) {
                            return Promise.reject("该用户已经添加此程序的指定权限，请勿重复添加");
                        } else {
                            return deploy_user_res.update(form_fields, {
                                where: {id: ~~form_fields["edit_id"] || 0}
                            })
                        }
                    }).then(function (data) {
                        res.end(JSON.stringify({"status": "success", "msg": "程序权限修改成功"}));
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