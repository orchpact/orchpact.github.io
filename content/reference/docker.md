# 独立自托管发行

此方案从 Orchpact 仓库独立构建。镜像包含工作流执行服务、管理台与 CLI，PostgreSQL 通过私有网络连接。

需要 Docker Engine 与 Compose。源码目录运行：

```sh
python3 docker/configure.py
# 如本机 8780 已占用，在 docker/.env 修改 ORCHPACT_PORT；保留已有凭据。
docker compose --env-file docker/.env config --quiet
docker compose --env-file docker/.env up -d --build --wait
```

configure.py 以 600 权限创建不同的管理员、数据库应用角色与数据库初始化密码，不显示值，也不覆盖已有文件。不要提交 docker/.env。管理凭据 ORCHPACT_API_TOKEN 位于该本地私有文件；由操作者自行读取并在 /admin/ 登录，不复制到网页或日志。镜像默认以 UID/GID 10001 运行。

服务仅发布到 127.0.0.1，端口默认 8780。PostgreSQL 18 没有宿主机端口，只接入内部数据库网络；Orchpact 另有出站网络用于配置的供应商。bootstrap postgres 账号只用于新卷初始化，Orchpact 使用无超级用户/CREATEDB/CREATEROLE/REPLICATION 权限的专用角色。

首次启动创建独立配置和文件实例；没有模型凭据也能进入管理面。实际执行前需要配置模型、分配额度、发布工作流、绑定应用并安装到空间。此方案不创建产品域名或网关，不替换现有工作区生产 Compose。

## 实例与版本

Compose 项目名默认 orchpact-standalone。需要多个实例时用 `-p YOUR_INSTANCE`，分别使用端口、凭据和数据卷。files 卷保存配置、回执、产物、文件实例标识；database 卷保存 PostgreSQL。两者需要成对保存和恢复。

镜像变量 ORCHPACT_IMAGE 默认为 orchpact-standalone:local，可在私有 env 文件指定唯一版本标签。发布或更新之前另行验证镜像、备份和恢复，不用同一标签覆盖生产运行版本。

已有 PostgreSQL 实例升级到独立工作流目录时，启动会在取得独占锁并核验文件配对后执行 `0003_workflow_catalog`，先保存真实 pg_dump，再在事务中建表与登记。既有组织包、应用密钥、安装和历史执行不会自动转换。

## 停止备份

先确认实例没有正在执行或排队的工作，再停止当前实例的 Orchpact 服务，保持 PostgreSQL 可用。将不存在的备份目标目录挂载到一次性 Orchpact 容器的 /backup 后执行：

```sh
docker compose --env-file docker/.env stop orchpact
docker compose --env-file docker/.env run --rm --no-deps \
  -v /absolute/private/backups:/backup orchpact backup /backup/orchpact-stopped
```

宿主机备份父目录需要让 UID 10001 可写。CLI 会拒绝实例仍被占用、目标已存在或位于实例内的备份。结果包含数据库 dump、配套文件和配置，不包含环境凭据；凭据另行安全保管。不要删除卷，不要用旧库覆盖正在写入的新实例。恢复步骤见 [PostgreSQL 运维](../docs/POSTGRESQL.md)。
