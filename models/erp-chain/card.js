/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("card", {
        card_id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键",
            field: "id"
        },
        card_code: {type: DataTypes.STRING(50), field: "code"},
        card_type: {type: DataTypes.TINYINT(3), field: "type"},
        card_state: {type: DataTypes.TINYINT(3), field: "state"},
        tenant_id: {type: DataTypes.BIGINT(20), field: "tenant_id"},
        tenant_code: {type: DataTypes.STRING(20), field: "tenant_code"},
        branch_code: {type: DataTypes.STRING(20), field: "branch_code"},
        is_deleted: DataTypes.TINYINT(1)
    });
};