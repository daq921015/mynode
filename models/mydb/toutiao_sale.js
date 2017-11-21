/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("toutiao_sale", {
        id: {type: DataTypes.BIGINT(20).UNSIGNED, primaryKey: true, autoIncrement: true, comment: "主键"},
        create_time: {type: DataTypes.DATE, allowNull: false, comment: "创建时间(订单)"},
        click_time: {type: DataTypes.DATE, allowNull: false, comment: "点击时间"},
        goods_info: {type: DataTypes.STRING(100), allowNull: false, comment: "商品信息(店铺商品名称)"},
        goods_id: {type: DataTypes.STRING(20), allowNull: false, comment: "商品ID(全网唯一)"},
        wangwang: {type: DataTypes.STRING(50), allowNull: false, comment: "掌柜旺旺"},
        shop: {type: DataTypes.STRING(64), allowNull: false, comment: "所属店铺"},
        quantity: {type: DataTypes.STRING(10), allowNull: false, comment: "单订单商品购买个数"},
        sale_price: {type: DataTypes.STRING(10), allowNull: false, comment: "商品单价(标签价)"},
        order_status: {type: DataTypes.STRING(10), allowNull: false, comment: "订单当前状态"},
        order_type: {type: DataTypes.STRING(10), allowNull: false, comment: "订单类型(天猫或淘宝等)"},
        income_perc: {type: DataTypes.STRING(10), allowNull: false, comment: "收入比率=佣金比例+补贴比例"},
        share_perc: {type: DataTypes.STRING(10), allowNull: false, comment: "分成比率(一般固定63%)"},
        pay_amount: {type: DataTypes.STRING(10), allowNull: false, comment: "付款金额(订单该商品总付款额，可能买了多个商品)"},
        expect_amount: {type: DataTypes.STRING(10), allowNull: false, comment: "效果预估=付款金额*收入比例*分成比例 或 (佣金金额+补贴金额)*分成比例"},
        balance_amount: {type: DataTypes.STRING(10), allowNull: false, comment: "结算金额=付款金额(结算后有值)"},
        expect_income: {type: DataTypes.STRING(10), allowNull: false, comment: "预估收入=效果预估(结算后有值)"},
        balance_time: {type: DataTypes.DATE, allowNull: false, comment: "结算时间(确认收货时间)"},
        commission_perc: {type: DataTypes.STRING(10), allowNull: false, comment: "佣金比例(商家设置的佣金比例)"},
        commission_amount: {type: DataTypes.STRING(10), allowNull: false, comment: "佣金金额=结算金额*佣金比例(结算后有值)"},
        pension_perc: {type: DataTypes.STRING(10), allowNull: false, comment: "补贴比率"},
        pension_amount: {type: DataTypes.STRING(10), allowNull: false, comment: "补贴金额=结算金额*补贴比例(结算后有值)"},
        pension_type: {type: DataTypes.STRING(10), allowNull: false, comment: "补贴类型(天猫或其它)"},
        deal_platform: {type: DataTypes.STRING(10), allowNull: false, comment: "成交平台(无线:手机，pc)"},
        goods_type: {type: DataTypes.STRING(10), allowNull: false, comment: "未知字段意义"},
        order_no: {type: DataTypes.STRING(32), allowNull: false, comment: "订单编号(淘宝唯一)(本系统唯一)(导入重复删除旧数据)"},
        goods_category: {type: DataTypes.STRING(32), allowNull: false, comment: "商品类目(店家上架选择类目)"},
        media_id: {type: DataTypes.STRING(10), allowNull: false, comment: "来源媒体ID(与ad_id确认最终受益人)"},
        media_name: {type: DataTypes.STRING(20), allowNull: false, comment: "来源媒体名称"},
        ad_id: {type: DataTypes.STRING(10), allowNull: false, comment: "广告位ID"},
        ad_name: {type: DataTypes.STRING(10), allowNull: false, comment: "广告位名称"},
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