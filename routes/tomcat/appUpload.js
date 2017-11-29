/*
 * 环境权限
 * create_ty:liubanglong
 * Time:2017-10-09
 * */
//supervisor 进程控制路由
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var authority = param.authority;
    var utils = param.utils;
    var fs = param.fs;
    var path = param.path;
    var crypto = param.crypto;
    var myssh = param.myssh;
    var myconfig = param.myconfig;
    var moment = param.moment;
    var myredis = param.myredis;
    var _ = param.underscore._;
    var async = param.async;
    var logError = param.publicmethod.logError;
    var logInfo = param.publicmethod.logInfo;
    var war_public_dir = process.platform === 'win32' ? "Y:/" : "/home/sftp/release";//app共目录
    router.get('/getAppUpload', function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id),
            authority.getUserEnvResource(req, 10)
        ]).then(function (data) {
            var menu = data[0];
            var operator = data[1];
            var envs = data[2];
            res.render(routeDir + "appUpload/index", {
                operator: operator,
                envs: envs,
                menu: menu,
                title: "商户数据设置",
                resTag: sider_id,
                session: req.session
            });
        }).catch(function (err) {
            res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
        });
    });
    router.get('/appUploadOperator', function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        //具体执行功能
        var operator = form_fields["operator"];
        var env_name = form_fields["env_name"];
        if (!env_name || !operator) {
            res.end(JSON.stringify({"status": "error", "msg": "传入参数缺失"}));
            return;
        }
        switch (operator + "") {
            //查询app信息
            case '2': {
                const app_business = form_fields["app_business"];
                const app_type = form_fields["app_type"];
                global[env_name + "_z0_saas-db_app"].findAndCountAll({
                    where: {
                        business: app_business,
                        type: app_type,
                        is_deleted: 0
                    },
                    limit: Number(form_fields["limit"]) || 0,
                    offset: Number(form_fields["offset"]) || 0,
                    order: [[form_fields["sortName"] || "create_at", form_fields["sortOrder"] || 'desc']],
                    raw: true
                }).then(function (data) {
                    res.end(JSON.stringify({
                        "status": "success", "msg": "", "data": {
                            "total": data["count"],
                            "rows": data["rows"]
                        }
                    }));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            //设置pos最新
            case '3': {
                const app_id = form_fields["app_id"] || 0;
                const app_type = form_fields["app_type"] || 0;
                global[env_name + "_z0_saas-db_app"].update({
                    is_latest: 0
                }, {
                    where: {
                        type: app_type,
                        is_deleted: 0
                    },
                    raw: true
                }).then(function (data) {
                    return global[env_name + "_z0_saas-db_app"].update({
                        is_latest: 1
                    }, {
                        where: {
                            id: app_id,
                            is_deleted: 0
                        },
                        raw: true
                    });
                }).then(function (data) {
                    res.end(JSON.stringify({"status": "success", "msg": "pos最新版本设置完毕"}));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            //设置网站最新
            case '4': {
                const app_id = form_fields["app_id"] || 0;
                const app_type = form_fields["app_type"] || 0;
                global[env_name + "_z0_saas-db_app"].update({
                    is_web_latest: 0
                }, {
                    where: {
                        type: app_type,
                        is_deleted: 0
                    },
                    raw: true
                }).then(function (data) {
                    return global[env_name + "_z0_saas-db_app"].update({
                        is_web_latest: 1
                    }, {
                        where: {
                            id: app_id,
                            is_deleted: 0
                        },
                        raw: true
                    });
                }).then(function (data) {
                    res.end(JSON.stringify({"status": "success", "msg": "网站最新版本设置完毕"}));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            //设置强制升级
            case '5': {
                const app_id = form_fields["app_id"] || 0;
                global[env_name + "_z0_saas-db_app"].update({
                    is_force_update: 1
                }, {
                    where: {
                        id: app_id,
                        is_deleted: 0
                    },
                    raw: true
                }).then(function (data) {
                    res.end(JSON.stringify({"status": "success", "msg": "强制升级设置完毕"}));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            //取消强制升级
            case '6': {
                const app_id = form_fields["app_id"] || 0;
                global[env_name + "_z0_saas-db_app"].update({
                    is_force_update: 0
                }, {
                    where: {
                        id: app_id,
                        is_deleted: 0
                    },
                    raw: true
                }).then(function (data) {
                    res.end(JSON.stringify({"status": "success", "msg": "强制升级已经取消"}));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            //删除app
            case '8': {
                const app_id = form_fields["app_id"] || 0;
                global[env_name + "_z0_saas-db_app"].findOne({
                    where: {
                        id: app_id,
                        $or: {
                            is_latest: 1,
                            is_web_latest: 1
                        },
                        is_deleted: 0
                    },
                    attributes: ["id"],
                    raw: true
                }).then(function (data) {
                    if (data) {
                        return Promise.reject("具有pos最新或网站最新的版本无法被删除");
                    } else {
                        return global[env_name + "_z0_saas-db_app"].update({
                            is_deleted: 1
                        }, {
                            where: {
                                id: app_id,
                                is_deleted: 0
                            },
                            raw: true
                        });
                    }
                }).then(function (data) {
                    res.end(JSON.stringify({"status": "success", "msg": "指定pos版本删除成功"}));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            //查询上传app信息（从redis）
            case '9': {
                var limit = Number(form_fields["limit"]) || 0;
                var offset = Number(form_fields["offset"]) || 0;
                var program_name = form_fields["program_name"];
                myredis.get("warstore_programs", function (err, data) {
                    if (err) {
                        logError(err);
                        res.end(JSON.stringify(JSON.stringify({"status": "error", "msg": "从缓存中获取程序库失败"})));
                        return;
                    }
                    var warstore_programs = JSON.parse(data);
                    var all_rows = [];
                    //筛选
                    if (typeof program_name !== "undefined") {
                        for (var key in warstore_programs) {
                            if (key.indexOf(program_name) >= 0) {
                                all_rows.push(warstore_programs[key]);
                            }
                        }
                    } else {
                        all_rows = _.values(warstore_programs);
                    }
                    //按照构建时间排序
                    all_rows.sort(function (obj1, obj2) {
                        var val1 = obj1.file_crate_time;
                        var val2 = obj2.file_crate_time;
                        if (moment(val1).unix() < moment(val2).unix()) {
                            return 1;
                        } else {
                            return -1;
                        }
                    });
                    var rows = all_rows.slice(offset, offset + limit);
                    var total = all_rows.length;
                    res.end(JSON.stringify({
                        "status": "success",
                        "msg": "",
                        "data": {"total": total, "rows": rows}
                    }));
                });
            }
                break;
            //下载程序
            case '10': {
                // //下载文件目录
                var path_name = path.join(war_public_dir, form_fields["path_name"]);
                var pro_name = path.basename(path_name);
                var fReadStream;
                fs.exists(path_name, function (exist) {
                    if (exist) {
                        res.set({
                            "Content-type": "application/octet-stream",
                            "Content-Disposition": "attachment;filename=" + encodeURI(pro_name)
                        });
                        fReadStream = fs.createReadStream(path_name);
                        fReadStream.on("data", function (chunk) {
                            res.write(chunk, "binary")
                        });
                        fReadStream.on("end", function () {
                            res.end();
                        });
                    } else {
                        res.set("Content-type", "text/html");
                        res.send("file not exist!");
                        res.end();
                    }
                });
            }
                break;
            case "11": {
                async.auto({
                    upload_files: function (callback) {
                        myssh.getLocalReadDirFilesDetail(path.join(war_public_dir, "upload"), function (err, files) {
                            callback(err, files);
                        })
                    },
                    releases_files: function (callback) {
                        myssh.getLocalReadDirFilesDetail(path.join(war_public_dir, "releases"), function (err, files) {
                            callback(err, files);
                        })
                    },
                    snapshots_files: function (callback) {
                        myssh.getLocalReadDirFilesDetail(path.join(war_public_dir, "snapshots"), function (err, files) {
                            callback(err, files);
                        })
                    },
                    //获取仓库中所有程序信息
                    build_programs: [
                        'upload_files',
                        'releases_files',
                        'snapshots_files',
                        function (results, callback) {
                            var upload_files = results["upload_files"];
                            var releases_files = results["releases_files"];
                            var snapshots_files = results["snapshots_files"];
                            var build_programs = {};
                            //upload目录程序信息
                            for (var file_name in  upload_files) {
                                build_programs[file_name] = {
                                    "path_name": path.join('/upload', file_name),
                                    "file_size": upload_files[file_name]["file_size"],
                                    "file_crate_time": upload_files[file_name]["file_crate_time"],
                                    "file_modify_time": upload_files[file_name]["file_modify_time"],
                                }
                            }
                            //releases目录程序信息
                            for (var file_name in  releases_files) {
                                build_programs[file_name] = {
                                    "path_name": path.join('/releases', file_name),
                                    "file_size": releases_files[file_name]["file_size"],
                                    "file_crate_time": releases_files[file_name]["file_crate_time"],
                                    "file_modify_time": releases_files[file_name]["file_modify_time"],
                                }
                            }
                            //snapshots目录程序信息
                            for (var file_name in  snapshots_files) {
                                build_programs[file_name] = {
                                    "path_name": path.join('/snapshots', file_name),
                                    "file_size": snapshots_files[file_name]["file_size"],
                                    "file_crate_time": snapshots_files[file_name]["file_crate_time"],
                                    "file_modify_time": snapshots_files[file_name]["file_modify_time"],
                                }
                            }
                            callback(null, build_programs);
                        }
                    ],
                    //把程序信息存入redis
                    warstore_programs: [
                        'build_programs',
                        function (results, callback) {
                            var build_programs = results["build_programs"];
                            myredis.set("warstore_programs", JSON.stringify(build_programs));
                            callback(null);
                        }
                    ]
                }, function (err, results) {
                    if (err) {
                        logError(err);
                        res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                        return;
                    }
                    res.render(routeDir + "appUpload/programList", {});
                });
            }
                break;
            default:
                res.end(JSON.stringify({"status": "error", "msg": "the operator of get request is not exist"}));
        }
    }).post('/appUploadOperator', function (req, res, next) {
        var upload_dir = path.join(__dirname, '..', '..', 'upload');
        var max_size = 50 * 1024 * 1024; //一次性最多上传50M
        utils.postForm(req, upload_dir, max_size, function (err, result) {
            if (err) {
                res.end(JSON.stringify({"status": "error", "msg": "获取post表单内容出错"}));
                return;
            }
            var form_data = result;
            var form_fields = form_data["fields"];
            //具体执行功能
            var env_name = form_fields["env_name"];
            var operator = form_fields["operator"];
            if (!env_name || !operator) {
                res.end(JSON.stringify({"status": "error", "msg": "传入参数缺失"}));
                return;
            }
            switch (operator + "") {
                case '1': {
                    var manual_pro = form_fields["manual_pro"];
                    var app_business = form_fields["app_business"];
                    var app_type = form_fields["app_type"];
                    var app_is_latest = form_fields["app_is_latest"];
                    var app_is_forceUpdate = form_fields["app_is_forceUpdate"];
                    var app_is_WebLatest = form_fields["app_is_WebLatest"];
                    var notes = form_fields["notes"];
                    var version_no = "0.0.1";
                    var login_name = req.session.user["login_name"];
                    var file_path = "";//上传APP，本地路径
                    //上传远程目录
                    var remote_path = {
                        "1": "/nfs/uploads/app/business" + app_business + "/www/Android/",
                        "2": "/nfs/uploads/app/business" + app_business + "/www/Windows/",
                        "4": "/nfs/uploads/app/business" + app_business + "/www/AErp/",
                        "5": "/nfs/uploads/app/business" + app_business + "/www/Android/Local/",
                        "6": "/nfs/uploads/app/business" + app_business + "/www/Windows/Local/",
                        "7": "/nfs/uploads/app/business" + app_business + "/www/FPOS/",
                        "8": "/nfs/uploads/app/business" + app_business + "/www/WPOS/",
                        "9": "/nfs/uploads/app/business" + app_business + "/www/windownsUpdate/",
                        "10": "/nfs/uploads/app/business" + app_business + "/www/AndroidUpdate/"
                    };
                    //手动上传的app
                    if (manual_pro === "on") {
                        file_path = form_data["files"].length > 0 ? form_data["files"][0] : "";
                        version_no = form_fields["version_no"];
                    } else {
                        file_path = path.join(war_public_dir, form_fields["auto_path_name"]);
                        var version_no_arr = file_path.match(/\d{1,2}\.\d{1,2}\.\d{1,2}/);
                        if (!version_no_arr) {
                            res.end(JSON.stringify({"status": "error", "msg": "无法获取程序版本号"}));
                            return;
                        }
                        version_no = version_no_arr[0];
                    }
                    var program_name = path.basename(file_path);
                    if (typeof remote_path[app_type] === "undefined") {
                        res.end(JSON.stringify({"status": "error", "msg": "没有找到远程上传目录"}));
                        return;
                    }
                    var remote_file_path = remote_path[app_type] + program_name;
                    //开始上传
                    async.auto({
                        file_exists: function (callback) {
                            myssh.getLocalIsFile(file_path, function (err, exist) {
                                callback(err, exist);
                            });
                        },
                        already_upload: [
                            'file_exists',
                            function (results, callback) {
                                global[env_name + "_z0_saas-db_app"].findAll({
                                    where: {
                                        type: app_type,
                                        business: app_business,
                                        version_no: version_no,
                                        is_deleted: 0
                                    },
                                    raw: true
                                }).then(function (data) {
                                    if (data.length > 0) {
                                        callback("对应业态、平台和版本的程序已经上传，请删除后重新上传");
                                        return;
                                    }
                                    callback(null);
                                }).catch(function (err) {
                                    callback(logError(err));
                                });
                            }
                        ],
                        //获取上传服务器ssh地址
                        static_ssh: [
                            'already_upload',
                            function (results, callback) {
                                var file_exists = results["file_exists"];
                                if (!file_exists) {
                                    callback(new Error("上传的APP文件没有找到"));
                                    return;
                                }
                                var beta_portal, z0_fs1;
                                if (typeof myconfig["static_ssh_host"][env_name] === "undefined"
                                    || typeof myconfig["static_ssh_host"][env_name]["beta_portal"] === "undefined"
                                    || myconfig["static_ssh_host"][env_name]["z0_fs1"] === "undefined") {
                                    callback(new Error("app上传失败，无法获取远程服务器ssh配置"));
                                    return;
                                }
                                beta_portal = myconfig["static_ssh_host"][env_name]["beta_portal"];
                                z0_fs1 = myconfig["static_ssh_host"][env_name]["z0_fs1"];
                                callback(null, [beta_portal, z0_fs1]);
                            }
                        ],
                        //获取ssh连接
                        conns: [
                            'static_ssh',
                            function (results, callback) {
                                var static_ssh = results["static_ssh"];
                                myssh.getRemoteSshConn(static_ssh[0], static_ssh[1], function (err, conns) {
                                    callback(err, conns);
                                });
                            }
                        ],
                        upload_file: [
                            'conns',
                            function (results, callback) {
                                var conns = results["conns"];
                                myssh.execRemoteUploadFile(conns[1], file_path, remote_file_path, function (err) {
                                    callback(err);
                                });
                            }
                        ],
                        //释放ssh
                        free_ssh: [
                            'upload_file',
                            function (results, callback) {
                                if (results["conns"]) {
                                    var conns = results["conns"];
                                    if (conns[1]) {
                                        conns[1].end();
                                    }
                                    if (conns[0]) {
                                        conns[0].end();
                                    }
                                }
                                callback(null);
                            }
                        ],
                        //上传文件md5签名
                        file_md5: [
                            'free_ssh',
                            function (results, callback) {
                                var start = new Date().getTime();
                                var md5sum = crypto.createHash('md5');
                                var stream = fs.createReadStream(file_path);
                                stream.on('data', function (chunk) {
                                    md5sum.update(chunk);
                                });
                                stream.on('end', function () {
                                    var file_md5 = md5sum.digest('hex').toUpperCase();
                                    logInfo('文件:' + file_path + ',MD5签名为:' + file_md5 + '.耗时:' + (new Date().getTime() - start) / 1000.00 + "秒");
                                    callback(null, file_md5);
                                });
                            }
                        ],
                        //如果本次pos有最新，把历史最新去掉
                        update_latest: [
                            'file_md5',
                            function (results, callback) {
                                var sql_option = {};
                                if (Number(app_is_latest) === 1) {
                                    sql_option["is_latest"] = 0;
                                }
                                if (Number(app_is_WebLatest) === 1) {
                                    sql_option["is_web_latest"] = 0;
                                }
                                if (_.keys(sql_option).length <= 0) {
                                    callback(null);
                                    return;
                                }
                                global[env_name + "_z0_saas-db_app"].update(sql_option, {
                                    where: {
                                        type: app_type,
                                        is_deleted: 0
                                    },
                                    raw: true
                                }).then(function (data) {
                                    callback(null);
                                }).catch(function (err) {
                                    callback(err);
                                });
                            }
                        ],
                        insert_db: [
                            'update_latest',
                            function (results, callback) {
                                var saas_db = results["saas_db"];
                                var file_md5 = results["file_md5"];
                                var login_name = req.session.user["login_name"];
                                var insert_data = {
                                    app_name: program_name,
                                    version_no: version_no,
                                    app_type: app_type,
                                    app_notes: notes,
                                    file_md5: file_md5,
                                    file_path: remote_file_path,
                                    app_business: app_business,
                                    create_by: login_name,
                                    is_force_update: app_is_forceUpdate,
                                    is_latest: app_is_latest,
                                    is_web_latest: app_is_WebLatest,
                                    app_create_by: login_name,
                                    is_deleted: 0
                                };
                                global[env_name + "_z0_saas-db_app"].create(insert_data, {
                                    raw: true
                                }).then(function (data) {
                                    callback(null);
                                }).catch(function (err) {
                                    callback(err);
                                });
                            }
                        ]
                    }, function (err, results) {
                        if (err) {
                            logError(err);
                            res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                            return;
                        }
                        res.end(JSON.stringify({"status": "success", "msg": "", "data": "app上传成功，请点击查询验证"}));
                    });
                }
                    break;
                default:
                    res.end(JSON.stringify({"status": "error", "msg": "the operator of post request is not exist"}));
            }
        });
    });
    router.get('/:action', function (req, res, next) {
        var action = req.params.action;
        res.end(JSON.stringify({"status": "error", "msg": "the addr of get request is not exist"}));
    }).post('/:action', function (req, res, next) {
        var action = req.params.action;
        res.end(JSON.stringify({"status": "error", "msg": "the addr of post request is not exist"}));
    });
    return router;
};