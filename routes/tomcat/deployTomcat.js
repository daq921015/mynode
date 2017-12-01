/**
 * Created by Administrator on 2017-03-27.
 */
//tomcat部署
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var path = param.path;
    var fs = param.fs;
    var myssh = param.myssh;
    var async = param.async;
    var logError = param.publicmethod.logError;
    var logInfo = param.publicmethod.logInfo;
    var publicmethod = param.publicmethod;
    var authority = param.authority;
    var myredis = param.myredis;
    var _ = param.underscore._;
    var utils = param.utils;
    var deploy_tomcat = param.myconfig.deploy_tomcat;
    //获取本地文件信息
    var UpWarPath = "/nfs/docker/wars";
    var unZipDir = "/tomcat";
    var war_public_dir = process.platform === 'win32' ? "Y:/" : "/home/sftp/release";//app共目录
    router.get("/getDeployTomcat", function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        var from_data = _.pick(form_fields, "env_name", "group_name", "program_name", "app_server_id");
        var menu, operator, tomcats;
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id),
            authority.getUserTomcatResource(req, 1)
        ]).then(function (data) {
            menu = data[0];
            operator = data[1];
            tomcats = data[2];
            var env_name = _.has(from_data, "env_name") ? from_data["env_name"] : _.first(_.keys(tomcats));
            var group_name = _.has(from_data, "group_name") && env_name ? form_fields["group_name"] : _.first(_.keys(tomcats[env_name]));
            //此处_.first(tomcats[env_name][group_name]) 有问题（用户没有任何部署权限时会报错 undefined）
            var program_name = _.has(from_data, "program_name") && group_name ? form_fields["program_name"] : _.first(tomcats[env_name][group_name]);
            return Promise.all([
                getVersions(program_name, 'snapshots'),
                getTargetServer(req, env_name, group_name, program_name)
            ])
        }).then(function (data) {
            var versions = data[0];
            var deploy_server = data[1];
            res.render(routeDir + "deployTomcat/index", {
                tomcats: tomcats,
                versions: versions,
                deploy_server: deploy_server,
                title: "程序部署",
                menu: menu,
                operator: operator,
                resTag: sider_id,
                session: req.session,
                from_data: from_data
            });
        }).catch(function (err) {
            res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
        });
    });
    router.get('/:action', function (req, res, next) {
        var action = req.params.action;
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var env_name = form_fields["env_name"];
        var group_name = form_fields["group_name"];
        var program_name = form_fields["program_name"];
        var app_server_id = form_fields["app_server_id"];
        var appversion = form_fields["appversion"];
        var apptype = form_fields["apptype"];
        var up_deploy = form_fields["up_deploy"];
        var env_conf = req.session.user["env_conf"];
        switch (action) {
            //获取部署页面
            case 'getWars' : {
                getWars(req, env_name, program_name, apptype).then(function (data) {
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
            case 'getVersions' : {
                getVersions(program_name, apptype).then(function (data) {
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
            case 'getTargetServer' : {
                getTargetServer(req, env_name, group_name, program_name).then(function (data) {
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
            case 'doDeploy' : {
                if (_.indexOf(deploy_tomcat.special_env, env_name) !== -1) {
                    doSpecialDeploy(env_name, group_name, program_name, app_server_id, appversion, apptype, req.session.user["user_name"]).then(function (data) {
                        res.end(JSON.stringify({"status": "success", "msg": data}));
                    }).catch(function (err) {
                        res.end(JSON.stringify({"status": "success", "msg": logError(err)}));
                    });
                } else {
                    doDeploy(env_name, group_name, program_name, app_server_id, appversion, apptype, req.session.user["user_name"]).then(function (data) {
                        res.end(JSON.stringify({"status": "success", "msg": data}));
                    }).catch(function (err) {
                        res.end(JSON.stringify({"status": "success", "msg": logError(err)}));
                    });
                }
            }
                break;
            case 'autoUpload' : {
                autoUpload(env_name, group_name, program_name, appversion, apptype).then(function (data) {
                    if (!(up_deploy == 1 && app_server_id !== "0")) {
                        res.end(JSON.stringify({"status": "success", "msg": "上传成功"}));
                        return;
                    }
                    if (_.indexOf(deploy_tomcat.special_env, env_name) !== -1) {
                        doSpecialDeploy(env_name, group_name, program_name, app_server_id, appversion, apptype, req.session.user["user_name"]).then(function (data) {
                            res.end(JSON.stringify({"status": "success", "msg": data}));
                        }).catch(function (err) {
                            res.end(JSON.stringify({"status": "success", "msg": logError(err)}));
                        });
                    } else {
                        doDeploy(env_name, group_name, program_name, app_server_id, appversion, apptype, req.session.user["user_name"]).then(function (data) {
                            res.end(JSON.stringify({"status": "success", "msg": data}));
                        }).catch(function (err) {
                            res.end(JSON.stringify({"status": "success", "msg": logError(err)}));
                        });
                    }
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "success", "msg": logError(err)}));
                });
            }
                break;
            default:
                res.end(JSON.stringify({"status": "error", "msg": "the addr of get request is not exist"}));
        }
    }).post('/:action', function (req, res, next) {
        res.end(JSON.stringify({"status": "error", "msg": "the addr of post request is not exist"}));
    });
//获取程序版本号
    var getVersions = function (program_name, apptype) {
        var sourcepath = path.join(war_public_dir, apptype);
        return new Promise(function (resolve, reject) {
            myssh.getLocalReadDirFilesDetail(sourcepath, function (err, files) {
                if (err) {
                    reject(err);
                } else {
                    var files_arr = _.keys(files);
                    var versioninfo = [];
                    for (var i = 0, j = files_arr.length; i < j; i++) {
                        var filename = files_arr[i];
                        if (filename.indexOf(program_name) != -1) {
                            var re = new RegExp("[0-9]+\.[0-9]+\.[0-9]+");
                            var matchresult = filename.match(re);
                            if (matchresult) {
                                versioninfo.push(matchresult[0]);
                            }
                        }
                    }
                    //版本自定义排序
                    var ret = versioninfo.sort(function (A, B) {
                        var array_A = A.split(".");
                        var array_B = B.split(".");
                        var result = -1;
                        if (array_A.length !== 3 && array_B.length !== 3) {
                            return result;
                        }
                        for (var i = 0, j = 3; i < j; i++) {
                            if (isNaN(array_A[i]) || isNaN(array_B[i])) {
                                break;
                            }
                            var A_num = parseInt(array_A[i]);
                            var B_num = parseInt(array_B[i]);
                            if (A_num == B_num) {
                                continue;
                            }
                            result = B_num - A_num;
                            break;
                        }
                        return result;
                    }).slice(0, 8);
                    resolve(ret);
                }
            })
        });
    };
//获取目标服务器
    var getTargetServer = function (req, env_name, group_name, program_name) {
        return deploy_app_server.findAll({
            include: {
                model: deploy_res_info,
                required: true,
                attributes: [],
                where: {
                    env_name: env_name,
                    group_name: group_name,
                    program_name: program_name
                }
            },
            where: {
                is_disable: 0
            },
            attributes: [["id", "app_server_id"], "alias"],
            raw: true
        }).then(function (data) {
            return Promise.resolve(data);
        });
    };
//获取所有war包信息
    var getWars = function (req, env_name, program_name, apptype) {
        var remotepath = UpWarPath + "/" + apptype;
        return deploy_env_config.findOne({
            where: {
                env_name: env_name
            },
            attributes: [["tunnel_ip", "host"], ["tunnel_user", "username"], ["tunnel_pwd", "password"], ["tunnel_port", "port"]],
            raw: true
        }).then(function (tunnelHost) {
            if (!tunnelHost) {
                return Promise.reject("没有找到环境配置：" + env_name);
            }
            return new Promise(function (resolve, reject) {
                async.waterfall([
                    function (callback) {
                        myssh.getRemoteSshConn(tunnelHost, function (err, tunnelHostSsh) {
                            callback(err, tunnelHostSsh[0]);
                        });
                    }, function (tunnelHostSsh, callback) {
                        myssh.getRemoteSftpDir(tunnelHostSsh, remotepath, function (err, files) {
                            tunnelHostSsh.end();
                            callback(err, files);
                        });
                    }, function (files, callback) {
                        var warinfo = [];
                        for (var i = 0, j = files.length; i < j; i++) {
                            if (files[i]["longname"].indexOf(program_name) != -1) {
                                warinfo.push(files[i]["longname"]);
                            }
                        }
                        //按照版本排序
                        warinfo.sort(function (obj1, obj2) {
                            var A = "0.0.0", B = "0.0.0";
                            var version_no_A = obj1.match(/\d{1,2}\.\d{1,2}\.\d{1,2}/);
                            var version_no_B = obj2.match(/\d{1,2}\.\d{1,2}\.\d{1,2}/);
                            if (version_no_A) {
                                A = version_no_A[0];
                            }
                            if (version_no_B) {
                                B = version_no_B[0];
                            }
                            var array_A = A.split(".");
                            var array_B = B.split(".");
                            var result = -1;
                            if (array_A.length !== 3 && array_B.length !== 3) {
                                return result;
                            }
                            for (var i = 0, j = 3; i < j; i++) {
                                if (isNaN(array_A[i]) || isNaN(array_B[i])) {
                                    break;
                                }
                                var A_num = parseInt(array_A[i]);
                                var B_num = parseInt(array_B[i]);
                                if (A_num === B_num) {
                                    continue;
                                }
                                result = B_num - A_num;
                                break;
                            }
                            return result;
                        });
                        callback(null, warinfo);
                    }
                ], function (err, warinfo) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(warinfo);
                    }
                });
            });
        });
    };
//自动下载并上传文件
    var autoUpload = function (env_name, group_name, program_name, appversion, apptype) {
        return deploy_env_config.findOne({
            where: {
                env_name: env_name
            },
            attributes: [["tunnel_ip", "host"], ["tunnel_user", "username"], ["tunnel_pwd", "password"], ["tunnel_port", "port"]],
            raw: true
        }).then(function (outserver) {
            if (!outserver) {
                return Promise.reject("没有找到环境配置：" + env_name);
            }
            return new Promise(function (resolve, reject) {
                var sourcepath = war_public_dir + "/" + apptype + "/" + program_name + "-" + appversion + ".war";
                var remotepath = UpWarPath + "/" + apptype + "/" + program_name + "-" + appversion + ".war";
                async.auto({
                    outconn: function (callback) {
                        //获取上传远程连接
                        myssh.getRemoteSshConn(outserver, function (err, outconn) {
                            callback(err, outconn[0]);
                        });
                    },
                    uploadFile: [
                        'outconn',
                        function (results, callback) {
                            var outconn = results["outconn"];
                            //上传文件
                            myssh.execRemoteUploadFile(outconn, sourcepath, remotepath, function (err) {
                                outconn.end();
                                callback(err);
                            })
                        }
                    ]
                }, function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    };
//部署服务器
    var doDeploy = function (env_name, group_name, program_name, app_server_id, appversion, apptype, user_name) {
        return Promise.all([
            deploy_app_server.findOne({
                where: {
                    id: app_server_id
                },
                raw: true
            }),
            deploy_env_config.findOne({
                where: {
                    env_name: env_name
                },
                raw: true
            })
        ]).then(function (data) {
            if (!data[0] || !data[1]) {
                return Promise.reject("没有找到部署服务器配置信息");
            }
            var server = _.extend(data[0], data[1]);
            return new Promise(function (resolve, reject) {
                var alias = server["alias"];
                var res_info_id = server["res_info_id"];
                var outserver = {
                    host: server["tunnel_ip"],
                    username: server["tunnel_user"],
                    password: server["tunnel_pwd"],
                    port: server["tunnel_port"]
                };
                var innerserver = {
                    host: server["host_ip"],
                    username: server["host_user"],
                    password: server["host_pwd"],
                    port: server["host_port"]
                };
                /**
                 * 步骤：
                 * 1、先判断目标服务器上是否有此war包（没有提示后停止后续操作，有直接部署）
                 * 2、判断解压缩目录是否存在（不存在先创建，目录路径包括环境、分区、别名-versoin（防止集群冲突））
                 * 3、解压缩war包到指定目录
                 * 4、更改程序配置文件（更改之前先要获取模板文件，然后修改后直接写到指定位置，不要更改模板）
                 * 5、启动docker(docker中设置软链接指向该程序解压目录)（supervisor:docker还需要与主机映射一个管理端口9900）
                 */
                var existsWarPath = UpWarPath + "/" + apptype + "/" + program_name + '-' + appversion + ".war";
                var unZipPath = unZipDir + "/" + env_name + "/webapps/" + group_name + "/" + alias + "-" + appversion + "/";
                var appconfdir = path.join(__dirname, '..', '..', 'config', 'tomcat', 'appconf', group_name + "/" + program_name);
                var appconfremotepath = unZipPath + "WEB-INF/classes/";
                async.auto({
                    //获取app pro.properties配置文件内容
                    getPorProperties: function (callback) {
                        publicmethod.getDeployAppConf(res_info_id, function (err, app_conf) {
                            callback(err, app_conf);
                        });
                    },
                    //获取本地模板文件列表
                    getLocalReadDir: function (callback) {
                        publicmethod.getLocalReadDir(appconfdir, function (err, files) {
                            callback(err, files);
                        });
                    },
                    //获取服务器链接
                    conns: function (callback) {
                        myssh.getRemoteSshConn(outserver, innerserver, function (err, conns) {
                            callback(err, conns);
                        });
                    },
                    //判断部署war包是否存在
                    war: [
                        'conns',
                        function (results, callback) {
                            myssh.getRemoteExists(results["conns"][0], existsWarPath, function (err, exist) {
                                if (!exist) {
                                    callback(new Error(program_name + '-' + appversion + ':war包不存在,请先上传然后再部署'));
                                    return;
                                }
                                callback(err);
                            });
                        }
                    ],
                    //确认war包解压目录是否存在，不存在则创建
                    affirm_war_dir: [
                        'conns',
                        function (results, callback) {
                            myssh.execRemoteMakeDirs(results["conns"][1], unZipPath, function (err, result) {
                                callback(err);
                            });
                        }
                    ],
                    //解压缩war包到指定目录
                    "unZipWar": [
                        'war',
                        'affirm_war_dir',
                        function (results, callback) {
                            var cmd = "rm -rf " + unZipPath + "* && unzip -oq " + existsWarPath + " -d " + unZipPath;
                            myssh.execRemoteCmd(results["conns"][1], cmd, function (err) {
                                callback(err);
                            });
                        }
                    ],
                    //上传模板配置文件到部署服务器
                    uploadConfDir: [
                        'unZipWar',
                        function (results, callback) {
                            myssh.execRemoteUploadDir(results["conns"][1], appconfdir, appconfremotepath, function (err) {
                                callback(err);
                            });
                        }
                    ],
                    //替换pro.properties
                    replaceProProperties: [
                        'getPorProperties',
                        'uploadConfDir',
                        function (results, callback) {
                            var cmd = "echo '" + results["getPorProperties"] + "' >" + appconfremotepath + "pro.properties";
                            myssh.execRemoteCmd(results["conns"][1], cmd, function (err) {
                                callback(err);
                            });
                        }
                    ],
                    //读取本地模板文件内容，替换动态变量并把内容上传到远程配置。注：动态变量要与数据库字段名一致
                    replaceTempConfAndUpload: [
                        'getLocalReadDir',
                        'uploadConfDir',
                        function (results, callback) {
                            var server_conf = server;
                            var files = results["getLocalReadDir"];
                            var conn = results["conns"][1];
                            server_conf["env_name"] = env_name;
                            server_conf["group_name"] = group_name;
                            server_conf["program_name"] = program_name;
                            server_conf["app_server_id"] = app_server_id;
                            server_conf["appversion"] = appversion;
                            server_conf["apptype"] = apptype;
                            //只替换指定扩展名的文件
                            var extname = ".properties.xml.yml.groovy.service";
                            async.each(files, function (file, callback) {
                                async.waterfall([
                                    function (callback) {
                                        //读取模板配置
                                        fs.readFile(file, {encoding: 'utf-8'}, function (err, data) {
                                            callback(err, data);
                                        });
                                    }, function (data, callback) {
                                        //替换变量并上传
                                        if (extname.indexOf(path.extname(file)) >= 0) {
                                            for (var field in server_conf) {
                                                var str = "\\$" + field;
                                                var re = new RegExp(str, 'gm');
                                                data = data.replace(re, server_conf[field]);
                                            }
                                            //配置文件双引号替换 斜杠+双引号
                                            data = data.replace(/\"/g, '\\"');
                                            //替换 \n\r 为 \n (win文件替换为unix文件)
                                            var file_name = path.basename(file);
                                            var cmd = "echo \"" + data + "\" >" + appconfremotepath + file_name;
                                            myssh.execRemoteCmd(conn, cmd, function (err) {
                                                callback(err);
                                            });
                                        } else {
                                            callback(null);
                                        }
                                    }
                                ], function (err) {
                                    callback(err);
                                });
                            }, function (err) {
                                callback(err);
                            });
                        }
                    ],
                    //删除重名容器
                    delDockerContainer: [
                        'conns',
                        function (results, callback) {
                            var container_exists = env_name + "-" + group_name + "-" + alias;
                            var docker_stop = "docker rm -f `docker ps -a |grep " + container_exists + "|awk '{print $NF}'`";
                            myssh.execRemoteCmd(results["conns"][1], docker_stop, function (err) {
                                callback(err);
                            });
                        }
                    ],
                    //启动容器
                    startDockerContainer: [
                        'delDockerContainer',
                        'replaceTempConfAndUpload',
                        'replaceProProperties',
                        function (results, callback) {
                            var deployServerInfo = server;
                            var productPath = '<Context path="' + deployServerInfo["tomcat_path"] + '" docBase="' + unZipPath + '" reloadable="false" privileged="false" antiResourceLocking="false" />';
                            var memory = deployServerInfo["docker_memory"];
                            var map_tomcat_port = deployServerInfo["map_tomcat_port"];
                            var map_ssh_port = deployServerInfo["map_ssh_port"];
                            var map_rpc_port = deployServerInfo["map_rpc_port"];
                            var main_redis_ip = deployServerInfo["main_redis_ip"];
                            var main_redis_pwd = deployServerInfo["main_redis_pwd"];
                            var container_name = env_name + "-" + group_name + "-" + alias + "-" + appversion;
                            //启动部署容器
                            var docker_start = "date";
                            if (program_name == "saas-gateway") {
                                docker_start = "docker run -t -d -m " + memory + " --name=" + container_name + " -v /var/logback/pos:/var/logback/pos -v /tomcat:/tomcat -v /nfs/uploads:/nfs/uploads -p " + map_tomcat_port + ":8080  -p " + map_ssh_port + ":22 -p " + map_rpc_port + ":3001 " + " -p 61247:61247 -e productPath='" + productPath + "' -e main_redis_ip='" + main_redis_ip + "' -e main_redis_pwd='" + main_redis_pwd + "' tomcat_img";
                            } else {
                                docker_start = "docker run -t -d -m " + memory + " --name=" + container_name + " -v /tomcat:/tomcat -v /nfs/uploads:/nfs/uploads -p " + map_tomcat_port + ":8080  -p " + map_ssh_port + ":22 -p " + map_rpc_port + ":3001 " + " -e productPath='" + productPath + "' -e main_redis_ip='" + main_redis_ip + "' -e main_redis_pwd='" + main_redis_pwd + "' tomcat_img";
                            }
                            logInfo(docker_start);
                            myssh.execRemoteCmd(results["conns"][1], docker_start, function (err) {
                                callback(err);
                            });
                        }
                    ]
                }, function (err, results) {
                    if (err) {
                        reject(err);
                    } else {
                        if (results["conns"]) {
                            var conns = results["conns"];
                            if (conns[1]) {
                                conns[1].end();
                            }
                            if (conns[0]) {
                                conns[0].end();
                            }
                        }
                        //部署没有报错，记录部署日志
                        var deploy_server = server;
                        var deploy_info = {
                            res_info_id: deploy_server["res_info_id"],
                            app_server_id: app_server_id,
                            env_name: env_name,
                            group_name: group_name,
                            program_name: program_name,
                            apptype: apptype,
                            appversion: appversion,
                            user_name: user_name,
                            alias: deploy_server["alias"],
                            host_ip: deploy_server["host_ip"],
                            host_alias: deploy_server["host_alias"]
                        };
                        if (err) {
                            deploy_info["deploy_result"] = "失败";
                        } else {
                            deploy_info["deploy_result"] = "成功";
                        }
                        deploy_app_history.create(deploy_info);
                        resolve("部署程序，执行完毕");
                    }
                });
            });
        });
    };
//特殊环境部署(方象生产环境、尚米生产环境)
    var doSpecialDeploy = function (env_name, group_name, program_name, app_server_id, appversion, apptype, user_name) {
        return Promise.all([
            deploy_app_server.findOne({
                where: {
                    id: app_server_id
                },
                raw: true
            }),
            deploy_env_config.findOne({
                where: {
                    env_name: env_name
                },
                raw: true
            })
        ]).then(function (data) {
            if (!data[0] || !data[1]) {
                return Promise.reject("没有找到部署服务器配置信息");
            }
            var server = _.extend(data[0], data[1]);
            return new Promise(function (resolve, reject) {
                var alias = server["alias"];
                var res_info_id = server["res_info_id"];
                var outserver = {
                    host: server["tunnel_ip"],
                    username: server["tunnel_user"],
                    password: server["tunnel_pwd"],
                    port: server["tunnel_port"]
                };
                var innerserver = {
                    host: server["host_ip"],
                    username: server["host_user"],
                    password: server["host_pwd"],
                    port: server["host_port"]
                };
                /**
                 * 步骤：
                 * 1、先判断目标服务器上是否有此war包（没有提示后停止后续操作，有直接部署）
                 * 2、判断解压缩目录是否存在（不存在先创建，目录路径包括环境、分区、别名-versoin（防止集群冲突））
                 * 3、解压缩war包到指定目录
                 * 4、更改程序配置文件（更改之前先要获取模板文件，然后修改后直接写到指定位置，不要更改模板）
                 */
                var existsWarPath = UpWarPath + "/" + apptype + "/" + program_name + '-' + appversion + ".war";
                var unZipPath = unZipDir + "/" + env_name + "/webapps/" + group_name + "/" + alias + "-" + appversion + "/";
                var appconfdir = path.join(__dirname, '..', '..', 'config', 'tomcat', 'appconf', group_name + "/" + program_name);
                var appconfremotepath = unZipPath + "WEB-INF/classes/";
                async.auto({
                    //获取app pro.properties配置文件内容
                    getPorProperties: function (callback) {
                        publicmethod.getDeployAppConf(res_info_id, function (err, app_conf) {
                            callback(err, app_conf);
                        });
                    },
                    //获取本地模板文件列表
                    getLocalReadDir: function (callback) {
                        publicmethod.getLocalReadDir(appconfdir, function (err, files) {
                            callback(err, files);
                        });
                    },
                    //获取阿里云负载均衡对象
                    aliyunbalance: function (callback) {
                        var aliyunbalance = param["ali_balance_" + env_name];
                        if (typeof aliyunbalance === "undefined") {
                            callback(new Error("该服务器：" + group_name + "-" + program_name + ",没有配置阿里云负载均衡，无法部署"));
                            return;
                        }
                        callback(null, aliyunbalance);
                    },
                    //获取部署服务器，阿里云负载均衡信息
                    balance_info: function (callback) {
                        publicmethod.getBalanceInfo(app_server_id, function (err, balance_infos) {
                            if (err) {
                                callback(err);
                                return;
                            }
                            if (balance_infos.length !== 1) {
                                callback(new Error("服务器：" + group_name + "-" + program_name + ",没有获取到服务器对应阿里云负载均衡信息,部署中止"));
                                return;
                            }
                            callback(err, balance_infos[0]);
                        });
                    },
                    //获取服务器链接(从阿里云负载移除后才能进行其它操作)(移除之前先确认负载均衡中服务器数不能少于2)
                    conns: function (callback) {
                        myssh.getRemoteSshConn(outserver, innerserver, function (err, conns) {
                            callback(err, conns);
                        });
                    },
                    //判断部署war包是否存在
                    war: [
                        'conns',
                        function (results, callback) {
                            myssh.getRemoteExists(results["conns"][0], existsWarPath, function (err, exist) {
                                if (!exist) {
                                    callback(new Error(program_name + '-' + appversion + ':war包不存在,请先上传然后再部署'));
                                    return;
                                }
                                callback(err);
                            });
                        }
                    ],
                    //统一阿里云api(不区分四层还是七层)
                    alibalanceApi: [
                        'war',
                        'aliyunbalance',
                        'balance_info',
                        function (results, callback) {
                            var balance_info = results["balance_info"];
                            var aliyunbalance = results["aliyunbalance"];
                            var alibalanceApi = {};
                            if (balance_info["server_type"] === 0) {
                                //四层负载均衡
                                alibalanceApi["searchBalanceInfo"] = aliyunbalance.DescribeHealthStatus;
                                alibalanceApi["removeBalanceServer"] = aliyunbalance.RemoveBackendServers;
                                //操作对象id
                                alibalanceApi["object_id"] = balance_info["balance_id"];
                                //服务器id
                                alibalanceApi["server_id"] = balance_info["server_id"];
                            } else if (balance_info["server_type"] === 1) {
                                //七层负载均衡
                                alibalanceApi["searchBalanceInfo"] = aliyunbalance.DescribeVServerGroupAttribute;
                                alibalanceApi["removeBalanceServer"] = aliyunbalance.RemoveVServerGroupBackendServers;
                                alibalanceApi["object_id"] = balance_info["v_group_id"];
                                alibalanceApi["server_id"] = balance_info["server_id"];
                            } else {
                                callback(new Error("服务器：" + group_name + "-" + program_name + ",负载均衡配置状态不被允许,无法部署"));
                                return;
                            }
                            callback(null, alibalanceApi);
                        }
                    ],
                    //查看部署服务器负载均衡中剩余服务器数量
                    descriAlibeBalance: [
                        'alibalanceApi',
                        function (results, callback) {
                            var aliyunbalance = results["aliyunbalance"];
                            var alibalanceApi = results["alibalanceApi"];
                            var object_id = alibalanceApi["object_id"];
                            //对象改变需要用call
                            alibalanceApi["searchBalanceInfo"].call(aliyunbalance, object_id, function (err, result) {
                                if (err) {
                                    callback(err);
                                    return;
                                }
                                if (result["statusCode"] !== 200) {
                                    callback(new Error("获取负载均衡服务器信息失败:object_id=" + object_id + ",返回结果:" + JSON.stringify(result)));
                                    return;
                                }
                                var server_count = result["data"]["BackendServers"]["BackendServer"].length;
                                callback(err, server_count);
                            });
                        }
                    ],
                    // 从阿里云负载均衡中移除该服务器
                    removeFromAliBalance: [
                        'descriAlibeBalance',
                        function (results, callback) {
                            var aliyunbalance = results["aliyunbalance"];
                            var alibalanceApi = results["alibalanceApi"];
                            var object_id = alibalanceApi["object_id"];
                            var server_id = alibalanceApi["server_id"];
                            var server_count = results["descriAlibeBalance"];
                            //明确是单实例的程序，直接跳过
                            if (server_count === 1 && _.indexOf(deploy_tomcat["single_instance"][env_name], group_name + "-" + program_name) !== -1) {
                                callback(null);
                                return;
                            }
                            if (server_count < 2) {
                                callback(new Error("object_id=" + object_id + ",阿里云负载均衡中当前服务器数小于两个，中止部署"));
                                return;
                            }
                            //负载均衡移除服务器
                            alibalanceApi["removeBalanceServer"].call(aliyunbalance, object_id, server_id, function (err, result) {
                                if (err) {
                                    callback(err);
                                    return;
                                }
                                if (result["statusCode"] !== 200) {
                                    callback(new Error("从负载均衡中移除服务器失败:object_id" + object_id + ",server_id=" + server_id + ",返回结果:" + JSON.stringify(result)));
                                    return;
                                }
                                callback(err);
                            });
                        }
                    ],
                    //确认war包解压目录是否存在，不存在则创建
                    affirm_war_dir: [
                        'removeFromAliBalance',
                        function (results, callback) {
                            myssh.execRemoteMakeDirs(results["conns"][1], unZipPath, function (err, result) {
                                callback(err);
                            });
                        }
                    ],
                    //解压缩war包到指定目录
                    "unZipWar": [
                        'affirm_war_dir',
                        function (results, callback) {
                            var cmd = "rm -rf " + unZipPath + "* && unzip -oq " + existsWarPath + " -d " + unZipPath;
                            myssh.execRemoteCmd(results["conns"][1], cmd, function (err) {
                                callback(err);
                            });
                        }
                    ],
                    //上传模板配置文件到部署服务器
                    uploadConfDir: [
                        'unZipWar',
                        function (results, callback) {
                            myssh.execRemoteUploadDir(results["conns"][1], appconfdir, appconfremotepath, function (err) {
                                callback(err);
                            });
                        }
                    ],
                    //替换pro.properties
                    replaceProProperties: [
                        'getPorProperties',
                        'uploadConfDir',
                        function (results, callback) {
                            var cmd = "echo '" + results["getPorProperties"] + "' >" + appconfremotepath + "pro.properties";
                            myssh.execRemoteCmd(results["conns"][1], cmd, function (err) {
                                callback(err);
                            });
                        }
                    ],
                    //读取本地模板文件内容，替换动态变量并把内容上传到远程配置。注：动态变量要与数据库字段名一致
                    replaceTempConfAndUpload: [
                        'getLocalReadDir',
                        'uploadConfDir',
                        function (results, callback) {
                            var server_conf = server;
                            var files = results["getLocalReadDir"];
                            var conn = results["conns"][1];
                            server_conf["env_name"] = env_name;
                            server_conf["group_name"] = group_name;
                            server_conf["program_name"] = program_name;
                            server_conf["app_server_id"] = app_server_id;
                            server_conf["appversion"] = appversion;
                            server_conf["apptype"] = apptype;
                            //只替换指定扩展名的文件
                            var extname = ".properties.xml.yml.groovy.service";
                            async.each(files, function (file, callback) {
                                async.waterfall([
                                    function (callback) {
                                        //读取模板配置
                                        fs.readFile(file, {encoding: 'utf-8'}, function (err, data) {
                                            callback(err, data);
                                        });
                                    }, function (data, callback) {
                                        //替换变量并上传
                                        if (extname.indexOf(path.extname(file)) >= 0) {
                                            for (var field in server_conf) {
                                                var str = "\\$" + field;
                                                re = new RegExp(str, 'gm');
                                                data = data.replace(re, server_conf[field]);
                                            }
                                            //配置文件双引号替换 斜杠+双引号
                                            data = data.replace(/\"/g, '\\"');
                                            //替换 \n\r 为 \n (win文件替换为unix文件)
                                            var file_name = path.basename(file);
                                            var cmd = "echo \"" + data + "\" >" + appconfremotepath + file_name;
                                            myssh.execRemoteCmd(conn, cmd, function (err) {
                                                callback(err);
                                            });
                                        } else {
                                            callback(null);
                                        }
                                    }
                                ], function (err) {
                                    callback(err);
                                });
                            }, function (err) {
                                callback(err);
                            });
                        }
                    ],
                    //清除旧软连接，并挂载新的软链接
                    setProgramLink: [
                        'conns',
                        'unZipWar',
                        function (results, callback) {
                            var mount_link = "rm -rf /var/www/webapps/" + program_name + " && ln -s " + unZipPath + " /var/www/webapps/" + program_name;
                            myssh.execRemoteCmd(results["conns"][1], mount_link, function (err) {
                                callback(err);
                            });
                        }
                    ],
                    //重新挂载软连接、更新配置文件后，停止tomcat清除原先日志
                    stopTomcat: [
                        'setProgramLink',
                        'replaceProProperties',
                        'replaceTempConfAndUpload',
                        function (results, callback) {
                            var stop_tomcat = "service tomcatd stop;rm -rf /usr/local/tomcat/logs/catalina.*";
                            myssh.execRemoteCmd(results["conns"][1], stop_tomcat, function (err, data) {
                                callback(err);
                            });
                        }
                    ],
                    //程序停止之后再加入到等待队列中（防止程序还没停止，又加入到阿里云负载均衡）
                    pushtomcatToqueue: [
                        'stopTomcat',
                        function (results, callback) {
                            var balance_info = results["balance_info"];
                            //移除完成后，加入到服务器启动队列，后续监控程序启动状况
                            //重新插入到负载均衡前，需要先检查程序是否完全启动
                            //所需数据
                            var server_count = results["descriAlibeBalance"];
                            //明确是单实例的程序，直接跳过
                            if (server_count === 1 && _.indexOf(deploy_tomcat["single_instance"][env_name], group_name + "-" + program_name) !== -1) {
                                callback(null);
                                return;
                            }
                            var deploy_tomcat2 = {
                                //环境
                                env_name: env_name,
                                //分组
                                group_name: group_name,
                                //程序
                                program_name: program_name,
                                //服务器别名
                                server_alias: balance_info["server_alias"],
                                //部署服务器id
                                app_server_id: balance_info["app_server_id"],
                                //负载均衡id
                                balance_id: balance_info["balance_id"],
                                //虚拟服务器组id
                                v_group_id: balance_info["v_group_id"],
                                //阿里云服务器id
                                server_id: balance_info["server_id"],
                                //阿里云服务器类型 0四层负载，1七层负载
                                server_type: balance_info["server_type"],
                                //隧道机ip(也是rpc代理所在的机器)(rpc代理默认使用3002端口)
                                tunnel_ip: server["tunnel_ip"],
                                //部署目标服务器ip(rpc逻辑处理程序所在服务器)(rpc默认端口3001)
                                host_ip: server["host_ip"]
                            };
                            myredis.lpush("deploy_tomcat", JSON.stringify(deploy_tomcat2));
                            callback(null);
                        }
                    ],
                    //重启tomcat
                    restartTomcat: [
                        'pushtomcatToqueue',
                        function (results, callback) {
                            var restart_tomcat = "service tomcatd restart";
                            myssh.execRemoteCmd(results["conns"][1], restart_tomcat, function (err, data) {
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
                    //部署没有报错，记录部署日志
                    var deploy_server = server;
                    var deploy_info = {
                        res_info_id: deploy_server["res_info_id"],
                        app_server_id: app_server_id,
                        env_name: env_name,
                        group_name: group_name,
                        program_name: program_name,
                        apptype: apptype,
                        appversion: appversion,
                        user_name: user_name,
                        alias: deploy_server["alias"],
                        host_ip: deploy_server["host_ip"],
                        host_alias: deploy_server["host_alias"]
                    };
                    if (err) {
                        deploy_info["deploy_result"] = "失败";
                    } else {
                        deploy_info["deploy_result"] = "成功";
                    }
                    deploy_app_history.create(deploy_info);
                    resolve("部署程序，执行完毕");
                });
            });
        });
    };
    return router;
};
