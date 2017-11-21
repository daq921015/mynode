module.exports = function (req, form_data, callback) {
    var publicmethod = param.publicmethod;
    var crypto = param.crypto;

    var form_fields = form_data["fields"];
    var env_name = form_fields["env_name"];
    var bind_mobile = form_fields["bind_mobile"];
    var mobile_pwd = form_fields["mobile_pwd"];
    var login_name = req.session.user["login_name"];
    var exec_type = form_fields["exec_type"];
    switch (exec_type + "") {
        //修改商户app版本号（post提交）
        case "1": {
            global[env_name + "_z0_saas-db_s_user"].findOne({
                where: {bind_mobile: bind_mobile, is_deleted: 0}
            }).then(function (data) {
                if (!data) {
                    return Promise.reject("没有找到手机号对应的商户");
                } else {
                    //验证密码（admin除外）
                    var _mobile_pwd = mobile_pwd ? mobile_pwd.toString() : "";
                    var pwd_md5 = crypto.createHash("md5").update(_mobile_pwd).digest('hex');
                    if (login_name !== "admin" && data.get("login_pass") !== pwd_md5) {
                        return Promise.reject("手机号登录密码不正确");
                    } else {
                        data.bind_mobile = null;
                        data.save();
                        return publicmethod.getBusinessDbRoute(env_name, data.tenant_id,1)
                    }
                }
            }).then(function (data) {
                if (!data || data["tenant_info"].partition_code !== "zc1") {
                    callback(null, "恵管家手机号已清除");
                } else {
                    var business_db = data["business_db"];
                    global[business_db + "_activation_code_history"].update({
                        active_mobile: null
                    }, {
                        where: {
                            active_mobile: bind_mobile,
                            is_deleted: 0
                        }
                    }).then(function () {
                        callback(null, "慧掌柜手机号已清除");
                    });
                }
            }).catch(function (err) {
                callback(err);
            });
        }
            break;
        default:
            callback("解绑注册手机号，功能不存在");
    }
};