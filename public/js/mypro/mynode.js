/**
 * Created by Administrator on 2017-07-27.
 */
function MyTable($tb, $btn, $form) {
    /*
     * $tb，表格展现div
     * $btn,表格查询按钮
     * $form,查询按钮条件表单
     * */
    //表格监听事件，选中行设置背景色
    $tb.on("click-row.bs.table", function (e, row, element) {
        var index = $(element).data("index");
        $tb.bootstrapTable("uncheckAll");
        $tb.bootstrapTable("check", index || 0);
        $('tr.success').removeClass('success');//去除之前选中的行的，选中样式
        $(element).addClass('success');//变色
        $('tr.selected').removeClass('selected');//去除之前选中
        $(element).addClass('selected');//选中
    });
    //数据加载失败
    $tb.on("load-error.bs.table", function (element, data) {
        toastr.error("表格数据加载失败");
        openButton($btn);
    });
    //刷新时按钮禁用
    $tb.on("refresh.bs.table", function (element, data) {
        closeButton($btn);
    });
    // }
    var that = this;
    //额外查询条件（静态）
    this.form_data = {};
    //额外查询条件（动态）（需要重写此函数）(返回对象)
    this.currentFormData = function () {
        return {};
    };
    var queryParams = function (params) {
        var formDate = new FormData($form[0]);
        formDate = formDate.ConvertToJson();
        $.extend(formDate, {
            limit: params.limit,   //页面大小
            offset: params.offset,  //页码
            sortOrder: params.order,//排序
            sortName: params.sort//排序字段
        }, that.form_data || {});
        if (typeof that.currentFormData === "function") {
            $.extend(formDate, that.currentFormData() || {})
        }
        return formDate;
    };
    this.bootStrap = {
        classes: "table table-hover table-condensed",
        sortName: "",
        sortOrder: "",                   //排序方式
        method: 'GET',                      //请求方式（*）
        striped: true,                      //是否显示行间隔色
        cache: false,                       //是否使用缓存，默认为true，所以一般情况下需要设置一下这个属性（*）
        pagination: true,                   //是否显示分页（*）
        sortable: true,                     //是否启用排序
        queryParams: queryParams,//传递参数（*）
        sidePagination: "server",           //分页方式：client客户端分页，server服务端分页（*）
        pageNumber: 1,                       //初始化加载第一页，默认第一页
        pageSize: 20,                       //每页的记录行数（*）
        pageList: [20, 50, 100, 200],        //可供选择的每页的行数（*）
        search: false,                       //是否显示表格搜索，此搜索是客户端搜索，不会进服务端，所以，个人感觉意义不大
        strictSearch: false,
        showColumns: false,                  //是否显示所有的列
        showRefresh: false,                  //是否显示刷新按钮
        minimumCountColumns: 2,             //最少允许的列数
        clickToSelect: false,                //是否启用点击选中行
        singleSelect: true,
        height: $tb ? $(window).height() - $tb.offset().top : 500,//行高，如果没有设置height属性，表格自动根据记录条数觉得表格高度 760 830
        uniqueId: "id",                     //每一行的唯一标识，一般为主键列
        showToggle: false,                    //是否显示详细视图和列表视图的切换按钮
        cardView: false,                    //是否显示详细视图
        detailView: false,                   //是否显示父子表
        searchOnEnterKey: false,
        rowStyle: function rowStyle(row, index) {
            return {
                css: {
                    "white-space": "nowrap"
                }
            };
        },
        columns: [],
        responseHandler: function (res) {
            openButton($btn);
            if (res.status !== "success") {
                toastr.warning(res.msg);
                return {total: 0, rows: []};
            } else {
                return res.data;
            }
        }
    };
    this.getBootStrap = function (options) {
        // closeButton($btn);
        //保留之前的部分属性
        var $page_size = $("button.dropdown-toggle span.page-size");//每页显示数
        var page_size = $page_size.text().trim();
        that.bootStrap.pageSize = typeof page_size !== "undefined" && page_size !== "" ? page_size : 20;
        that.bootStrap.height = $(window).height() - $tb.offset().top;
        _.extend(that.bootStrap, options || {});
        $tb.bootstrapTable('destroy');
        return that.bootStrap;
    };
    //---------------------表格相关操作-------------------------
    //修改和删除依赖行唯一键
    this.addData = function (add_url, title) {
        /*
         * 获取增加数据窗口
         * 参数：增加数据url,窗口标题
         * */
        var options = {
            title: title || "无窗口标题",
            url: add_url
        };
        TIPBOX.dialog(options);
    };
    this.editData = function (edit_url, title) {
        var arrselections = $tb.bootstrapTable('getSelections');
        if (arrselections.length <= 0) {
            toastr.warning('请选择有效数据');
            return;
        }
        var edit_id = arrselections[0][that.bootStrap.uniqueId];
        var options = {
            title: title || "无窗口标题",
            url: edit_url + "?edit_id=" + edit_id
        };
        TIPBOX.dialog(options);
    };
    this.delData = function (del_url) {
        /*
         * 删除表中选中行数据
         * 参数：表对象，删除url
         * */
        //取表格的选中行数据
        var arrselections = $tb.bootstrapTable('getSelections');
        if (arrselections.length <= 0) {
            toastr.warning('请选择有效数据');
            return;
        }
        TIPBOX.confirm({message: "确认要删除选择的数据吗？"}).on(function (e) {
            if (!e) {
                return;
            }
            $.ajax({
                type: "get",
                url: del_url + "?del_id=" + arrselections[0][that.bootStrap.uniqueId],
                success: function (data, status) {
                    if (status === "success") {
                        toastr.info('删除成功');
                    }
                },
                error: function () {
                    toastr.warning('删除失败！');
                },
                complete: function () {
                    //删除完成重新查询
                    $tb.bootstrapTable('refresh');
                }
            });
        });
    };
    this.timeTools = function (action) {
        var startTime = "1900-01-01";
        var endTime = "1900-01-01";
        switch (action) {
            case "today":
                var todayArray = getToDayArray();
                startTime = todayArray[0].substring(0, todayArray[0].length - 3);
                endTime = todayArray[1].substring(0, todayArray[0].length - 3);
                break;
            case "yesterday":
                var yesterdayArray = getYesterDayArray();
                startTime = yesterdayArray[0].substring(0, yesterdayArray[0].length - 3);
                endTime = yesterdayArray[1].substring(0, yesterdayArray[0].length - 3);
                break;
            case "this_week":
                var this_weekArray = getThisWeekArray();
                startTime = this_weekArray[0].substring(0, this_weekArray[0].length - 3);
                endTime = this_weekArray[1].substring(0, this_weekArray[0].length - 3);
                break;
            case "last_week":
                var last_weekArray = getLastWeekArray();
                startTime = last_weekArray[0].substring(0, last_weekArray[0].length - 3);
                endTime = last_weekArray[1].substring(0, last_weekArray[0].length - 3);
                break;
            case "this_month":
                var this_monthArray = getThisMonthArray();
                startTime = this_monthArray[0].substring(0, this_monthArray[0].length - 3);
                endTime = this_monthArray[1].substring(0, this_monthArray[0].length - 3);
                break;
            case "last_month":
                var last_monthArray = getLastMonthArray();
                startTime = last_monthArray[0].substring(0, last_monthArray[0].length - 3);
                endTime = last_monthArray[1].substring(0, last_monthArray[0].length - 3);
                break;
            case "last_30":
                var last_30Array = getLastDaysArray(30);
                startTime = last_30Array[0].substring(0, last_30Array[0].length - 3);
                endTime = last_30Array[1].substring(0, last_30Array[0].length - 3);
                break;
            case "last_60":
                var last_60Array = getLastDaysArray(60);
                startTime = last_60Array[0].substring(0, last_60Array[0].length - 3);
                endTime = last_60Array[1].substring(0, last_60Array[0].length - 3);
                break;
            case "last_90":
                var last_90Array = getLastDaysArray(90);
                startTime = last_90Array[0].substring(0, last_90Array[0].length - 3);
                endTime = last_90Array[1].substring(0, last_90Array[0].length - 3);
                break;
        }
        return [startTime, endTime];
    };
    //表格foot统计函数
    this.getColumnSum = function (data, field, fixed) {
        var amount = 0;
        for (var i = 0, j = data.length; i < j; i++) {
            amount = amount + parseFloat(data[i][field]);
        }
        return amount.toFixed(fixed === 0 ? 0 : 2);
    };
    this.frontEndExport = function ($export) {
        /*
         *前端导出（导出当前页数据）
         *传入导出按钮元素（div）
         * */
    };
}
//初始化时间控件
function dateControlInit($control, custom_option, datetime) {
    /*
     * 初始化日期控件
     * */
    var control_option = $.extend({
        format: 'yyyy-mm-dd hh:ii:ss',
        startView: "month",
        minView: "month",
        maxView: "month",
        todayBtn: true,
        language: "zh-CN",
        autoclose: true,
        pickerPosition: "bottom-left",
        todayHighlight: true
    }, custom_option || {});
    $control.datetimepicker(control_option);
    if (datetime) {
        $control.find("input").val(datetime);
    }
}
//禁用按钮
function closeButton($element) {
    $element.addClass("disabled");
    $element.prop('disabled', true);
}
//启用按钮
function openButton($element) {
    $element.removeClass("disabled");
    $element.prop('disabled', false);
}
/*
 *获取传入的日期前N天或后N日期(N = day)
 *type:1：前；2：后
 *date：传入的日期
 */
