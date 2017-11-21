import ch.qos.logback.classic.AsyncAppender
import ch.qos.logback.classic.db.DBAppender
import ch.qos.logback.core.db.DriverManagerConnectionSource

// See http://logback.qos.ch/manual/groovy.html for details on configuration

scan("30 seconds")

appender("mysqldb_log", DBAppender) {
    connectionSource(ch.qos.logback.core.db.DataSourceConnectionSource) {
      dataSource(com.mchange.v2.c3p0.ComboPooledDataSource) {
          driverClass = "com.mysql.jdbc.Driver"
		  jdbcUrl = "jdbc:mysql://$log_db_ip:$log_db_port/log-$env_name-$group_name-$program_name"
		  user = "$log_db_user"
		  password = "$log_db_pwd"
      }
    }
}

appender("async", AsyncAppender) {
    discardingThreshold = 0
    queueSize = 512
    appenderRef("mysqldb_log")
}

root(ch.qos.logback.classic.Level.INFO, ["async"])