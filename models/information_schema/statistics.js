/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("statistics", {
        TABLE_SCHEMA: {type: DataTypes.STRING(64), comment: "数据库名称", field: "TABLE_SCHEMA"},
        table_name: {type: DataTypes.STRING(64), comment: "表名", field: "table_name"},
        index_name: {type: DataTypes.STRING(64), comment: "索引名", field: "index_name"},
        column_name: {type: DataTypes.STRING(64), comment: "索引字段", field: "column_name"},
        seq_in_index: {type: DataTypes.BIGINT(2), comment: "索引字段顺序", field: "seq_in_index"},
        non_unique: {type: DataTypes.BIGINT(1), comment: "是否唯一索引", field: "non_unique"}
    });
};