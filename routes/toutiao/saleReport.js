//supervisor 进程控制路由
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var utils = param.utils;
    var authority = param.authority;
    var _ = param.underscore._;
    var logError = param.publicmethod.logError;
    router.get("/index", function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id),
            toutiao_sale.findAll({
                group: ["ad_name"],
                attributes: ["ad_name"]
            }),
            toutiao_sale.findAll({
                group: ["order_status"],
                attributes: ["order_status"]
            })
        ]).then(function (data) {
            var menu = data[0];
            var operator = data[1];
            res.render(routeDir + "saleReport", {
                ad_names: data[2],
                order_status: data[3],
                title: "operator",
                operator: operator,
                menu: menu,
                resTag: sider_id,
                session: req.session
            });
        }).catch(function (err) {
            res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
        });
    });
    router.get('/:action', function (req, res, next) {
        var action = req.params.action;
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        switch (action) {
            case 'list': {
                var start_create_time = form_fields["start_create_time"];
                var end_create_time = form_fields["end_create_time"];
                var start_balance_time = form_fields["start_balance_time"];
                var end_balance_time = form_fields["end_balance_time"];
                var order_status = form_fields["order_status"];
                var ad_name = form_fields["ad_name"];
                if (!start_create_time || !end_create_time) {
                    res.end(JSON.stringify({"status": "error", "msg": "查询参数缺失"}));
                    return;
                }
                var toutiao_sale_where = {
                    create_time: {$between: [start_create_time, end_create_time]}
                };
                if (start_balance_time && end_balance_time) {
                    toutiao_sale_where["balance_time"] = {$between: [start_balance_time, end_balance_time]};
                }
                if (order_status) {
                    toutiao_sale_where["order_status"] = {$in: order_status.split(",")};
                }
                if (ad_name) {
                    toutiao_sale_where["ad_name"] = {$in: ad_name.split(",")};
                }
                _.extend(toutiao_sale_where, _.pick(form_fields, "goods_id", "order_no"));
                Promise.all([
                    toutiao_sale.count({
                        col: "goods_id",
                        distinct: true,
                        where: toutiao_sale_where
                    }),
                    toutiao_sale.findAll({
                        attributes: [
                            "goods_id", "goods_info", "goods_category", "commission_perc",
                            [Sequelize.fn("sum", Sequelize.col("quantity")), "goods_num"],
                            [Sequelize.fn("count", Sequelize.fn("DISTINCT", Sequelize.col("order_no"))), "order_num"],
                            [Sequelize.fn("sum", Sequelize.col("pay_amount")), "goods_pay_amount"],
                            [Sequelize.fn("sum", Sequelize.col("expect_amount")), "goods_expect_amount"],
                            [Sequelize.fn("sum", Sequelize.col("balance_amount")), "goods_balance_amount"],
                            [Sequelize.fn("sum", Sequelize.col("expect_income")), "goods_expect_income"],
                            [Sequelize.fn("sum", Sequelize.col("commission_amount")), "goods_commission_amount"],
                            [Sequelize.fn("sum", Sequelize.col("pension_amount")), "goods_pension_amount"]
                        ],
                        where: toutiao_sale_where,
                        limit: ~~form_fields["limit"] || 0,
                        offset: ~~form_fields["offset"] || 0,
                        group: "goods_id",
                        order: [[Sequelize.literal(form_fields["sortName"] || "goods_expect_amount"), form_fields["sortOrder"] || "desc"]],
                        raw: true
                    })
                ]).then(function (data) {
                    var total = data[0];
                    var rows = data[1];
                    res.end(JSON.stringify({
                        "status": "success",
                        "msg": "",
                        "data": {"total": total, "rows": rows}
                    }));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            case 'upload': {
                res.render(routeDir + "saleUpload", {});
            }
                break;
            default:
                res.end(JSON.stringify({"status": "error", "msg": "the addr of get request is not exist。"}));
        }
    }).post("/:action", function (req, res, next) {
        res.end(JSON.stringify({"status": "error", "msg": "the addr of post request is not exist。"}));
    });
    return router;
};