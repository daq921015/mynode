/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("sys_resource", {
        id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键"
        },
        res_name: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "资源名称"
        },
        res_url: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: "资源URL"
        },
        label_class: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: "控件样式class"
        },
        label_id: {
            type: DataTypes.STRING(32),
            allowNull: true,
            comment: "标签id"
        },
        parent_id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            allowNull: false,
            comment: "父菜单id"
        },
        parent_name: {
            type: DataTypes.STRING(32),
            allowNull: true,
            comment: "父菜单名称"
        },
        order: {
            type: DataTypes.TINYINT(3),
            allowNull: true,
            comment: "菜单排序号"
        },
        function_sign: {
            type: DataTypes.TINYINT(3),
            allowNull: false,
            comment: "1菜单，2子菜单,3功能按钮,4访问控制，无按钮",
            validate: {
                args: [[1, 2, 3, 4]],
                msg: "功能选项标志1,2,3,4"
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
        }
    }, {
        comment: "程序资源表"
    });
};