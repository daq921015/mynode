//supervisor 进程控制路由
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var utils = param.utils;
    var _ = param.underscore._;
    var moment = param.moment;
    var authority = param.authority;
    var publicmethod = param.publicmethod;
    var logError = param.publicmethod.logError;
    router.get("/index", function (req, res, next) {
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
            var channels = [
                {"channel": '型男塑造师'}, {"channel": '居家巧匠'}, {"channel": '户外行者'},
                {"channel": '数码极客'}, {"channel": '文娱先锋'}, {"channel": '时尚车主'},
                {"channel": '母婴达人'}, {"channel": '潮女搭配师'}, {"channel": '美妆老师'},
                {"channel": '美食专家'}
            ];
            var toutiao_numbers = [
                {"toutiao_number": '潮男周刊'}, {"toutiao_number": '会生活'}, {"toutiao_number": '户外行者'},
                {"toutiao_number": '数码极客'}, {"toutiao_number": '文娱多宝阁'}, {"toutiao_number": '爱车族'},
                {"toutiao_number": '辣妈潮宝'}, {"toutiao_number": '每日穿衣之道'}, {"toutiao_number": '美妆课堂'},
                {"toutiao_number": '美食大搜罗'}, {"toutiao_number": '特卖精选'}
            ];
            res.render(routeDir + "historyExactList", {
                channels: channels,
                toutiao_numbers: toutiao_numbers,
                title: "精确数据",
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
                    var goods_clicks = form_fields["goods_clicks"];
                    var article_author = form_fields["article_author"];
                    var read_count = form_fields["read_count"];
                    var channel = form_fields["channel"];
                    var toutiao_number = form_fields["toutiao_number"];
                    var name = form_fields["name"];
                    if (!start_create_time || !end_create_time) {
                        res.end(JSON.stringify({"status": "error", "msg": "查询参数缺失"}));
                        return;
                    }
                    var toutiao_exact_article_where = {
                        create_time: {$between: [start_create_time, end_create_time]},
                    };
                    if (name) {
                        toutiao_exact_article_where["name"] = {$like: "%" + name.toString() + "%"};
                    }
                    if (read_count) {
                        toutiao_exact_article_where["read_count"] = {$gte: read_count || 0};
                    }
                    if (goods_clicks) {
                        toutiao_exact_article_where["goods_clicks"] = {$gte: goods_clicks || 0};
                    }
                    if (channel) {
                        toutiao_exact_article_where["channel"] = {$in: channel.split(",")};
                    }
                    if (toutiao_number) {
                        toutiao_exact_article_where["toutiao_number"] = {$in: toutiao_number.split(",")};
                    }
                    if (article_author) {
                        toutiao_exact_article_where["article_author"] = article_author;
                    }
                    toutiao_exact_article.findAndCountAll({
                        where: toutiao_exact_article_where,
                        limit: ~~form_fields["limit"] || 0,
                        offset: ~~form_fields["offset"] || 0,
                        order: [[form_fields["sortName"] || "read_count", form_fields["sortOrder"] || "desc"]],
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
                case "upload": {
                    res.render(routeDir + "historyExactUpload", {});
                }
                    break;
                default:
                    res.end(JSON.stringify({"status": "error", "msg": "the addr of get request is not exist"}));
            }
        }
    ).post("/:action", function (req, res, next) {
        var action = req.params.action;
        switch (action) {
            case "upload": {
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
                    var links = [];//本次导入的所有文章地址列表
                    var fields = data[0];//excel表头
                    all_count = data.length - 1;
                    //特殊过滤字段
                    var link_idx = _.indexOf(fields, "link");
                    var read_count_idx = _.indexOf(fields, "read_count");
                    var recommend_count_idx = _.indexOf(fields, "recommend_count");
                    var create_time_idx = _.indexOf(fields, "create_time");
                    if (link_idx === -1 || read_count_idx === -1 || recommend_count_idx === -1 || create_time_idx === -1) {
                        return Promise.reject("excel表头缺失");
                    }
                    //过滤后数据
                    for (var i = 1, j = data.length; i < j; i++) {
                        var data_judge = true;
                        //本次导入的文章地址不能重复
                        if (_.indexOf(links, data[i][link_idx]) !== -1) {
                            give_up++;
                            continue;
                        }
                        links.push(data[i][link_idx]);
                        //数据行列数要和表头列数一致
                        if (fields.length !== data[i].length) {
                            give_up++;
                            continue;
                        }
                        //验证表格内容
                        for (var m = 0, n = data[i].length; m < n; m++) {
                            //cell必须有内容
                            if (typeof data[i][m] === "undefined" || data[i][m] === "") {
                                give_up++;
                                data_judge = false;
                                break;
                            }
                            //阅读数转换成数字
                            if (m === read_count_idx && /万/.test(data[i][m])) {
                                const tmp = data[i][m].replace(/万.*/, '');
                                if (!isNaN(tmp)) {
                                    data[i][m] = tmp.trim() * 10000;
                                } else {
                                    give_up++;
                                    data_judge = false;
                                    break;
                                }
                            }
                            //推荐数可以转换成数字
                            if (m === recommend_count_idx && /万/.test(data[i][m])) {
                                const tmp = data[i][m].replace(/万.*/, '');
                                if (!isNaN(tmp)) {
                                    data[i][m] = tmp.trim() * 10000;
                                } else {
                                    give_up++;
                                    data_judge = false;
                                    break;
                                }
                            }
                            data[i][m] = "'" + data[i][m] + "'";
                        }
                        if (data_judge) {
                            //计算小时和日期
                            var create_time = data[i][create_time_idx].replace(/'/g, "");
                            var hour = "'" + moment(create_time).format("HH") + "'";
                            var week = "'" + moment(create_time).day() + "'";
                            data[i].push(hour);
                            data[i].push(week);
                            insert_data.push("(" + data[i].join(",") + ")");
                        }
                    }
                    fields.push("hour");
                    fields.push("week");
                    var sql = "";
                    for (var i = 0, j = fields.length; i < j; i++) {
                        if (i === 0) {
                            sql = "REPLACE INTO `toutiao_exact_article` (`" + fields[i] + "`,";
                        } else if (i === j - 1) {
                            sql = sql + "`" + fields[i] + "`) values";
                        } else {
                            sql = sql + "`" + fields[i] + "`,";
                        }
                    }
                    sql = sql + insert_data.join(",");
                    return mydbSource.query(sql);
                }).then(function (data) {
                    res.end(JSON.stringify({"status": "success", "msg": "上传成功,总数据:" + all_count + ",无效行数:" + give_up}));
                }).catch(function (err) {
                    res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                });
            }
                break;
            default:
                res.end(JSON.stringify({"status": "error", "msg": "the addr of post request is not exist"}));
        }
    });
    return router;
};