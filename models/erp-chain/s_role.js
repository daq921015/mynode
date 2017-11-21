/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("s_role", {
        role_id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键",
            field: "id"
        },
        tenant_id: {type: DataTypes.BIGINT(20), field: "tenant_id"},
        branch_id: {type: DataTypes.BIGINT(20), field: "branch_id"},
        role_code: {type: DataTypes.STRING(20), field: "role_code"},
        role_name: {type: DataTypes.STRING(50), field: "role_name"},
        is_deleted: DataTypes.TINYINT(1)
    });
};