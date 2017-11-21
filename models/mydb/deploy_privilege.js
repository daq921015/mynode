/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("deploy_privilege", {
        id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键"
        },
        privilege_code: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "权限编号"
        },
        privilege_name: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "权限名称"
        },
        privilege_type: {
            type: DataTypes.TINYINT(1),
            allowNull: true,
            comment: "权限类型"
        },
        memo: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: "备注"
        },
        created_by: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: "default",
            comment: "创建人"
        },
        updated_by: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: "default",
            comment: "修改人"
        }
    }, {
        comment: "权限说明表"
    });
};