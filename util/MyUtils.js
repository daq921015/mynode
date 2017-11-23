var myutils = function (param) {
    var path = param.path;
    var fs = param.fs;
    var url = param.url;
    var querystring = param.querystring;
    var formidable = param.formidable;
    var utils = {};
    //获取路由路径(相对routes文件夹)，根据此路径设置模板路径。
    utils.getRouteDir = function (routeFilePath) {
        var array = [];
        var result = "";
        var dept = 5;

        function getPath(fullPath) {
            var baseName = path.basename(fullPath);
            if (baseName == "routes" || dept == 0) {
                return;
            } else {
                array.push(baseName);
                var dirName = path.dirname(fullPath)
                dept = dept - 1;
                getPath(dirName);
            }
        }

        getPath(routeFilePath);
        for (var i = 0, j = array.length; i < j; i++) {
            if (i == 0) {
                result = array[i];
            } else {
                result = path.join(array[i], result);
            }
        }
        //此处必须用这种 斜杠
        return result + "/";
    };
    utils.postForm = function () {
        /*
         * 获取post表单内容，如果有file这直接上传到指定位置
         * 参数：请求对象，上传目录，上传最大大小 [req,[,uploadDir][,max_size],callback]
         * 返回：callback({"status":"","msg":"","data":{}});
         * */
        var req,
            uploadDir = path.join(__dirname, '..', 'upload'), //默认上传到upload
            max_size = 3 * 1024 * 1024, //默认一次性最多上传3M
            callback;
        if (arguments.length === 2) {
            req = arguments[0];
            callback = arguments[1];
        } else if (arguments.length === 3) {
            req = arguments[0];
            uploadDir = arguments[1];
            callback = arguments[2];
        } else if (arguments.length === 4) {
            req = arguments[0];
            uploadDir = arguments[1];
            max_size = arguments[2];
            callback = arguments[3];
        } else {
            callback = arguments[0];
            typeof callback === "function" && callback("post 参数不正确");
            return;
        }

        var size = req.headers['content-length'];
        if (size > max_size) {
            typeof callback === "function" && callback({
                "status": "error",
                "msg": "上传文件太大,上限" + max_size / (1024 * 1024) + "M，上传失败！"
            });
            return;
        }
        var form = new formidable.IncomingForm();
        form.encoding = 'utf-8';
        form.uploadDir = uploadDir;
        form.keepExtensions = true;
        form.maxFieldsSize = 2 * 1024 * 1024;
        form.maxFields = 1000;
        form.hash = false;
        form.multiples = true;
        form.on('progress', function (bytesReceived, bytesExpected) {
        });
        form.on('field', function (name, value) {
        });
        form.on('fileBegin', function (name, file) {
        });
        form.on('file', function (name, file) {
        });
        form.on('error', function (err) {
            typeof callback === "function" && callback(err);
        });
        form.on('aborted', function (msg) {
            console.log(msg);
        });
        form.on('end', function () {
        });
        form.parse(req, function (err, fields, files) {
            if (err) {
                typeof callback === "function" && callback(err);
                return;
            }
            //保持原名，放入指定目录
            var des_files = [];
            for (var key in files) {
                var old_path = "";
                var old_name = "";
                var type = "";
                var size = "";
                if (files[key] instanceof Array) {
                    for (var i = 0, j = files[key].length; i < j; i++) {
                        old_path = files[key][i]["path"];
                        old_name = files[key][i]["name"];
                        type = files[key][i]["type"];
                        size = files[key][i]["size"];
                        if (typeof old_name === "string" && old_name.trim() !== "") {
                            var des_file = path.join(uploadDir, old_name);
                            des_files.push(des_file);
                            fs.renameSync(old_path, des_file);
                        }
                    }
                } else {
                    old_path = files[key]["path"];
                    old_name = files[key]["name"];
                    type = files[key]["type"];
                    size = files[key]["size"];
                    if (typeof old_name === "string" && old_name.trim() !== "") {
                        var des_file = path.join(uploadDir, old_name);
                        des_files.push(des_file);
                        fs.renameSync(old_path, des_file);
                    }
                }
            }
            //去除参数两边空格，如果为空则设置为null,如果为数字字符串转换成数字类型
            for (let field_name in fields) {
                if (typeof fields[field_name] === "string") {
                    fields[field_name] = fields[field_name].trim();
                }
                if (fields[field_name] === "" || fields[field_name] === null) {
                    delete fields[field_name];
                }
                //为了防止数据库number类型，字符串无法插入，所有数字参数全部转换成number
                //字符数不能超过10个，超过10个的数字字符转换成字符的时候可能有问题（超出数字最大长度）
                if (typeof fields[field_name] === "string" && fields[field_name].length > 10) {
                    continue;
                }
                //是数字字符并且不以0开头（0除外）
                if (!isNaN(fields[field_name]) && (fields[field_name] === "0" || !fields[field_name].startsWith("0"))) {
                    fields[field_name] = Number(fields[field_name]);
                }
            }
            typeof callback === "function" && callback(err, {files: des_files, fields: fields});
        });
    };
    utils.getForm = function (req) {
        /*
         * 获取get表单内容
         * 参数：请求对象，上传目录，上传最大大小 [req,[,uploadDir][,max_size],callback]
         * 返回：callback({"status":"","msg":"","data":{}});
         * */
        var urlParsed = url.parse(req.url);
        var fields = querystring.parse(urlParsed.query);
        //去除参数两边空格，如果为空则或null则删除
        for (var field_name in fields) {
            if (typeof fields[field_name] === "string") {
                fields[field_name] = fields[field_name].trim();
            }
            if (fields[field_name] === "" || fields[field_name] === null) {
                delete fields[field_name];
            }
            //为了防止数据库number类型，字符串无法插入，所有数字参数全部转换成number
            //字符数不能超过10个，超过10个的数字字符转换成字符的时候可能有问题（超出数字最大长度）
            if (typeof fields[field_name] === "string" && fields[field_name].length > 10) {
                continue;
            }
            //是数字字符并且不以0开头（0除外）
            if (!isNaN(fields[field_name]) && (fields[field_name] === "0" || !fields[field_name].startsWith("0"))) {
                fields[field_name] = Number(fields[field_name]);
            }
        }
        return {fields: fields};
    };
    utils.getClientIp = function (req) {
        return req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
    };
    return utils;
};
module.exports = myutils;