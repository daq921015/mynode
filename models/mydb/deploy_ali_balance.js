/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("deploy_ali_balance", {
        id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键"
        },
        app_server_id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            allowNull: false,
            comment: "部署服务器id"
        },
        balance_id: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: "负载均衡实例id"
        },
        v_group_id: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: "虚拟服务器组id"
        },
        server_id: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: "服务器id(阿里)"
        },
        server_alias: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: "服务器别名"
        },
        server_type: {
            type: DataTypes.TINYINT(1),
            allowNull: false,
            comment: "负载均衡类型：0四层后端服务器,1七层虚拟服务器组,2没用阿里负载均衡",
            validate: {
                args: [[0, 1, 2]],
                msg: "负载均衡类型0,1,2"
            }
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