function getTargetDate(day, type, date) {
    var zdate;
    if (date === null || date === undefined) {
        zdate = new Date();
    } else {
        zdate = date;
    }
    var edate;
    if (type === 1) {
        edate = new Date(zdate.getTime() - (day * 24 * 60 * 60 * 1000));
    } else {
        edate = new Date(zdate.getTime() + (day * 24 * 60 * 60 * 1000));
    }
    return edate;
}
/*
 *获取最近几天(N = day)
 *days：传入天数
 *返回值：[起始时间,结束时间]
 */
function getLastDaysArray(days) {
    //起始时间的年月日
    var date1 = getTargetDate(days, 1);
    var year1 = date1.getFullYear();
    var month1 = date1.getMonth() + 1;
    var day1 = date1.getDate();
    //结束时间的年月日
    var date2 = new Date();
    var year2 = date2.getFullYear();
    var month2 = date2.getMonth() + 1;
    var day2 = date2.getDate();
    //处理起始时间小于10的追加"0"在前面
    month1 = month1 < 10 ? "0" + month1 : month1;
    day1 = day1 < 10 ? "0" + day1 : day1;
    //处理结束时间小于10的追加"0"在前面
    month2 = month2 < 10 ? "0" + month2 : month2;
    day2 = day2 < 10 ? "0" + day2 : day2;

    var startTime = year1 + "-" + month1 + "-" + day1 + " 00:00:00";       //起始时间
    var endTime = year2 + "-" + month2 + "-" + day2 + " 23:59:59";      //结束时间
    return [startTime, endTime];
}
/*
 *获取今日的起始和结束时间
 *返回值：[起始时间,结束时间]
 */
