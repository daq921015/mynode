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
    //--------------------------公告信息结转历史流水---------------------------------------------
    var carryOverHistorySale = function (business_db) {
        var carryOverTime, carryOverTimeMoment, carryOverEndTimeMoment;
        return global[business_db + "_tmp_sale_carry_over"].findOne({
            attributes: [[Sequelize.literal("DATE_ADD(IFNULL(MAX(sale_date),'1900-01-01'),INTERVAL 1 DAY)"), "sale_date"]],
            raw: true
        }).then(function (data) {
            carryOverTime = data["sale_date"];
            if ((Date.now() - new Date(carryOverTime).getTime()) > ((15 + 7) * (24 * 60 * 60 * 1000))) {
                return Promise.reject("数据已经超过15天没有结转，为避免一次结转太多，造成数据库压力过高，请手动结转");
            }
            //最终结转时间不满足7天差距则不结转
            carryOverTimeMoment = moment(carryOverTime);
            carryOverEndTimeMoment = moment(moment().startOf('day').subtract(6, 'days'));
            if (!carryOverTimeMoment.isBefore(carryOverEndTimeMoment)) {
                return Promise.resolve("最终结转时间不满足7天差距则不结转");
            }
            var sql = "INSERT INTO `tmp_sale_carry_over`(tenant_id,sale_count,sale_total_amount,sale_date) SELECT tenant_id,COUNT(1) AS sale_count,SUM(total_amount) AS sale_total_amount,DATE(checkout_at) AS sale_date FROM `sale` WHERE checkout_at >= ? AND checkout_at < DATE_SUB(CURDATE(), INTERVAL 6 DAY)  AND is_deleted=0 GROUP BY tenant_id,DATE(checkout_at)";
            return global[business_db].query(sql, {
                type: Sequelize.QueryTypes.INSERT,
                replacements: [carryOverTime],
                raw: true
            });
        }).then(function (data) {
            if (typeof data === "string") {
                return Promise.resolve(data);
            }
            logInfo("结转库:" + business_db + ",结转开始时间(>=):" + carryOverTimeMoment.format("YYYY-MM-DD") + ",结转结束时间(<):" + carryOverEndTimeMoment.format("YYYY-MM-DD") + ",结转开始id:" + data[0] + ",结转行数:" + data[1]);
            return Promise.resolve("结转完毕");
        });
    };
    //------------------------------END----------------------------------------------------------
    //----------------------------商户报表-------------------------------------------------------
    //获取所有商户基本信息
    var getTenantInfo = function (form_fields) {
        var env_name = form_fields["env_name"];
        var partition_code = form_fields["partition_code"];
        var tenant_code = form_fields["tenant_code"]
        var is_test = form_fields["is_test"];
        var tenant_where = {
            partition_code: partition_code,
            is_deleted: 0
        };
        if (typeof is_test !== "undefined") {
            if (Number(is_test) === 0) {
                tenant_where["is_test"] = 0;
                tenant_where["is_bate"] = 0;
            } else {
                tenant_where["$or"] = {
                    is_test: 1,
                    is_bate: 1
                }
            }
        }
        if (typeof tenant_code !== "undefined") {
            tenant_where["tenant_code"] = tenant_code.toString();
        }
        return global[env_name + "_z0_saas-db_tenant"].findAll({
            where: tenant_where,
            attributes: {include: [[Sequelize.literal("if(`is_test`=0 and `is_bate`=0,0,1)"), "tenant_type"]]},//测试、正式商户
            raw: true
        }).then(function (data) {
            var _obj = {};
            _.each(data, function (item) {
                _obj[item["tenant_id"]] = item;
            });
            return Promise.resolve(_obj);
        })
    };
    //获取指定商户，门店注册数统计情况
    var getBranchRegisterInfo = function (tenant_ids, env_name) {
        return global[env_name + "_z0_saas-db_tenant_goods"].findAll({
            where: {
                tenant_id: {$in: tenant_ids},
                branch_id: {$not: null},
                is_deleted: 0
            },
            attributes: ["tenant_id", "branch_id", [Sequelize.literal("if(`limit_date` = '1900-01-01' OR `limit_date` > NOW(),0,1)"), "is_expired"]],
            group: ["tenant_id", "branch_id"],
            raw: true
        }).then(function (data) {
            var tenant_branch_stat = {};
            for (var i = 0, j = data.length; i < j; i++) {
                var tenant_id = data[i]["tenant_id"];
                var is_expired = data[i]["is_expired"];
                if (!_.has(tenant_branch_stat, tenant_id)) {
                    tenant_branch_stat[tenant_id] = {};
                    tenant_branch_stat[tenant_id]["branch_count"] = 0;//门店总数量
                    tenant_branch_stat[tenant_id]["branch_expired_count"] = 0;//过期门店总数量
                }
                tenant_branch_stat[tenant_id]["branch_count"] = tenant_branch_stat[tenant_id]["branch_count"] + 1;
                //门店已经过期
                if (Number(is_expired) === 1) {
                    tenant_branch_stat[tenant_id]["branch_expired_count"] = tenant_branch_stat[tenant_id]["branch_expired_count"] + 1;
                }
            }
            return Promise.resolve(tenant_branch_stat);
        });
    };
    //获取指定商户，缴费总金额
    var getTenantPayAmount = function (tenant_ids, env_name) {
        //门店付款总金额
        return global[env_name + "_z0_saas-db_order_info"].findAll({
            where: {
                tenant_id: {$in: tenant_ids},
                status: 2,
                is_deleted: 0
            },
            attributes: ["tenant_id", [Sequelize.fn("ifnull", Sequelize.fn("sum", Sequelize.col("total")), 0), "tenant_pay_amount"]],
            group: ["tenant_id"],
            raw: true
        }).then(function (data) {
            var _obj = {};
            _.each(data, function (item) {
                _obj[item["tenant_id"]] = item;
            });
            return Promise.resolve(_obj);
        });
    };
    //获取指定商户.门店有缴费记录统计数
    var getBranchPayCount = function (tenant_ids, env_name) {
        //门店付款门店数
        return global[env_name + "_z0_saas-db_order_info"].findAll({
            include: {
                model: global[env_name + "_z0_saas-db_order_list"],
                attributes: [],
                where: {
                    is_deleted: 0
                },
                required: true
            },
            where: {
                tenant_id: {$in: tenant_ids},
                status: 2,
                is_deleted: 0
            },
            attributes: ["tenant_id", [Sequelize.fn("count", Sequelize.col("tenant_id")), "branch_pay_count"]],
            group: ["tenant_id", [global[env_name + "_z0_saas-db_order_list"], "branch_id"]],
            raw: true
        }).then(function (data) {
            var _obj = {};
            _.each(data, function (item) {
                var tennat_id = item["tenant_id"];
                if (_.has(_obj, tennat_id)) {
                    _obj[item["tenant_id"]]["branch_pay_count"]++;
                } else {
                    _obj[item["tenant_id"]] = item;
                    _obj[item["tenant_id"]]["branch_pay_count"] = 1;
                }
            });
            return Promise.resolve(_obj);
        });
    };
    //获取指定商户，会员数
    var getTenantVipInfo = function (tenant_ids, business_db) {
        //商户会员统计
        return global[business_db + "_vip"].findAll({
            where: {
                tenant_id: {$in: tenant_ids},
                is_deleted: 0
            },
            attributes: ["tenant_id",
                [Sequelize.fn("count", Sequelize.col("tenant_id")), "vip_count"],
                [Sequelize.fn("ifnull", Sequelize.fn("sum", Sequelize.col("sum_consume")), 0), "vip_sum_consume"]],
            group: ["tenant_id"],
            raw: true
        }).then(function (data) {
            var _obj = {};
            _.each(data, function (item) {
                _obj[item["tenant_id"]] = item;
            });

            return Promise.resolve(_obj);
        });
    };
    //获取指定商户，流水数和流水总金额
    var getTenantSaleInfo = function (tenant_ids, business_db) {
        //结转历史流水
        var sale_his;
        return carryOverHistorySale(business_db).then(function (data) {
            //获取结转历史流水
            return global[business_db + "_tmp_sale_carry_over"].findAll({
                attributes: [
                    "tenant_id",
                    [Sequelize.fn("ifnull", Sequelize.fn("sum", Sequelize.col("sale_count")), 0), "sale_count"],
                    [Sequelize.fn("ifnull", Sequelize.fn("sum", Sequelize.col("sale_total_amount")), 0), "sale_total_amount"]
                ],
                where: {
                    tenant_id: {$in: tenant_ids}
                },
                group: "tenant_id",
                raw: true
            })
        }).then(function (data) {
            sale_his = data;
            //实时流水，最近7天流水，包括今天
            return global[business_db + "_sale"].findAll({
                where: {
                    tenant_id: {$in: tenant_ids},
                    checkout_at: {$between: [moment(moment().startOf('day').subtract(6, 'days')).format("YYYY-MM-DD"), moment().format("YYYY-MM-DD HH:mm:ss")]},
                    is_deleted: 0
                },
                attributes: [
                    "tenant_id",
                    [Sequelize.fn("count", Sequelize.col("tenant_id")), "sale_count"],
                    [Sequelize.fn("ifnull", Sequelize.fn("sum", Sequelize.col("total_amount")), 0), "sale_total_amount"]
                ],
                group: "tenant_id",
                raw: true
            });
        }).then(function (data) {
            var _obj_his = {};
            var _obj_latest = {};
            _.each(sale_his, function (item) {
                _obj_his[item["tenant_id"]] = item;
            });
            _.each(data, function (item) {
                _obj_latest[item["tenant_id"]] = item;
            });
            //合并历史与最近流水
            for (var tenant_id in _obj_his) {
                if (_obj_latest[tenant_id]) {
                    _obj_his[tenant_id]["sale_count"] = parseFloat(_obj_his[tenant_id]["sale_count"]) + parseFloat(_obj_latest[tenant_id]["sale_count"]);
                    _obj_his[tenant_id]["sale_total_amount"] = parseFloat(_obj_his[tenant_id]["sale_total_amount"]) + parseFloat(_obj_latest[tenant_id]["sale_total_amount"]);
                }
            }
            return Promise.resolve(_obj_his);
        });
    };
    //商户数据报表
    var getTenantReport = function (req, form_data) {
        var form_fields = form_data["fields"];
        //获取参数并验证
        var env_name = form_fields["env_name"];
        var partition_code = form_fields["partition_code"];
        if (!env_name || !partition_code) {
            return Promise.reject("查询参数缺失");
        }
        var tenant_info;
        var tenant_ids = [];
        var business_db;
        return Promise.all([
            getTenantInfo(form_fields),
            publicmethod.getBusinessDbRoute(env_name, partition_code, 2)
        ]).then(function (data) {
            tenant_info = data[0];
            business_db = data[1];
            for (var tenant_id in tenant_info) {
                tenant_ids.push(Number(tenant_id));
            }
            return Promise.all([
                getBranchRegisterInfo(tenant_ids, env_name),
                getTenantPayAmount(tenant_ids, env_name),
                getBranchPayCount(tenant_ids, env_name),
                getTenantVipInfo(tenant_ids, business_db),
                getTenantSaleInfo(tenant_ids, business_db),
            ]);
        }).then(function (data) {
            var tenant_branch_stat = data[0];
            var tenant_branch_pay_amount = data[1];
            var tenant_branch_pay_count = data[2];
            var tenant_vip_info = data[3];
            var tenant_sale_info = data[4];
            //合并商户查询结果,没有的设置默认值
            for (var tenant_id in tenant_info) {
                _.extend(
                    tenant_info[tenant_id],
                    tenant_branch_stat[tenant_id] || {
                        branch_count: 0,
                        branch_expired_count: 0
                    },
                    tenant_branch_pay_amount[tenant_id] || {
                        tenant_pay_amount: 0
                    },
                    tenant_branch_pay_count[tenant_id] || {
                        branch_pay_count: 0,
                    },
                    tenant_vip_info[tenant_id] || {
                        vip_count: 0,
                        vip_sum_consume: 0
                    },
                    tenant_sale_info[tenant_id] || {
                        sale_count: 0,
                        sale_total_amount: 0
                    });
            }
            return Promise.resolve(_.values(tenant_info));
        });
    };
    //------------------------------END----------------------------------------------------------
    //----------------------------分区报表-------------------------------------------------------
    var getBranchIds = function (env_name, partition_code, tenant_code) {
        var business_db, tenant_id, branch_ids;
        return new Promise(function (resolve, reject) {
            if (typeof tenant_code !== "undefined") {
                resolve(publicmethod.getBusinessDbRoute(env_name, tenant_code, 1));
            } else {
                resolve(publicmethod.getBusinessDbRoute(env_name, partition_code, 2));
            }
        }).then(function (data) {
            if (typeof data !== "string") {
                business_db = data["business_db"];
                tenant_id = data["tenant_info"]["tenant_id"];
                return global[business_db + "_branch"].findAll({
                    where: {
                        tenant_id: tenant_id
                    },
                    attributes: ["branch_id"],
                    raw: true
                });
            } else {
                business_db = data;
                return Promise.resolve();
            }
        }).then(function (data) {
            if (data instanceof Array) {
                branch_ids = [];
                for (var i = 0, j = data.length; i < j; i++) {
                    branch_ids.push(data[i]["branch_id"]);
                }
            }
            return Promise.resolve([business_db, tenant_id, branch_ids]);
        })
    };
    //会员历史数量
    var getVipHisCount = function (business_db, tenant_id) {
        var where = {
            create_at: {$lt: moment(moment().startOf('day').subtract(6, 'days')).format("YYYY-MM-DD")},
            is_deleted: 0
        };
        if (typeof tenant_id !== "undefined") {
            where["tenant_id"] = tenant_id;
        }
        return global[business_db + "_vip"].findOne({
            where: where,
            raw: true,
            attributes: [[Sequelize.literal("count(1)"), "vip_his_count"]]
        });
    };
    //会员最近数量
    var getVipDateCount = function (business_db, tenant_id) {
        var where = {
            create_at: {$gte: moment(moment().startOf('day').subtract(6, 'days')).format("YYYY-MM-DD")},
            is_deleted: 0
        };
        if (typeof tenant_id !== "undefined") {
            where["tenant_id"] = tenant_id;
        }
        return global[business_db + "_vip"].findAll({
            where: where,
            raw: true,
            attributes: [
                [Sequelize.literal("count(1)"), "vip_date_count"],
                [Sequelize.fn("DATE", Sequelize.col("create_at")), "create_at"]
            ],
            group: [Sequelize.fn("DATE", Sequelize.col("create_at"))]
        }).then(function (data) {
            //转换成json对象
            var date_count = {};
            for (var i = 0, j = data.length; i < j; i++) {
                date_count[data[i]["create_at"]] = {
                    vip_date_count: data[i]["vip_date_count"]
                };
            }
            //遍历7天日期，确保每天会员数存在，不存在补0
            var latest_vip_count = {};
            for (var i = 0; i < 7; i++) {
                var key_date = moment().subtract(i, "days").format("YYYY-MM-DD");
                if (typeof date_count[key_date] == "undefined") {
                    latest_vip_count[key_date] = {
                        vip_date_count: 0
                    };
                } else {
                    latest_vip_count[key_date] = date_count[key_date];
                }
            }
            return Promise.resolve(latest_vip_count);
        });
    };
    //超7天会员消费额
    var getVipHisSumConsume = function (business_db, branch_ids) {
        var where = {
            create_at: {$lt: moment(moment().startOf('day').subtract(6, 'days')).format("YYYY-MM-DD")},
            is_deleted: 0
        };
        if (typeof branch_ids !== "undefined") {
            where["trade_branch_id"] = {$in: branch_ids};
        }
        return global[business_db + "_vip_trade_history"].findOne({
            where: where,
            raw: true,
            attributes: [
                [Sequelize.fn("IFNULL", Sequelize.fn("SUM", Sequelize.col("trade_amount")), 0), "vip_his_sum_consume"]
            ]
        });
    };
    //7天内每天会员日消费额
    var getVipDateSumConsume = function (business_db, branch_ids) {
        var where = {
            create_at: {$gte: moment(moment().startOf('day').subtract(6, 'days')).format("YYYY-MM-DD")},
            is_deleted: 0
        };
        if (typeof branch_ids !== "undefined") {
            where["trade_branch_id"] = {$in: branch_ids};
        }
        return global[business_db + "_vip_trade_history"].findAll({
            where: where,
            raw: true,
            attributes: [
                [Sequelize.fn("IFNULL", Sequelize.fn("SUM", Sequelize.col("trade_amount")), 0), "vip_date_sum_consume"],
                [Sequelize.fn("DATE", Sequelize.col("create_at")), "create_at"]
            ],
            group: [Sequelize.fn("DATE", Sequelize.col("create_at"))]
        }).then(function (data) {
            //转换成json对象
            var date_count = {};
            for (var i = 0, j = data.length; i < j; i++) {
                date_count[data[i]["create_at"]] = {
                    vip_date_sum_consume: data[i]["vip_date_sum_consume"]
                };
            }
            //遍历7天日期，确保每天会员数存在，不存在补0
            var latest_vip_count = {};
            for (var i = 0; i < 7; i++) {
                var key_date = moment().subtract(i, "days").format("YYYY-MM-DD");
                if (typeof date_count[key_date] == "undefined") {
                    latest_vip_count[key_date] = {
                        vip_date_sum_consume: 0
                    };
                } else {
                    latest_vip_count[key_date] = date_count[key_date];
                }
            }
            return Promise.resolve(latest_vip_count);
        });
    };
    //7天内流水
    var getLatestSaleInfo = function (business_db, tenant_id) {
        var where = {
            checkout_at: {$between: [moment(moment().startOf('day').subtract(6, 'days')).format("YYYY-MM-DD"), moment().format("YYYY-MM-DD HH:mm:ss")]},
            is_deleted: 0
        };
        if (typeof tenant_id !== "undefined") {
            where["tenant_id"] = tenant_id;
        }
        return global[business_db + "_sale"].findAll({
            where: where,
            raw: true,
            attributes: [
                [Sequelize.literal("count(1)"), "sale_date_count"],
                [Sequelize.fn("IFNULL", Sequelize.fn("SUM", Sequelize.col("total_amount")), 0), "sale_date_total_amount"],
                [Sequelize.fn("DATE", Sequelize.col("checkout_at")), "sale_date"]
            ],
            group: [Sequelize.fn("DATE", Sequelize.col("checkout_at"))]
        }).then(function (data) {
            //转换成json对象
            var date_count = {};
            for (var i = 0, j = data.length; i < j; i++) {
                if (typeof date_count[data[i]["sale_date"]] == "undefined") {
                    date_count[data[i]["sale_date"]] = {};
                }
                date_count[data[i]["sale_date"]]["sale_date_count"] = data[i]["sale_date_count"];
                date_count[data[i]["sale_date"]]["sale_date_total_amount"] = data[i]["sale_date_total_amount"];
            }
            //遍历7天日期，确保每天流水数存在，不存在补0
            var latest_sale_info = {};
            for (var i = 0; i < 7; i++) {
                var key_date = moment().subtract(i, "days").format("YYYY-MM-DD");
                if (typeof date_count[key_date] == "undefined") {
                    latest_sale_info[key_date] = {
                        sale_date_count: 0,
                        sale_date_total_amount: 0
                    };
                } else {
                    latest_sale_info[key_date] = {
                        sale_date_count: date_count[key_date]["sale_date_count"],
                        sale_date_total_amount: date_count[key_date]["sale_date_total_amount"]
                    };
                }
            }
            return Promise.resolve(latest_sale_info);
        });
    };
    //7天外历史流水
    var getHisSaleInfo = function (business_db, tenant_id) {
        var where = {};
        if (typeof tenant_id !== "undefined") {
            where["tenant_id"] = tenant_id;
        }
        return global[business_db + "_tmp_sale_carry_over"].findAll({
            where: where,
            raw: true,
            attributes: [
                [Sequelize.fn("IFNULL", Sequelize.fn("SUM", Sequelize.col("sale_count")), 0), "sale_his_count"],
                [Sequelize.fn("IFNULL", Sequelize.fn("SUM", Sequelize.col("sale_total_amount")), 0), "sale_his_total_amount"]
            ]
        }).then(function (data) {
            var sale_his_count, sale_his_total_amount;
            if (data.length !== 1) {
                sale_his_count = 0;
                sale_his_total_amount = 0;
            } else {
                sale_his_count = data[0]["sale_his_count"];
                sale_his_total_amount = data[0]["sale_his_total_amount"];
            }
            return Promise.resolve([sale_his_count, sale_his_total_amount]);
        });
    };
    //分区数据报表
    var getPartitionReport = function (req, form_data, callback) {
        var form_fields = form_data["fields"];
        //获取参数并验证
        var env_name = form_fields["env_name"];
        var partition_code = form_fields["partition_code"];
        var tenant_code = form_fields["tenant_code"];
        if (!env_name || !partition_code) {
            callback(new Error("查询参数缺失"));
            return;
        }
        var business_db, tenant_id, branch_ids;
        return getBranchIds(env_name, partition_code, tenant_code).then(function (data) {
            business_db = data[0];
            tenant_id = data[1];
            branch_ids = data[2];
            return carryOverHistorySale(business_db);
        }).then(function (data) {
            return Promise.all([
                getVipHisCount(business_db, tenant_id),
                getVipDateCount(business_db, tenant_id),
                getVipHisSumConsume(business_db, branch_ids),
                getVipDateSumConsume(business_db, branch_ids),
                getLatestSaleInfo(business_db, tenant_id),
                getHisSaleInfo(business_db, tenant_id)
            ]).then(function (data) {
                var vip_his_count = data[0];
                var vip_date_count = data[1];
                var vip_his_sum_consume = data[2];
                var vip_date_sum_consume = data[3];
                var latest_sale_info = data[4];
                var his_sale_info = data[5];
                //---------------会员处理-----------------
                var vip_info = {};
                var his_count = vip_his_count["vip_his_count"];
                var his_sum_consume = vip_his_sum_consume["vip_his_sum_consume"];
                //7天内每天总数量
                for (var i = 6; i >= 0; i--) {
                    const key_date = moment().subtract(i, "days").format("YYYY-MM-DD");
                    if (typeof vip_info[key_date] == "undefined") {
                        vip_info[key_date] = {};
                    }
                    vip_info[key_date]["vip_date_count"] = vip_date_count[key_date]["vip_date_count"];
                    vip_info[key_date]["vip_date_sum_consume"] = vip_date_sum_consume[key_date]["vip_date_sum_consume"];
                    vip_info[key_date]["vip_his_count"] = parseFloat(vip_date_count[key_date]["vip_date_count"]) + parseFloat(his_count);
                    vip_info[key_date]["vip_his_sum_consume"] = parseFloat(vip_date_sum_consume[key_date]["vip_date_sum_consume"]) + parseFloat(his_sum_consume);
                    his_count = vip_info[key_date]["vip_his_count"];
                    his_sum_consume = vip_info[key_date]["vip_his_sum_consume"];
                }
                //---------------流水处理-----------------
                var sale_info = {};
                var sale_his_count = his_sale_info[0];
                var sale_his_total_amount = his_sale_info[1];
                //7天内每天流水、流水金额日增量和总量
                for (var i = 6; i >= 0; i--) {
                    const key_date = moment().subtract(i, "days").format("YYYY-MM-DD");
                    if (typeof sale_info[key_date] == "undefined") {
                        sale_info[key_date] = {};
                    }
                    sale_info[key_date]["sale_date_count"] = latest_sale_info[key_date]["sale_date_count"];
                    sale_info[key_date]["sale_date_total_amount"] = latest_sale_info[key_date]["sale_date_total_amount"];
                    sale_info[key_date]["sale_his_count"] = parseFloat(latest_sale_info[key_date]["sale_date_count"]) + parseFloat(sale_his_count);
                    sale_info[key_date]["sale_his_total_amount"] = parseFloat(latest_sale_info[key_date]["sale_date_total_amount"]) + parseFloat(sale_his_total_amount);
                    sale_his_count = sale_info[key_date]["sale_his_count"];
                    sale_his_total_amount = sale_info[key_date]["sale_his_total_amount"];
                }
                //---------------------合并每一天,会员、流水的数据-----------------------------------
                for (var latest_date in sale_info) {
                    _.extend(sale_info[latest_date], vip_info[latest_date], {latest_date: latest_date});
                }
                var rows = _.values(sale_info);
                return Promise.resolve(rows);
            })
        });
    };
//------------------------------END----------------------------------------------------------
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
            var partition = {
                "www_ali": ["za1", "zb1", "zc1", "zd1"],
                "sanmi_www": ["zd1"],
                //"test_51": ["zd1"]
            };
            res.render(routeDir + "tenantReportList", {
                operator: operator,
                partition: partition,
                envs: _.keys(partition),
                menu: menu,
                title: "MySQL查询",
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
            case 'reportList': {
                var report_type = form_fields["report_type"];
                switch (report_type + "") {
                    //商户报表
                    case "1": {
                        getTenantReport(req, form_data).then(function (data) {
                            res.end(JSON.stringify({"status": "success", "msg": "", "data": data}));
                        }).catch(function (err) {
                            res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                        });
                    }
                        break;
                    //分区报表
                    case "2": {
                        getPartitionReport(req, form_data).then(function (data) {
                            res.end(JSON.stringify({"status": "success", "msg": "", "data": data}));
                        }).catch(function (err) {
                            res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                        });
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