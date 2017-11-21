/**
 * Created by Administrator on 2017-07-22.
 */
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var _ = param.underscore._;
    var authority = param.authority;
    var utils = param.utils;
    var logError = param.publicmethod.logError;
    var execRedisCommend = function (client, command, args, callback) {
        client[command](args, function (err, data) {
            callback(err, data);
        });
    };
    router.get("/getRedisData", function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id),
            authority.getUserEnvResource(req, 1),
            pro_redis_config.findAll({
                order: [["env_name", "desc"], ["redis_alias", "asc"]],
                raw: true
            })
        ]).then(function (data) {
            var menu = data[0];
            var operator = data[1];
            var envs = data[2];
            var all_redis = data[3];
            var display_rediss = {};
            _.each(all_redis, function (item) {
                var env_name = item["env_name"];
                var redis_alias = item["redis_alias"];
                //用户有此环境权限
                if (_.contains(envs, env_name)) {
                    if (!_.has(display_rediss, env_name)) {
                        display_rediss[env_name] = [redis_alias];
                    } else {
                        display_rediss[env_name].push(redis_alias);
                    }
                }
            });
            res.render(routeDir + "redisData/index", {
                operator: operator,
                envs: _.keys(display_rediss),
                display_redis: display_rediss,
                menu: menu,
                title: "redis查询",
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
        //获取参数并验证
        var search_env = typeof req.query["search_env"] !== "undefined" && req.query["search_env"].trim() !== "" ? req.query["search_env"].trim() : null;
        var search_sql = typeof req.query["search_sql"] !== "undefined" && req.query["search_sql"].trim() !== "" ? req.query["search_sql"].trim() : null;
        var search_redis = typeof req.query["search_redis"] !== "undefined" && req.query["search_redis"].trim() !== "" ? req.query["search_redis"].trim() : null;
        if (search_env == null || search_redis == null || search_sql == null) {
            res.end(JSON.stringify({status: "error", msg: "查询参数缺失"}));
            return;
        }
        var exec_redis = param[search_env + "_" + search_redis];
        switch (action) {
            case 'list': {
                var reg = /\s+/;
                var sql_array = search_sql.split(reg);
                var keywords = typeof sql_array[0] !== "undefined" ? sql_array[0].toLowerCase() : "";
                var filter_sql = {
                    "get": execRedisCommend, "hget": execRedisCommend, "exists": execRedisCommend,
                    "dbsize": execRedisCommend, "type": execRedisCommend, "ttl": execRedisCommend,
                    "keys": execRedisCommend, "hgetall": execRedisCommend, "hkeys": execRedisCommend,
                    "hvals": execRedisCommend, "hlen": execRedisCommend, "hexists": execRedisCommend,
                    "llen": execRedisCommend, "lrange": execRedisCommend, "lindex": execRedisCommend,
                    "smembers": execRedisCommend, "sismember": execRedisCommend
                };
                if (typeof filter_sql[keywords] === "undefined") {
                    res.end(JSON.stringify({"status": "error", "msg": "redis执行命令不存在。请重试或联系管理员！"}));
                    return;
                }
                filter_sql[keywords](exec_redis, keywords, sql_array.slice(1), function (err, data) {
                    if (err) {
                        logError(err);
                        res.end(JSON.stringify({"status": "error", "msg": "redis命令执行错误，请检查命令语法是否正确或key类型是否正确"}));
                        return;
                    }
                    res.end(JSON.stringify({"status": "success", "msg": "", "data": data}));
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
};