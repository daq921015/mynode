/*
 * 商户报表
 * */
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var utils = param.utils;
    var authority = param.authority;
    var logError = param.publicmethod.logError;
    var publicmethod = param.publicmethod;
    var logInfo = param.publicmethod.logInfo;
    var _ = param.underscore._;
    var moment = param.moment;
//------------------------------END----------------------------------------------------------
    let getTenantData = function (env_name, partition_code) {
        let db_name = {
            "za1": "rest-db",
            "zb1": "retail-db",
            "zc1": "erp-store",
            "zd1": "erp-chain"
        };
        if (!_.has(db_name, partition_code)) {
            return Promise.reject("没有查到分区对应数据库名称");
        }
        return global[env_name + "_" + partition_code + "_" + db_name[partition_code] + "_tmp_sale_carry_over"].findAll({
            attributes: [
                "tenant_id",
                [Sequelize.fn("sum", Sequelize.col("sale_count")), "sale_total_count"],
                [Sequelize.fn("sum", Sequelize.col("vip_count")), "vip_total_count"],
                [Sequelize.fn("sum", Sequelize.col("branch_count")), "branch_total_count"],
                [Sequelize.fn("sum", Sequelize.col("sale_amount")), "sale_total_amount"],
                [Sequelize.fn("sum", Sequelize.col("vip_trade_amount")), "vip_trade_total_amount"],
            ],
            group: "tenant_id",
            order: ["tenant_id"],
            raw: true,
        });
    };
    let getPartitionData = function (env_name, partition_code, start_date, end_date) {
        let db_name = {
            "za1": "rest-db",
            "zb1": "retail-db",
            "zc1": "erp-store",
            "zd1": "erp-chain"
        };
        if (!_.has(db_name, partition_code)) {
            return Promise.reject("没有查到分区对应数据库名称");
        }
        return Promise.all([
            global[env_name + "_" + partition_code + "_" + db_name[partition_code] + "_tmp_sale_carry_over"].findAll({
                where: {
                    sale_date: {
                        $between: [start_date, end_date]
                    }
                },
                attributes: [
                    "sale_date",
                    [Sequelize.fn("sum", Sequelize.col("sale_count")), "sale_date_count"],
                    [Sequelize.fn("sum", Sequelize.col("vip_count")), "vip_date_count"],
                    [Sequelize.fn("sum", Sequelize.col("branch_count")), "branch_date_count"],
                    [Sequelize.fn("sum", Sequelize.col("sale_amount")), "sale_date_amount"],
                    [Sequelize.fn("sum", Sequelize.col("vip_trade_amount")), "vip_trade_date_amount"],
                ],
                group: "sale_date",
                order: ["sale_date"],
                raw: true,
            }),
            global[env_name + "_" + partition_code + "_" + db_name[partition_code] + "_tmp_sale_carry_over"].findOne({
                where: {
                    sale_date: {$lt: start_date}
                },
                attributes: [
                    [Sequelize.fn("sum", Sequelize.col("sale_count")), "sale_total_count"],
                    [Sequelize.fn("sum", Sequelize.col("vip_count")), "vip_total_count"],
                    [Sequelize.fn("sum", Sequelize.col("branch_count")), "branch_total_count"],
                    [Sequelize.fn("sum", Sequelize.col("sale_amount")), "sale_total_amount"],
                    [Sequelize.fn("sum", Sequelize.col("vip_trade_amount")), "vip_trade_total_amount"],
                ],
                raw: true,
            })
        ]).then(data => {
            let date_data = data[0];
            let history_data = data[1];
            // 数据增加倍数
            let multiple = 1;
            let sale_total_count = history_data["sale_total_count"] * multiple;
            let vip_total_count = history_data["vip_total_count"] * multiple;
            let branch_total_count = history_data["branch_total_count"] * multiple;
            let sale_total_amount = history_data["sale_total_amount"] * multiple;
            let vip_trade_total_amount = history_data["vip_trade_total_amount"] * multiple;
            for (let i = 0, j = date_data.length; i < j; i++) {
                date_data[i]["env_name"] = env_name;
                date_data[i]["partition_code"] = partition_code;
                date_data[i]["sale_total_count"] = sale_total_count + date_data[i]["sale_date_count"] * multiple;
                date_data[i]["vip_total_count"] = vip_total_count + date_data[i]["vip_date_count"] * multiple;
                date_data[i]["branch_total_count"] = branch_total_count + date_data[i]["branch_date_count"] * multiple;
                date_data[i]["sale_total_amount"] = sale_total_amount + date_data[i]["sale_date_amount"] * multiple;
                date_data[i]["vip_trade_total_amount"] = vip_trade_total_amount + date_data[i]["vip_trade_date_amount"] * multiple;
                sale_total_count = date_data[i]["sale_total_count"];
                vip_total_count = date_data[i]["vip_total_count"];
                branch_total_count = date_data[i]["branch_total_count"];
                sale_total_amount = date_data[i]["sale_total_amount"];
                vip_trade_total_amount = date_data[i]["vip_trade_total_amount"];
            }
            return Promise.resolve(date_data);
        });
    };
    var partition = ["www_ali-za1", "www_ali-zb1", "www_ali-zc1", "www_ali-zd1", "sanmi_www-zd1"];
    router.get('/getTenantReport', function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id)
        ]).then(function (data) {
            var menu = data[0];
            var operator = data[1];
            res.render(routeDir + "tenantReportList", {
                operator: operator,
                partition: partition,
                menu: menu,
                title: "商户报表",
                resTag: sider_id,
                session: req.session
            });
        }).catch(function (err) {
            res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
        });
    });
    router.get('/:action', async function (req, res, next) {
        var action = req.params.action;
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        if (!_.has(form_fields, "start_date") || !_.has(form_fields, "end_date")) {
            res.end(JSON.stringify({"status": "error", "msg": "必须要有开始日期和结束日期"}));
            return;
        }
        let start_date = form_fields["start_date"];
        let end_date = form_fields["end_date"];
        switch (action) {
            case 'reportList': {
                var report_type = form_fields["report_type"];
                switch (report_type + "") {
                    //商户报表
                    case "1": {
                        if (_.has(form_fields, "partition")) {
                            let _partition = form_fields["partition"].split("-");
                            if (_partition.length !== 2) {
                                res.end(JSON.stringify({"status": "error", "msg": "请求参数不合法"}));
                            } else {
                                getTenantData(_partition[0], _partition[1], start_date, end_date).then(data => {
                                    res.end(JSON.stringify({"status": "success", "msg": "", "data": data}));
                                }).catch(err => {
                                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                                });
                            }
                        } else {
                            let re_result = [];
                            for (let i = 0, j = partition.length; i < j; i++) {
                                let _partition = partition[i].split("-");
                                let _env_name = _partition[0];
                                let _partition_code = _partition[1];
                                try {
                                    let get_data = await getTenantData(_env_name, _partition_code, start_date, end_date);
                                    re_result = _.union(re_result, get_data);
                                } catch (err) {
                                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                                    return false;
                                }
                            }
                            res.end(JSON.stringify({"status": "success", "msg": "", "data": re_result}));
                        }
                    }
                        break;
                    //分区报表
                    case "2": {
                        if (_.has(form_fields, "partition")) {
                            let _partition = form_fields["partition"].split("-");
                            if (_partition.length !== 2) {
                                res.end(JSON.stringify({"status": "error", "msg": "请求参数不合法"}));
                            } else {
                                getPartitionData(_partition[0], _partition[1], start_date, end_date).then(data => {
                                    res.end(JSON.stringify({"status": "success", "msg": "", "data": data}));
                                }).catch(err => {
                                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                                });
                            }
                        } else {
                            let re_result = [];
                            for (let i = 0, j = partition.length; i < j; i++) {
                                let _partition = partition[i].split("-");
                                let _env_name = _partition[0];
                                let _partition_code = _partition[1];
                                try {
                                    let get_data = await getPartitionData(_env_name, _partition_code, start_date, end_date);
                                    re_result = _.union(re_result, get_data);
                                } catch (err) {
                                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                                    return false;
                                }
                            }
                            // 把所有区的数据合在一块
                            let merge_resut = {};
                            for (let i = 0, j = re_result.length; i < j; i++) {
                                if (!_.has(merge_resut, re_result[i]["sale_date"])) {
                                    re_result[i]["env_name"] = "";
                                    re_result[i]["partition_code"] = "";
                                    merge_resut[re_result[i]["sale_date"]] = re_result[i];
                                } else {
                                    merge_resut[re_result[i]["sale_date"]]["branch_date_count"] = parseFloat(merge_resut[re_result[i]["sale_date"]]["branch_date_count"]) + parseFloat(re_result[i]["branch_date_count"]);
                                    merge_resut[re_result[i]["sale_date"]]["branch_total_count"] = parseFloat(merge_resut[re_result[i]["sale_date"]]["branch_total_count"]) + parseFloat(re_result[i]["branch_total_count"]);
                                    merge_resut[re_result[i]["sale_date"]]["vip_date_count"] = parseFloat(merge_resut[re_result[i]["sale_date"]]["vip_date_count"]) + parseFloat(re_result[i]["vip_date_count"]);
                                    merge_resut[re_result[i]["sale_date"]]["vip_total_count"] = parseFloat(merge_resut[re_result[i]["sale_date"]]["vip_total_count"]) + parseFloat(re_result[i]["vip_total_count"]);
                                    merge_resut[re_result[i]["sale_date"]]["vip_trade_date_amount"] = parseFloat(merge_resut[re_result[i]["sale_date"]]["vip_trade_date_amount"]) + parseFloat(re_result[i]["vip_trade_date_amount"]);
                                    merge_resut[re_result[i]["sale_date"]]["vip_trade_total_amount"] = parseFloat(merge_resut[re_result[i]["sale_date"]]["vip_trade_total_amount"]) + parseFloat(re_result[i]["vip_trade_total_amount"]);
                                    merge_resut[re_result[i]["sale_date"]]["sale_date_count"] = parseFloat(merge_resut[re_result[i]["sale_date"]]["sale_date_count"]) + parseFloat(re_result[i]["sale_date_count"]);
                                    merge_resut[re_result[i]["sale_date"]]["sale_total_count"] = parseFloat(merge_resut[re_result[i]["sale_date"]]["sale_total_count"]) + parseFloat(re_result[i]["sale_total_count"]);
                                    merge_resut[re_result[i]["sale_date"]]["sale_date_amount"] = parseFloat(merge_resut[re_result[i]["sale_date"]]["sale_date_amount"]) + parseFloat(re_result[i]["sale_date_amount"]);
                                    merge_resut[re_result[i]["sale_date"]]["sale_total_amount"] = parseFloat(merge_resut[re_result[i]["sale_date"]]["sale_total_amount"]) + parseFloat(re_result[i]["sale_total_amount"]);
                                }
                            }
                            res.end(JSON.stringify({"status": "success", "msg": "", "data": _.values(merge_resut)}));
                        }
                    }
                        break;
                    default:
                        res.end(JSON.stringify({"status": "error", "msg": "报表类型不存在"}));
                }
            }
                break;
            default:
                res.end(JSON.stringify({"status": "error", "msg": "the addr of get request is not exist"}));
        }
    }).post('/:action', function (req, res, next) {
        res.end(JSON.stringify({"status": "error", "msg": "the addr of post request is not exist"}));
    });
    return router;
};