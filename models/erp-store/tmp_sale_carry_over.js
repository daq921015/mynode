/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("tmp_sale_carry_over", {
        id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键",
            field: "id"
        },
        tenant_id: DataTypes.BIGINT(20),
        sale_count: DataTypes.BIGINT(20),
        vip_count: DataTypes.BIGINT(20),
        branch_count: DataTypes.BIGINT(20),
        sale_amount: {type: DataTypes.DECIMAL(11, 3)},
        vip_trade_amount: {type: DataTypes.DECIMAL(11, 3)},
        sale_date: DataTypes.DATEONLY
    });
};