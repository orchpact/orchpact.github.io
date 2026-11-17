# PostgreSQL 存储与运维

Orchpact 使用 PostgreSQL 保存业务状态、账务和审计，使用配套的本地文件目录保存交付物与回执。验证基线和 Compose 使用 PostgreSQL 18。每个数据库及其文件目录只允许一个主进程。

## 本地配置

安装 PostgreSQL 18 和 `pg_dump/pg_restore`。例如 macOS 可安装 `brew install postgresql@18`，并将 `/opt/homebrew/opt/postgresql@18/bin` 加入 PATH。自行启动本地数据库服务，再由数据库管理员创建专用角色和空数据库：

```sh
createuser --pwprompt orchpact
createdb --owner=orchpact orchpact
uv run orchpact --root /absolute/path/to/orchpact-instance init
# 编辑该实例 .env，设置真实连接和随机管理凭据；不要提交或打印凭据
uv run orchpact --root /absolute/path/to/orchpact-instance check
uv run orchpact --root /absolute/path/to/orchpact-instance serve
```

`ORCHPACT_DATABASE_URL` 使用 `postgresql://` 或 `postgres://` URI，示意值为 `postgresql://orchpact:password@127.0.0.1:5432/orchpact`。密码中的 URI 保留字符必须百分号编码。URL 可放在实例 `.env`（600）或受控环境；不能写进前端。跨主机连接应设置 `sslmode=verify-full` 及可信 CA，数据库禁止公开无约束访问。

Orchpact 账号只需拥有自己的数据库和 public schema，运行阶段无需超级用户或 CREATEDB 权限。不与其他应用共用数据库，不使用事务池代理：实例所有权依赖一个持续存在的 PostgreSQL 会话。保持数据库 `fsync` / `full_page_writes` 开启，Orchpact 连接强制同步提交。大整数用于积分微单位；JSON 快照仍按不可变文本序列化，查询使用原生 JSONB 表达式。

首次启动在双重独占锁下创建 schema 和迁移台账，写入 `orchpact-postgresql-v1` 格式标识，再将库与 `var/database-instance` 绑定。已初始化的库不能配一个空文件目录；恢复必须使用配套的标识、产物和回执。未标记的非空数据库拒绝初始化。文件目录和数据库都只允许一个 Orchpact 主进程。

所有业务写事务共用事务级 advisory lock，确保预算、预留、任务领取、幂等、状态与审计原子提交。读连接独立使用 MVCC；不宣称支持多主调度。数据库所有权会话丢失后 readyz 失败，后续写入拒绝，需运维确认后重启。未知外部请求继续先恢复回执，不自动重发。

## 停止备份与恢复

`pg_dump` 生成 custom 格式，客户端版本不得低于服务端主版本。默认使用 PATH 中的程序，可通过 `ORCHPACT_PG_DUMP` 指定绝对路径。数据库密码只传入子进程环境，不进入命令参数和日志。命名迁移也在执行前生成独立 dump，SQL 失败时事务回滚，修正后可重试同名迁移；每次重试另存新备份，不覆盖先前 dump。

完整恢复单位是 **数据库 dump + 同一时刻的 var/ + config/ + 单独安全保存的环境凭据**，应用私钥也要单独备份。数据库 dump 本身不能代替文件备份。先等待任务结束、停止主进程，再运行：

```sh
uv run orchpact --root /absolute/path/to/instance backup /private/backups/release-001
```

目标必须是实例外的新目录；持有文件锁和数据库锁的运行实例拒绝备份。备份前验证库/文件绑定，输出 `database.dump`、`var/` 和 `config/`；目标目录 700、dump 600。文件内可能含用户内容和托管供应商密钥，须按敏感材料保管。`.env` 和网关私钥不自动打包。

恢复演练必须在独立环境进行，不覆盖现有数据库：

1. 停止目标 Orchpact，创建由专用角色拥有的**空库**。
2. 用受控 `PGHOST/PGPORT/PGUSER/PGDATABASE/PGPASSFILE`（或仅子进程内 PGPASSWORD）提供连接，执行 `pg_restore --exit-on-error --no-owner --no-acl --dbname="$PGDATABASE" /private/backups/release-001/database.dump`。不要把含密码的 URI 放进命令行，不使用 `--clean` 覆盖活动库。
3. 将配套 `var/` 和 `config/` 恢复到新的实例目录（包含 `database-instance`），恢复匹配的凭据，修改新 `.env` 指向恢复库，核对文件权限。不能从空目录直接重建丢失的配套文件。
4. 先 `orchpact check`，再启动一个主进程，检查 readyz、schema_migrations、原付款人/账务、产物哈希、回执和权限，再恢复产品流量。未知请求按真实回执处理，不能重发来“验收”。

`pg_dump` 是一致数据库快照，但主进程停止才能与本地文件组成一致恢复点。备份失败不可视为成功，保留原库和旧文件。恢复旧备份前先保存新写入并评估费用与文件，不自动回退数据库。

## 测试与 CI

测试和评估显式调用 `orchpact.testing.database_url_for()`，从不读取业务 `ORCHPACT_DATABASE_URL`。两种模式：

- 安装本地 PostgreSQL 二进制并配置 `ORCHPACT_PG_BIN`；启动临时集群，只有私有 Unix socket，没有 TCP 监听，持久性保持开启。每个测试实例一个独立数据库，进程退出时删除本次创建的库并停止临时集群。不要以 root 运行 initdb。
- 指定专用 `ORCHPACT_TEST_DATABASE_URL` 和匹配的 `ORCHPACT_PG_DUMP`。测试账号需要 CREATEDB、可终止自己测试库的连接；数据库名均以本次随机 `orchpact_test_` 前缀登记，只清理本次登记的库。绝不能指向生产服务器。

CI 配置 PostgreSQL 18 service 和 Python 3.11–3.13。真实本地执行与尚未执行的范围分别记录在 [发行验收](RELEASE_VALIDATION.md)。

参考：[Psycopg 事务与连接生命周期](https://www.psycopg.org/psycopg3/docs/basic/transactions.html)、[PostgreSQL advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)、[pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)、[官方容器与 PG18 数据目录](https://hub.docker.com/_/postgres)。
