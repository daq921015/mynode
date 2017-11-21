module.exports = function (req, form_data, callback) {
    var form_fields = form_data["fields"];
    var env_name = form_fields["env_name"];
    var search_condition = form_fields["search_condition"];
    if (!env_name || !search_condition) {
        callback("传入参数缺失，请输入搜索内容");
        return;
    }
    global[env_name + "_zc1_erp-store_activation_code_history"].findAndCountAll({
        where: {
            $or: {
                activation_code: search_condition,
                mobile: search_condition
            },
            is_deleted: 0
        },
        limit: ~~form_fields["limit"] || 0,
        offset: ~~form_fields["offset"] || 0,
        raw: true
    }).then(function (data) {
        var total = data["count"];
        var rows = data["rows"];
        callback(null, {total: total, rows: rows});
    }).catch(function (err) {
        callback(err);
    });
};