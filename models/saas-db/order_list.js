/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("order_list", {
        id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键",
            field: "id"
        },
        order_id: {type: DataTypes.BIGINT(20).UNSIGNED, field: "order_id"},
        branch_id: {type: DataTypes.BIGINT(20).UNSIGNED, field: "branch_id"},
        is_deleted: {type: DataTypes.TINYINT(1).UNSIGNED, field: "is_deleted"}
    });
};