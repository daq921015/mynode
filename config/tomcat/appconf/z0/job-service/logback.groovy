import ch.qos.logback.classic.AsyncAppender
import ch.qos.logback.classic.db.DBAppender
import ch.qos.logback.classic.encoder.PatternLayoutEncoder
import ch.qos.logback.classic.filter.LevelFilter
import ch.qos.logback.core.db.DriverManagerConnectionSource
import ch.qos.logback.core.rolling.RollingFileAppender
import ch.qos.logback.core.rolling.TimeBasedRollingPolicy

import java.nio.charset.Charset

import static ch.qos.logback.classic.Level.DEBUG
import static ch.qos.logback.classic.Level.INFO
import static ch.qos.logback.classic.Level.WARN
import static ch.qos.logback.classic.Level.ERROR
import static ch.qos.logback.core.spi.FilterReply.ACCEPT
import static ch.qos.logback.core.spi.FilterReply.DENY
import static ch.qos.logback.classic.Level.OFF

// See http://logback.qos.ch/manual/groovy.html for details on configuration

scan("30 seconds")

def app = "pro-z0-job"

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
    filter(LevelFilter) {
        level = DEBUG
        onMatch = DENY
        onMismatch = ACCEPT
    }
    discardingThreshold = 0
    queueSize = 512
    appenderRef("mysqldb_log")
}

appender("debug", RollingFileAppender) {
    filter(LevelFilter) {
        level = DEBUG
        onMatch = ACCEPT
        onMismatch = DENY
    }
    rollingPolicy(TimeBasedRollingPolicy) {
        fileNamePattern = "/var/logback/${app}/%d{yyyy-MM-dd}_debug.log"
        maxHistory = 30
    }
    encoder(PatternLayoutEncoder) {
        charset = Charset.forName("UTF-8")
        pattern = "%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n"
    }
}

root(INFO, ["async","debug"])

