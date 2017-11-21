/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("deploy_app_server", {
        id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            comment: "主键"
        },
        res_info_id: {
            type: DataTypes.BIGINT(20).UNSIGNED,
            allowNull: false,
            comment: "部署程序id"
        },
        alias: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "程序别名,不能有中划线"
        },
        docker_memory: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "容器内存大小,单位必须m,tomcat内存自动此值减78"
        },
        map_tomcat_port: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "tomcat端口容器映射主机端口"
        },
        map_ssh_port: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "ssh端口容器映射主机端口"
        },
        map_rpc_port: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "rpc映射主机端口,生产环境直接rpcserver端口"
        },
        docker_ssh_user: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "docker容器登录用户"
        },
        docker_ssh_pwd: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "docker容器登录密码"
        },
        host_ip: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "程序部署宿主机ip"
        },
        host_user: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "程序部署宿主机用户名"
        },
        host_pwd: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "程序部署宿主机密码"
        },
        host_port: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "程序部署宿主机端口"
        },
        host_alias: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "程序部署宿主机别名"
        },
        tomcat_path: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: "项目访问路径,配置server.xml"
        },
        connect_test_path: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: "程序连通测试地址"
        },
        is_disable: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "服务器状态：0正常1禁用",
            validate: {
                isIn: {
                    args: [[false, true]],
                    msg: "服务器状态只能为0或1"
                }
            }
        },
        memo: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: "备注"
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "删除状态：0启用,1停用",
            validate: {
                isIn: {
                    args: [[false, true]],
                    msg: "删除状态只能为0或1"
                }
            }
        },
        created_by: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: "default",
            comment: "创建人"
        },
        updated_by: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: "default",
            comment: "修改人"
        }
    }, {
        comment: "程序资源表"
    });
};