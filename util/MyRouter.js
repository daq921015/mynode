/*
 功能：加载所有路由，分配访问路径。路由以文件夹为一个集体（路由分配函数中param可以添加特有的参数值）
 routes文件夹下，js默认访问地址为:dirName/fileName（dirName可以是多层）
 param参数传递，如果内部数据有引用数据。不同函数之间可能会共享信息。
 待改进：
 路由分配时指定访问权限。登录后才能访问文件夹下的所有资源
 更进一步权限控制，同一页面下不同登录用户功能不同。（ejs渲染的时候加权限判断）
 */

//public文件夹路由分配函数
var setRouter = function (param, routePath) {
    var app = param.app;
    var fs = param.fs;
    var path = param.path;
    var utils = param.utils;

    //获取路由相对路径（routes）
    if (fs.statSync(routePath).isDirectory()) {
        var routeDir = utils.getRouteDir(routePath);
    } else {
        //TODO
        return;
    }
    //遍历文件夹下所有.js文件，做路由配置
    fs.readdirSync(routePath).forEach(function (file) {
        var route_fname = path.join(routePath, file);
        //必须是.js文件
        if (fs.statSync(route_fname).isFile() && path.extname(route_fname) === ".js") {
            //文件名（没有后缀）
            var route_name = path.basename(route_fname, '.js');
            var route = require(route_fname);
            //设置路由访问路径
            if (typeof route === "function") {
                app.use("/" + routeDir + route_name, route(param, routeDir));
            }
        }
    });

};
//一个文件夹设置一个路由信息
var myrouter = function (param) {
    var path = param.path;
    var fs = param.fs;
    //遍历所有文件夹（routes下）自动加入路由
    fs.readdirSync(path.join(__dirname, "..", "routes")).forEach(function (file) {
        var routePath = path.join(__dirname, "..", "routes", file);
        if (fs.statSync(routePath).isDirectory()) {
            setRouter(param, routePath);
        }
    });
};
module.exports = myrouter;