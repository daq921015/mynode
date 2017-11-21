/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("sys_user", {
        id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键"
        },
        login_name: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "登录名",
            validate: {
                isAlpha: {msg: "登录名不符合规则，只能为字母"}
            }
        },
        login_pwd: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "登录密码",
            validate: {
                is: {
                    args: ["^[a-z0-9@#!$&]+$", 'i'],
                    msg: "登录密码不符合规则，不满足大小写、数字及特殊符号@#!$&",
                },
                len: {args: [6, 15], msg: "密码应为6到15位"}
            }
        },
        white_list: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: "登录白名单，多规则逗号分隔（正则验证）"
        },
        black_list: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: "登录黑名单，（优先级高于白名单）"
        },
        status: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "用户状态：0启用,1停用",
            validate: {isIn: {args: [[false, true]], msg: "用户状态只能为启用或停用"}}
        },
        user_name: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "用户名"
        },
        tel: {
            type: DataTypes.STRING(32),
            allowNull: true,
            comment: "用户电话",
            validate: {isAlphanumeric: {msg: "电话只能为数字"}}
        }
        ,
        email: {
            type: DataTypes.STRING(32),
            allowNull: true,
            comment: "用户邮箱",
            validate: {isEmail: {msg: "邮箱格式不正确"}}
        },
        qq: {
            type: DataTypes.STRING(32),
            allowNull: true,
            comment: "用户QQ",
            validate: {isAlphanumeric: {msg: "QQ只能为数字"}}
        },
        last_login_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: "最后一次登录时间",
            validate: {isDate: {msg: "最后登录时间日期格式不正确"}}
        },
        last_login_ip: {
            type: DataTypes.STRING(32),
            allowNull: true,
            comment: "最后一次登录IP",
            validate: {isIP: {msg: "ip地址格式不正确"}}
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
            validate: {isIn: {args: [[false, true]], msg: "删除状态只能为0或1"}}
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
        comment: "存储用户基本信息"
    });
};