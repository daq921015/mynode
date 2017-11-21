/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("columns", {
        TABLE_SCHEMA: {type: DataTypes.STRING(64), comment: "数据库名称", field: "TABLE_SCHEMA"},
        table_name: {type: DataTypes.STRING(64), comment: "表名", field: "table_name"},
        column_name: {type: DataTypes.STRING(64), comment: "列名", field: "column_name"},
        column_default: {type: DataTypes.TEXT, comment: "列默认值", field: "column_default"},
        is_nullable: {type: DataTypes.STRING(3), comment: "列是否为空", field: "is_nullable"},
        column_type: {type: DataTypes.TEXT, comment: "列类型", field: "column_type"}
    });
};