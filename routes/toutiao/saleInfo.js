//supervisor 进程控制路由
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var utils = param.utils;
    var authority = param.authority;
    var _ = param.underscore._;
    var publicmethod = param.publicmethod;
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
            res.render(routeDir + "saleList", {
                ad_names: data[2],
                order_status: data[3],
                title: "订单数据",
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
                toutiao_sale.findAndCountAll({
                    where: toutiao_sale_where,
                    limit: ~~form_fields["limit"] || 0,
                    offset: ~~form_fields["offset"] || 0,
                    order: [[form_fields["sortName"] || "expect_amount", form_fields["sortOrder"] || "desc"]],
                    raw: true
                }).then(function (data) {
                    res.end(JSON.stringify({
                        "status": "success",
                        "msg": "",
                        "data": {"total": data["count"], "rows": data["rows"]}
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
    }).post('/:action', function (req, res, next) {
        var action = req.params.action;
        switch (action) {
            case 'upload': {
                var give_up = 0;//放弃数据行数
                var all_count = 0;//总行数
                new Promise(function (resolve, reject) {
                    utils.postForm(req, function (err, form_data) {
                        if (err) {
                            reject(Promise.reject(err));
                        }
                        var files = form_data["files"];
                        if (files.length !== 1) {
                            reject("excel文件上传失败");
                        }
                        resolve(files[0]);
                    });
                }).then(function (file_path) {
                    return publicmethod.readFromExcel(file_path);
                }).then(function (data) {
                    if (data.length <= 1) {
                        return Promise.reject("excel内数据为空，第一行为表头");
                    }
                    var insert_data = [];//本次导入的数据
                    var order_nos = [];
                    var fields = data[0];//excel表头
                    all_count = data.length - 1;
                    //特殊过滤字段
                    var balance_time_idx = _.indexOf(fields, "balance_time");
                    var order_no_idx = _.indexOf(fields, "order_no");
                    if (balance_time_idx === -1) {
                        return Promise.reject("excel表头缺失");
                    }
                    //过滤数据
                    for (var i = 1, j = data.length; i < j; i++) {
                        var data_judge = true;
                        order_nos.push(data[i][order_no_idx]);
                        //数据行列数要和表头列数一致
                        if (fields.length !== data[i].length) {
                            give_up++;
                            continue;
                        }
                        //验证表格内容
                        for (var m = 0, n = data[i].length; m < n; m++) {
                            //cell必须有内容
                            if (typeof data[i][m] === "undefined" || data[i][m] === "") {
                                //type文章类型除外，可以不存在
                                if (m === balance_time_idx) {
                                    data[i][m] = "1970-01-01";
                                } else {
                                    give_up++;
                                    data_judge = false;
                                    break;
                                }
                            }
                            //信息两侧加单引号，数据单引号加斜线
                            data[i][m] = "'" + data[i][m].toString().replace("'", "\\'") + "'";
                        }
                        if (data_judge) {
                            insert_data.push("(" + data[i].join(",") + ")");
                        }
                    }
                    var sql = "";
                    for (var i = 0, j = fields.length; i < j; i++) {
                        if (i === 0) {
                            sql = "INSERT INTO `toutiao_sale` (`" + fields[i] + "`,";
                        } else if (i === j - 1) {
                            sql = sql + "`" + fields[i] + "`) values";
                        } else {
                            sql = sql + "`" + fields[i] + "`,";
                        }
                    }
                    sql = sql + insert_data.join(",");
                    return toutiao_sale.destroy({
                        where: {
                            order_no: {$in: order_nos}
                        },
                        force: true,
                        raw: true
                    }).then(function (data) {
                        console.log(sql);
                        return mydbSource.query(sql, {type: Sequelize.QueryTypes.INSERT});
                    });

                }).then(function (data) {
                    res.end(JSON.stringify({"status": "success", "msg": "上传成功,总数据:" + all_count + ",无效行数:" + give_up}));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            default:
                res.end(JSON.stringify({"status": "error", "msg": "the addr of post request is not exist。"}));
        }
    });
    return router;
};