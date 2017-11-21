var mymethod = function (param) {
    var path = param.path;
    var fs = param.fs;
    var logger = param.logger;
    var zip_local = param.zip_local;
    var node_xlsx = param.node_xlsx;
    var moment = param.moment;
    var _ = param.underscore._;
    var myssh = param.myssh;
    var utils = param.utils;
    var hprose = param.hprose;
    var publicmethod = {};
    publicmethod.getDeployAppConf = function (res_info_id, callback) {
        /*
         * 获取部署程序的app启动配置文件
         * 返回：callback(err,配置文件内容);
         * */
        var conf_file_data = "";
        deploy_app_config.findAll({
            where: {
                res_info_id: res_info_id
            },
            raw: true
        }).then(function (data) {
            if (!data) {
                callback(new Error("没有获取到配置文件内容:res_info_id=" + res_info_id));
            } else {
                for (var i = 0, j = data.length; i < j; i++) {
                    if (data[i]["memo"] === "" || data[i]["memo"] === "null" || typeof data[i]["memo"] === "undefined") {
                        conf_file_data = conf_file_data + data[i]["conf_key"] + "=" + data[i]["conf_value"] + "\n";
                    } else {
                        conf_file_data = conf_file_data + "#" + data[i]["memo"] + "\n" + data[i]["conf_key"] + "=" + data[i]["conf_value"] + "\n";
                    }
                }
                callback(null, conf_file_data);
            }
        }).catch(function (err) {
            callback(err);
        });
    };
    publicmethod.getLocalReadDir = function (readpath, callback) {
        /*
         *读取本地文件夹,readpath不是文件夹或不存在返回空集合
         *参数：目标路径
         *返回：callback([...])
         * */
        var judge = 0;
        fs.exists(readpath, function (result) {
            if (result) {
                if (fs.lstatSync(readpath).isDirectory()) {
                    fs.readdir(readpath, function (err, files) {
                        if (err) {
                            callback(err);
                            return;
                        }
                        var ret = [];
                        for (var i = 0, j = files.length; i < j; i++) {
                            ret.push(path.join(readpath, files[i]));
                        }
                        judge = 1;
                        callback(null, ret);
                    });
                } else {
                    callback(null, []);
                }
            } else {
                callback(null, []);
            }
        });
    };
    publicmethod.setSysOpertorLog = function (req, req_authority, callback) {
        var insert_data = {
            parent_name: req_authority["parent_name"],
            res_name: req_authority["res_name"],
            res_url: req.url,
            http_method: req.method,
            user_id: req.session.user.user_id,
            login_name: req.session.user.login_name,
            user_name: req.session.user.user_name,
            request_ip: utils.getClientIp(req)
        };
        sys_request_log.create(insert_data).then(function (data) {
            if (typeof callback === "function") {
                callback(null, data);
            }
        }).catch(function (err) {
            if (typeof callback === "function") {
                callback(err);
            }
        });
    };
    publicmethod.setSysFuncOpertor = function (req, op_content, callback) {
        var insert_data = {
            user_id: req.session.user["user_id"],
            login_name: req.session.user["login_name"],
            user_name: req.session.user["user_name"],
            op_content: op_content,
            request_ip: utils.getClientIp(req),
            created_by: req.session.user["login_name"],
            updated_b: req.session.user["login_name"]
        };
        sys_operator.create(insert_data).then(function (data) {
            if (typeof callback === "function") {
                callback(null, data);
            }
        }).catch(function (err) {
            if (typeof callback === "function") {
                callback(err);
            }
        });
    };
    publicmethod.getBalanceInfo = function (app_server_id, callback) {
        deploy_ali_balance.findAll({
            where: {app_server_id: app_server_id},
            raw: true
        }).then(function (data) {
            callback(null, data);
        }).catch(function (err) {
            callback(err);
        });
    };
    publicmethod.logError = function (err, otherInfo) {
        var err_msg = "";
        if (typeof err === "string") {
            err_msg = err;
        } else if (err instanceof Error && err.errors) {
            var errors_message = [];
            err.errors.forEach(function (item) {
                errors_message.push(item.message);
            });
            err_msg = errors_message.join("||")
        } else if (err instanceof Error && err.message) {
            err_msg = err.message;
        } else {
            err_msg = err.stack.split("\n")[0];
        }
        if (typeof otherInfo !== "undefined") {
            logger.error(otherInfo + "-" + err_msg);
        } else {
            // logger.error(err_msg);
            logger.error(err);
        }
        return err_msg;
    };
    publicmethod.logInfo = function (info) {
        logger.info(info);
    };
    publicmethod.getBusinessDbRoute = function (env_name, qry_data, type) {
        /*
         * 获取业务库db(数据源路由函数)
         * type 1商户信息  2分区
         * */
        var group_db_name = {
            "z0": "saas-db",
            "z3": "goods-db",
            "za1": "rest-db",
            "zb1": "retail-db",
            "zc1": "erp-store",
            "zd1": "erp-chain"
        };
        if (!env_name || !qry_data || !type) {
            return Promise.reject("请输入商户查询信息");
        }
        if (type === 1) {
            var saas_db = env_name + "_z0_saas-db";
            var tenant_where;
            //商户查询条件，可以转换成数字并且开头不为0，则加入条件
            qry_data = qry_data.toString();
            if (!isNaN(qry_data) && !qry_data.startsWith("0")) {
                tenant_where = {
                    $or: {
                        id: Number(qry_data),
                        code: qry_data,
                        login_name: Sequelize.where(global[saas_db + "_s_user"].rawAttributes.login_name, qry_data),
                        bind_mobile: Sequelize.where(global[saas_db + "_s_user"].rawAttributes.bind_mobile, qry_data)
                    },
                    is_deleted: 0
                }
            } else {
                tenant_where = {
                    $or: {
                        code: qry_data,
                        login_name: Sequelize.where(global[saas_db + "_s_user"].rawAttributes.login_name, qry_data),
                        bind_mobile: Sequelize.where(global[saas_db + "_s_user"].rawAttributes.bind_mobile, qry_data)
                    },
                    is_deleted: 0
                }
            }
            return global[saas_db + "_tenant"].findOne({
                include: {
                    model: global[saas_db + "_s_user"],
                    required: true,
                    where: {
                        is_deleted: 0
                    },
                    attributes: []
                },
                where: tenant_where,
                raw: true
            }).then(function (data) {
                if (!data) {
                    return Promise.reject("没有查到对应的商户");
                } else {
                    var db_name = group_db_name[data.partition_code];
                    if (!db_name) {
                        return Promise.reject("没有查到商户分区对应的业务数据库");
                    } else {
                        var business_db = env_name + "_" + data.partition_code + "_" + db_name;
                        return Promise.resolve({business_db: business_db, tenant_info: data});
                    }
                }
            })
        } else {
            return Promise.resolve(env_name + "_" + qry_data + "_" + group_db_name[qry_data]);
        }
    };
    publicmethod.wirteToExcel = function (data, fields) {
        /*
         * 把[{}]数据写入excel
         * */
        if (data.length === 0) {
            return Promise.reject("导出内容为空，导出失败");
        }
        var data_fields = _.keys(data[0]);
        if (fields) {
            if (fields.length !== data_fields.length) {
                return Promise.reject("导出内容字段，与指定列名不匹配");
            } else {
                data_fields = fields;
            }
        }
        var write_data = [];
        //excel加入列名
        write_data.push(data_fields);
        for (var i = 0, j = data.length; i < j; i++) {
            write_data.push(_.values(data[i]));
        }
        var current_date_time = moment().format("YYYY-MM-DD-HH-mm-ss");
        var export_file_path = path.join(__dirname, '..', 'export', "export-" + current_date_time + '.xlsx');
        //写入Excel
        var buffer = node_xlsx.build([{name: "1", data: write_data}]);
        fs.writeFileSync(export_file_path, buffer, 'binary');
        //压缩excel
        var zip_file_path = path.join(__dirname, '..', 'export', "export-" + current_date_time + ".zip");
        zip_local.sync.zip(export_file_path).compress().save(zip_file_path);
        //删除源文件
        fs.unlink(export_file_path);
        return Promise.resolve(zip_file_path);
    };
    publicmethod.readFromExcel = function (file_path) {
        return new Promise(function (resolve, reject) {
            myssh.getLocalIsFile(file_path, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    var obj = node_xlsx.parse(file_path);
                    var sheet1 = obj[0];
                    var data = sheet1["data"];
                    resolve(data);
                }
            });
        });
    };
    publicmethod.execRpcServiceProxy = function (outaddr, inneraddr, name, args) {
        /*
         * 代理调用rpc服务器信息
         * 参数示例：
         * outaddr：http://118.190.9.128:3002
         * inneraddr：http://10.29.223.203:39003
         * name：getTomcatStatus
         * args：[]
         * */
        //获取外层client
        var client = hprose.Client.create(outaddr, []);
        return new Promise(function (resolve, reject) {
            //把内部调用地址，加入到第一个参数中，代理会获取第一个参数，去调用指定服务器
            args.splice(0, 0, inneraddr);
            //第一个参数为最终调用目标地址
            client.invoke(name, args, {
                onsuccess: function (result) {
                    resolve(result);
                },
                onerror: function (name, err) {
                    resolve(publicmethod.logError(err));
                },
                timeout: 5000
            });
        });
    };
    return publicmethod;
};
module.exports = mymethod;