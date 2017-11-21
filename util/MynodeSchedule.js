/*
 * 定时计划执行模块（程序启动时加载）
 * Time:2017-09-28
 * by:liubanglong
 * */
var addBlanceServer = function (param) {
    /*
     * 定时读取redis，key:deploy_tomcat,获取之前从阿里云负载均衡中踢出的服务器
     * */
    var myredis = param.myredis;
    var my_rpc_service = param.my_rpc_service;
    var logError = param.publicmethod.logError;
    var logInfo = param.publicmethod.logInfo;
    var publicmethod = param.publicmethod;
    //由部署时存入key决定
    var key = "deploy_tomcat";
    var serverStorAgin = function (balance_info) {
        myredis.lpush("deploy_tomcat", JSON.stringify(balance_info));
    };
    myredis.rpop(key, function (err, data) {
        if (err) {
            logError(err);
            return;
        }
        if (!data) {
            return;
        }
        var balance_info = JSON.parse(data);
        var env_name = balance_info["env_name"];
        var server_alias = balance_info["server_alias"];
        var server_id = balance_info["server_id"];
        var server_type = balance_info["server_type"];
        var balance_id = balance_info["balance_id"];
        var v_group_id = balance_info["v_group_id"];
        var tunnel_ip = balance_info["tunnel_ip"];
        var host_ip = balance_info["host_ip"];
        //获取阿里云负载均衡实例（根据环境名称）
        var aliyunbalance = param["ali_balance_" + env_name];
        if (typeof aliyunbalance === "undefined") {
            logError(new Error("env_name=" + env_name + ",没有找到阿里云负载均衡对象，重新存入缓存"));
            //操作失败，再次push到缓存
            serverStorAgin(balance_info);
            return;
        }
        //检测程序是否已经完全启动 ping/ping.js
        //代理地址
        var rpcproxy_addr = "http://" + tunnel_ip + ":3002";
        //服务器地址
        var rpcserver_addr = "http://" + host_ip + ":3001";
        //检测tomcat启动状态
        publicmethod.execRpcServiceProxy(rpcproxy_addr, rpcserver_addr, "getProgramStatus", [], function (err, result) {
            //报错（rpc不通），重新放入
            if (err) {
                logError(err);
                serverStorAgin(balance_info);
                return;
            }
            //启动完成（约定信息：返回信息中有ok，说明启动完成。有req_error，tomcat没有启动，rpcServer没有启动等，返回这个信息则
            // 服务器基本无法再次加入负载均衡中，需要人工处理。req_timeout:tomcat正在启动中，没有启动完成）
            logInfo("阿里云负载均衡定时任务，检测返回结果：" + result + "。详细信息：env_name=" + env_name + ",server_alias=" + server_alias + ",server_id=" + server_id +
                ",server_type=" + server_type + ",balance_id=" + balance_id + ",v_group_id=" + v_group_id);
            if (/ok/.test(result)) {
                //把从阿里云负载均衡中卸载的程序重新加入进来
                if (server_type === 0) {
                    aliyunbalance.AddBackendServers(balance_id, server_id, function (err, result) {
                        if (err) {
                            logError(new Error("env_name=" + env_name + ",server_alias=" + server_alias + ",server_id=" + server_id +
                                ",server_type=" + server_type + ",添加服务器错误，重新存入缓存"));
                            serverStorAgin(balance_info);
                            return;
                        }
                        if (result["statusCode"] !== 200) {
                            logError(new Error("env_name=" + env_name + ",server_alias=" + server_alias + ",server_id=" + server_id +
                                ",server_type=" + server_type + ",添加服务器状态码非200，重新存入缓存。" + JSON.stringify(result["data"])));
                            serverStorAgin(balance_info);
                            return;
                        }
                        logInfo("env_name=" + env_name + ",server_alias=" + server_alias + ",server_id=" + server_id +
                            ",server_type=" + server_type + ",已被添加进负载均衡中");
                    });
                } else if (server_type === 1) {
                    aliyunbalance.AddVServerGroupBackendServers(v_group_id, server_id, function (err, result) {
                        if (err) {
                            logError(new Error("env_name=" + env_name + ",server_alias=" + server_alias + ",server_id=" + server_id +
                                ",server_type=" + server_type + ",添加服务器错误，重新存入缓存"));
                            serverStorAgin(balance_info);
                            return;
                        }
                        if (result["statusCode"] !== 200) {
                            logError(new Error("env_name=" + env_name + ",server_alias=" + server_alias + ",server_id=" + server_id +
                                ",server_type=" + server_type + ",添加服务器状态码非200，重新存入缓存。" + JSON.stringify(result["data"])));
                            serverStorAgin(balance_info);
                            return;
                        }
                        logInfo("env_name=" + env_name + ",server_alias=" + server_alias + ",server_id=" + server_id +
                            ",server_type=" + server_type + ",已被添加进负载均衡中");
                    });
                } else {
                    //抛弃的服务器应该报警通知（待完善）
                    logError(new Error("env_name=" + env_name + ",server_alias=" + server_alias + ",server_id=" + server_id +
                        ",server_type=" + server_type + ",服务器状态不正确，抛弃"));
                    return;
                }
            } else if (/req_timeout/.test(result)) {
                //启动未完成，重新加入队列
                serverStorAgin(balance_info);
                return;
            } else if (/req_error/.test(result)) {
                //检测有错误，重新加入队列
                serverStorAgin(balance_info);
                return;
            } else {
                //检测有错误，重新加入队列
                serverStorAgin(balance_info);
                return;
            }
        });
    });
};

// 程序启动时调用此模块，加载一下定时任务
module.exports = function (param) {
    var schedule = param.schedule;
    //每10秒调用一次
    var j = schedule.scheduleJob('*/10 * * * * *', function () {
        addBlanceServer(param);
    });
};