/*
 * 环境权限
 * create_ty:liubanglong
 * Time:2017-10-09
 * */
//supervisor 进程控制路由
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var utils = param.utils;
    var _ = param.underscore._;
    var Sequelize = param.Sequelize;
    var authority = param.authority;
    var async = param.async;
    var logError = param.publicmethod.logError;
    router.get("/getEnvAuth", function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id),
            deploy_env_config.findAll({
                raw: true,
                attributes: ["env_name"],
                order: ["env_name"]
            }),
            deploy_privilege.findAll({
                where: {
                    privilege_type: 2
                },
                order: ["privilege_code"],
                attributes: ["privilege_code", "privilege_name"],
                raw: true
            })
        ]).then(function (data) {
            var menu = data[0];
            var operator = data[1];
            var envs = _.pluck(data[2], 'env_name');
            var privileges = data[3];
            res.render(routeDir + "envAuth/index", {
                privileges: privileges,
                envs: envs,
                operator: operator,
                menu: menu,
                title: "程序配置",
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
                var deploy_user_env_where = _.pick(form_fields, 'env_name');
                var sys_user_where = {};
                if (_.has(form_fields, "search_condition")) {
                    sys_user_where["$or"] = [
                        {login_name: {$like: "%" + (form_fields["search_condition"] || "") + "%"}},
                        {user_name: {$like: "%" + (form_fields["search_condition"] || "") + "%"}}
                    ];
                }
                if (_.has(form_fields, "privilege_code")) {
                    deploy_user_env_where["privilege_code"] = form_fields["privilege_code"];
                }
                var user_id = req.session.user["user_id"] || 0;
                deploy_user_env.findAndCountAll({
                    include: [{
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
                        where: {privilege_type: 2}
                    }],
                    where: deploy_user_env_where,
                    limit: ~~form_fields["limit"] || 0,
                    offset: ~~form_fields["offset"] || 0,
                    order: [[sys_user, "login_name", 'asc'],"env_name","privilege_code"],
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
                    deploy_env_config.findAll({
                        raw: true,
                        attributes: ["env_name"],
                        order: ["env_name"]
                    }),
                    sys_user.findAll({
                        raw: true,
                        attributes: ["id", "login_name","user_name"],
                        order: ["login_name"]
                    }),
                    deploy_privilege.findAll({
                        where: {
                            privilege_type: 2
                        },
                        order: ["privilege_code"],
                        attributes: ["privilege_code", "privilege_name"],
                        raw: true
                    })
                ]).then(function (data) {
                    var envs = _.pluck(data[0], 'env_name');
                    var users = data[1];
                    var privileges = data[2];
                    res.render(routeDir + "envAuth/add", {
                        envs: envs,
                        users: users,
                        privileges: privileges
                    });
                });
            }
                break;
            case 'edit': {
                Promise.all([
                    deploy_user_env.findOne({
                        where: {id: ~~form_fields["edit_id"] || 0},
                        attributes: {include: [["id", "edit_id"]]},
                        raw: true
                    }),
                    deploy_privilege.findAll({
                        where: {
                            privilege_type: 2
                        },
                        order: ["privilege_code"],
                        attributes: ["privilege_code", "privilege_name"],
                        raw: true
                    })
                ]).then(function (data) {
                    res.render(routeDir + "envAuth/edit", {
                        editData: data[0],
                        privileges: data[1]
                    });
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'del': {
                deploy_user_env.destroy({'where': {'id': form_fields["del_id"] || 0}}).then(function (result) {
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
                    const deploy_user_env_where = _.pick(form_fields, "user_id", "env_name", "privilege_code");
                    //查询该用户该环境是否已经设置权限
                    deploy_user_env.findOne({where: deploy_user_env_where}).then(function (data) {
                        if (data) {
                            return Promise.reject("该用户已经添加此环境的指定权限，请勿重复添加");
                        } else {
                            return deploy_user_env.create(form_fields);
                        }
                    }).then(function (data) {
                        res.end(JSON.stringify({"status": "success", "msg": "环境权限添加成功。"}));
                    }).catch(function (err) {
                        res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                    });
                }
                    break;
                case 'edit': {
                    const deploy_user_env_where = _.pick(form_fields, "user_id", "env_name", "privilege_code");
                    deploy_user_env.findOne({where: deploy_user_env_where}).then(function (data) {
                        if (data) {
                            return Promise.reject("该用户已经添加此环境的指定权限，请勿重复添加");
                        } else {
                            return Promise.resolve();
                        }
                    }).then(function (data) {
                        return deploy_user_env.update(form_fields, {
                            where: {id: ~~form_fields["edit_id"] || 0}
                        })
                    }).then(function (data) {
                        res.end(JSON.stringify({"status": "success", "msg": "环境权限修改成功"}));
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