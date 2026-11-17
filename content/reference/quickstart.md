# 快速开始

Orchpact（序契）是可自托管的声明式工作流引擎。先声明团队、岗位、依赖、交付规则和验收，再由应用固定引用工作流修订、在 Workspace 绑定资源并执行。CrewAI 负责团队内的 Agent 协作与多轮行动，Orchpact 负责跨团队工作流、授权、回执、账务和产物验收。

本文走通“分析员与撰稿员组成分析团队，独立审校团队检查交付”的完整示例。长期保存的是声明，每次实际启动创建新的 Crew、Task 和 Agent；具体映射见 [执行团队](TEAM_EXECUTION.md)。

## 选择一种运行方式

首次试用可以使用仓库中的独立 Docker Compose，自动创建私有 PostgreSQL 与配套文件卷。需要修改代码时使用 Python 源码运行。两种方式都只启动一个主进程；新实例默认没有可用模型，也没有执行额度。

源码位于 [orchpact/orchpact](https://github.com/orchpact/orchpact)，官网与在线文档位于 [orchpact.github.io](https://orchpact.github.io/)。当前从源码或自行构建的 wheel 安装，不依赖已经发布到 PyPI 或镜像仓库的包。

## 使用 Docker

需要 Docker Engine 和 Compose。克隆仓库后运行：

```sh
git clone https://github.com/orchpact/orchpact.git
cd orchpact
python3 docker/configure.py
docker compose --env-file docker/.env config --quiet
docker compose --env-file docker/.env up -d --build --wait
```

打开 `http://127.0.0.1:8780/admin/`。随机管理凭据保存在本机私有 `docker/.env` 的 ORCHPACT_API_TOKEN 字段，生成器不显示也不覆盖它；由操作者在本机读取并登录。端口占用时先在该文件修改 ORCHPACT_PORT。不要提交该文件。

数据库不开放宿主机端口。新 Compose 的数据库与文件卷需要成对保留，不能用新空卷替换已有实例。详情见 [独立 Docker 发行](../docker/README.md)。

## 使用源码

需要 Python 3.11–3.13、uv、专用 PostgreSQL 数据库及匹配的 PostgreSQL 客户端。PostgreSQL 18 是当前验证基线。

```sh
git clone https://github.com/orchpact/orchpact.git
cd orchpact
uv sync --frozen
uv run orchpact --root /absolute/private/orchpact-instance init
# 在该实例 .env 中设置 ORCHPACT_DATABASE_URL，使用专用空库。
uv run orchpact --root /absolute/private/orchpact-instance check
uv run orchpact --root /absolute/private/orchpact-instance serve --host 127.0.0.1 --port 8780
```

`init` 为新实例生成权限 600 的私有配置，不打印管理凭据。`check` 校验配置和数据库连接；服务启动时才取得实例独占锁、执行必要的初始化和迁移。不要为同一库启动多个 Uvicorn worker。数据库、文件目录与恢复流程见 [PostgreSQL 运维](POSTGRESQL.md)。

## 发布并安装团队工作流

1. 在管理台配置支持 text/json 的可用模型，并在“账号与积分”为执行账号分配额度；新账号默认额度为零。
2. 在源码目录离线检查 [department-review.json](../examples/workflows/department-review.json)。只使用 Docker 时，可先通过仓库文件查看该定义，再在下述管理台登记时校验：

```sh
uv run orchpact workflow-check examples/workflows/department-review.json
```

3. 在“工作流目录”登记这个 JSON，得到 `department-review` 的不可变修订。
4. 在“应用绑定”创建 `analysis-app`，固定引用该工作流 ID 与明确修订。应用身份、公钥和工作流资产分别管理。
5. 在当前 Workspace 预览安装，把 `reasoning` 槽位绑定到本空间支持 text/json 的模型，确认后安装。绑定内容为 `{"models":{"reasoning":"your-text-profile"}}`，其中模型标识使用你实际配置的值；绑定不写入定义。
6. 按 [应用接入](APPLICATIONS.md)配置服务端签名身份，从该应用提交 `calculate` 操作：

```json
{"operation":"calculate","input":{"records":[{"id":"source-a","amount":3},{"id":"source-b","amount":5}]},"context":{}}
```

实际执行会调用你配置的模型并消耗额度。应用私钥保留在应用服务端网关，管理凭据不进入网页。通过 Python 客户端登记、绑定和安装的命令见 [README](../README.md)；需要明确指定空间时传入 `--workspace`。

## 理解本次执行

| 阶段 | 执行者 | 可检查的结果 |
| --- | --- | --- |
| 分析与成稿 | 分析团队 Crew，包含 analyst、writer 两个岗位 Agent | 前序岗位的 notes 经 CrewAI Task context 交接，末位岗位提交 result.json |
| 独立审校 | 审校团队的新 Crew，包含 checker 岗位 Agent | audit.json 的 reviewed_artifact_ids 引用本次实际产物 |
| 契约与推进 | Orchpact | 检查文件、当前引用和适用验收；审校失败时按定义有界返工 |

成功时 `result.json` 的 `total` 应为 8，`source_ids` 包含 source-a、source-b，且当前产物通过审校。模型原始回答或单个 Crew 结束不能单独证明整个工作流成功。运行查询中的 `crew_runs` 应能关联两个团队，`agent_steps` 将模型/工具步骤关联到实际岗位；有界协议修正可能产生额外 Crew 启动记录，不能把 Crew 数量当作工作项数量。

多个应用可以引用同一个定义；它们的签名身份、运行、文件和账务分别管理。发布新修订不移动应用引用，修改引用不升级空间安装；显式升级不改写已有执行。完整协议见 [工作流与绑定](WORKFLOWS.md)。

需要观察恢复行为时，区分三个结果：正常交付应有匹配当前产物的验收；返工应保留旧产物并产生新的代次与审校；外部请求结果未知应保留预留并等待真实回执，不自动重放请求。相关约束见 [架构](ARCHITECTURE.md)和 [执行边界](EXECUTION_BOUNDARY.md)。

## 先验证机制，不调用真实模型

需要独立测试 PostgreSQL：安装本地二进制并配置 ORCHPACT_PG_BIN，或指定有 CREATEDB 权限的专用 ORCHPACT_TEST_DATABASE_URL；备份客户端通过 ORCHPACT_PG_DUMP 指定。不要指向业务库。

```sh
uv run python evals/verify_contracts.py --output /absolute/new/contracts.json
uv run python scripts/smoke_release.py --output /absolute/new/smoke.json
```

前者复现授权、验收、未知结果与幂等结算四类契约；后者在临时实例中走完真实 CLI、签名 HTTP、双应用执行和重启核验。它们使用真实隔离存储与合成供应商响应，不证明内容质量、真实检索或成本优势，也不会运行生成的业务代码。

接下来阅读 [架构](ARCHITECTURE.md)、[公开接口](COMPATIBILITY.md)与[管理台](CONSOLE.md)。
