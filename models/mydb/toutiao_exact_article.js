/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("toutiao_exact_article", {
        id: {type: DataTypes.BIGINT(20).UNSIGNED, primaryKey: true, autoIncrement: true, comment: "主键"},
        name: {type: DataTypes.STRING(120), allowNull: false, comment: "标题"},
        channel: {type: DataTypes.STRING(50), allowNull: false, comment: "频道"},
        toutiao_number: {type: DataTypes.STRING(50), allowNull: false, comment: "头条号"},
        article_author: {type: DataTypes.STRING(50), allowNull: false, comment: "文章作者"},
        type: {type: DataTypes.STRING(10), allowNull: false, defaultValue: "", comment: "类型：图集、专辑"},
        create_time: {type: DataTypes.DATE, allowNull: false, comment: "上线时间"},
        recommend_count: {type: DataTypes.BIGINT(20).UNSIGNED, allowNull: false, comment: "推荐数"},
        read_count: {type: DataTypes.BIGINT(20).UNSIGNED, allowNull: false, comment: "阅读数"},
        read_percent: {type: DataTypes.STRING(10), allowNull: false, comment: "阅读百分比"},
        goods_clicks: {type: DataTypes.BIGINT(20).UNSIGNED, allowNull: false, comment: "商品点击数"},
        goods_clicks_percent: {type: DataTypes.STRING(10), allowNull: false, comment: "商品点击率"},
        dislike_count: {type: DataTypes.BIGINT(20).UNSIGNED, allowNull: false, comment: "dislike数"},
        dislike_count_percent: {type: DataTypes.STRING(10), allowNull: false, comment: "dislike率"},
        link: {type: DataTypes.STRING(100), allowNull: true, comment: "文章地址"},
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
        comment: "准确数据"
    });
};