function getToDayArray() {
    var date = new Date();      //当前时间
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    month = month < 10 ? "0" + month : month;
    day = day < 10 ? "0" + day : day;
    var startTime = year + "-" + month + "-" + day + " 00:00:00";         //起始时间
    var endTime = year + "-" + month + "-" + day + " 23:59:59";      //结束时间
    return [startTime, endTime];
}

/*
 *获取昨日的起始和结束时间
 *返回值：[起始时间,结束时间]
 */
function getYesterDayArray() {
    var date = getTargetDate(1, 1);       //当前时间前一天
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    month = month < 10 ? "0" + month : month;
    day = day < 10 ? "0" + day : day;
    var startTime = year + "-" + month + "-" + day + " 00:00:00";       //起始时间
    var endTime = year + "-" + month + "-" + day + " 23:59:59";      //结束时间
    return [startTime, endTime];
}

/*
 *获取本周的起始和结束时间
 *返回值：[起始时间,结束时间]
 */
function getThisWeekArray() {
    var date = new Date();      //当前时间
    var week = date.getDay();   //获取今天星期几
    var monday = getTargetDate(week - 1, 1, date);      //获取星期一
    var sunday = getTargetDate(7 - week, 2, date);   //获取星期天
    //起始时间的年月日
    var year1 = monday.getFullYear();
    var month1 = monday.getMonth() + 1;
    var day1 = monday.getDate();
    //结束时间的年月日
    var year2 = sunday.getFullYear();
    var month2 = sunday.getMonth() + 1;
    var day2 = sunday.getDate();
    //处理起始时间小于10的追加"0"在前面
    month1 = month1 < 10 ? "0" + month1 : month1;
    day1 = day1 < 10 ? "0" + day1 : day1;
    //处理结束时间小于10的追加"0"在前面
    month2 = month2 < 10 ? "0" + month2 : month2;
    day2 = day2 < 10 ? "0" + day2 : day2;

    var startTime = year1 + "-" + month1 + "-" + day1 + " 00:00:00";       //起始时间
    var endTime = year2 + "-" + month2 + "-" + day2 + " 23:59:59";      //结束时间
    return [startTime, endTime];
}

