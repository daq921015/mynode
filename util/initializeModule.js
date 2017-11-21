/**
 * Created by Administrator on 2017-07-23.
 * 程序启动,初始化全局变量
 */
var initializeModule = function (param) {
    var myconfig = param.myconfig;
    var async = param.async;
    var _ = param.underscore._;
    global["Op"] = param.Sequelize.Op;//sequlize全局操作符变量
    //--------------初始化模块（注意模块间的顺序）()--------------------
    async.auto({
        //集中所有查询sql语句
        dbExecSql: function (callback) {
            param["dbExecSql"] = require("./dbExecSql");
            callback(null);
        },
        //param中添加工具 param.utils
        utils: function (callback) {
            param["utils"] = require("./MyUtils")(param);
            callback(null);
        },
        //添加基础服务方法
        authority: function (callback) {
            param["authority"] = require("./../service/MyAuthority")(param);
            callback(null);
        },
        //初始化阿里云负载均衡访问api
        aliyunBalance: function (callback) {
            var AliyunBalance = require("./aliyunBalance")(param);
            var aliyunbalance = myconfig.aliyunbalance;
            for (var name in aliyunbalance) {
                param["ali_balance_" + name] = new AliyunBalance(aliyunbalance[name]);
            }
            callback(null);
        },
        //初始化数据库源
        mydbSource: function (callback) {
            pro_db_config.findAll({
                raw: true
            }).then(function (data) {
                for (var i = 0, j = data.length; i < j; i++) {
                    var db_conf = _.pick(data[i], "host", "username", "password", "port", "database");
                    var env_name = data[i]["env_name"];
                    var db_group = data[i]["db_group"];
                    var database = data[i]["database"];
                    if (/saas-db/.test(database)) {
                        require("../models/saas-db/ref")(db_conf, env_name + "_" + db_group + "_" + database);
                    }
                    if (/erp-store/.test(database)) {
                        require("../models/erp-store/ref")(db_conf, env_name + "_" + db_group + "_" + database);
                    }
                    if (/erp-chain|retail-db|rest-db/.test(database)) {
                        require("../models/erp-chain/ref")(db_conf, env_name + "_" + db_group + "_" + database);
                    }
                    if (/goods-db/.test(database)) {
                        require("../models/goods-db/ref")(db_conf, env_name + "_" + db_group + "_" + database);
                    }
                    if (/log-db/.test(db_group)) {
                        require("../models/log-db/ref")(db_conf, env_name + "_" + db_group);
                    }
                }
            }).catch(function (err) {
                callback(err);
            });
            callback(null);
        },
        //param中添加MySsh远程服务器连接
        myssh: function (callback) {
            param["myssh"] = require("./MySsh")(param);
            callback(null);
        },
        //初始化 tomcat部署所有数据库/reids连接
        redisSource: function (callback) {
            var myredisObject = require("./MyRedis");
            pro_redis_config.findAll({
                raw: true
            }).then(function (data) {
                for (var i = 0, j = data.length; i < j; i++) {
                    var redis_conf = _.pick(data[i], "host", "port", "password", "db");
                    var env_name = data[i]["env_name"];
                    var redis_alias = data[i]["redis_alias"];
                    param[env_name + "_" + redis_alias] = myredisObject(redis_conf);
                }
                callback(null);
            }).catch(function (err) {
                callback(err);
            });
        },
        //添加公共方法
        publicmethod: [
            'utils',
            'myssh',
            function (results, callback) {
                param["publicmethod"] = require("./publicmethod")(param);
                callback(null);
            }
        ],
        //初始化自定义定时任务模块
        MynodeSchedule: [
            'publicmethod',
            function (results, callback) {
                require("./MynodeSchedule")(param);
                callback(null);
            }
        ]
    }, function (err, results) {
        //把param整个程序的使用变量，设置成全局
        if (err) {
            console.log(err);
        }
    });
    //---------------------------END---------------------------------
};
module.exports = initializeModule;

