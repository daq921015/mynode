/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("order_info", {
        id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键",
            field: "id"
        },
        tenant_id: {type: DataTypes.BIGINT(20).UNSIGNED, field: "tenant_id"},
        status: {type: DataTypes.TINYINT(3).UNSIGNED, field: "status"},
        is_deleted: {type: DataTypes.TINYINT(1).UNSIGNED, field: "is_deleted"}
    });
};