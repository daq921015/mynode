//登录控制
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var async = param.async;
    var logError = param.publicmethod.logError;
    var authority = param.authority;
    var dbExecSql = param.dbExecSql;
    var utils = param.utils;
    var _ = param.underscore._;
    var getDbTableColumn = function (dbcon, dbname, callback) {
        /*
         * 获取db所有表字段信息
         * 返回{table_name:{column_name:{result}}}
         * */
        var sql = dbExecSql.special_contrast.getDbTableColumnList;
        var options = [dbname];
        dbcon.query(sql, {type: Sequelize.QueryTypes.SELECT, raw: true, replacements: options}).then(function (data) {
            var table_info = {};
            for (var i = 0, j = data.length; i < j; i++) {
                var table_name = data[i]["table_name"];
                var column_name = data[i]["column_name"];
                if (!_.has(table_info, table_name)) {
                    table_info[table_name] = {}
                }
                table_info[table_name][column_name] = data[i];
            }
            callback(null, table_info);
        }).catch(function (err) {
            callback(err);
        });
    };
    var getDbTableIndex = function (dbcon, dbname, callback) {
        /*
         * 获取db所有表索引信息
         * 返回{table_name:{index_name:{result}}}
         * */
        var sql = dbExecSql.special_contrast.getDbTableIndexList;
        var options = [dbname];
        dbcon.query(sql, {type: Sequelize.QueryTypes.SELECT, raw: true, replacements: options}).then(function (data) {
            var table_info = {};
            for (var i = 0, j = data.length; i < j; i++) {
                var table_name = data[i]["table_name"];
                var index_name = data[i]["index_name"];
                var column_name = data[i]["column_name"];
                if (!_.has(table_info, table_name)) {
                    table_info[table_name] = {}
                }
                if (!_.has(table_info[table_name], index_name)) {
                    table_info[table_name][index_name] = {}
                }
                table_info[table_name][index_name][column_name] = data[i];
            }
            callback(null, table_info);
        }).catch(function (err) {
            callback(err);
        });
    };
    var contrastTableExist = function (db1_info, db2_info) {
        /*
         * 获取两个库表对比结果
         * return: [库1特有表，库2特有表，两库共有表]
         * */
        var db1_table_names = _.keys(db1_info);
        var db2_table_names = _.keys(db2_info);
        //db1多出的表名
        var db1_table_more = _.difference(db1_table_names, db2_table_names);
        //db2多出的表名
        var db2_table_more = _.difference(db2_table_names, db1_table_names);
        //两个库共有表名
        var db_table_public = _.intersection(db1_table_names, db2_table_names);
        return [db1_table_more, db2_table_more, db_table_public]
    };
    var contrastColumnExist = function (db1_info, db2_info, table_name) {
        /*
         * 获取两库，同一张表字段存在情况
         * */
        var db1_column_names = _.keys(db1_info[table_name]);
        var db2_column_names = _.keys(db2_info[table_name]);
        //db1表多出的字段名
        var db1_column_more = _.difference(db1_column_names, db2_column_names);
        //db2表多出的字段名
        var db2_column_more = _.difference(db2_column_names, db1_column_names);
        //两个库表共有字段名
        var db_column_public = _.intersection(db1_column_names, db2_column_names);
        return [db1_column_more, db2_column_more, db_column_public]
    };
    var contrastFieldDiff = function (db1_info, db2_info, table_name, field_name) {
        /*
         * 判断两个库 同表名、同字段名的信息是否一致
         * return:一致 [true/false,db1_field,db2_field]
         * */
        var db1_field = _.values(db1_info[table_name][field_name]);
        var db2_field = _.values(db2_info[table_name][field_name]);
        var field_equal = _.isEqual(db1_field, db2_field);
        return [field_equal, db1_info[table_name][field_name], db2_info[table_name][field_name]];
    };
    var contrastTableIndexExist = function (db1_info, db2_info) {
        /*
         * 获取两个库表对比结果
         * return: [库1特有表，库2特有表，两库共有表]
         * */
        var db1_table_names = _.keys(db1_info);
        var db2_table_names = _.keys(db2_info);
        var index_result = {
            table_index_contrast: {},
            index_name_contrast: {}
        };
        //只比较都存在的表
        var tables = _.intersection(db1_table_names, db2_table_names);
        for (var i = 0, j = tables.length; i < j; i++) {
            var table_name = tables[i];
            var db1_index_names = _.keys(db1_info[table_name]);
            var db2_index_names = _.keys(db2_info[table_name]);
            //db1表多出的索引
            var db1_index_more = _.difference(db1_index_names, db2_index_names);
            //db2表多出的索引
            var db2_index_more = _.difference(db2_index_names, db1_index_names);
            //表索引有不同
            if (db1_index_more.length > 0 || db2_index_more.length > 0) {
                index_result["table_index_contrast"][table_name] = [db1_index_more, db2_index_more];
            }
        }
        return index_result;
    };
    var getContrastFromDbs = function (dbcon1, dbname1, dbcon2, dbname2, callback) {
        /*
         * 获取两个库对比结果
         * */
        if (typeof dbcon1 == "undefined" || typeof dbname1 == "undefined"
            || typeof dbcon2 == "undefined" || typeof dbname2 == "undefined") {
            callback(new Error("数据库对比参数缺失"));
            return;
        }
        async.auto({
            //获取数据库1表字段信息
            db1_column_info: function (callback) {
                getDbTableColumn(dbcon1, dbname1, function (err, result) {
                    callback(err, result);
                });
            },
            //获取数据库2表字段信息
            db2_column_info: function (callback) {
                getDbTableColumn(dbcon2, dbname2, function (err, result) {
                    callback(err, result);
                });
            },
            db1_index_info: function (callback) {
                getDbTableIndex(dbcon1, dbname1, function (err, result) {
                    callback(err, result);
                });
            },
            db2_index_info: function (callback) {
                getDbTableIndex(dbcon2, dbname2, function (err, result) {
                    callback(err, result);
                });
            },
            //开始对比表和字段，获取对比结果
            contrast_column_result: [
                'db1_column_info',
                'db2_column_info',
                function (results, callback) {
                    var db1_info = results["db1_column_info"];
                    var db2_info = results["db2_column_info"];
                    var table_name_contrast = contrastTableExist(db1_info, db2_info);
                    var column_name_contrast = {};
                    var field_name_contrast = {};
                    //获取字段存在对比结果
                    var db_table_public = table_name_contrast[2];
                    for (var i = 0, j = db_table_public.length; i < j; i++) {
                        var t_name = db_table_public[i];
                        column_name_contrast[t_name] = contrastColumnExist(db1_info, db2_info, t_name);
                    }
                    //获取同表同字段内容对比结果
                    for (var table_name in column_name_contrast) {
                        var db_column_public = column_name_contrast[table_name][2];
                        for (var i = 0, j = db_column_public.length; i < j; i++) {
                            var field_name = db_column_public[i];
                            var field_diff = contrastFieldDiff(db1_info, db2_info, table_name, field_name);
                            var field_equal = field_diff[0];
                            //如果字段信息不一样
                            if (!field_equal) {
                                var db1_field = field_diff[1];
                                var db2_field = field_diff[2];
                                if (!_.has(field_name_contrast, table_name)) {
                                    field_name_contrast[table_name] = {};
                                }
                                field_name_contrast[table_name][field_name] = [db1_field, db2_field];
                            }
                        }
                    }
                    //去除无用的冗余数据
                    table_name_contrast.splice(-1, 1);
                    //去除字段信息完全一样的表信息
                    var column_name_result = {};
                    for (var t_name in column_name_contrast) {
                        if (column_name_contrast[t_name][0].length !== 0 || column_name_contrast[t_name][1].length !== 0) {
                            column_name_result[t_name] = [column_name_contrast[t_name][0], column_name_contrast[t_name][1]]
                        }
                    }
                    callback(null, {
                        table_name_contrast: table_name_contrast,
                        column_name_contrast: column_name_result,
                        field_name_contrast: field_name_contrast
                    });
                }
            ],
            contrast_index_result: [
                'db1_index_info',
                'db2_index_info',
                function (results, callback) {
                    var db1_info = results["db1_index_info"];
                    var db2_info = results["db2_index_info"];
                    var index_result = contrastTableIndexExist(db1_info, db2_info);
                    callback(null, index_result);
                }
            ]
        }, function (err, results) {
            if (err) {
                callback(err);
                return;
            }
            var contrast_column_result = results["contrast_column_result"];
            var contrast_index_result = results["contrast_index_result"];
            _.extend(contrast_index_result, contrast_column_result);
            callback(err, contrast_index_result);
        });
    };
    router.get('/getContrast', function (req, res, next) {
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
            res.render(routeDir + "contrastList", {
                operator: operator,
                display_dbs: display_dbs,
                envs: _.keys(display_dbs),
                menu: menu,
                title: "数据库对比",
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
        //获取参数并验证
        var db1_env = form_fields["db1_env"];
        var db1_db = form_fields["db1_db"];
        var db2_env = form_fields["db2_env"];
        var db2_db = form_fields["db2_db"];
        if (!db1_env || !db1_db || !db2_env || !db2_db) {
            res.end(JSON.stringify({"status": "error", "msg": "传入参数缺失，请先选择对比数据库"}));
            return;
        }
        switch (action) {
            case 'doStartContrast': {
                //获取saas-db库连接池
                var dbcon1 = global[db1_env + "_" + db1_db];
                if (typeof dbcon1 === "undefined") {
                    res.end(JSON.stringify({"status": "error", "msg": db1_env + ":" + db1_db + "获取数据库连接失败，请先配置数据库地址"}));
                    return;
                }
                var dbcon2 = global[db2_env + "_" + db2_db];
                if (typeof dbcon2 === "undefined") {
                    res.end(JSON.stringify({"status": "error", "msg": db2_env + ":" + db2_db + "获取数据库连接失败，请先配置数据库地址"}));
                    return;
                }
                //去掉前面的分组信息
                var dbname1 = db1_db.replace(/^z[a-zA-Z0-9]*_/, '');
                var dbname2 = db2_db.replace(/^z[a-zA-Z0-9]*_/, '');
                var erp_chain = ["erp-chain", "retail-db", "rest-db"];
                if (!(_.contains(erp_chain, dbname1) && _.contains(erp_chain, dbname2))) {
                    if (dbname1 !== dbname2) {
                        res.end(JSON.stringify({"status": "error", "msg": "数据库不一致，没有可比性，请重新选择数据库"}));
                        return;
                    }
                }
                getContrastFromDbs(dbcon1, dbname1, dbcon2, dbname2, function (err, result) {
                    if (err) {
                        logError(err);
                        res.end(JSON.stringify({"status": "error", "msg": "内部执行错误，对比失败"}));
                        return;
                    }
                    res.end(JSON.stringify({"status": "success", "msg": "对比执行完成", "data": result}));
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










