程序功能综合描述

注意点
0、noejs设置，先设置源，根目录下执行npm install安装依赖包
1、开发时，路由表 .js文件和模板文件，文件夹路径要对应
2、路由表访问路径默认设置为  http://domain:3000/dirname/filename [dirname可以多层，与.js深度有关]
3、myrouter.js为全局路由配置文件，一个路由表文件夹配置一次
4、config.js文件为项目所有参数配置地方。程序内部调用为 config=param.conf; value=config[key]
5、程序启动前需要先执行数据库脚本（sql文件夹），数据库使用的为mysql
6、res.render 一定要加 {title:"name",session:req.session},页面需要根据session.isLogin判断页面是否隐藏

js/css说明
1、jquery-1.12.4.min.js、bootstrap.min.js|bootstrap.min.css 前端框架基本文件
2、bootstrap-table.min.js,bootstrap-table-zh-CN.min.js|bootstrap-table.min.css 表格插件
3、toastr.min.js、toastr.min.css 非阻塞提示框 例：删除数据前需要先选中数据
4、tipbox.js 自己封装的弹出框插件 例：删除数据时，确认是否删除

严重问题：
host如果有不通的主机(supervisord服务没启动)，程序直接崩溃。
程序没有做命名重复以及非合法字符判断
添加主机或删除主机，仪表盘不变化，因为主机信息是在程序启动是加载到param全局参数中的。
添加修改信息，中文乱码

待改进：
1、用户注册密码未加密。可以使用md5加密后存库。
2、用户权限设置
    1）登录权限访问文件夹所有资源没做，只能在每个路由表中判断session islogin字段值
    2）同一页面，不同登录用户访问功能限制没做。
        思路：数据库设计权限表。每一个功能为一个产品项id。每一个角色具有多个产品项权限。每一个用户可以有多种角色。

Time:2017-09-29
by:liubanglong
功能点说明：
一、tomcat部署
    1）tomcat部署配置文件放在程序 /config/tomcat目录下,部署时会把配置文件中 $开头的变量替换为固定值，并上传覆盖war包原文件
    2）pro.properties配置文件，按照key/value方式存入数据库deploy_app_config表中，部署时把程序所有key组合起来上传
    3）非生产环境使用docker部署，docker镜像中具有rpcServer程序（/var/www/webapps），进行本机tomcat运行状态及日志获取
        注:getProgramStatus(rpc调用方法)，需要额外的war包（ping.war:/webapps）
    4）tomcat服务启动脚本tomcatd(/etc/init.d/tomcatd),退出状态需要0（exit 0）,否则rpc无法获取tomcat状态等操作
    5）所有的rpc调用都走rpcProxy代理。rpc代理部署在堡垒机上
    6）rpc读取的tomcat日志目录为/usr/local/tomcat/logs/catalina.out,所以请调整tomcat日志配置文件logging.properties
    7）生产环境（www_ali/sanmi_www）,部署时会先从阿里云负载均衡中卸载，定时任务会一直监控tomcat启动状态，启动完成重新加入
    8）war包解压目录为本机：/tomcat下。集群中的每一个程序程序目录不再共享。















