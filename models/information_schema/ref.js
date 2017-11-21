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
        timestamps: false,
        //时间字段格式下划线
        underscored: true,
        //删除控制，删除时只记录删除时间
        paranoid: false,
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
module.exports = function (options, table_prefix) {
    var Sequelize = param.Sequelize;
    var _ = param.underscore._;
    var new_options = _.extend(default_options, options || {});
    var sequelize = new Sequelize(new_options);
    //---------------------------读取本目录其它model文件--------------------------------------------
    //系统表
    var statistics = sequelize.import('./statistics.js');
    var columns = sequelize.import('./columns.js');
    //------------------------------------END------------------------------------------------------

    //---------------------------------设置表间关系------------------------------------------------
    // deploy_res_info.hasOne(deploy_user_res, {foreignKey: "res_info_id"});
    // deploy_app_history.belongsTo(deploy_user_res, {foreignKey: "res_info_id", targetKey: "res_info_id"});
    //-------------------------------------END-----------------------------------------------------
    //----------------------------------表模型加入全局----------------------------------------------
    //系统表
    global[table_prefix + "_statistics"] = statistics;
    global[table_prefix + "_columns"] = columns;
    //--------------------------------------END----------------------------------------------------
};
