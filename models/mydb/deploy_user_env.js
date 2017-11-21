/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("deploy_user_env", {
        id: {type: DataTypes.BIGINT(20).UNSIGNED, primaryKey: true, autoIncrement: true, comment: "主键"},
        user_id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            allowNull: false,
            comment: "用户id"
        },
        env_name: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "环境名称"
        },
        privilege_code: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "权限编号",
        },
        memo: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: "备注"
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "删除状态：0启用,1停用",
            validate: {
                isIn: {
                    args: [[false, true]],
                    msg: "删除状态只能为0或1"
                }
            }
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
        comment: "环境下特殊功能描述表"
    });
};