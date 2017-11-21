/**
 * Created by Administrator on 2017-03-27.
 */
//tomcat部署
module.exports = function (param, routeDir) {
    let express = require("express");
    let router = express.Router();
    let logError = param.publicmethod.logError;
    let publicmethod = param.publicmethod;
    let authority = param.authority;
    let _ = param.underscore._;
    let utils = param.utils;
    let execRpcCmd = function (app_server_id, env_name, action) {
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
            let host_info = data[0];
            let env_info = data[1];
            if (!host_info || !env_info) {
                return Promise.reject("没有查到程序环境或服务器信息");
            }
            let outaddr = "http://" + env_info["tunnel_ip"] + ":3002";
            let inneraddr = "http://" + host_info["host_ip"] + ":" + host_info["map_rpc_port"];
            return publicmethod.execRpcServiceProxy(outaddr, inneraddr, action, []);
        });
    };
    let listFunc = async function (req, form_fields) {
        let env_name = form_fields["env_name"];
        let user_id = req.session.user["user_id"] || 0;
        if (!_.has(form_fields, "env_name")) {
            return Promise.reject("参数缺失");
        }
        let deploy_res_info_where = {env_name: env_name};
        if (_.has(form_fields, "search_condition")) {
            deploy_res_info_where["$or"] = {
                group_name: {$like: "%" + form_fields["search_condition"] + "%"},
                program_name: {$like: "%" + form_fields["search_condition"] + "%"}
            };
        }
        let server_info = await deploy_res_info.findAndCountAll({
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
        });
        let total = server_info["count"].length;
        let server = Sequelize.getPlaneData(server_info["rows"]);
        //获取运行状态
        for (let i = 0, j = server.length; i < j; i++) {
            let outaddr = /http:\/\//.test(server[i]["tunnel_ip"]) ? server[i]["tunnel_ip"] + ":3002" : "http://" + server[i]["tunnel_ip"] + ":3002";
            let inneraddr = /http:\/\//.test(server[i]["host_ip"]) ? server[i]["host_ip"] + ":" + server[i]["map_rpc_port"] : "http://" + server[i]["host_ip"] + ":" + server[i]["map_rpc_port"];
            server[i]["run_status"] = await publicmethod.execRpcServiceProxy(outaddr, inneraddr, "getTomcatStatus", []);
        }
        //获取最后一次部署
        let app_server_ids = _.pluck(server, "app_server_id");
        let deploy_history = await deploy_app_history.findAll({
            where: {
                app_server_id: {$in: app_server_ids}
            },
            attributes: [[Sequelize.fn("max", Sequelize.col("id")), "max_id"]],
            group: ["app_server_id"],
            raw: true
        });
        let ids = _.pluck(deploy_history, "max_id");
        let history = await deploy_app_history.findAll({
            where: {
                id: {$in: ids}
            },
            attributes: ["app_server_id", "deploy_time", "apptype", "appversion", "user_name", "deploy_result"],
            raw: true
        });
        //合并最后一次部署
        let _server = {};
        let _history = {};
        //隐蔽ip和端口信息
        _.each(server, function (item) {
            _server[item["app_server_id"]] = _.omit(item, "host_ip", "map_rpc_port", "tunnel_ip");
        });
        _.each(history, function (item) {
            _history[item["app_server_id"]] = item;
        });
        for (let app_server_id in _server) {
            _.extend(_server[app_server_id], _history[app_server_id]);
        }
        let rows = _.chain(_server).values().sortBy("group_name", "program_name", "alias");
        return Promise.resolve({"total": total, "rows": rows});
    };
    router.get("/getTomcatDashboard", function (req, res, next) {
        let form_data = utils.getForm(req);
        let form_fields = form_data["fields"];
        let sider_id = form_fields["sider_id"] || 0;
        let env_name = form_fields["env_name"];
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id),
            authority.getUserEnvResource(req, 12)
        ]).then(function (data) {
            let menu = data[0];
            let operator = data[1];
            let envs = data[2];
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
        let action = req.params.action;
        let form_data = utils.getForm(req);
        let form_fields = form_data["fields"];
        switch (action) {
            case "list": {
                listFunc(req, form_fields).then(function (data) {
                    res.end(JSON.stringify({
                        "status": "success",
                        "msg": "",
                        "data": data
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
