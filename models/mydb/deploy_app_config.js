/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("deploy_app_config", {
        id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键"
        },
        res_info_id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            allowNull: false,
            comment: "系统资源id"
        },
        conf_key: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: "key"
        },
        conf_value: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: "value"
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
        comment: "程序资源表"
    });
};