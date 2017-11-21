//supervisor 进程控制路由
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var authority = param.authority;
    var async = param.async;
    var utils = param.utils;
    var _ = param.underscore._;
    var Sequelize = param.Sequelize;
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
            res.render(routeDir + "user/index", {
                title: "用户",
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
                sys_user.findAndCountAll({
                    where: {
                        $or: [
                            {login_name: {$like: "%" + (form_fields["search_condition"] || "") + "%"}},
                            {tel: {$like: "%" + (form_fields["search_condition"] || "") + "%"}}
                        ]
                    },
                    offset: form_fields["offset"] ? ~~form_fields["offset"] : 0,
                    limit: form_fields["limit"] ? ~~form_fields["limit"] : 0,
                    order: [
                        [form_fields["sortName"] || "last_login_time", form_fields["sortOrder"] || 'DESC']
                    ],
                    raw: true
                }).then(function (data) {
                    res.end(JSON.stringify({
                        "status": "success",
                        "msg": "",
                        "data": {total: data["count"], rows: data["rows"]}
                    }));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'add': {
                res.render(routeDir + "user/add");
            }
                break;
            case 'edit': {
                sys_user.findById(form_fields["edit_id"] || 0, {raw: true}).then(function (user) {
                    if (!user) {
                        return Promise.reject("获取修改数据失败")
                    } else {
                        res.render(routeDir + "user/edit", {
                            editUser: user
                        });
                    }
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'del': {
                sys_user.destroy({'where': {'id': form_fields["del_id"] || 0}}).then(function (data) {
                    if (data === 1) {
                        return Promise.reject("删除失败");
                    } else {
                        res.end(JSON.stringify({"status": "success", "msg": "删除成功。"}));
                    }
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'authority': {
                async.parallel([
                    //所有权限
                    function (callback) {
                        sys_resource.findAll({
                            attributes: ["id", ["parent_id", "pId"], ["res_name", "name"], [Sequelize.literal("0"), "open"], [Sequelize.literal("0"), "checked"]],
                            raw: true,
                            order: ["order"]
                        }).then(function (sys_resources) {
                            callback(null, sys_resources);
                        }).catch(function (err) {
                            callback(err);
                        });
                    },
                    //用户权限
                    function (callback) {
                        sys_resource.findAll({
                            include: [{
                                model: sys_user_resource,
                                attributes: [],
                                where: {user_id: form_fields["edit_id"]}
                            }],
                            attributes: ["id", ["parent_id", "pId"], ["res_name", "name"], [Sequelize.literal("0"), "open"], [Sequelize.literal("1"), "checked"]],
                            raw: true
                        }).then(function (sys_resources) {
                            callback(null, sys_resources);
                        }).catch(function (err) {
                            callback(err);
                        });
                    }
                ], function (err, results) {
                    if (err) {
                        var err_msg = logError(err);
                        res.end(JSON.stringify({"status": "error", "msg": err_msg}));
                        return;
                    }
                    var all_auth = results[0];
                    var user_auth = results[1];
                    var user_uni_id = [];
                    for (var i = 0, j = user_auth.length; i < j; i++) {
                        user_uni_id.push(user_auth[i]["id"]);
                    }
                    for (var i = 0, j = all_auth.length; i < j; i++) {
                        if (_.indexOf(user_uni_id, all_auth[i]["id"]) >= 0) {
                            all_auth[i]["checked"] = 1;
                        }
                    }
                    res.render(routeDir + "user/authority", {
                        auth_list: JSON.stringify(all_auth)
                    });
                });
            }
                break;
            case 'setEnvAuth': {
                const user_id = form_fields["edit_id"] || 0;
                var envs, priviges, user_privileges = {};
                //获取环境信息
                deploy_env_config.findAll({
                    attributes: ["id", ["env_name", "name"]],
                    raw: true
                }).then(function (data) {
                    //获取环境所有权限
                    envs = data;
                    return deploy_privilege.findAll({
                        where: {
                            privilege_type: 2
                        },
                        attributes: ["id", "privilege_code", ["privilege_name", "name"]],
                        raw: true
                    })
                }).then(function (data) {
                    priviges = data;
                    //获取用户已有环境权限
                    return deploy_user_env.findAll({
                        where: {
                            user_id: user_id
                        },
                        attributes: [["env_name", "name"], "privilege_code"],
                        raw: true
                    });
                }).then(function (data) {
                    //用户已有环境权限
                    _.each(data, function (item) {
                        if (!_.has(user_privileges, item["name"])) {
                            user_privileges[item["name"]] = [item["privilege_code"]];
                        } else {
                            user_privileges[item["name"]].push(item["privilege_code"]);
                        }
                    });
                    //组合 环境、所有权限和用户已有权限
                    _.each(envs, function (env) {
                        if (!_.has(user_privileges, env["name"])) {
                            env["children"] = priviges;
                        } else {
                            env["checked"] = 1;
                            for (var i = 0, j = priviges.length; i < j; i++) {
                                if (!_.has(env, "children")) {
                                    env["children"] = [];
                                }
                                //必须克隆(浅)
                                const clone = _.clone(priviges[i]);
                                env["children"].push(clone);
                                if (_.contains(user_privileges[env["name"]], priviges[i]["privilege_code"])) {
                                    env["children"][i]["checked"] = 1;
                                }
                            }
                        }
                    });
                    //二级权限中加入环境名（深度克隆）
                    var env_auth = JSON.parse(JSON.stringify(envs));
                    _.each(env_auth, function (env) {
                        if (_.has(env, "children")) {
                            _.each(env["children"], function (item) {
                                item["env_name"] = env["name"];
                                item["user_id"] = user_id;
                            })
                        }
                    });
                    return Promise.resolve(env_auth);
                }).then(function (data) {
                    res.render(routeDir + "user/setEnvAuth", {
                        auth_list: JSON.stringify(data)
                    });
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'setTomcatAuth': {
                const user_id = form_fields["edit_id"] || 0;
                var programs, priviges, user_privileges = {};
                //获取所有程序
                deploy_res_info.findAll({
                    include: {
                        model: deploy_env_config,
                        attributes: [],
                        required: true
                    },
                    attributes: [["id", "res_info_id"], "env_name", "group_name", "program_name"],
                    raw: true
                }).then(function (data) {
                    programs = data;
                    //所有权限
                    return deploy_privilege.findAll({
                        where: {
                            privilege_type: 1
                        },
                        attributes: ["privilege_code", "privilege_name"],
                        raw: true
                    })
                }).then(function (data) {
                    priviges = data;
                    //获取用户已有环境权限
                    return deploy_user_res.findAll({
                        where: {
                            user_id: user_id
                        },
                        attributes: ["res_info_id", "privilege_code"],
                        raw: true
                    });
                }).then(function (data) {
                    //用户已有环境权限
                    _.each(data, function (item) {
                        if (!_.has(user_privileges, item["res_info_id"])) {
                            user_privileges[item["res_info_id"]] = [item["privilege_code"]];
                        } else {
                            user_privileges[item["res_info_id"]].push(item["privilege_code"]);
                        }
                    });
                }).then(function (data) {
                    //组合ztree数据   数组对象分组（共分3次组）
                    //第一次分组
                    var env_name_g = _.groupBy(programs, function (item) {
                        return item["env_name"];
                    });
                    //顶层数组
                    var top_level = [];
                    var i = 0;
                    //循环分组信息
                    for (var env_name in env_name_g) {
                        //每次循环把下层计数器归0
                        var j = 0;
                        //创建本层对象
                        var obj = {
                            name: env_name,
                            children: []
                        };
                        //把本层对象加入上一层数组中
                        top_level.push(obj);
                        //第二次分组
                        var group_name_g = _.groupBy(env_name_g[env_name], function (item) {
                            return item["group_name"];
                        });
                        //循环分组信息
                        for (var group_name in group_name_g) {
                            var obj = {
                                name: group_name,
                                children: []
                            };
                            //把本层对象加入上一层数组中
                            top_level[i]["children"].push(obj);
                            var program_name_g = _.groupBy(group_name_g[group_name], function (item) {
                                return item["program_name"];
                            });
                            for (var program_name in program_name_g) {
                                var obj = {
                                    name: program_name,
                                    children: []
                                };
                                //克隆
                                const clone = _.clone(priviges);
                                var res_info_id = program_name_g[program_name][0]["res_info_id"];
                                //组织最后一层（第四层数据）
                                _.each(clone, function (item) {
                                    var tmp = {};
                                    tmp["privilege_code"] = item["privilege_code"];
                                    tmp["name"] = item["privilege_name"];
                                    tmp["res_info_id"] = res_info_id;
                                    tmp["user_id"] = user_id;
                                    //设置初始化选中状态
                                    if (_.contains(user_privileges[res_info_id], item["privilege_code"])) {
                                        tmp["checked"] = 1;
                                        top_level[i]["checked"] = 1;
                                        top_level[i]["children"][j]["checked"] = 1;
                                        obj["checked"] = 1;
                                    }
                                    obj["children"].push(tmp);
                                });
                                //把本层对象加入上一层数组中
                                top_level[i]["children"][j]["children"].push(obj);
                            }
                            j++;
                        }
                        i++;
                    }
                    return Promise.resolve(top_level);
                }).then(function (data) {
                    res.render(routeDir + "user/setTomcatAuth", {
                        auth_list: JSON.stringify(data)
                    });
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'pwdEdit': {
                res.render(routeDir + "user/pwdEdit");
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
            form_fields["created_by"] = login_name;
            form_fields["updated_by"] = login_name;
            switch (action) {
                case 'add': {
                    form_fields["status"] = ~~form_fields["status"];
                    sys_user.findOne({where: {login_name: form_fields["login_name"]}}).then(function (user) {
                        if (user) {
                            return Promise.reject(form_fields["login_name"] + ",用户名已经存在");
                        } else {
                            return sys_user.create(form_fields);
                        }
                    }).then(function (user) {
                        res.end(JSON.stringify({"status": "success", "msg": "", "data": "用户添加成功。"}));
                    }).catch(function (err) {
                        var err_msg = logError(err);
                        res.end(JSON.stringify({"status": "error", "msg": err_msg}));
                    });
                }
                    break;
                case 'edit': {
                    sys_user.update(form_fields, {where: {id: form_fields["edit_id"]}}).then(function (result) {
                        res.end(JSON.stringify({"status": "success", "msg": "", "data": "修改数据成功"}));
                    }).catch(function (err) {
                        var err_msg = logError(err);
                        res.end(JSON.stringify({"status": "error", "msg": err_msg}));
                    });
                }
                    break;
                case 'authority': {
                    var user_auth = JSON.parse(form_fields["user_auth"]);
                    if (!(user_auth instanceof Array)) {
                        res.end(JSON.stringify({"status": "error", "msg": "参数错误，权限保存失败。"}));
                        return;
                    }
                    sys_user_resource.destroy({where: {user_id: form_fields["user_id"]}}).then(function (user) {
                        var bulk_data = [];
                        for (var i = 0, j = user_auth.length; i < j; i++) {
                            var _obj = {};
                            _obj["user_id"] = form_fields["user_id"];
                            _obj["resource_id"] = user_auth[i]["id"];
                            bulk_data.push(_obj);
                        }
                        return sys_user_resource.bulkCreate(bulk_data);
                    }).then(function () {
                        res.end(JSON.stringify({"status": "success", "msg": "权限设置成功。"}));
                    }).catch(function (err) {
                        res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                    });
                }
                    break;
                case 'setEnvAuth': {
                    var env_auth = JSON.parse(form_fields["env_auth"]);
                    if (!(env_auth instanceof Array)) {
                        res.end(JSON.stringify({"status": "error", "msg": "参数错误，权限保存失败。"}));
                        return;
                    }
                    deploy_user_env.destroy({where: {user_id: form_fields["user_id"]}}).then(function (user) {
                        return deploy_user_env.bulkCreate(env_auth);
                    }).then(function () {
                        res.end(JSON.stringify({"status": "success", "msg": "权限设置成功。"}));
                    }).catch(function (err) {
                        res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                    });
                }
                    break;
                case 'setTomcatAuth': {
                    var tomcat_auth = JSON.parse(form_fields["tomcat_auth"]);
                    if (!(tomcat_auth instanceof Array)) {
                        res.end(JSON.stringify({"status": "error", "msg": "参数错误，权限保存失败。"}));
                        return;
                    }
                    deploy_user_res.destroy({where: {user_id: form_fields["user_id"]}}).then(function (user) {
                        console.log(JSON.stringify(tomcat_auth));
                        return deploy_user_res.bulkCreate(tomcat_auth);
                    }).then(function () {
                        res.end(JSON.stringify({"status": "success", "msg": "权限设置成功。"}));
                    }).catch(function (err) {
                        res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                    });
                }
                    break;
                case 'pwdEdit': {
                    sys_user.findOne({where: {id: user_id, login_pwd: form_fields["old_pwd"]}}).then(function (user) {
                        if (!user) {
                            return Promise.reject("原密码不正确，修改失败")
                        } else {
                            user.login_pwd = form_fields["new_pwd"];
                            return user.save();
                        }
                    }).then(function (user) {
                        res.end(JSON.stringify({"status": "success", "msg": "密码修改成功！"}));
                    }).catch(function (err) {
                        var err_msg = logError(err);
                        res.end(JSON.stringify({"status": "error", "msg": err_msg}));
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