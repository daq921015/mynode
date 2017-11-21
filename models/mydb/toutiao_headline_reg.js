/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("toutiao_headline_reg", {
        id: {type: DataTypes.BIGINT(20).UNSIGNED, primaryKey: true, autoIncrement: true, comment: "主键"},
        reg_info: {type: DataTypes.STRING(100), allowNull: false, comment: "正则内容"},
        is_official: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "是否官方提供 0是1不是",
            validate: {
                isIn: {
                    args: [[false, true]],
                    msg: "是否官方提供不能为空"
                }
            }
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
        comment: "头条综合数据表"
    });
};