/*
 *获取上周的起始和结束时间
 *返回值：[起始时间,结束时间]
 */
function getLastWeekArray() {
    var date = new Date();      //当前时间
    var week = date.getDay();   //获取今天星期几
    var monday = getTargetDate(week + 6, 1, date);      //获取上周星期一
    var sunday = getTargetDate(week, 1, date);          //获取上周星期天
    //起始时间的年月日
    var year1 = monday.getFullYear();
    var month1 = monday.getMonth() + 1;
    var day1 = monday.getDate();
    //结束时间的年月日
    var year2 = sunday.getFullYear();
    var month2 = sunday.getMonth() + 1;
    var day2 = sunday.getDate();
    //处理起始时间小于10的追加"0"在前面
    month1 = month1 < 10 ? "0" + month1 : month1;
    day1 = day1 < 10 ? "0" + day1 : day1;
    //处理结束时间小于10的追加"0"在前面
    month2 = month2 < 10 ? "0" + month2 : month2;
    day2 = day2 < 10 ? "0" + day2 : day2;

    var startTime = year1 + "-" + month1 + "-" + day1 + " 00:00:00";       //起始时间
    var endTime = year2 + "-" + month2 + "-" + day2 + " 23:59:59";      //结束时间
    return [startTime, endTime];
}

/*
 *获取本月的起始和结束时间
 *返回值：[起始时间,结束时间]
 */
function getThisMonthArray() {
    var date = new Date();      //当前时间
    var year = date.getFullYear();
    var month = date.getMonth();

    var min = new Date(year, month, 1);                 //本月月初
    var max = new Date(year, month + 1, 0);             //本月月底

    //起始时间的年月日
    var year1 = min.getFullYear();
    var month1 = min.getMonth() + 1;
    var day1 = min.getDate();
    //结束时间的年月日
    var year2 = max.getFullYear();
    var month2 = max.getMonth() + 1;
    var day2 = max.getDate();
    //处理起始时间小于10的追加"0"在前面
    month1 = month1 < 10 ? "0" + month1 : month1;
    day1 = day1 < 10 ? "0" + day1 : day1;
    //处理结束时间小于10的追加"0"在前面
    month2 = month2 < 10 ? "0" + month2 : month2;
    day2 = day2 < 10 ? "0" + day2 : day2;

    var startTime = year1 + "-" + month1 + "-" + day1 + " 00:00:00";       //起始时间
    var endTime = year2 + "-" + month2 + "-" + day2 + " 23:59:59";      //结束时间
    return [startTime, endTime];
}
/*
 *获取上月的起始和结束时间
 *返回值：[起始时间,结束时间]
 */
