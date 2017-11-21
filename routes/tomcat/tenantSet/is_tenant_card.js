module.exports = function (req, form_data, callback) {
    var publicmethod = param.publicmethod;
    var _ = param.underscore._;

    var form_fields = form_data["fields"];
    var env_name = form_fields["env_name"];
    var login_name = form_fields["login_name"];
    var card_code = form_fields["card_code"];
    var business_db, tenant_info;
    publicmethod.getBusinessDbRoute(env_name, login_name,1).then(function (data) {
        business_db = data["business_db"];
        tenant_info = data["tenant_info"];
        var card_where = card_code ? {
            tenant_id: tenant_info.tenant_id,
            card_code: card_code.toString(),
            is_deleted: 0
        } : {
            tenant_id: tenant_info.tenant_id,
            is_deleted: 0
        };
        return global[business_db + "_card"].findAndCountAll({
            where: card_where,
            raw: true,
            limit: ~~form_fields["limit"] || 0,
            offset: ~~form_fields["offset"] || 0,
            order: [["type", "asc"], ["code", "desc"]]
        });
    }).then(function (data) {
        var rows = data["rows"];
        //加入商户信息
        for (var i = 0, j = rows.length; i < j; i++) {
            _.extend(rows[i], tenant_info);
        }
        callback(null, {total: data["count"], rows: data["rows"]});
    }).catch(function (err) {
        callback(err);
    });
};