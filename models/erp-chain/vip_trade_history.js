/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("vip_trade_history", {
        id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键",
            field: "id"
        },
        trade_branch_id: DataTypes.BIGINT(20),
        trade_amount: DataTypes.DECIMAL(11, 3),
        is_deleted: DataTypes.TINYINT(1)
    });
};