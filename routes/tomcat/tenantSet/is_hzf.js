//查询商户惠支付配置信息
var publicmethod = param.publicmethod;
var _ = param.underscore._;
var async = param.async;
var fs = param.fs;
var path = param.path;
var myconfig = param.myconfig;
var myssh = param.myssh;
var getTenantHzfInfo = function (req, form_data, callback) {
    var form_fields = form_data["fields"];
    var env_name = form_fields["env_name"];
    var tenant_code = form_fields["tenant_code"];
    var branch_code = form_fields["branch_code"];
    var business_db, tenant_info, hzf_info;
    publicmethod.getBusinessDbRoute(env_name, tenant_code, 1).then(function (data) {
        business_db = data["business_db"];
        tenant_info = data["tenant_info"];
        return global[env_name + "_z0_saas-db_s_pay_account"].findAll({
            where: {
                tenant_id: tenant_info["tenant_id"],
                branch_id: {$not: null},
                umpay_id: {$not: null},
                is_deleted: 0
            },
            attributes: ["tenant_id", "branch_id", "umpay_id"],
            raw: true
        });
    }).then(function (data) {
        hzf_info = data;
        var branch_where = branch_code ? {
            tenant_id: tenant_info["tenant_id"],
            $or: {
                code: branch_code,
                phone: branch_code
            },
            is_deleted: 0
        } : {
            tenant_id: tenant_info["tenant_id"],
            is_deleted: 0
        };
        return global[business_db + "_branch"].findAndCountAll({
            where: branch_where,
            limit: ~~form_fields["limit"] || 0,
            offset: ~~form_fields["offset"] || 0,
            order: [["code", "asc"]],
            raw: true
        });
    }).then(function (data) {
        var total = data["count"];
        var branch_info = data["rows"];
        //合并商户信息到一块
        for (var i = 0, j = branch_info.length; i < j; i++) {
            //归并hzf信息
            for (var m = 0, n = hzf_info.length; m < n; m++) {
                if (branch_info[i]["tenant_id"] === hzf_info[m]["tenant_id"] && branch_info[i]["branch_id"] === hzf_info[m]["branch_id"]) {
                    _.extend(branch_info[i], hzf_info[m])
                }
            }
            //归并商户信息
            if (branch_info[i]["tenant_id"] === tenant_info["tenant_id"]) {
                _.extend(branch_info[i], tenant_info)
            }
            //更改商户分区字段值
            branch_info[i].partition_code = business_db;
        }
        callback(null, {total: total, rows: branch_info});
    }).catch(function (err) {
        callback(err);
    });
};
//绑定惠支付
var bindHzf = function (req, form_data, callback) {
    var form_fields = form_data["fields"];
    var form_files = form_data["files"];
    var env_name = form_fields["env_name"];
    var tenant_id = Number(form_fields["tenant_id"]);
    var branch_id = Number(form_fields["branch_id"]);
    if (!env_name || !tenant_id || !branch_id) {
        callback("传入参数缺失，无法绑定惠支付");
        return;
    }
    if (form_files.length !== 1) {
        callback("配置文件上传失败，请重新上传绑定或联系管理员");
        return;
    }
    //只有www_ali环境支持配置惠支付
    if (env_name !== "www_ali") {
        callback(new Error(env_name + ",此环境不支持惠支付配置"));
        return;
    }
    var hzf_conf_path = form_files[0];

    async.auto({
        //确定配置文件存在
        file_exists: function (callback) {
            fs.exists(hzf_conf_path, function (exists) {
                if (exists) {
                    if (fs.statSync(hzf_conf_path).isFile()) {
                        callback(null, true);
                        return;
                    }
                }
                callback(new Error("没有找到上传的惠支付配置文件"));
            });
        },
        //获取惠支付配置文件编号
        hzf_conf_num: function (callback) {
            var hzf_conf_num = path.basename(hzf_conf_path).split("_")[0];
            callback(null, hzf_conf_num);
        },
        //判定该商户该门店是否在 s_pay_amount表中有数据
        s_pay_amount_exists: function (callback) {
            global[env_name + "_z0_saas-db_s_pay_account"].findAll({
                where: {
                    tenant_id: tenant_id,
                    branch_id: branch_id,
                    is_deleted: 0
                }
            }).then(function (data) {
                if (data.length > 1) {
                    callback("该商户惠支付配置表中数据异常，超过两条");
                } else if (data.length === 1) {
                    callback(null, true)
                } else {
                    callback(null, false)
                }
            }).catch(function (err) {
                callback(err);
            });
        },
        //设置惠支付程序配置文件（ssh地址直接写死）,程序版本在 z0-fs脚本中
        setHzfProgramConf: [
            'file_exists',
            'hzf_conf_num',
            's_pay_amount_exists',
            function (results, callback) {
                var hzf_conf_num = results["hzf_conf_num"];
                var beta_portal, z0_fs1;
                if (typeof myconfig["static_ssh_host"][env_name] === "undefined"
                    || typeof myconfig["static_ssh_host"][env_name]["beta_portal"] === "undefined"
                    || myconfig["static_ssh_host"][env_name]["z0_fs1"] === "undefined") {
                    callback(new Error("惠支付配置失败，无法获取远程服务器ssh配置"));
                    return;
                }
                beta_portal = myconfig["static_ssh_host"][env_name]["beta_portal"];
                z0_fs1 = myconfig["static_ssh_host"][env_name]["z0_fs1"];
                async.auto({
                    conns: function (callback) {
                        myssh.getRemoteSshConn(beta_portal, z0_fs1, function (err, conns) {
                            callback(err, conns);
                        });
                    },
                    //上传惠支付配置文件
                    uploadHzfConf: [
                        'conns',
                        function (results, callback) {
                            var conns = results["conns"];
                            var remote_path = "/nfs/uploads/appdata/http-service/p8/" + path.basename(hzf_conf_path);
                            myssh.execRemoteUploadFile(conns[1], hzf_conf_path, remote_path, function (err) {
                                callback(err);
                            });
                        }
                    ],
                    //设置模板和程序配置惠支付
                    setTemplateConf: [
                        'uploadHzfConf',
                        function (results, callback) {
                            var conns = results["conns"];
                            var cmd = "/nfs/www/config/www/hzf.sh add " + hzf_conf_num;
                            myssh.execRemoteCmd(conns[1], cmd, function (err, data) {
                                if (err) {
                                    callback(err);
                                    return;
                                }
                                if (!/ok/.test(data)) {
                                    callback(new Error("惠支付配置文件上传失败"));
                                    return;
                                }
                                callback(err);
                            });
                        }
                    ]
                }, function (err, results) {
                    if (results["conns"]) {
                        var conns = results["conns"];
                        if (conns[1]) {
                            conns[1].end();
                        }
                        if (conns[0]) {
                            conns[0].end();
                        }
                    }
                    callback(err);
                });
            }
        ],
        //数据库配置门店惠支付
        setHzfDB: [
            'setHzfProgramConf',
            function (results, callback) {
                var hzf_conf_num = results["hzf_conf_num"];
                var s_pay_amount_exists = results["s_pay_amount_exists"];
                if (s_pay_amount_exists) {
                    global[env_name + "_z0_saas-db_s_pay_account"].update({
                        umpay_id: hzf_conf_num
                    }, {
                        where: {
                            tenant_id: tenant_id,
                            branch_id: branch_id,
                            is_deleted: 0
                        },
                        limit: 1,
                    }).then(function (data) {
                        callback(null, true);
                    }).catch(function (err) {
                        callback(err);
                    });
                } else {
                    global[env_name + "_z0_saas-db_s_pay_account"].create({
                        tenant_id: tenant_id,
                        branch_id: branch_id,
                        umpay_id: hzf_conf_num,
                        is_deleted: 0,
                        create_at: new Date(),
                        create_by: "lbl",
                        last_update_at: new Date(),
                        last_update_by: "lbl"
                    }).then(function (data) {
                        callback(null, true);
                    }).catch(function (err) {
                        callback(err);
                    });
                }
            }
        ]
    }, function (err) {
        if (err) {
            callback(err);
            return;
        }
        var hzf_conf_name = path.basename(hzf_conf_path);
        var op_content = "绑定惠支付:" + env_name + ",tenant_id=" + tenant_id + ",branch_id=" + branch_id + ",hzf_conf_name=" + hzf_conf_name;
        publicmethod.setSysFuncOpertor(req, op_content);
        callback(err, "惠支付绑定完成")
    });
};
//惠支付绑定检测
var checkBindHzf = function (req, form_data, callback) {
    var form_fields = form_data["fields"];
    var env_name = form_fields["env_name"];
    var tenant_id = Number(form_fields["tenant_id"]);
    var branch_id = Number(form_fields["branch_id"]);
    var umpay_id = form_fields["umpay_id"];
    //只有www_ali环境支持惠支付检测
    if (env_name !== "www_ali") {
        callback(env_name + ",此环境不支持惠支付检测");
        return;
    }
    global[env_name + "_z0_saas-db_s_pay_account"].findOne({
        where: {
            tenant_id: tenant_id,
            branch_id: branch_id,
            umpay_id: umpay_id,
            is_deleted: 0
        }
    }).then(function (data) {
        if (!data) {
            return Promise.reject("检测完成:该商户门店惠支付检测不通过：数据库中配置错误");
        } else {
            var beta_portal, z0_fs1;
            if (typeof myconfig["static_ssh_host"][env_name] === "undefined"
                || typeof myconfig["static_ssh_host"][env_name]["beta_portal"] === "undefined"
                || myconfig["static_ssh_host"][env_name]["z0_fs1"] === "undefined") {
                callback(new Error("惠支付检测失败，无法获取远程服务器ssh配置"));
                return;
            }
            beta_portal = myconfig["static_ssh_host"][env_name]["beta_portal"];
            z0_fs1 = myconfig["static_ssh_host"][env_name]["z0_fs1"];
            async.auto({
                conns: function (callback) {
                    myssh.getRemoteSshConn(beta_portal, z0_fs1, function (err, conns) {
                        callback(err, conns);
                    });
                },
                //检测远程惠支付
                checkProConf: [
                    'conns',
                    function (results, callback) {
                        var conns = results["conns"];
                        var cmd = "/nfs/www/config/www/hzf.sh check " + umpay_id;
                        myssh.execRemoteCmd(conns[1], cmd, function (err, data) {
                            if (err) {
                                callback(err);
                                return;
                            }
                            if (!/exists/.test(data)) {
                                callback("检测完成:该商户门店惠支付检测不通过，程序中配置错误");
                                return;
                            }
                            callback(err);
                        });
                    }
                ]
            }, function (err, results) {
                if (results["conns"]) {
                    var conns = results["conns"];
                    if (conns[1]) {
                        conns[1].end();
                    }
                    if (conns[0]) {
                        conns[0].end();
                    }
                }
                if (err) {
                    callback(err);
                    return;
                }
                callback(null, "检测完成,惠支付配置一切正常");
            });
        }
    }).catch(function (err) {
        callback(err);
    });
};
//解绑惠支付
var unBindHzf = function (req, form_data, callback) {
    var form_fields = form_data["fields"];
    var env_name = form_fields["env_name"];
    var tenant_id = Number(form_fields["tenant_id"]);
    var branch_id = Number(form_fields["branch_id"]);
    var umpay_id = form_fields["umpay_id"];
    if (!env_name || !tenant_id || !branch_id) {
        callback(new Error("传入参数缺失，无法解绑门店惠支付"));
        return;
    }
    //只有www_ali环境支持解绑惠支付
    if (env_name !== "www_ali") {
        callback(new Error(env_name + ",此环境不支持解绑惠支付"));
        return;
    }
    global[env_name + "_z0_saas-db_s_pay_account"].update({
        umpay_id: null
    }, {
        where: {
            tenant_id: tenant_id,
            branch_id: branch_id,
            is_deleted: 0
        },
        limit: 10
    }).then(function (data) {
        var op_content = "解绑惠支付:" + env_name + ",tenant_id=" + tenant_id + ",branch_id=" + branch_id + ",umpay_id=" + umpay_id;
        publicmethod.setSysFuncOpertor(req, op_content);
        callback(null, "门店惠支付解绑成功");
    }).catch(function (err) {
        callback(err);
    });
};
module.exports = function (req, form_data, callback) {
    var form_fields = form_data["fields"];
    var exec_type = form_fields["exec_type"];
    switch (exec_type + "") {
        //查询商户惠支付信息
        case '1': {
            getTenantHzfInfo(req, form_data, function (err, result) {
                callback(err, result);
            });
        }
            break;
        //绑定惠支付
        case '3': {
            bindHzf(req, form_data, function (err, result) {
                callback(err, result);
            });
        }
            break;
        //解绑惠支付
        case '4': {
            unBindHzf(req, form_data, function (err, result) {
                callback(err, result);
            });
        }
            break;
        //惠支付绑定检测
        case '5': {
            checkBindHzf(req, form_data, function (err, result) {
                callback(err, result);
            });
        }
            break;
        default:
            callback(new Error("传入参数不正确,未找到执行类型"));
    }
};