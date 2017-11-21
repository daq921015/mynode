/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("sys_user_resource", {
        id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键"
        },
        user_id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            allowNull: false,
            comment: "用户id"
        },
        resource_id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            allowNull: false,
            comment: "资源id"
        }
    }, {
        timestamps: false,
        comment: "用户与资源关联表"
    });
};