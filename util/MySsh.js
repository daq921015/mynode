/**
 * Created by Administrator on 2017-08-09.
 * 隧道机一定要安装 nmap和nc命令  yum -y install nmap nc
 */
var MySsh = function (param) {
    "use strict";
    var ssh2 = param.ssh2;
    var Client = ssh2.Client;
    var fs = param.fs;
    var path = param.path;
    var events = param.events;
    var through = param.through;
    var async = param.async;
    var util = param.util;
    var moment = param.moment;
    var log4js = require("../service/logConfig");
    //log4js.configure();
    var logger = log4js.logger("MySsh");

    /**
     * 描述：控制上传或者下载一个一个的执行
     */
    function Control() {
        events.EventEmitter.call(this);
    }

    util.inherits(Control, events.EventEmitter); // 使这个类继承EventEmitter
    var control = new Control();
    control.on("donext", function (todos, callback) {
        if (todos.length > 0) {
            var func = todos.shift();
            func(function (err, result) {
                if (err) {
                    callback(err);
                    return;
                }
                control.emit("donext", todos, callback);
            });
        } else {
            callback(null);
        }
    });

    var myssh = {};
    myssh.getRemoteSshConn = function () {
        /*
         * 获取远程ssh连接
         * 参数[outserver,callback]或[outserver,innerserver,callback]
         * 返回callback(err,[outconn])或callback(err,[outconn,innerconn]);
         * */
        //分配参数
        var outserver, innerserver, outConn, innerConn, callback;
        if (arguments.length == 2 && typeof arguments[1] === "function") {
            outserver = arguments[0];
            callback = arguments[1];
        } else if (arguments.length == 3 && typeof arguments[2] === "function") {
            outserver = arguments[0];
            innerserver = arguments[1];
            callback = arguments[2];
            innerConn = new Client();
        } else {
            return {"status": "error", "msg": "参数错误"}
        }
        outConn = new Client();
        async.waterfall([
            function (callback) {
                //获取第一层ssh连接
                outConn.on('ready', function () {
                    logger.info(outserver['host'] + ":" + outserver['port'] + " connect");
                    callback(null, outConn);
                }).on('error', function (err) {
                    callback(new Error(logError(err) + "--" + outserver['host'] + ":" + outserver['port'] + ' 服务器连接失败'));
                }).on('close', function (err) {
                    if (err) {
                        logger.error(err);
                        return;
                    }
                    logger.info(outserver['host'] + ":" + outserver['port'] + ' close.');
                }).connect(outserver);
            }, function (outConn, callback) {
                //获取第二层连接
                if (typeof innerConn === "undefined") {
                    callback(null, [outConn]);
                    return;
                }
                var cmd = 'nmap -sS -p ' + innerserver["port"] + " " + innerserver["host"];
                //先检测nmap是否通
                myssh.execRemoteCmd(outConn, cmd, function (err, data) {
                    if (err) {
                        outConn.end();
                        callback(new Error(innerserver['host'] + ":" + innerserver['port'] + " nmap命令执行失败"));
                        return;
                    }
                    var check = data.indexOf("open");
                    if (check <= 0) {
                        outConn.end();
                        callback(new Error(cmd + ":端口检测不通，服务器未启动"));
                        return;
                    }
                    //利用nc stream连接内部服务器
                    var nc_cmd = 'nc -w 10 ' + innerserver["host"] + ' ' + innerserver['port'];
                    outConn.exec(nc_cmd, function (err, stream) {
                        if (err) {
                            outConn.end();
                            callback(new Error(logError(err) + "--" + innerserver['host'] + ":" + innerserver['port'] + ' 服务器连接失败'));
                            return;
                        }
                        innerConn.on('ready', function () {
                            logger.info(innerserver['host'] + ":" + innerserver['port'] + " connect");
                            callback(null, [outConn, innerConn]);
                        }).on('error', function (err) {
                            outConn.end();
                            callback(new Error(logError(err) + "--" + innerserver['host'] + ":" + innerserver['port'] + ' 服务器连接失败'));
                        }).on('close', function (err) {
                            if (err) {
                                logger.error(err);
                                return;
                            }
                            logger.info(innerserver['host'] + ":" + innerserver['port'] + ' close.');
                        }).connect({
                            sock: stream,
                            username: innerserver["username"],
                            password: innerserver["password"],
                            port: innerserver["port"]
                        });
                    });
                });
            }
        ], function (err, conns) {
            callback(err, conns);
        });
    };
    myssh.getRemoteFileOrDirList = function (conn, remotePath, isFile, callback) {
        /*
         * 描述：获取远程文件路径下文件列表信息
         * 参数:
         *      conn:远程连接
         *      remotePath:远程路径；
         *      isFile:是否是获取文件，true获取文件信息，false获取目录信息；
         *      callback:回调函数
         * 回调：callback(err, dirs) dir, 获取的列表信息
         * */
        var cmd = "find " + remotePath + " -type " + (isFile == true ? "f" : "d") + "\nexit\n";
        myssh.execRemoteCmd(conn, cmd, function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            var dirs = [];
            var arr = data.split("\r\n");
            arr.forEach(function (dir) {
                if (dir.indexOf(remotePath) == 0) {
                    dirs.push(dir);
                }
            });
            callback(null, dirs);
        });
    };
    myssh.getRemoteSftpDir = function (conn, remotePath, callback) {
        /*
         * 描述：获取sftp文件夹下文件,如果目录不存在则返回callback(err,[]);
         * 参数：conn:远程连接
         *       remotePath：远程路径
         *       callback：回调函数
         * 回调：callback(err, [{},{}]) 对象中问文件属性
         * */
        async.waterfall([
            function (callback) {
                //先判断目标是否存在
                myssh.getRemoteExists(conn, remotePath, function (err, result) {
                    callback(err, result);
                });
            }, function (exist, callback) {
                if (!exist) {
                    callback(null, []);
                    return;
                }
                conn.sftp(function (err, sftp) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    sftp.readdir(remotePath, function (err, result) {
                        sftp.end();
                        callback(err, result);
                    });
                });
            }
        ], function (err, result) {
            if (err) {
                callback(err);
                return;
            }
            callback(null, result);
        });
    };
    myssh.getRemoteExists = function (conn, remotePath, callback) {
        /*
         * 判断远程目录或文件是否存在
         * 参数：
         *       conn:远程连接
         *       remotePath:远程路径
         * 返回：callback(err,Boolean);
         * */
        conn.sftp(function (err, sftp) {
            if (err) {
                callback(err);
                return;
            }
            sftp.exists(remotePath, function (result) {
                sftp.end();
                callback(null, result);
            });
        });
    };

    myssh.execRemoteCmd = function (conn, cmd, callback) {
        /*
         * 执行远程命令
         * 参数：conn:远程连接，cmd：执行命令，callback:回调函数
         * 返回：callback(err,data)
         * */
        conn.exec(cmd, function (err, stream) {
            if (err) {
                callback(err);
                return;
            }
            var data = "";
            stream.pipe(through(function onWrite(buf) {
                data = data + buf;
            }, function onEnd() {
                stream.unpipe();
            }));
            stream.on('close', function () {
                if (callback) {
                    callback(null, '' + data);
                }
            });
        });
    };
    myssh.execRemoteUploadFile = function (conn, localPath, remotePath, callback) {
        /*
         * 描述：上传文件,本地文件不存在报错，远程目录不存在递归创建
         * 参数：
         *      conn:远程连接
         *      localPath:本地路径
         *      remotePath:远程路径
         *      callback:回调函数
         * 回调：callback(err)
         * */
        async.waterfall([
            function (callback) {
                myssh.getLocalExists(localPath, function (err, exist) {
                    callback(err, exist);
                });
            }, function (exist, callback) {
                if (!exist) {
                    callback(new Error("上传文件，本地文件不存在"));
                    return;
                }
                //确保远程目录存在，不存在则创建
                myssh.execRemoteMakeDirs(conn, path.dirname(remotePath), function (err) {
                    callback(err);
                });
            }, function (callback) {
                conn.sftp(function (err, sftp) {
                    callback(err, sftp);
                });
            }, function (sftp, callback) {
                sftp.fastPut(localPath, remotePath, function (err, result) {
                    sftp.end();
                    callback(err);
                });
            }
        ], function (err, result) {
            callback(err);
        });
    };
    var cnt = 0;
    myssh.execRemoteUploadDir = function (conn, localDir, remoteDir, callback) {
        /*
         * 描述：上传文件夹到远程linux机器
         * 参数:
         *      conn:远程连接
         *      remotePath:远程路径；
         *      localDir:本地路径，
         *      callback:回调函数
         * 回调：callback(err)
         * */
        var that = this;
        var dirs = [];
        var files = [];
        myssh.getLocalFileAndDirList(localDir, dirs, files);
        // 创建远程目录
        var todoDir = [];
        var todoCmd = [];
        var fileName = 'tmp_' + cnt + '.sh';
        cnt++;
        var shCmdFile = fs.createWriteStream(fileName);

        dirs.forEach(function (dir) {
            var to = path.join(remoteDir, dir.substring(localDir.length + 1)).replace(/[\\]/g, '/');
            var cmd = "mkdir -p " + to + "\n";
            todoCmd.push(cmd);
            fs.appendFileSync(fileName, cmd, 'utf8');
        });
        shCmdFile.end();

        // 上传文件
        var todoFile = [];
        files.forEach(function (file) {
            todoFile.push(function (done) {
                var to = path.join(remoteDir, file.substring(localDir.length + 1)).replace(/[\\]/g, '/');
                //logger.info("upload " + file + ' to ' + to);
                myssh.execRemoteUploadFile(conn, file, to, function (err, result) {
                    done(err, result);
                });
            });
        });

        // 创建根目录
        myssh.execRemoteCmd(conn, 'mkdir -p ' + remoteDir + '\nexit\n', function (err, data) {
            if (err) {
                callback(err);
            } else {
                // 上传命令，运行、删除命令
                myssh.execRemoteUploadFile(conn, fileName, remoteDir + '/' + fileName, function (err, result) {
                    fs.unlinkSync(fileName);// 删除命令文件
                    if (err) {
                        logger.error(err);
                        return;
                    }
                    myssh.execRemoteCmd(conn, 'cd ' + remoteDir + '\nsh ' + fileName + '\nrm -rf ' + fileName + '\nexit\n', function (err, date) {
                        control.emit("donext", todoFile, function (err) {
                            if (err) {
                                logger.error(err);
                                return;
                            }
                            if (callback)
                                callback(err);
                        });
                    });
                });
            }
        });
    };
    myssh.execRemoteDownloadFile = function (conn, remotePath, localPath, callback) {
        /*
         * 描述：下载文件,远程文件不存在返回错误，本地目录不存在创建目录
         * 参数：
         *      conn:远程连接
         *      localPath:本地文件路径
         *      remotePath:远程文件
         *      callback:回调函数
         * 回调：callback(err)
         * */
        async.waterfall([
            function (callback) {
                //判断远程文件是否存在
                myssh.getRemoteExists(conn, remotePath, function (err, exist) {
                    callback(err, exist);
                });
            }, function (exist, callback) {
                if (!exist) {
                    callback(new Error("下载远程文件，远程文件不存在"));
                    return;
                }
                //确保本地目录存在，不存在则递归创建
                var base_dir = path.dirname(localPath);
                myssh.execLocalMakeDirs(base_dir, function (err) {
                    callback(err);
                });
            }, function (callback) {
                //获取sftp
                conn.sftp(function (err, sftp) {
                    callback(err, sftp);
                });
            }, function (sftp, callback) {
                //下载远程文件
                sftp.fastGet(remotePath, localPath, function (err, result) {
                    sftp.end();
                    callback(err);
                });
            }
        ], function (err) {
            callback(err);
        });
    };
    myssh.execRemoteDownloadDir = function (conn, remoteDir, localDir, callback) {
        /*
         * 描述：下载目录到本地
         * 参数:
         *      conn:远程连接
         *      remotePath:远程路径
         *      localDir:本地路径
         *      callback:回调函数
         * 回调：callback(err)
         * */
        myssh.getRemoteFileOrDirList(conn, remoteDir, false, function (err, dirs) {
            if (err) {
                callback(err);
                return;
            }
            myssh.getRemoteFileOrDirList(conn, remoteDir, true, function (err, files) {
                if (err) {
                    callback(err);
                    return;
                }
                dirs.shift();
                dirs.forEach(function (dir) {
                    var tmpDir = path.join(localDir, dir.slice(remoteDir.length + 1)).replace(/[//]\g/, '\\');
                    // 创建目录
                    fs.mkdirSync(tmpDir);
                });
                var todoFiles = [];
                files.forEach(function (file) {
                    var tmpPath = path.join(localDir, file.slice(remoteDir.length + 1)).replace(/[//]\g/, '\\');
                    todoFiles.push(function (done) {
                        // that.downloadFile(file, tmpPath, done);
                        myssh.execRemoteDownloadFile(conn, file, tmpPath, function (err, result) {
                            done(err, result);
                        });
                        logger.info("downloading the " + file);
                    });// end of todoFiles.push
                });
                control.emit("donext", todoFiles, callback);
            });
        });
    };
    myssh.execRemoteMakeDirs = function (conn, remoteDir, callback) {
        /*
         * 描述：创建目录
         * 参数:
         *      conn:远程连接
         *      remoteDir:远程路径；
         *      callback:回调函数
         * 回调：callback(err, date) : data创建目录之后返回的信息
         * */
        var cmd = 'mkdir -p ' + remoteDir + '\nexit\n';
        myssh.execRemoteCmd(conn, cmd, callback);
    };
    myssh.execRemoteRemoveDirs = function (conn, remoteDir, callback) {
        /*
         * 描述：删除目录
         * 参数：
         *      conn:远程连接
         *      remoteDir:远程路径
         *      callback:回调函数
         * 回调：callback(err, date) : data 删除之后返回的信息
         * */
        var cmd = 'rm -rf ' + remoteDir + '\nexit\n';
        myssh.execRemoteCmd(conn, cmd, callback);
    };

    myssh.getLocalExists = function (localPath, callback) {
        fs.exists(localPath, function (exist) {
            callback(null, exist);
        });
    };
    myssh.execLocalMakeDirs = function (localPath, callback) {
        /*
         * 创建本地目录
         * */
        async.waterfall([
            function (callback) {
                //判断本地目录是否存在
                myssh.getLocalExists(localPath, function (err, exist) {
                    callback(err, exist);
                });
            }, function (exist, callback) {
                if (exist) {
                    callback(null);
                    return;
                }
                myssh.execLocalMakeDirs(path.dirname(localPath), function (err) {
                    //判断父及目录是否存在
                    if (err) {
                        callback(err);
                        return;
                    }
                    //创建本地目录
                    fs.mkdir(localPath, function (err) {
                        callback(err);
                    });
                });
            }
        ], function (err, result) {
            callback(err);
        });
    };
    myssh.getLocalFileAndDirList = function (localDir, dirs, files) {
        /*
         * 获取指定目录下的所有目录和文件（递归获取）
         * */
        var dir = fs.readdirSync(localDir);
        for (var i = 0; i < dir.length; i++) {
            var p = path.join(localDir, dir[i]);
            var stat = fs.statSync(p);
            if (stat.isDirectory()) {
                dirs.push(p);
                myssh.getLocalFileAndDirList(p, dirs, files);
            }
            else {
                files.push(p);
            }
        }
    };
    myssh.getLocalIsDirectory = function (localDir, callback) {
        /*
        * 是否为目录
        * */
        async.auto({
            path_exists: function (callback) {
                myssh.getLocalExists(localDir, function (err, exist) {
                    callback(err, exist);
                });
            },
            is_directory: [
                'path_exists',
                function (results, callback) {
                    var path_exists = results["path_exists"];
                    if (!path_exists) {
                        callback(null, false);
                        return;
                    }
                    var is_directory = fs.statSync(localDir).isDirectory();
                    callback(null, is_directory);
                }
            ]
        }, function (err, results) {
            if (err) {
                callback(err);
                return;
            }
            var is_directory = results["is_directory"];
            callback(err, is_directory);
        });
    };
    myssh.getLocalIsFile = function (localDir, callback) {
        /*
        * 是否为文件
        * */
        async.auto({
            path_exists: function (callback) {
                myssh.getLocalExists(localDir, function (err, exist) {
                    callback(err, exist);
                });
            },
            is_file: [
                'path_exists',
                function (results, callback) {
                    var path_exists = results["path_exists"];
                    if (!path_exists) {
                        callback(null, false);
                        return;
                    }
                    var is_file = fs.statSync(localDir).isFile();
                    callback(null, is_file);
                }
            ]
        }, function (err, results) {
            if (err) {
                callback(err);
                return;
            }
            var is_file = results["is_file"];
            callback(err, is_file);
        });
    };
    myssh.getLocalReadDir = function (localDir, callback) {
        /*
        * 读取本地目录下的所有文件和目录
        * */
        async.auto({
            is_directory: function (callback) {
                myssh.getLocalIsDirectory(localDir, function (err, is_directory) {
                    callback(err, is_directory);
                })
            },
            files: [
                'is_directory',
                function (results, callback) {
                    var is_directory = results["is_directory"];
                    if (!is_directory) {
                        callback(null, []);
                        return;
                    }
                    fs.readdir(localDir, function (err, files) {
                        callback(err, files);
                    })
                }
            ]
        }, function (err, results) {
            if (err) {
                callback(err);
            }
            var files = results["files"];
            callback(err, files);
        });
    };
    myssh.getLocalReadDirFiles = function (localDir, callback) {
        /*
        * 获取本地目录下的所有文件
        * */
        async.auto({
            is_directory: function (callback) {
                myssh.getLocalIsDirectory(localDir, function (err, is_directory) {
                    callback(err, is_directory);
                })
            },
            all_files: [
                'is_directory',
                function (results, callback) {
                    var is_directory = results["is_directory"];
                    if (!is_directory) {
                        callback(null, []);
                        return;
                    }
                    fs.readdir(localDir, function (err, files) {
                        callback(err, files);
                    })
                }
            ],
            files: [
                'all_files',
                function (results, callback) {
                    var all_files = results["all_files"];
                    var files = [];
                    for (var i = 0, j = all_files.length; i < j; i++) {
                        var file_path = path.join(localDir, all_files[i]);
                        if (fs.statSync(file_path).isFile()) {
                            files.push(all_files[i]);
                        }
                    }
                    callback(null, files);
                }
            ]
        }, function (err, results) {
            if (err) {
                callback(err);
            }
            var files = results["files"];
            callback(err, files);
        });
    };
    myssh.getLocalReadDirFilesDetail = function (localDir, callback) {
        /*
        * 获取本地目录下的所有文件及其详情
        * */
        async.auto({
            files: function (callback) {
                myssh.getLocalReadDirFiles(localDir, function (err, files) {
                    callback(err, files);
                })
            },
            files_detail: [
                'files',
                function (results, callback) {
                    var files = results["files"];
                    var files_detail = {};
                    for (var i = 0, j = files.length; i < j; i++) {
                        var file_path = path.join(localDir, files[i]);
                        var stat = fs.statSync(file_path);
                        var file_size, file_crate_time, file_modify_time;
                        if (parseFloat((stat.size / (1024 * 1024))) > 1) {
                            file_size = (stat.size / (1024 * 1024)).toFixed(2) + "M";
                        } else {
                            file_size = (stat.size / 1024).toFixed(2) + "K";
                        }
                        file_crate_time = moment(stat.birthtime).utcOffset(8).format("YYYY-MM-DD HH:mm:ss");
                        file_modify_time = moment(stat.mtime).utcOffset(8).format("YYYY-MM-DD HH:mm:ss");
                        files_detail[files[i]] = {
                            file_name: files[i],
                            file_size: file_size,
                            file_crate_time: file_crate_time,
                            file_modify_time: file_modify_time
                        }
                    }
                    callback(null, files_detail);
                }
            ]
        }, function (err, results) {
            if (err) {
                callback(err);
                return;
            }
            var files_detail = results["files_detail"];
            callback(err, files_detail);
        });
    };
    return myssh;
};
module.exports = MySsh;
