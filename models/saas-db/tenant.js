/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("tenant", {
        tenant_id: {
            type: DataTypes.BIGINT(19).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键",
            field: "id"
        },
        tenant_code: {type: DataTypes.CHAR(8), field: "code"},
        tenant_name: {type: DataTypes.STRING(50), field: "name"},
        tenant_address: {type: DataTypes.STRING(100), field: "address"},
        tenant_phone: {type: DataTypes.STRING(20), field: "phone_number"},
        tenant_linkman: {type: DataTypes.STRING(20), field: "linkman"},
        tenant_business: {type: DataTypes.STRING(20), field: "business1"},
        tenant_status: {type: DataTypes.TINYINT(3), field: "status", comment: "状态：0-未激活，1-启用，2-停用"},
        partition_code: DataTypes.STRING(20),
        is_test: DataTypes.TINYINT(1),
        is_bate: DataTypes.TINYINT(1),
        is_deleted: DataTypes.TINYINT(1),
        tenant_create_at: {type: DataTypes.DATE, field: "create_at"}
    });
};