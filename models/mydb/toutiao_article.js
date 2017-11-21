/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("toutiao_article", {
        id: {type: DataTypes.BIGINT(20).UNSIGNED, primaryKey: true, autoIncrement: true, comment: "主键"},
        name: {type: DataTypes.STRING(120), allowNull: false, comment: "标题"},
        read_count: {type: DataTypes.BIGINT(20).UNSIGNED, allowNull: false, comment: "阅读数"},
        comment: {type: DataTypes.BIGINT(20).UNSIGNED, allowNull: false, comment: "评论数"},
        create_time: {type: DataTypes.DATE, allowNull: false, comment: "上线时间"},
        link: {type: DataTypes.STRING(100), allowNull: true, unique: true, comment: "链接"},
        channel: {type: DataTypes.STRING(50), allowNull: false, comment: "频道"},
        type: {type: DataTypes.STRING(20), allowNull: false, comment: "类型"},
        hour: {type: DataTypes.INTEGER(2).UNSIGNED, allowNull: true, comment: "时间点"},
        week: {type: DataTypes.INTEGER(2).UNSIGNED, allowNull: true, comment: "星期"},
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