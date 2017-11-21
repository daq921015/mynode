//supervisor 进程控制路由
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var utils = param.utils;
    var authority = param.authority;
    var moment = param.moment;
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
            authority.getUserOperator(req, sider_id)
        ]).then(function (data) {
            var menu = data[0];
            var operator = data[1];
            res.render(routeDir + "historyList", {
                title: "综合数据",
                operator: operator,
                menu: menu,
                resTag: sider_id,
                session: req.session
            });
        }).catch(function (err) {
            res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
        });
    });
    //todo 权限限制，不只需要登录权限还需要判断该用户是否有删除改天数据的权限。
    router.get('/:action', function (req, res, next) {
            var action = req.params.action;
            var form_data = utils.getForm(req);
            var form_fields = form_data["fields"];
            var name = form_fields["name"];
            var read_count = form_fields["read_count"];
            var channel = form_fields["channel"];
            var start_time = form_fields["start_time"];
            var end_time = form_fields["end_time"];
            var toutiao_article_where = {
                create_time: {$between: [start_time, end_time]}
            };
            if (name) {
                toutiao_article_where["name"] = {$like: "%" + name.toString() + "%"};
            }
            if (read_count) {
                toutiao_article_where["read_count"] = {$gte: read_count || 0};
            }
            if (channel) {
                toutiao_article_where["channel"] = {$in: channel.split(",")};
            }
            switch (action) {
                case 'list': {
                    if (!start_time || !end_time) {
                        res.end(JSON.stringify({"status": "error", "msg": "查询参数缺失"}));
                        return;
                    }
                    toutiao_article.findAndCountAll({
                        where: toutiao_article_where,
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
                case 'download': {
                    if (!start_time || !end_time) {
                        res.end(JSON.stringify({"status": "error", "msg": "查询参数缺失"}));
                        return;
                    }
                    toutiao_article.count({
                        col: ["id"],
                        where: toutiao_article_where,
                        raw: true
                    }).then(function (data) {
                        var max_export = 40000;
                        if (data >= max_export) {
                            return Promise.reject("导出数据量不符合要求，最高导出不能超过" + max_export + "条。当前数量：" + data);
                        } else {
                            return toutiao_article.findAll({
                                where: toutiao_article_where,
                                attributes: ["name", "read_count", "comment", "create_time", "link", "channel", "type", "hour", "week", "created_at"],
                                raw: true
                            });
                        }
                    }).then(function (data) {
                        var fields = ["标题", "阅读量", "评论数", "上线时间", "链接", "频道", "类型", "小时", "星期", "导入时间"];
                        return publicmethod.wirteToExcel(data, fields);
                    }).then(function (data) {
                        res.end(JSON.stringify({"status": "success", "msg": "", "data": data}));
                    }).catch(function (err) {
                        res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                    });
                }
                    break;
                case "upload": {
                    res.render(routeDir + "historyUpload");
                }
                    break;
                default:
                    res.end(JSON.stringify({"status": "error", "msg": "the addr of get request is not exist"}));
            }
        }
    ).post("/:action", function (req, res, next) {
        var action = req.params.action;
        switch (action) {
            case 'download': {
                var zip_file_path = req.body["zip_file_path"];
                if (!zip_file_path) {
                    res.end(JSON.stringify({"status": "error", "msg": "arg error"}));
                    return;
                }
                res.download(zip_file_path);
            }
                break;
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
                    var type_idx = _.indexOf(fields, "type");
                    var read_count_idx = _.indexOf(fields, "read_count");
                    var comment_idx = _.indexOf(fields, "comment");
                    var create_time_idx = _.indexOf(fields, "create_time");
                    if (link_idx === -1 || type_idx === -1 || read_count_idx === -1 || comment_idx === -1 || create_time_idx === -1) {
                        return Promise.reject("excel表头缺失");
                    }
                    //过滤数据
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
                                //type文章类型除外，可以不存在
                                if (m === type_idx) {
                                    data[i][m] = "";
                                } else {
                                    give_up++;
                                    data_judge = false;
                                    break;
                                }
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
                            //评论数可以转换成数字
                            //阅读数转换成数字
                            if (m === comment_idx && /万/.test(data[i][m])) {
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
                            sql = "REPLACE INTO `toutiao_article` (`" + fields[i] + "`,";
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