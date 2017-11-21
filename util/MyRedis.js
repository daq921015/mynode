/**
 * Created by Administrator on 2017-08-15.
 */
// redis 链接
module.exports = function (conAddr) {
    var redis = param.redis;
    var _ = param.underscore._;
    var other_option = {"string_numbers": true};
    var conf = _.extend(other_option, conAddr || {});
    var myredis = redis.createClient(conf);
    myredis.on('error', function (err) {
        console.log(err);
    });
    return myredis;
};
