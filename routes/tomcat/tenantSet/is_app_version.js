module.exports = function (req, form_data, callback) {
    var publicmethod = param.publicmethod;
    var _ = param.underscore._;

    var form_fields = form_data["fields"];
    var env_name = form_fields["env_name"];
    var exec_type = form_fields["exec_type"];
    switch (exec_type + "") {
        //修改商户app版本号（post提交）
        case "1": {
            const app_type = form_fields["app_type"];
            const app_business = form_fields["app_business"];
            const tenant_code = form_fields["tenant_code"];
            const version_no = form_fields["version_no"];
            global[env_name + "_z0_saas-db_app"].findOne({
                where: {
                    version_no: version_no,
                    type: app_type,
                    is_latest: 0,
                    is_deleted: 0
                },
                raw: true
            }).then(function (data) {
                if (!data && version_no) {
                    return Promise.reject("请确认该版本号是否存在。只能设置 版本类型：正式版，并且不是pos最新版本的版本号");
                } else {
                    return publicmethod.getBusinessDbRoute(env_name, tenant_code, 1);
                }
            }).then(function (data) {
                var business_db = data["business_db"];
                var tenant_info = data["tenant_info"];
                return global[business_db + "_branch"].update({
                    branch_app_version: version_no || null
                }, {
                    where: {
                        tenant_id: tenant_info["tenant_id"],
                        is_deleted: 0
                    },
                    fields: ["branch_app_version"]
                });
            }).then(function (data) {
                var op_content = "修改商户恵管家版本号:env_name=" + env_name + ",tenant_code=" + tenant_code + ",app_type=" + app_type + ",app_business=" + app_business + ",version_no=" + version_no;
                publicmethod.setSysFuncOpertor(req, op_content);
                callback(null, "指定商户，版本号修改完成,更新门店数：" + data);
            }).catch(function (err) {
                callback(err);
            });
        }
            break;
        //查询商户app版本号
        case "2": {
            // 1恵管家  2慧掌柜
            var app_type = form_fields["app_type"];
            //(恵管家)
            if (app_type === 1) {
                const tenant_code = form_fields["tenant_code"];
                const branch_code = form_fields["branch_code"];
                var tenant_info;
                var business_db;
                publicmethod.getBusinessDbRoute(env_name, tenant_code, 1).then(function (data) {
                    business_db = data["business_db"];
                    tenant_info = data["tenant_info"];
                    var branch_where = branch_code ? {
                        tenant_id: tenant_info["tenant_id"],
                        code: branch_code,
                        is_deleted: 0
                    } : {
                        tenant_id: tenant_info["tenant_id"],
                        is_deleted: 0
                    };
                    return global[business_db + "_branch"].findAndCountAll({
                        where: branch_where,
                        limit: ~~form_fields["limit"] || 0,
                        offset: ~~form_fields["offset"] || 0,
                        raw: true
                    });
                }).then(function (data) {
                    var total = data["count"];
                    var rows = data["rows"];
                    //合并商户信息到一块
                    for (var i = 0, j = rows.length; i < j; i++) {
                        _.extend(rows[i], tenant_info);
                        rows[i]["partition_code"] = business_db;
                    }
                    callback(null, {total: total, rows: rows});
                }).catch(function (err) {
                    callback(err);
                });
            } else {
                //(慧掌柜)
                const branch_id = form_fields["branch_id"];
                global[env_name + "_zc1_erp-store_branch"].findOne({
                    where: {
                        id: branch_id,
                        is_deleted: 0
                    },
                    raw: true
                }).then(function (branch_info) {
                    if (!branch_info) {
                        callback("没有找到对应的门店");
                        return;
                    }
                    branch_info["partition_code"] = env_name + "_zc1_erp-store";
                    callback(null, {total: 1, rows: [branch_info]});
                }).catch(function (err) {
                    callback(err);
                });
            }
        }
            break;
        //查询app信息
        case "3": {
            const app_business = form_fields["app_business"];
            const app_type = form_fields["app_type"];
            global[env_name + "_z0_saas-db_app"].findAndCountAll({
                where: {
                    business: app_business,
                    type: app_type,
                    is_deleted: 0
                },
                limit: ~~form_fields["limit"] || 0,
                offset: ~~form_fields["offset"] || 0,
                raw: true,
                order: [["app_create_at", "desc"]]
            }).then(function (data) {
                callback(null, {total: data["count"], rows: data["rows"]});
            }).catch(function (err) {
                callback(err);
            });
        }
            break;
        //修改单个门店版本号
        case "4": {
            const app_type = form_fields["app_type"];
            const app_business = form_fields["app_business"];
            const branch_id = form_fields["branch_id"];
            const partition_code = form_fields["partition_code"];
            const version_no = form_fields["version_no"];
            global[env_name + "_z0_saas-db_app"].findOne({
                where: {
                    version_no: version_no,
                    type: app_type,
                    is_latest: 0,
                    is_deleted: 0
                },
                raw: true
            }).then(function (data) {
                if (!data && version_no) {
                    return Promise.reject("请确认该版本号是否存在。只能设置 版本类型：正式版，并且不是pos最新版本的版本号");
                } else {
                    var business_branch = global[partition_code + "_branch"];
                    if (!business_branch) {
                        return Promise.reject("没有找到修改门店");
                    } else {
                        return business_branch.update({
                            branch_app_version: version_no || null
                        }, {
                            where: {
                                id: branch_id,
                                is_deleted: 0
                            },
                            fields: ["branch_app_version"]
                        });
                    }
                }
            }).then(function (data) {
                var op_content = "修改门店版本号:env_name=" + env_name + ",partition_code=" + partition_code + ",branch_id=" + branch_id + ",app_type=" + app_type + ",app_business=" + app_business + ",version_no=" + version_no;
                publicmethod.setSysFuncOpertor(req, op_content);
                callback(null, {"msg": "指定门店，版本号修改完成,更新门店数：" + data, "version_no": version_no});
            }).catch(function (err) {
                callback(err);
            });
        }
            break;
        //清除单个门店版本号
        case "5": {
            const branch_id = form_fields["branch_id"];
            const partition_code = form_fields["partition_code"];
            var business_branch = global[partition_code + "_branch"];
            if (!business_branch) {
                callback("没有找到修改门店");
            } else {
                business_branch.update({
                    branch_app_version: null
                }, {
                    where: {
                        id: branch_id,
                        is_deleted: 0
                    },
                    fields: ["branch_app_version"]
                }).then(function (data) {
                    var op_content = "清除门店版本号:env_name=" + env_name + ",partition_code=" + partition_code + ",branch_id=" + branch_id;
                    publicmethod.setSysFuncOpertor(req, op_content);
                    callback(null, "门店版本号清除完成,更新门店数：" + data);
                }).catch(function (err) {
                    callback(err);
                });
            }
        }
            break;
        default:
            callback("查询app版本号参数错误，功能不存在");
    }
};
