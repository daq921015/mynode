module.exports = function (req, form_data, callback) {
    var publicmethod = param.publicmethod;
    var _ = param.underscore._;
    var form_fields = form_data["fields"];
    var env_name = form_fields["env_name"];
    if (_.size(_.pick(form_fields, "env_name", "tenant_code")) !== 2) {
        callback("查询参数缺失，请输入商户信息");
        return;
    }
    var business_db, tenant_info;
    publicmethod.getBusinessDbRoute(env_name, form_fields["tenant_code"], 1).then(function (data) {
        business_db = data["business_db"];
        tenant_info = data["tenant_info"];
        var branch_where = {
            tenant_id: tenant_info["tenant_id"],
            is_deleted: 0
        };
        if (_.has(form_fields, "branch_code")) {
            branch_where["code"] = form_fields["branch_code"];
        }
        return global[business_db + "_branch"].findAndCountAll({
            where: branch_where,
            limit: Number(form_fields["limit"]) || 0,
            offset: Number(form_fields["offset"]) || 0,
            order: [["code", "asc"]],
            raw: true
        });
    }).then(function (data) {
        var total = data["count"];
        var rows = data["rows"];
        _.each(rows, function (item) {
            _.extend(item, tenant_info);
        });
        callback(null, {"total": total, "rows": data["rows"]});
    }).catch(function (err) {
        callback(err);
    });
};