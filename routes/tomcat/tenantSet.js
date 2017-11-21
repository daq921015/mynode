/**
 * Created by Administrator on 2017-07-22.
 */
module.exports = function (param, routeDir) {
    var express = require("express");
    var router = express.Router();
    var authority = param.authority;
    var utils = param.utils;
    var _ = param.underscore._;
    var logError = param.publicmethod.logError;
    //-----------------------功能路由表----------------------------------------
    //商户所有特殊功能列表
    // key需要和环境权限表（deploy_user_env）字段名对应，name会在页面展示 exec_func为该功能执行函数
    var tenant_special_funcs = {
        "is_app_version": {
            "name": "设置商户pos版本号",
            "exec_func": require("./tenantSet/is_app_version"),
            "privilege_code": "4"
        },
        "is_clear_mobile": {
            "name": "解绑商户注册手机号",
            "exec_func": require("./tenantSet/is_clear_mobile"),
            "privilege_code": "3"
        },
        "is_tenant_card": {
            "name": "查询商户母卡和授权卡",
            "exec_func": require("./tenantSet/is_tenant_card"),
            "privilege_code": "5"
        },
        "is_tenant_active_code": {
            "name": "慧掌柜商户激活码查询",
            "exec_func": require("./tenantSet/is_tenant_active_code"),
            "privilege_code": "6"
        },
        "is_hzf": {"name": "惠支付设置", "exec_func": require("./tenantSet/is_hzf"), "privilege_code": "7"},
        "is_recipe": {"name": "商户配方、领用功能", "exec_func": require("./tenantSet/is_recipe"), "privilege_code": "8"},
        "is_mp_upload": {"name": "微餐厅文件上传", "exec_func": require("./tenantSet/is_mp_upload"), "privilege_code": "9"},
        "is_meituan_bind": {"name": "美团解绑与绑定", "exec_func": require("./tenantSet/is_meituan_bind"), "privilege_code": "13"}
    };
    //--------------------------END--------------------------------------------
    router.get("/getTenantSet", function (req, res, next) {
        var form_data = utils.getForm(req);
        var form_fields = form_data["fields"];
        var sider_id = form_fields["sider_id"] || 0;
        Promise.all([
            //菜单栏
            authority.getUserSiderMenu(req),
            authority.getUserOperator(req, sider_id),
            deploy_user_env.findAll({
                where: {
                    user_id: req.session.user["user_id"]
                },
                attributes: ["env_name", "privilege_code"],
                order: ["env_name"],
                raw: true
            })
        ]).then(function (data) {
            var menu = data[0];
            var operator = data[1];
            var user_auth = data[2];
            //转换成对象
            var _obj_auth = {};
            _.each(user_auth, function (item) {
                var env_name = item["env_name"];
                var privilege_code = item["privilege_code"];
                //用户有此环境权限
                if (!_.has(_obj_auth, env_name)) {
                    _obj_auth[env_name] = [privilege_code];
                } else {
                    _obj_auth[env_name].push(privilege_code);
                }
            });
            //过滤本功能有的环境权限
            var env_auth = {};
            for (var env_name in _obj_auth) {
                var tmp_auth = {};
                for (var func in tenant_special_funcs) {
                    if (_.contains(_obj_auth[env_name], tenant_special_funcs[func]["privilege_code"])) {
                        tmp_auth[func] = tenant_special_funcs[func]["name"];
                    }
                }
                if (!_.isEmpty(tmp_auth)) {
                    env_auth[env_name] = tmp_auth;
                }
            }
            res.render(routeDir + "tenantSet/index", {
                operator: operator,
                envs: _.keys(env_auth),
                env_auth: env_auth,
                menu: menu,
                title: "商户数据设置",
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
        //具体执行功能（值为 tenant_special_funcs中的key）
        var func_type = form_fields["func_type"];
        switch (action + "") {
            case 'getFuncContext': {
                if (!func_type) {
                    res.end(JSON.stringify({"status": "error", "msg": "page not found"}));
                    return;
                }
                if (func_type === "is_app_version") {
                    res.render(routeDir + "tenantSet/" + func_type + "/index", {});
                } else {
                    res.render(routeDir + "tenantSet/" + func_type, {});
                }
            }
                break;
            case 'operatorTenantSet': {
                if (!func_type) {
                    res.end(JSON.stringify({"status": "error", "msg": "传入参数缺失,无法找到处理方法"}));
                    return;
                }
                //判断是否有此指定功能
                if (!_.has(tenant_special_funcs, func_type)) {
                    res.end(JSON.stringify({"status": "error", "msg": "商户数据，指定功能不存在"}));
                    return;
                }
                //调用功能执行函数
                tenant_special_funcs[func_type]["exec_func"](req, form_data, function (err, result) {
                    if (err) {
                        res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                        return;
                    }
                    res.end(JSON.stringify({"status": "success", "msg": "", "data": result}));
                });
            }
                break;
            default:
                res.end(JSON.stringify({"status": "error", "msg": "the addr of get request is not exist"}));
        }
    }).post('/:action', function (req, res, next) {
        var action = req.params.action;
        utils.postForm(req, function (err, result) {
            if (err) {
                res.end(JSON.stringify({"status": "error", "msg": "获取post表单内容出错"}));
                return;
            }
            var form_data = result;
            var form_fields = form_data["fields"];
            var func_type = form_fields["func_type"];
            switch (action + "") {
                case 'operatorTenantSet': {
                    if (!func_type) {
                        res.end(JSON.stringify({"status": "error", "msg": "传入参数缺失,无法找到处理方法"}));
                        return;
                    }
                    //判断是否有此指定功能
                    if (!_.has(tenant_special_funcs, func_type)) {
                        res.end(JSON.stringify({"status": "error", "msg": "商户数据，指定功能不存在"}));
                        return;
                    }
                    //调用功能执行函数
                    tenant_special_funcs[func_type]["exec_func"](req, form_data, function (err, result) {
                        if (err) {
                            res.end(JSON.stringify({"status": "error", "msg": logError(err)}));
                            return;
                        }
                        res.end(JSON.stringify({"status": "success", "msg": "", "data": result}));
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