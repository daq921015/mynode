module.exports = function (req, form_data, callback) {
    var form_fields = form_data["fields"];
    var publicmethod = param.publicmethod;
    var _ = param.underscore._;
    var env_name = form_fields["env_name"];
    var tenant_code = form_fields["tenant_code"];
    var exec_type = form_fields["exec_type"];
    if (env_name !== "www_ali") {
        callback(env_name + ",此环境不支持配方、领用相关操作");
        return;
    }
    var business_db, tenant_info;
    switch (exec_type + "") {
        case '1': {
            publicmethod.getBusinessDbRoute(env_name, tenant_code, 1).then(function (data) {
                business_db = data["business_db"];
                tenant_info = data["tenant_info"];
                return global[env_name + "_z0_saas-db_tenant_goods"].findAndCountAll({
                    where: {
                        tenant_id: tenant_info["tenant_id"],
                        is_deleted: 0
                    },
                    order: [["goods_id", "desc"]],
                    limit: ~~form_fields["limit"] || 0,
                    offset: ~~form_fields["offset"] || 0,
                    raw: true
                });
            }).then(function (data) {
                var total = data["count"];
                var tenant_goods = data["rows"];
                for (var i = 0, j = tenant_goods.length; i < j; i++) {
                    _.extend(tenant_goods[i], tenant_info);
                }
                callback(null, {total: total, rows: tenant_goods});
            }).catch(function (err) {
                callback(err);
            });
        }
            break;
        case '2': {
            publicmethod.getBusinessDbRoute(env_name, tenant_code, 1).then(function (data) {
                business_db = data["business_db"];
                tenant_info = data["tenant_info"];
                return global[env_name + "_z0_saas-db_tenant_goods"].findOne({
                    where: {
                        tenant_id: tenant_info["tenant_id"],
                        goods_id: 29,
                        is_deleted: 0
                    },
                    raw: true
                });
            }).then(function (data) {
                if (data) {
                    return Promise.reject("该商户已经具有配方功能，无需再次添加，请点击查询确认");
                } else {
                    return global[env_name + "_z0_saas-db_tenant_goods"].findOne({
                        where: {
                            tenant_id: tenant_info["tenant_id"],
                            is_deleted: 0
                        },
                        order: ["tenant_id", "branch_id"],
                        raw: true
                    });
                }
            }).then(function (data) {
                if (!data) {
                    return Promise.reject("该商户无任何产品包");
                }
                return global[env_name + "_z0_saas-db_tenant_goods"].create({
                    tenant_id: tenant_info["tenant_id"],
                    branch_id: null,
                    goods_id: 29,
                    // limit_date: data["limit_date"],
                    limit_date: '1900-01-01',
                    is_deleted: 0
                });
            }).then(function (data) {
                callback(null, "产品包添加成功");
            }).catch(function (err) {
                callback(err);
            });
        }
            break;
        default:
            callback(new Error("传入参数不正确,未找到执行类型"));
    }
};