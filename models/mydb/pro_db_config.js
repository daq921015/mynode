/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("pro_db_config", {
        id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键"
        },
        env_name: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        db_group: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        host: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        username: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        password: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        port: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        database: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        db_type: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        memo: {type: DataTypes.STRING(50), allowNull: true, comment: "备注"},
        created_by: {type: DataTypes.STRING(32), allowNull: false, defaultValue: "default", comment: "创建人"},
        updated_by: {type: DataTypes.STRING(32), allowNull: false, defaultValue: "default", comment: "修改人"}
    }, {
        comment: "程序运行查询线上数据库配置"
    });
};