//--------------------程序所用模块声明（全在此处）------------------
var express = require('express');
var app = express();
var favicon = require('serve-favicon');
//var logger = require('morgan');//日志处理被log4js代替
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var path = require('path');
var fs = require('fs');
var url = require("url");
var formidable = require("formidable");//表单处理模块（包括文件上传）
var querystring = require("querystring");//请求参数序列化和反序列化模块
var node_xlsx = require('node-xlsx');//excel 存取模块
var zip_local = require('zip-local');//文件压缩模块
var ssh2 = require("ssh2");//ssh连接远程linux服务器模块
var through = require('through');
var events = require("events");
var util = require("util");
var session = require("express-session");//用来处理session
var RedisStrore = require("connect-redis")(session);//用来处理session
var async = require("async");//防止大量嵌套回调，流程处理模块
var domain = require("domain");
var hprose = require("hprose");//nodejs rpc模块（远程过程调用）
var redis = require("redis");//redis存取模块
var underscore = require("underscore");//对象、数组、函数处理工具模块
var moment = require("moment");//时间、日期，获取、计算及格式化模块
var https = require("https");//https请求
var crypto = require("crypto");//签名模块
var schedule = require("node-schedule");//定时执行模块
var Sequelize = require("sequelize");//MySQL orm模块
//加载第三方模块
var param = {
    app: app,
    fs: fs,
    path: path,
    node_xlsx: node_xlsx,
    zip_local: zip_local,
    url: url,
    ssh2: ssh2,
    through: through,
    events: events,
    util: util,
    formidable: formidable,
    querystring: querystring,
    async: async,
    hprose: hprose,
    redis: redis,
    underscore: underscore,
    moment: moment,
    https: https,
    crypto: crypto,
    schedule: schedule,
    Sequelize: Sequelize
};
global["param"] = param;
//---------------------------自定义模块----------------------------------
//程序配置文件
var myconfig = require("./config");
param["myconfig"] = myconfig;
//初始化日志处理模块，静态文件放在日志处理之前，可避免输出静态文件访问日志
var log4js = require("./service/logConfig");
var logger = log4js.logger("production");//日志处理模块
param["logger"] = logger;
log4js.configure();
//初始化本程序运行依赖数据库
require("./models/mydb/ref")(myconfig.mynodeSource);
//初始化本程序运行依赖redis
param["myredis"] = require("./util/MyRedis")(myconfig.myredis);
app.use(express.static(path.join(__dirname, 'public')));
app.use(log4js.useLog());
//------------------------------END----------------------------------------
//--------------------启动基本设置-------------------------------
app.set('views', path.join(__dirname, 'views'));//设置模块位置
app.set('view engine', 'ejs');//设置程序模板引擎
app.use(favicon(path.join(__dirname, 'public', 'img', 'favicon.ico')));//浏览器地址栏图标
//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
//session设置，一个浏览器只能登录一个用户，登录多个待研究。
app.use(session({
    name: "sid",
    secret: 'Asecret123-',
    resave: true,
    rolling: true,
    saveUninitialized: false,
    cookie: myconfig.cookie,
    store: new RedisStrore(myconfig.redis_session)
}));
//-------------------------END-----------------------------------
//---------------------全局异常处理-------------------------------
//整个进程做错误未捕获处理（最外层）
process.on('uncaughtException', function (err) {
    console.log(err);
    logger.error("uncaughtException-app.js全局错误捕获:" + err);
});
//为所有的req,res做错误处理（内部逻辑未捕获错误，全局由此处理）
app.use(function (req, res, next) {
    //监听domain的错误事件
    var mydomain = domain.create();
    mydomain.on('error', function (err) {
        mydomain.dispose();
        console.log(err);
        logger.error("内部服务器异常，错误未捕获:" + req.url + "---" + err);
        res.end(JSON.stringify({"status": "error", "msg": "未捕获异常"}));
    });
    mydomain.add(req);
    mydomain.add(res);
    mydomain.run(next);
});
//-------------------------END-----------------------------------
//-----------------路由加载、访问控制（核心逻辑加载）------------
//设置访问权限，未登录只能访问指定文件夹中的内容（config.unRegister）,登录超时，ajax请求确保跳转登录页
app.use(function (req, res, next) {
    //如果是公共路径直接放行
    var rootPath = url.parse(req.url).pathname.split("/")[1];
    if (underscore._.indexOf(myconfig.unRegister, rootPath) >= 0) {
        next();
        return;
    }
    //如果没有登录根据请求类型进行驳回
    if (!req.session.islogin) {
        //判断是否ajax请求
        if (typeof req.header("x-requested-with") !== "undefined" && req.header("x-requested-with").toUpperCase() === "XMLHTTPREQUEST") {
            res.statusCode = 911;
            res.end();
            return;
        } else {
            res.redirect("/public/login" + "?_=" + Date.now());
            return;
        }

    }
    //如果已经登录，此时判断请求路径，当前用户是否有权限
    var authority = param.authority;
    var req_pathname = url.parse(req.url).pathname;
    //后端判断当前用户访问路径权限 最好把用户权限放到redis中，否则每一次请求都会查询数据库
    authority.isUserOperatorPass(req_pathname, req, function (err, req_authority) {
        //有权限放行
        if (typeof req_authority["res_url"] !== "undefined") {
            param.publicmethod.setSysOpertorLog(req, req_authority);
            next();
            return;
        }
        //没权限还需根据请求类型进行驳回到首页
        //判断是否ajax请求
        if (typeof req.header("x-requested-with") !== "undefined" && req.header("x-requested-with").toUpperCase() === "XMLHTTPREQUEST") {
            res.statusCode = 911;
            res.end();
        } else {
            res.redirect("/public/login" + "?_=" + Date.now());
        }
    });
});
//初始化自定义方法、模块
require("./util/initializeModule")(param);
//把路由表集中设置，默认设置访问路径和所在目录有关
require("./util/MyRouter")(param);
//根目录访问，重定向到首页（首页路径与所在目录有关）
app.use("/", function (req, res) {
    res.redirect("/public/index" + "?_=" + Date.now());
});
//-------------------------END-----------------------------------
//--------express框架错误处理，设置友好错误界面（没用到）--------
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});
// error handler  此处参数最后少了一个next，如果加上则会处理错误（express最后一个中间件）
app.use(function (err, req, res) {
    // set locals, only providing error in development
    logger.error("app.js全局错误捕获:" + err);
    res.locals.message = err.message;

    //res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.locals.error = err;
    // render the error page
    res.status(err.status || 500);
    res.end('error');
});
//-------------------------END-----------------------------------
module.exports = app;
