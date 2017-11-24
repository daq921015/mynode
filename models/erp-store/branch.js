/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("branch", {
        branch_id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键",
            field: "id"
        },
        tenant_id: DataTypes.BIGINT(20),
        branch_type: DataTypes.TINYINT(3),
        branch_code: {type: DataTypes.STRING(20), field: "code"},
        branch_name: {type: DataTypes.STRING(30), field: "name"},
        branch_phone: {type: DataTypes.STRING(20), field: "phone"},
        branch_contacts: {type: DataTypes.STRING(20), field: "contacts"},
        branch_address: {type: DataTypes.STRING(50), field: "address"},
        meituan_business: {type: DataTypes.STRING(50), field: "meituan_business"},
        branch_app_version: {type: DataTypes.STRING(20), field: "app_version"},
        meituan_token: {type: DataTypes.STRING(200), field: "meituan_token"},
        branch_status: {type: DataTypes.TINYINT(3), field: "status", comment: "状态0 停用1启用"},
        is_deleted: DataTypes.TINYINT(1),
        branch_create_at: {type: DataTypes.DATE, field: "create_at"}
    });
};