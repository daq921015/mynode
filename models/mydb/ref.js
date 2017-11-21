/**
 * Created by Administrator on 2017-10-29.
 * model 关系映射
 */
var default_options = {
    // "host": "192.168.0.78",
    // "username": "root",
    // "password": "root",
    // "database": "test",
    "port": "3306",
    "pool": {
        "max": 5,
        "min": 1,
        "idle": 10000
    },
    "dialect": "mysql",  //数据库类型默认mysql
    //时区
    "timezone": "+08:00",
    //定义表时，全局默认配置
    "define": {
        //定义模型时自动带两个事件字段
        timestamps: true,
        //时间字段格式下划线
        underscored: true,
        //删除控制，删除时只记录删除时间
        paranoid: true,
        //模型名称与数据库表名一直
        freezeTableName: true,
        //表默认为innodb引擎
        engine: 'InnoDB',
        //表版本控制
        // version: true
        //字符集
        charset: 'utf8',
        //核对
        collate: 'utf8_general_ci'
    },
    //使用操作符别名 Op.like = $like
    // operatorsAliases: false,
    //Default options for sequelize.query
    "query": {
        //查询的结果以不同对象展示
        raw: false
    },
    //Default options for sequelize.set
    "set": {},
    //Default options for sequelize.sync
    "sync": {
        //强一致，存在则删除
        force: false
    },
    //mysql执行日志输出位置
    "logging": null
};
module.exports = function (options) {
    var Sequelize = param.Sequelize;
    var _ = param.underscore._;
    var new_options = _.extend(default_options, options || {});
    var sequelize = new Sequelize(new_options);
    //---------------------------读取本目录其它model文件--------------------------------------------
    //系统表
    var sys_operator = sequelize.import('./sys_operator.js');
    var sys_request_log = sequelize.import('./sys_request_log.js');
    var sys_resource = sequelize.import('./sys_resource.js');
    var sys_user = sequelize.import('./sys_user.js');
    var sys_user_resource = sequelize.import('./sys_user_resource.js');
    var pro_db_config = sequelize.import('./pro_db_config.js');
    var pro_redis_config = sequelize.import('./pro_redis_config.js');
    //tomcat表
    var deploy_ali_balance = sequelize.import('./deploy_ali_balance.js');
    var deploy_app_config = sequelize.import('./deploy_app_config.js');
    var deploy_app_history = sequelize.import('./deploy_app_history.js');
    var deploy_app_server = sequelize.import('./deploy_app_server.js');
    var deploy_env_config = sequelize.import('./deploy_env_config.js');
    var deploy_res_info = sequelize.import('./deploy_res_info.js');
    var deploy_user_env = sequelize.import('./deploy_user_env.js');
    var deploy_user_res = sequelize.import('./deploy_user_res.js');
    var deploy_privilege = sequelize.import('./deploy_privilege.js');
    //toutiao
    var toutiao_article = sequelize.import('./toutiao_article.js');
    var toutiao_exact_article = sequelize.import('./toutiao_exact_article.js');
    var toutiao_headline_reg = sequelize.import('./toutiao_headline_reg.js');
    var toutiao_sale = sequelize.import('./toutiao_sale.js');
    //------------------------------------END------------------------------------------------------

    //---------------------------------设置表间关系------------------------------------------------
    sys_user.belongsToMany(sys_resource, {through: sys_user_resource, foreignKey: "user_id"});
    sys_resource.belongsToMany(sys_user, {through: sys_user_resource, foreignKey: "resource_id"});
    sys_resource.hasMany(sys_user_resource, {foreignKey: "resource_id"});
    sys_user.hasMany(sys_user_resource, {foreignKey: "user_id"});
    sys_user_resource.belongsTo(sys_resource, {foreignKey: "resource_id"});
    //tomcat
    deploy_res_info.hasOne(deploy_user_res, {foreignKey: "res_info_id"});
    deploy_res_info.hasOne(deploy_app_server, {foreignKey: "res_info_id"});
    deploy_res_info.belongsTo(deploy_env_config, {foreignKey: "env_name", targetKey: "env_name"});
    deploy_user_res.belongsTo(deploy_res_info, {foreignKey: "res_info_id"});
    deploy_user_res.belongsTo(sys_user, {foreignKey: "user_id"});
    deploy_user_res.belongsTo(deploy_privilege, {foreignKey: "privilege_code", targetKey: "privilege_code"});
    deploy_app_config.belongsTo(deploy_res_info, {foreignKey: "res_info_id"});
    deploy_app_server.belongsTo(deploy_res_info, {foreignKey: "res_info_id"});
    deploy_app_history.belongsTo(deploy_user_res, {foreignKey: "res_info_id", targetKey: "res_info_id"});

    deploy_user_env.belongsTo(sys_user, {foreignKey: "user_id"});
    deploy_user_env.belongsTo(deploy_privilege, {foreignKey: "privilege_code", targetKey: "privilege_code"});
    deploy_env_config.belongsTo(deploy_res_info, {foreignKey: "env_name", targetKey: "env_name"});
    //-------------------------------------END-----------------------------------------------------
    // sequelize.sync();
    //加载到全局变量
    // for (var model_name in sequelize.models) {
    //     global[model_name] = sequelize.models[model_name];
    // }
    //----------------------------------表模型加入全局----------------------------------------------
    //系统表
    global["sys_operator"] = sequelize.models["sys_operator"];
    global["sys_request_log"] = sequelize.models["sys_request_log"];
    global["sys_resource"] = sequelize.models["sys_resource"];
    global["sys_user"] = sequelize.models["sys_user"];
    global["sys_user_resource"] = sequelize.models["sys_user_resource"];
    global["pro_db_config"] = sequelize.models["pro_db_config"];
    global["pro_redis_config"] = sequelize.models["pro_redis_config"];
    //tomcat表
    global["deploy_ali_balance"] = sequelize.models["deploy_ali_balance"];
    global["deploy_app_config"] = sequelize.models["deploy_app_config"];
    global["deploy_app_history"] = sequelize.models["deploy_app_history"];
    global["deploy_app_server"] = sequelize.models["deploy_app_server"];
    global["deploy_env_config"] = sequelize.models["deploy_env_config"];
    global["deploy_res_info"] = sequelize.models["deploy_res_info"];
    global["deploy_user_env"] = sequelize.models["deploy_user_env"];
    global["deploy_user_res"] = sequelize.models["deploy_user_res"];
    global["deploy_privilege"] = sequelize.models["deploy_privilege"];
    //toutiao
    global["toutiao_article"] = sequelize.models["toutiao_article"];
    global["toutiao_exact_article"] = sequelize.models["toutiao_exact_article"];
    global["toutiao_headline_reg"] = sequelize.models["toutiao_headline_reg"];
    global["toutiao_sale"] = sequelize.models["toutiao_sale"];
    //--------------------------------------END----------------------------------------------------
    Sequelize.getPlaneData = function (data) {
        var re_data = [];
        //去除别名中 表名称
        for (var i = 0, j = data.length; i < j; i++) {
            var tmp = {};
            for (var field_name in data[i]) {
                var field = field_name.replace(/^.*\./, "");
                tmp[field] = data[i][field_name];
            }
            re_data.push(tmp);
        }
        return re_data;
    };
    global["Sequelize"] = Sequelize;
    global["mydbSource"] = sequelize;
};
