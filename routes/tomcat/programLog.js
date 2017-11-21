/**
 * Created by Administrator on 2017-07-22.
 */
//supervisor 进程控制路由
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var dbExecSql = param.dbExecSql;
    var authority = param.authority;
    var _ = param.underscore._;
    var utils = param.utils;
    var logError = param.publicmethod.logError;
    router.get("/getProgramLog", function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id),
            authority.getUserEnvResource(req, 11),
            pro_db_config.findAll({
                where: {
                    db_type: 1
                },
                order: [["env_name", "desc"], ["db_group", "asc"]],
                raw: true
            })
        ]).then(function (data) {
            var menu = data[0];
            var operator = data[1];
            var envs = data[2];
            var all_dbs = data[3];
            var display_dbs = {};
            _.each(all_dbs, function (item) {
                var env_name = item["env_name"];
                var db_name = item["db_group"] + "_" + item["database"];
                //用户有此环境权限
                if (_.contains(envs, env_name)) {
                    if (!_.has(display_dbs, env_name)) {
                        display_dbs[env_name] = [db_name];
                    } else {
                        display_dbs[env_name].push(db_name);
                    }
                }
            });
            res.render(routeDir + "programLog/index", {
                operator: operator,
                envs: _.keys(display_dbs),
                menu: menu,
                title: "程序日志",
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
        var search_env = form_fields["search_env"];
        var program = form_fields["search_program"];
        var search_type = form_fields["search_type"];
        var start_time = form_fields["start_time"];
        var end_time = form_fields["end_time"];
        var search_condition = form_fields["search_condition"];
        if (!search_env || !program || !start_time || !end_time || program.split("/").length !== 2) {
            logError("programLog.js," + "查询条件有问题：search_env=" + search_env + ",search_program=" + program);
            res.end(JSON.stringify({"status": "error", "msg": "查询条件缺失"}));
            return;
        }
        var search_group = program.split("/")[0];
        var search_program = program.split("/")[1];
        var logdb = search_env + "_log-db";
        var sequlize = global[logdb];
        var table_name = "`log-" + search_env + "-" + search_group + "-" + search_program + "`.`logging_event` where 1=1";
        if (typeof sequlize === "undefined") {
            res.end(JSON.stringify({"status": "error", "msg": "数据库未配置，获取数据库连接失败：" + logdb}));
            return;
        }
        switch (action) {
            case 'list': {
                var offset = form_fields["offset"];
                var limit = form_fields["limit"];
                var countSql = dbExecSql.tomcat_programLog.getProgramLogListCount + " " + table_name;
                var countOptions = [];
                var dataSql = dbExecSql.tomcat_programLog.getProgramLogList + " " + table_name;
                var dataOptions = [];
                //加入开始日期搜索条件
                if (start_time) {
                    countSql = countSql + " and `timestmp`>=?";
                    countOptions.push(Date.parse(start_time));
                    dataSql = dataSql + " and `timestmp`>=?";
                    dataOptions.push(Date.parse(start_time));
                }
                //加入结束日期搜索条件
                if (end_time) {
                    countSql = countSql + " and `timestmp`<=?";
                    countOptions.push(Date.parse(end_time));
                    dataSql = dataSql + " and `timestmp`<=?";
                    dataOptions.push(Date.parse(end_time));
                }
                //加入日志类型
                if (search_type) {
                    countSql = countSql + " and `level_string`=?";
                    countOptions.push(search_type);
                    dataSql = dataSql + " and `level_string`=?";
                    dataOptions.push(search_type);
                }
                //加入搜索条件
                if (search_condition) {
                    countSql = countSql + " and `formatted_message` like ?";
                    countOptions.push("%" + search_condition + "%");
                    dataSql = dataSql + " and `formatted_message` like ?";
                    dataOptions.push("%" + search_condition + "%");
                }
                dataSql = dataSql + " order by timestmp limit ?,?";
                dataOptions.push(offset);
                dataOptions.push(limit);
                var total = 0;
                var rows = [];
                sequlize.query(countSql, {
                    type: Sequelize.QueryTypes.SELECT,
                    replacements: countOptions,
                    raw: true,
                    plain: true
                }).then(function (data) {
                    if (data) {
                        total = data["count"];
                    }
                    return sequlize.query(dataSql, {
                        type: Sequelize.QueryTypes.SELECT,
                        replacements: dataOptions,
                        raw: true
                    })
                }).then(function (data) {
                    if (data) {
                        rows = data;
                    }
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
            default:
                res.end(JSON.stringify({"status": "error", "msg": "the addr of get request is not exist"}));
        }
    }).post("/:action", function (req, res, next) {
        res.end(JSON.stringify({"status": "error", "msg": "the addr of post request is not exist。"}));
    });
    return router;
};