function getLastMonthArray() {
    var date = new Date();      //当前时间
    var year = date.getFullYear();
    var month = date.getMonth();

    var min = new Date(year, month - 1, 1); //上月月初
    var max = new Date(year, month, 0);    //上月月底

    //起始时间的年月日
    var year1 = min.getFullYear();
    var month1 = min.getMonth() + 1;
    var day1 = min.getDate();
    //结束时间的年月日
    var year2 = max.getFullYear();
    var month2 = max.getMonth() + 1;
    var day2 = max.getDate();
    //处理起始时间小于10的追加"0"在前面
    month1 = month1 < 10 ? "0" + month1 : month1;
    day1 = day1 < 10 ? "0" + day1 : day1;
    //处理结束时间小于10的追加"0"在前面
    month2 = month2 < 10 ? "0" + month2 : month2;
    day2 = day2 < 10 ? "0" + day2 : day2;

    var startTime = year1 + "-" + month1 + "-" + day1 + " 00:00:00";       //起始时间
    var endTime = year2 + "-" + month2 + "-" + day2 + " 23:59:59";      //结束时间
    return [startTime, endTime];
}
/*
 * 获取选中文本
 * var inputDom = $("#input1")[0];
 * */
function getSelectedText(inputDom) {
    if (document.selection) //IE
    {
        return [document.selection.createRange().text, document.selectionStart, document.selectionStart];
    }
    else {
        return [inputDom.value.substring(inputDom.selectionStart,
            inputDom.selectionEnd), inputDom.selectionStart, inputDom.selectionEnd];
    }
}

/*
 * 设置文本选中高亮
 * var inputDom = $("#input1")[0];
 * */
function setTextSelected(inputDom, startIndex, endIndex) {
    if (inputDom.setSelectionRange) {
        inputDom.setSelectionRange(startIndex, endIndex);
    }
    else if (inputDom.createTextRange) //IE
    {
        var range = inputDom.createTextRange();
        range.collapse(true);
        range.moveStart('character', startIndex);
        range.moveEnd('character', endIndex - startIndex - 1);
        range.select();
    }
    inputDom.focus();
}
/*
 * 扩展date 日期格式化
 * var time1 = new Date().Format("yyyy-MM-dd");
 * var time2 = new Date().Format("yyyy-MM-dd HH:mm:ss");
 * */
Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};
var parseParam = function (param, key) {
    var paramStr = "";
    if (param instanceof String || param instanceof Number || param instanceof Boolean) {
        paramStr += "&" + key + "=" + encodeURIComponent(param);
    } else {
        $.each(param, function (i) {
            var k = key == null ? i : key + (param instanceof Array ? "[" + i + "]" : "." + i);
            paramStr += '&' + parseParam(this, k);
        });
    }
    return paramStr.substr(1);
};
/*
 * FormData转接送
 * */
FormData.prototype.ConvertToJson = function () {
    var $that = this;
    var data = {};
    $that.forEach(function (value, key) {
        data[key] = value;
    });
    return data;
};
jQuery.makeJsForm = function (url, method, options) {
    /*
     * js生成表单并提交（input都是text）
     * */
    // 创建Form
    var $form = $('<form></form>');
    // 设置属性
    $form.attr('action', url);
    $form.attr('method', method);
    // form的target属性决定form在哪个页面提交
    // _self -> 当前页面 _blank -> 新页面
    $form.attr('target', '_self');
    for (var key in options) {
        // 创建Input
        var $input = $('<input type="text" name="' + key + '" />');
        $input.attr('value', options[key]);
        // 附加到Form
        $form.append($input);
    }
    // 提交表单
    $("body").append($form);
    $form.submit().remove();
};