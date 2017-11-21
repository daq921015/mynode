/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("sale", {
        id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键",
            field: "id"
        },
        tenant_id: DataTypes.BIGINT(20),
        checkout_at: DataTypes.DATE,
        is_deleted: DataTypes.TINYINT(1)
    });
};