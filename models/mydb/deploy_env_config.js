/**
 * Created by Administrator on 2017-10-29.
 */
module.exports = function (sequelize, DataTypes) {
    return sequelize.define("deploy_env_config", {
        id: {type: DataTypes.BIGINT(20).UNSIGNED, primaryKey: true, autoIncrement: true, comment: "主键"},
        env_name: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        domain: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        tunnel_ip: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        tunnel_user: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        tunnel_pwd: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        tunnel_port: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        saas_db_ip: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        saas_db_user: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        saas_db_pwd: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        saas_db_port: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        goods_db_ip: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        goods_db_user: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        goods_db_pwd: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        goods_db_port: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        rest_db_ip: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        rest_db_user: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        rest_db_pwd: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        rest_db_port: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        retail_db_ip: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        retail_db_user: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        retail_db_pwd: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        retail_db_port: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        erp_store_ip: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        erp_store_user: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        erp_store_pwd: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        erp_store_port: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        erp_chain_ip: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        erp_chain_user: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        erp_chain_pwd: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        erp_chain_port: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        log_db_ip: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        log_db_user: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        log_db_pwd: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        log_db_port: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        main_redis_ip: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
        main_redis_pwd: {type: DataTypes.STRING(32), allowNull: false, comment: ""},
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