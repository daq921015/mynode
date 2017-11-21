/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("s_user", {
        user_id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键",
            field: "id"
        },
        login_name: {type: DataTypes.STRING(30), field: "login_name"},
        login_pass: {type: DataTypes.STRING(32), field: "login_pass"},
        bind_mobile: {type: DataTypes.STRING(20), field: "bind_mobile"},
        tenant_id: {type: DataTypes.BIGINT(20), field: "tenant_id"},
        is_deleted: DataTypes.TINYINT(1)
    });
};