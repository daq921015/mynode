/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("activation_code_history", {
        id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键",
            field: "id"
        },
        activation_code: {type: DataTypes.STRING(30), field: "activation_code"},
        active_type: {type: DataTypes.TINYINT(3), field: "type"},
        tenant_id: {type: DataTypes.BIGINT(20), field: "tenant_id"},
        branch_id: {type: DataTypes.BIGINT(20), field: "branch_id"},
        active_mobile: {type: DataTypes.STRING(11), field: "mobile"},
        device_code: {type: DataTypes.STRING(50), field: "device_code"},
        is_deleted: DataTypes.TINYINT(1),
        active_create_at: {type: DataTypes.DATE, field: "create_at"}
    });
};