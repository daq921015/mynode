//supervisor 进程控制路由
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var logError = param.publicmethod.logError;
    var utils = param.utils;
    var authority = param.authority;
    var _ = param.underscore._;
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
            res.render(routeDir + "historyExactReport", {
                channels: channels,
                toutiao_numbers: toutiao_numbers,
                title: "精确数据-分析报表-作者维度",
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
            if (action !== "list") {
                res.end(JSON.stringify({"status": "error", "msg": "the addr of get request is not exist"}));
                return;
            }
            var start_create_time = form_fields["start_create_time"];
            var end_create_time = form_fields["end_create_time"];
            var goods_clicks = form_fields["goods_clicks"];
            var article_count = form_fields["article_count"];
            var name = form_fields["name"];
            var article_author = form_fields["article_author"];
            var read_count = form_fields["read_count"];
            var channel = form_fields["channel"];
            var toutiao_number = form_fields["toutiao_number"];
            var report_type = form_fields["report_type"];
            if (!start_create_time || !end_create_time) {
                res.end(JSON.stringify({"status": "error", "msg": "查询参数缺失"}));
                return;
            }
            var toutiao_exact_article_where = {
                create_time: {$between: [start_create_time, end_create_time]}
            };
            if (name) {
                toutiao_exact_article_where["name"] = {$like: "%" + name.toString() + "%"};
            }
            if (read_count) {
                toutiao_exact_article_where["read_count"] = {$gte: Number(read_count) || 0};
            }
            if (goods_clicks) {
                toutiao_exact_article_where["goods_clicks"] = {$gte: Number(goods_clicks) || 0};
            }
            if (channel) {
                toutiao_exact_article_where["channel"] = {$in: channel.split(",")};
            }
            if (toutiao_number) {
                toutiao_exact_article_where["toutiao_number"] = {$in: toutiao_number.split(",")};
            }
            if (article_author) {
                toutiao_exact_article_where["article_author"] = article_author.toString();
            }
            switch (report_type + "") {
                case '0': {
                    Promise.all([
                        toutiao_exact_article.count({
                            col: "article_author",
                            group: "article_author",
                            where: toutiao_exact_article_where,
                            having: Sequelize.literal("count(1)>" + (Number(article_count) || 0))
                        }),
                        toutiao_exact_article.findAll({
                            attributes: [
                                "id", "article_author",
                                [Sequelize.fn("count", Sequelize.literal(1)), "article_count_sum"],//总篇数
                                [Sequelize.fn("sum", Sequelize.col("read_count")), "read_count_sum"],//总阅读数
                                [Sequelize.fn("sum", Sequelize.col("goods_clicks")), "goods_clicks_sum"],//总商品点击数
                                [Sequelize.fn("sum", Sequelize.col("recommend_count")), "recommend_count_sum"],//总推荐数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`type`='图片',1,0)")), "atlas_sum"],//图集数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`type`='专辑',1,0)")), "special_sum"],//专辑数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`<50000,1,0)")), "probability_le_five"],//0~5万文章数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`>=50000,1,0)")), "probability_five"],//5~10万文章数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`>=100000,1,0)")), "probability_ten"],//10~30万文章数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`>=300000,1,0)")), "probability_thr_ten"],//>30万文章数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`channel`='型男塑造师',1,0)")), "stylish_man_article"],
                                [Sequelize.fn("sum", Sequelize.literal("IF(`channel`='居家巧匠',1,0)")), "living_article"],
                                [Sequelize.fn("sum", Sequelize.literal("IF(`channel`='户外行者',1,0)")), "outdoors_article"],
                                [Sequelize.fn("sum", Sequelize.literal("IF(`channel`='数码极客',1,0)")), "digital_pro_article"],
                                [Sequelize.fn("sum", Sequelize.literal("IF(`channel`='文娱先锋',1,0)")), "entertainment_article"],
                                [Sequelize.fn("sum", Sequelize.literal("IF(`channel`='时尚车主',1,0)")), "fashion_article"],
                                [Sequelize.fn("sum", Sequelize.literal("IF(`channel`='母婴达人',1,0)")), "mom_baby_article"],
                                [Sequelize.fn("sum", Sequelize.literal("IF(`channel`='潮女搭配师',1,0)")), "tide_girl_article"],
                                [Sequelize.fn("sum", Sequelize.literal("IF(`channel`='美妆老师',1,0)")), "beauty_pro_article"],
                                [Sequelize.fn("sum", Sequelize.literal("IF(`channel`='美食专家',1,0)")), "delicacy_article"]
                            ],
                            where: toutiao_exact_article_where,
                            limit: Number(form_fields["limit"]) || 0,
                            offset: Number(form_fields["offset"]) || 0,
                            group: "article_author",
                            having: Sequelize.literal("count(1)>" + (Number(article_count) || 0)),
                            order: [[Sequelize.literal(form_fields["sortName"] || "read_count_sum"), form_fields["sortOrder"] || "desc"]],
                            raw: true
                        })
                    ]).then(function (data) {
                        var total = data[0].length || 0;
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
                case '1': {
                    Promise.all([
                        toutiao_exact_article.count({
                            col: "channel",
                            group: "channel",
                            where: toutiao_exact_article_where
                        }),
                        toutiao_exact_article.findAll({
                            attributes: [
                                "id", "channel",
                                [Sequelize.fn("count", Sequelize.literal(1)), "article_count_sum"],//总篇数
                                [Sequelize.fn("sum", Sequelize.col("read_count")), "read_count_sum"],//总阅读数
                                [Sequelize.fn("sum", Sequelize.col("goods_clicks")), "goods_clicks_sum"],//总商品点击数
                                [Sequelize.fn("sum", Sequelize.col("recommend_count")), "recommend_count_sum"],//总推荐数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`type`='图片',1,0)")), "atlas_sum"],//图集数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`type`='专辑',1,0)")), "special_sum"],//专辑数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`<50000,1,0)")), "probability_le_five"],//0~5万文章数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`>=50000,1,0)")), "probability_five"],//5~10万文章数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`>=100000,1,0)")), "probability_ten"],//10~30万文章数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`>=300000,1,0)")), "probability_thr_ten"]//>30万文章数
                            ],
                            where: toutiao_exact_article_where,
                            limit: Number(form_fields["limit"]) || 0,
                            offset: Number(form_fields["offset"]) || 0,
                            group: "channel",
                            order: [[Sequelize.literal(form_fields["sortName"] || "read_count_sum"), form_fields["sortOrder"] || "desc"]],
                            raw: true
                        })
                    ]).then(function (data) {
                        var total = data[0].length || 0;
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
                case '2': {
                    Promise.all([
                        toutiao_exact_article.count({
                            col: "channel",
                            group: ["channel", "week"],
                            where: toutiao_exact_article_where
                        }),
                        toutiao_exact_article.findAll({
                            attributes: [
                                "id", "channel", "week",
                                [Sequelize.fn("count", Sequelize.literal(1)), "article_count_sum"],//总篇数
                                [Sequelize.fn("sum", Sequelize.col("read_count")), "read_count_sum"],//总阅读数
                                [Sequelize.fn("sum", Sequelize.col("goods_clicks")), "goods_clicks_sum"],//总商品点击数
                                [Sequelize.fn("sum", Sequelize.col("recommend_count")), "recommend_count_sum"],//总推荐数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`type`='图片',1,0)")), "atlas_sum"],//图集数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`type`='专辑',1,0)")), "special_sum"],//专辑数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`<50000,1,0)")), "probability_le_five"],//0~5万文章数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`>=50000,1,0)")), "probability_five"],//5~10万文章数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`>=100000,1,0)")), "probability_ten"],//10~30万文章数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`>=300000,1,0)")), "probability_thr_ten"]//>30万文章数
                            ],
                            where: toutiao_exact_article_where,
                            limit: Number(form_fields["limit"]) || 0,
                            offset: Number(form_fields["offset"]) || 0,
                            group: ["channel", "week"],
                            order: [[Sequelize.literal(form_fields["sortName"] || "read_count_sum"), form_fields["sortOrder"] || "desc"]],
                            raw: true
                        })
                    ]).then(function (data) {
                        var total = data[0].length || 0;
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
                case '3': {
                    Promise.all([
                        toutiao_exact_article.count({
                            col: "channel",
                            group: ["channel", "hour"],
                            where: toutiao_exact_article_where
                        }),
                        toutiao_exact_article.findAll({
                            attributes: [
                                "id", "channel", "hour",
                                [Sequelize.fn("count", Sequelize.literal(1)), "article_count_sum"],//总篇数
                                [Sequelize.fn("sum", Sequelize.col("read_count")), "read_count_sum"],//总阅读数
                                [Sequelize.fn("sum", Sequelize.col("goods_clicks")), "goods_clicks_sum"],//总商品点击数
                                [Sequelize.fn("sum", Sequelize.col("recommend_count")), "recommend_count_sum"],//总推荐数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`type`='图片',1,0)")), "atlas_sum"],//图集数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`type`='专辑',1,0)")), "special_sum"],//专辑数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`<50000,1,0)")), "probability_le_five"],//0~5万文章数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`>=50000,1,0)")), "probability_five"],//5~10万文章数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`>=100000,1,0)")), "probability_ten"],//10~30万文章数
                                [Sequelize.fn("sum", Sequelize.literal("IF(`read_count`>=300000,1,0)")), "probability_thr_ten"]//>30万文章数
                            ],
                            where: toutiao_exact_article_where,
                            limit: Number(form_fields["limit"]) || 0,
                            offset: Number(form_fields["offset"]) || 0,
                            group: ["channel", "hour"],
                            order: [[Sequelize.literal(form_fields["sortName"] || "read_count_sum"), form_fields["sortOrder"] || "desc"]],
                            raw: true
                        })
                    ]).then(function (data) {
                        var total = data[0].length || 0;
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
                default:
                    res.end(JSON.stringify({"status": "error", "msg": "the report_type of get request is not exist"}));
            }
        }
    ).post("/:action", function (req, res, next) {
        res.end(JSON.stringify({"status": "error", "msg": "the addr of post request is not exist"}));
    });
    return router;
};