/**
 * Created by Administrator on 2017-03-27.
 */
//tomcat部署
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var path = require('path');
    var fs = require('fs');
    var logError = param.publicmethod.logError;
    var publicmethod = param.publicmethod;
    var authority = param.authority;
    var _ = param.underscore._;
    var utils = param.utils;
    var execRpcCmd = function (app_server_id, env_name, action) {
        console.log(app_server_id, env_name);
        return Promise.all([
            deploy_app_server.findOne({
                where: {
                    id: app_server_id
                },
                raw: true,
                attributes: ["host_ip", "map_rpc_port"]
            }),
            deploy_env_config.findOne({
                where: {
                    env_name: env_name
                },
                raw: true,
                attributes: ["tunnel_ip"]
            })
        ]).then(function (data) {
            var host_info = data[0];
            var env_info = data[1];
            if (!host_info || !env_info) {
                return Promise.reject("没有查到程序环境或服务器信息");
            }
            var outaddr = "http://" + env_info["tunnel_ip"] + ":3002";
            var inneraddr = "http://" + host_info["host_ip"] + ":" + host_info["map_rpc_port"];
            return publicmethod.execRpcServiceProxy(outaddr, inneraddr, action, []);
        });
    };
    router.get("/getTomcatDashboard", function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        var env_name = form_fields["env_name"];
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id),
            authority.getUserEnvResource(req, 12)
        ]).then(function (data) {
            var menu = data[0];
            var operator = data[1];
            var envs = data[2];
            res.render(routeDir + "tomcatDashboard/index", {
                envs: envs,
                operator: operator,
                menu: menu,
                title: "程序仪表盘",
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
            case "list": {
                var env_name = form_fields["env_name"];
                var user_id = req.session.user["user_id"] || 0;
                if (!_.has(form_fields, "env_name")) {
                    res.end(JSON.stringify({"status": "error", "msg": "参数缺失"}));
                    return;
                }
                var total = 0, rows = [];
                var deploy_res_info_where = {env_name: env_name};
                if (_.has(form_fields, "search_condition")) {
                    deploy_res_info_where["$or"] = {
                        group_name: {$like: "%" + form_fields["search_condition"] + "%"},
                        program_name: {$like: "%" + form_fields["search_condition"] + "%"}
                    };
                }
                deploy_res_info.findAndCountAll({
                    include: [{
                        model: deploy_app_server,
                        required: true,
                        where: {
                            is_disable: 0
                        },
                        attributes: [["id", "app_server_id"], "alias", "host_ip", "map_rpc_port"]
                    }, {
                        model: deploy_user_res,
                        required: true,
                        attributes: [[Sequelize.fn("GROUP_CONCAT", Sequelize.col("privilege_code")), "privilege_code"]],
                        where: {
                            user_id: user_id
                        }
                    }, {
                        model: deploy_env_config,
                        required: true,
                        attributes: ["tunnel_ip"]
                    }],
                    attributes: ["env_name", "group_name", "program_name"],
                    where: deploy_res_info_where,
                    limit: Number(form_fields["limit"]) || 0,
                    offset: Number(form_fields["offset"]) || 0,
                    group: [[deploy_app_server, "id"]],
                    raw: true
                }).then(function (data) {
                    total = data["count"].length;
                    rows = Sequelize.getPlaneData(data["rows"]);
                    //获取运行状态
                    var Promi_all = [];
                    //异步操作
                    for (var i = 0, j = rows.length; i < j; i++) {
                        var outaddr = /http:\/\//.test(rows[i]["tunnel_ip"]) ? rows[i]["tunnel_ip"] + ":3002" : "http://" + rows[i]["tunnel_ip"] + ":3002";
                        var inneraddr = /http:\/\//.test(rows[i]["host_ip"]) ? rows[i]["host_ip"] + ":" + rows[i]["map_rpc_port"] : "http://" + rows[i]["host_ip"] + ":" + rows[i]["map_rpc_port"];
                        Promi_all.push(publicmethod.execRpcServiceProxy(outaddr, inneraddr, "getTomcatStatus", []));
                    }
                    return Promise.all(Promi_all).then(function (data) {
                        _.each(data, function (item, index) {
                            rows[index]["run_status"] = item;
                        });
                        return Promise.resolve();
                    });
                }).then(function (data) {
                    //获取最后一次部署
                    var app_server_ids = _.pluck(rows, "app_server_id");
                    return deploy_app_history.findAll({
                        where: {
                            app_server_id: {$in: app_server_ids}
                        },
                        attributes: [[Sequelize.fn("max", Sequelize.col("id")), "max_id"]],
                        group: ["app_server_id"],
                        raw: true
                    }).then(function (data) {
                        var ids = _.pluck(data, "max_id");
                        return deploy_app_history.findAll({
                            where: {
                                id: {$in: ids}
                            },
                            attributes: ["app_server_id", "deploy_time", "apptype", "appversion", "user_name", "deploy_result"],
                            raw: true
                        }).then(function (data) {
                            //合并最后一次部署
                            var _rows = {};
                            var _data = {};
                            //隐蔽ip和端口信息
                            _.each(rows, function (item) {
                                _rows[item["app_server_id"]] = _.omit(item, "host_ip", "map_rpc_port", "tunnel_ip");
                            });
                            _.each(data, function (item) {
                                _data[item["app_server_id"]] = item;
                            });
                            for (var app_server_id in _rows) {
                                _.extend(_rows[app_server_id], _data[app_server_id]);
                            }
                            rows = _.chain(_rows).values().sortBy("group_name", "program_name", "alias");
                            return Promise.resolve();
                        });
                    })
                }).then(function () {
                    res.end(JSON.stringify({
                        "status": "success",
                        "msg": "",
                        "data": {"total": total, "rows": rows}
                    }));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'startTomcat':
            case 'stopTomcat':
            case 'reStartTomcat':
            case 'getTomcatLog':
            case 'getTomcatStatus': {
                execRpcCmd(form_fields["app_server_id"], form_fields["env_name"], action).then(function (data) {
                    if (action === "getTomcatLog") {
                        res.end(data);
                    } else {
                        res.end(JSON.stringify({"status": "success", "msg": "", "data": data}));
                    }
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                })
            }
                break;
            default:
                res.end(JSON.stringify({"status": "error", "msg": "the addr of get request is not exist"}));
        }
    }).post('/:action', function (req, res, next) {
        res.end(JSON.stringify({"status": "error", "msg": "the addr of post request is not exist"}));
    });
    return router;
};
