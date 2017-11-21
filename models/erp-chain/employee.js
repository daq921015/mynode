/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("employee", {
        employee_id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键",
            field: "id"
        },
        tenant_id: {type: DataTypes.BIGINT(20), field: "tenant_id"},
        branch_id: {type: DataTypes.BIGINT(20), field: "branch_id"},
        user_id: {type: DataTypes.BIGINT(20), field: "user_id"},
        login_name: {type: DataTypes.STRING(30), field: "login_name"},
        employee_name: {type: DataTypes.STRING(50), field: "name"},
        is_deleted: DataTypes.TINYINT(1),
        employee_create_at: {type: DataTypes.DATE, field: "create_at"}
    });
};