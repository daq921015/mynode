var dbExecSql = {};
/*
 * 本程序所有sql集中在此处写，具体方法中去组织条件语句和参数
 * 1、json变量名字为sql使用文件 路径+名称
 * 2、对象内key名称为调用方法名字
 * */
dbExecSql.tomcat_programLog = {
    /*
     * app程序运行日志
     * */
    //条件查询数量（其它条件代码组织）
    getProgramLogListCount: "SELECT COUNT(1) as `count` FROM",
    //条件查询（其它条件代码组织）
    getProgramLogList: "SELECT DATE_FORMAT(FROM_UNIXTIME((`logging_event`.`timestmp` / 1000)),'%Y-%m-%d %H:%i:%S.%f') AS `log_time`,`formatted_message`,`logger_name`,`level_string`,`thread_name`,`event_id` FROM"
};
dbExecSql.special_contrast = {
    getDbTableIndexList: "SELECT `table_name`,`index_name`,`column_name`,`seq_in_index`,`non_unique` FROM `INFORMATION_SCHEMA`.`STATISTICS`  WHERE `table_schema` = ?",
    getDbTableColumnList: "SELECT `table_name`,`column_name`,column_default,`is_nullable`,`column_type` FROM information_schema.`columns` WHERE table_schema = ? "
};
module.exports = dbExecSql;