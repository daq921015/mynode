/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("sys_request_log", {
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
        parent_name: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "当前资源父菜单名称"
        },
        res_name: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "当前操作名称"
        },
        http_method: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "请求类型"
        },
        login_name: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "登录名"
        },
        user_name: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "用户名"
        },
        request_ip: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "请求ip"
        },
        res_url: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: "操作URL"
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