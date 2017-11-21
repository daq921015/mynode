module.exports = function (req, form_data, callback) {
    var publicmethod = param.publicmethod;
    var async = param.async;
    var fs = param.fs;
    var myconfig = param.myconfig;
    var myssh = param.myssh;
    var path=param.path;

    var form_fields = form_data["fields"];
    var form_files = form_data["files"];
    var env_name = form_fields["env_name"];
    if (!env_name) {
        callback(new Error("传入参数缺失，无法上传微餐厅配置文件"));
        return;
    }
    if (form_files.length !== 1) {
        callback(new Error("配置文件上传失败，请重新上传绑定或联系管理员"));
        return;
    }
    //只有www_ali和sanmi_www环境支持配置惠支付
    if (env_name !== "www_ali" && env_name !== "sanmi_www") {
        callback(new Error(env_name + ",此环境不支持惠支付配置"));
        return;
    }
    var mp_conf_path = form_files[0];
    async.auto({
        //确定配置文件存在
        file_exists: function (callback) {
            fs.exists(mp_conf_path, function (exists) {
                if (exists) {
                    if (fs.statSync(mp_conf_path).isFile()) {
                        callback(null, true);
                        return;
                    }
                }
                callback(new Error("没有找到上传的微餐厅配置文件"));
            });
        },
        //设置惠支付程序配置文件（ssh地址直接写死）,程序版本在 z0-fs脚本中
        setHzfProgramConf: [
            'file_exists',
            function (results, callback) {
                var beta_portal, z0_fs1;
                if (typeof myconfig["static_ssh_host"][env_name] === "undefined"
                    || typeof myconfig["static_ssh_host"][env_name]["beta_portal"] === "undefined"
                    || myconfig["static_ssh_host"][env_name]["z0_fs1"] === "undefined") {
                    callback(new Error("微餐厅配置文件上传失败，无法获取远程服务器ssh配置"));
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
                            var remote_path = "/nfs/uploads/appdata/o2o-wx/ct/" + path.basename(mp_conf_path);
                            myssh.execRemoteUploadFile(conns[1], mp_conf_path, remote_path, function (err) {
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
        ]
    }, function (err) {
        if (err) {
            callback(err);
            return;
        }
        var mp_conf_name = path.basename(mp_conf_path);
        var op_content = "微餐厅配置文件上传:" + env_name + ",mp_conf_name=" + mp_conf_name;
        publicmethod.setSysFuncOpertor(req, op_content);
        callback(err, "微餐厅配置文件上传成功")
    });
};