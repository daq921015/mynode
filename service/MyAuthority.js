/**
 * Created by Administrator on 2017-05-31.
 */
var my_authority = function (param) {
    /*
     * 涉及到用户权限的调用统一写到此处
     * */
    var _ = param.underscore._;
    var authority = {};
    authority.isUserOperatorPass = function (req_pathname, req, callback) {
        /*
         * 后端判断用户访问权限
         * 参数：用户id
         * 返回：true or false
         * */
        var reg = new RegExp(req_pathname);
        var req_authority = {};
        var user_id = req.session.user["user_id"];
        sys_resource.findAll({
            include: {
                model: sys_user_resource,
                where: {user_id: user_id},
                attributes: [],
                required: true
            },
            attributes: {include: [["id", "res_id"]]},
            raw: true
        }).then(function (user_auth) {
            if (!user_auth instanceof Array) {
                callback(null, false);
            }
            for (var i = 0, j = user_auth.length; i < j; i++) {
                if (reg.test(user_auth[i]["res_url"])) {
                    req_authority = user_auth[i];
                    break;
                }
            }
            callback(null, req_authority);
        }).catch(function (err) {
            callback(err);
        });
    };
    authority.getUserSiderMenu = function (req) {
        /*
         * 获取用户侧边栏
         * */
        var user_id = req.session.user["user_id"];
        return sys_resource.findAll({
            include: {
                model: sys_user_resource,
                where: {
                    user_id: user_id
                },
                attributes: [],
                required: true
            },
            where: {
                function_sign: {"$in": [1, 2]}
            },
            attributes: {include: [["id", "res_id"]]},
            order: [["parent_id", "asc"], ["order", "asc"]],
            raw: true
        }).then(function (data) {
            var mmenu = {};
            var smenu = {};
            _.each(data, function (item) {
                if (item["function_sign"] === 1) {
                    mmenu[item["res_id"]] = _.pick(item, "res_id", "res_name", "res_url");
                } else if (item["function_sign"] === 2) {
                    if (typeof smenu[item["parent_id"]] === "undefined") {
                        smenu[item["parent_id"]] = [];
                    }
                    smenu[item["parent_id"]].push(_.pick(item, "res_id", "res_name", "res_url"));
                }
            });
            return Promise.resolve([mmenu, smenu]);
        });
    };
    authority.getUserOperator = function (req, sider_id) {
        /*
         * 获取用户功能页权限
         * */
        var user_id = req.session.user["user_id"];
        return sys_resource.findAll({
            include: {
                model: sys_user_resource,
                where: {
                    user_id: user_id
                },
                attributes: [],
                required: true
            },
            where: {
                parent_id: sider_id || -1,
                function_sign: 3
            },
            attributes: {include: [["id", "res_id"]]},
            order: [["parent_id", "asc"], ["order", "asc"]],
            raw: true
        }).then(function (data) {
            var operator = [];
            _.each(data, function (item) {
                operator.push(_.pick(item, "res_id", "res_name", "res_url", "label_id", "label_class"));
            });
            return Promise.resolve(operator);
        });
    };
    authority.getUserTomcatResource = function (req, resource_type) {
        /*
         * 获取用户tomcat权限
         * */
        if (typeof resource_type === "undefined") {
            return Promise.resolve({});
        }
        var user_id = req.session.user["user_id"];
        return deploy_res_info.findAll({
            include: {
                model: deploy_user_res,
                required: true,
                attributes: [],
                where: {
                    user_id: user_id,
                    privilege_code: resource_type || 0
                }
            },
            attributes: ["env_name", "group_name", "program_name"],
            raw: true
        }).then(function (data) {
            var tomcat_res = {};
            _.each(data, function (item) {
                if (!_.has(tomcat_res, item["env_name"])) {
                    tomcat_res[item["env_name"]] = {};
                }
                if (!_.has(tomcat_res[item["env_name"]], item["group_name"])) {
                    tomcat_res[item["env_name"]][item["group_name"]] = [];
                }
                tomcat_res[item["env_name"]][item["group_name"]].push(item["program_name"]);
            });
            return Promise.resolve(tomcat_res);
        });
    };
    authority.getUserEnvResource = function (req, resource_type) {
        /*
         * 获取用户环境权限
         * */
        if (typeof resource_type === "undefined") {
            return Promise.resolve([]);
        }
        var user_id = req.session.user["user_id"] || 0;
        var deploy_user_env_where = {user_id: user_id};
        if (typeof resource_type === "Array") {
            deploy_user_env_where["privilege_code"] = {
                $in: resource_type
            }
        } else {
            deploy_user_env_where["privilege_code"] = resource_type || 0;
        }
        return deploy_user_env.findAll({
            where: deploy_user_env_where,
            attributes: ["env_name"],
            order: ["env_name"],
            raw: true
        }).then(function (data) {
            return Promise.resolve(_.pluck(data, "env_name"));
        });
    };
    return authority;
};
module.exports = my_authority;