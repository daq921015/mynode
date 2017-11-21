var _=require("underscore")._;
var btn_obj = {
    "1": '<input type="button" class="btn btn-default" data-operator="getDeployTomcat" value="程序部署">',
    "2": '<input type="button" class="btn btn-default" data-operator="startTomcat" value="启动">',
    "3": '<input type="button" class="btn btn-default" data-operator="stopTomcat" value="停止">',
    "4": '<input type="button" class="btn btn-default" data-operator="reStartTomcat" value="重启">',
    "5": '<input type="button" class="btn btn-default" data-operator="getTomcatLog" value="控制台日志">',
    "6": '',
    "7": '<input type="button" class="btn btn-default" data-operator="getDeployAppHistory" value="部署历史">',
    "8": '<input type="button" class="btn btn-default" data-operator="getDeployAppConf" value="程序配置">',
    "9": '<input type="button" class="btn btn-default" data-operator="getDeployAppServer" value="部署服务器">'
};
console.log(_.pick(btn_obj,["1","2"]));