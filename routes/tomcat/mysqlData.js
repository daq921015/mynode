/**
 * Created by Administrator on 2017-07-22.
 */
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var authority = param.authority;
    var utils = param.utils;
    var _ = param.underscore._;
    var logError = param.publicmethod.logError;
    router.get("/index", function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id),
            authority.getUserEnvResource(req, 2),
            pro_db_config.findAll({
                where: {
                    db_type: 2
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
            res.render(routeDir + "mysqlData/index", {
                operator: operator,
                display_dbs: display_dbs,
                envs: _.keys(display_dbs),
                menu: menu,
                title: "MySQL查询",
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
        //获取参数并验证
        var search_env = form_fields["search_env"];
        var search_sql = form_fields["search_sql"];
        var search_db = form_fields["search_db"];
        if (!search_env || !search_db || !search_sql) {
            res.end(JSON.stringify({status: "error", msg: "查询参数缺失，请输入查询sql或选择查询数据库"}));
            return;
        }
        var exec_db = search_env + "_" + search_db;
        var sequlize = global[exec_db];
        if (typeof  sequlize === "undefined") {
            res.end(JSON.stringify({status: "error", msg: "获取数据库连接失败，请先配置数据库地址"}));
            return;
        }
        var dataSql = search_sql.toLowerCase().replace(/(^;*)|(;*$)/g, "");
        switch (action) {
            case 'list': {
                var offset = form_fields["offset"] || 0;
                var limit = form_fields["limit"] || 0;
                var countSql = "select count(1) as count from (" + dataSql + ")M";
                var dataOptions = [];
                if (/limit/.test(dataSql)) {
                    dataSql = "select * from (" + dataSql + ")M  limit ?,?";
                } else {
                    dataSql = dataSql + " limit ?,?";
                }
                dataOptions.push(offset);
                dataOptions.push(limit);
                var total = 0;
                sequlize.query(countSql, {
                    type: Sequelize.QueryTypes.SELECT,
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
                    var rows = [];
                    if (data) {
                        rows = data;
                    }
                    res.end(JSON.stringify({"status": "success", "msg": "", "data": {"total": total, "rows": rows}}));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'fields': {
                //select限制，只能是查询语句
                if (!dataSql.startsWith('select')) {
                    res.end(JSON.stringify({status: "error", msg: "请输入查询sql"}));
                    return;
                }
                //www流水特殊查询语句限制
                if (/(sale)|(sale_detail)|(sale_payment)/.test(dataSql.toLowerCase()) && search_env === "www_ali"
                    && !(/tenant_id\s*=/.test(dataSql.toLowerCase()) || /tenant_id\s*in/.test(dataSql.toLowerCase()))) {
                    res.end(JSON.stringify({status: "error", msg: "www查询流水数据,必须加tenant_id条件"}));
                    return;
                }
                //因为联合查询时，为避免查询字段重复，都需要用括号包起来
                if (/limit/.test(dataSql)) {
                    dataSql = "select * from (" + dataSql + ")M  limit 1";
                } else {
                    // dataSql = dataSql + " limit 0";
                    dataSql = "select * from (" + dataSql + ")M  limit 1";
                }
                sequlize.query(dataSql, {
                    type: Sequelize.QueryTypes.SELECT,
                    raw: true,
                    plain: true
                }).then(function (data) {
                    var fields = [];
                    if (data) {
                        fields = _.keys(data);
                    }
                    res.end(JSON.stringify({status: "success", msg: "", "data": fields}));
                }).catch(function (err) {
                    res.end(JSON.stringify({status: "error", msg: logError(err)}));
                });
            }
                break;
            default:
                res.end(JSON.stringify({"status": "error", "msg": "the addr of get request is not exist"}));
        }
    }).post('/:action', function (req, res, next) {
        res.end(JSON.stringify({"status": "error", "msg": "the addr of post request is not exist"}));
    });
    return router;
}
;