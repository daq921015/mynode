/**
 * Created by Administrator on 2017-05-24.
 */
module.exports = function (param, routeDir) {
    /*
     * 今日头条，标题党 标题验证
     * */
    var express = require("express");
    var router = express.Router();
    var async = param.async;
    var _ = param.underscore._;
    var utils = param.utils;
    var authority = param.authority;
    var logError = param.publicmethod.logError;
    router.get('/getTitleCheckResult', function (req, res, next) {
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
            res.render(routeDir + "regIndex", {
                title: "标题审查",
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
        res.end(JSON.stringify({"status": "error", "msg": "the addr of post request is not exist"}));
    }).post("/:action", function (req, res, next) {
        var action = req.params.action;
        async.auto({
            form_data: function (callback) {
                utils.postForm(req, function (err, form_data) {
                    callback(err, form_data);
                });
            }
        }, function (err, results) {
            var form_fields = results["form_data"]["fields"];
            switch (action) {
                case 'getTitleCheckResult': {
                    //获取标题，字符串内容，没有则赋null值
                    var titles = form_fields["titles"];
                    if (!titles) {
                        res.end(JSON.stringify({"status": "error", "msg": "标题内容为空！"}));
                        return;
                    }
                    titles = JSON.parse(titles);
                    if (!titles instanceof Array) {
                        res.end(JSON.stringify({"status": "error", "msg": "获取标题内容失败！"}));
                        return;
                    }
                    var unique_titles = _.union(titles);
                    //获取所有正则句式
                    toutiao_headline_reg.findAll({raw: true}).then(function (reg_infos) {
                        var hit_titles = [];
                        var miss_titles = [];
                        for (var i = 0, j = unique_titles.length; i < j; i++) {
                            var _hit = false;
                            for (var m = 0, n = reg_infos.length; m < n; m++) {
                                var reg = new RegExp(reg_infos[m]["reg_info"]);
                                //被匹配
                                if (reg.test(unique_titles[i])) {
                                    hit_titles.push({
                                        number: hit_titles.length + 1,
                                        title: unique_titles[i],
                                        reg_info: reg_infos[m]["reg_info"],
                                        is_official: reg_infos[m]["is_official"]
                                    });
                                    _hit = true;
                                    break;
                                }
                            }
                            if (!_hit) {
                                miss_titles.push({
                                    number: miss_titles.length + 1,
                                    title: unique_titles[i]
                                });
                            }
                        }
                        res.end(JSON.stringify({"status": "success", "msg": "", "data": [hit_titles, miss_titles]}));
                    }).catch(function (err) {
                        res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                    });
                }
                    break;
                default:
                    res.end(JSON.stringify({"status": "error", "msg": "the addr of post request is not exist"}));
            }
        });
    });
    return router;
};