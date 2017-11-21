/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("deploy_app_history", {
        id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键"
        },
        res_info_id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            allowNull: false,
            comment: "部署程序id"
        },
        app_server_id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            allowNull: false,
            comment: "部署服务器id"
        },
        env_name: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "部署环境名称"
        },
        group_name: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "部署程序组"
        },
        program_name: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "部署程序名称"
        },
        alias: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "部署程序别名"
        },
        host_ip: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "部署服务器ip"
        },
        host_alias: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "部署服务器备注"
        },
        apptype: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "部署程序类型：snapshots,release"
        },
        appversion: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "部署程序版本"
        },
        user_name: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "部署用户"
        },
        deploy_time: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: new Date(),
            comment: "部署时间"
        },
        deploy_result: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "部署结果"
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