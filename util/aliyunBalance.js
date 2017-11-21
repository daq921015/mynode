/*
 * 阿里云负载均衡api操作
 * time:2017-09-26
 * by:liubanglong
 * 描述：所有权重默认100，后端端口默认8080，监听端口默认8080,RegionId默认cn-qingdao
 * 特例：奥家的posapi四层监听用的80端口，指定了特殊负载均衡id(此处写固定了)
 * */
var aliyun_balance = function (param) {
    var https = param.https;
    var moment = param.moment;
    var crypto = param.crypto;
    var querystring = param.querystring;
    var _ = param.underscore._;

    function AliyunBalance(env_info) {
        /*
         * 类初始化参数，json对象
         * */
        //------------------------不同环境变量----------------------------------
        //地域
        this.RegionId = env_info["RegionId"];
        //阿里云key(用户id)
        this.AccessKeyId = env_info["AccessKeyId"];
        //阿里云签名密钥
        this.AccessKeySecret = env_info["AccessKeySecret"];
        //----------------------------END-----------------------------------------
        //------------------------自定义公告方法----------------------------------
        //对象按照key字典排序
        this.jsonSort = function (data) {
            var _data_keys = _.keys(data);
            var data_sort = {};
            _data_keys.sort();
            for (var i = 0, j = _data_keys.length; i < j; i++) {
                data_sort[_data_keys[i]] = data[_data_keys[i]];
            }
            return data_sort;
        };
        //发送请求
        this.doGet = function (options, callback) {
            /*
             * url:请求URL
             * options:请求参数
             * callback:结果回调函数
             * */
            //阿里云接口调用公告参数
            var data = {
                "Format": "JSON",
                "SignatureNonce": Math.round(Math.random() * 1000000000),
                "Timestamp": moment().utcOffset(0).format(moment.defaultFormatUtc),
                "SignatureVersion": "1.0",
                "AccessKeyId": this.AccessKeyId,
                "SignatureMethod": "HMAC-SHA1",
                "Version": "2014-05-15"
            };
            //合并公告参数和指定action参数
            _.extend(data, options || {});
            //请求参数字符串（排序）
            var query_str = querystring.stringify(this.jsonSort(data));
            //签名字符串
            var StringToSign = "GET" + "&" + encodeURIComponent("/") + "&" + encodeURIComponent(query_str);
            //签名字符串
            var Signature = crypto.createHmac('sha1', this.AccessKeySecret + "&").update(StringToSign).digest().toString('base64');
            //请求对象添加签名key，并排序后生成请求参数字符串
            data["Signature"] = Signature;
            var req_param = querystring.stringify(data);
            //拼接请求连接
            var req_url = "https://slb.aliyuncs.com" + "?" + req_param;
            //开始https请求
            https.get(req_url, function (res) {
                const statusCode = res.statusCode;
                const contentType = res.headers['content-type'];
                //var error;
                //if (statusCode !== 200) {
                //    error = new Error('请求失败。\n' +
                //        `状态码: ${statusCode}`);
                //} else if (!/^application\/json/.test(contentType)) {
                //    error = new Error('无效的 content-type.\n' +
                //        `期望 application/json 但获取的是 ${contentType}`);
                //}
                //if (error) {
                //    // 消耗响应数据以释放内存
                //    res.resume();
                //    callback(error);
                //    return;
                //}
                res.setEncoding('utf8');
                var rawData = '';
                res.on('data', function (chunk) {
                    rawData += chunk;
                })
                ;
                res.on('end', function () {
                    const parsedData = JSON.parse(rawData);
                    var re_data = {
                        "statusCode": statusCode,
                        "data": parsedData
                    };
                    callback(null, re_data);
                })
                ;
            }).on('error', function (e) {
                callback(e);
            });
        };
        //----------------------------END-----------------------------------------
    }

    //-----------------------------后端服务器封装api----------------------------------------------
    //添加后端服务器
    AliyunBalance.prototype.AddBackendServers = function (LoadBalancerId, server_id, callback) {
        var options = {
            "Action": "AddBackendServers",
            "LoadBalancerId": LoadBalancerId,
            "BackendServers": JSON.stringify([
                {"ServerId": server_id, "Weight": "100"}
            ])
        };
        this.doGet(options, function (err, result) {
            callback(err, result);
        });
    };
    //移除后端服务器
    AliyunBalance.prototype.RemoveBackendServers = function (LoadBalancerId, server_id, callback) {
        var options = {
            "Action": "RemoveBackendServers",
            "LoadBalancerId": LoadBalancerId,
            "BackendServers": JSON.stringify([server_id])
        };
        this.doGet(options, function (err, result) {
            callback(err, result);
        });
    };
    //后端服务器健康检查
    AliyunBalance.prototype.DescribeHealthStatus = function (LoadBalancerId, callback) {
        //特殊设置
        var port = 8080;
        if (LoadBalancerId === "lb-uf6dps6qm7o12d0e5s5ta") {
            port = 80;
        }
        var options = {
            "Action": "DescribeHealthStatus",
            "LoadBalancerId": LoadBalancerId,
            "ListenerPort": port
        };
        this.doGet(options, function (err, result) {
            callback(err, result);
        });
    };
    //----------------------------------END-------------------------------------------------------
    //---------------------------虚拟服务器组封装api----------------------------------------------
    //虚拟服务器组添加服务器
    AliyunBalance.prototype.AddVServerGroupBackendServers = function (VServerGroupId, server_id, callback) {
        var options = {
            "Action": "AddVServerGroupBackendServers",
            "VServerGroupId": VServerGroupId,
            "RegionId": this.RegionId,
            "BackendServers": JSON.stringify([
                {"ServerId": server_id, "Port": "8080", "Weight": "100"}
            ])
        };
        this.doGet(options, function (err, result) {
            callback(err, result);
        });
    };
    //虚拟服务器组移除服务器
    AliyunBalance.prototype.RemoveVServerGroupBackendServers = function (VServerGroupId, server_id, callback) {
        var options = {
            "Action": "RemoveVServerGroupBackendServers",
            "VServerGroupId": VServerGroupId,
            "RegionId": this.RegionId,
            "BackendServers": JSON.stringify([
                {"ServerId": server_id, "Port": "8080"}
            ])
        };
        this.doGet(options, function (err, result) {
            callback(err, result);
        });
    };
    //查询由VServerGroupId指定的虚拟服务器组的详细信息
    AliyunBalance.prototype.DescribeVServerGroupAttribute = function (VServerGroupId, callback) {
        var options = {
            "Action": "DescribeVServerGroupAttribute",
            "VServerGroupId": VServerGroupId,
            "RegionId": this.RegionId
        };
        this.doGet(options, function (err, result) {
            callback(err, result);
        });
    };
    //----------------------------------END-------------------------------------------------------
    return AliyunBalance;
};
module.exports = aliyun_balance;
