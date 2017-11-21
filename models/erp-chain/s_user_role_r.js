/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("s_user_role_r", {
        user_id: {type: DataTypes.BIGINT(20).UNSIGNED, primaryKey: true, field: "user_id"},
        role_id: {type: DataTypes.BIGINT(20).UNSIGNED, primaryKey: true, field: "role_id"}
    });
};