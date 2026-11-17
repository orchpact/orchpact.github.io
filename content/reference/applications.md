# 应用接入

HTTP API 使用 `/api/v1` 前缀。浏览器通过产品同站网关访问，应用私钥留在网关。核心默认无需产品目录，静态托管由 `config/frontends.toml` 显式配置。

## 独立工作流与应用安装

推荐接入路径是发布独立工作流，再为每个应用创建固定修订的绑定。以下路径均带 `/api/v1` 前缀；目录发布与全局应用改绑需要管理员身份，空间安装由所有者或管理员执行：

1. `POST /workflows?revision=0` 发布新工作流，参考 [department-review.json](../examples/workflows/department-review.json)。更新已有资产时 revision 使用当前目录头修订。
2. `POST /apps/{app}/binding` 创建独立应用，body 为 `{"name":"Analysis app","workflow_id":"department-review","workflow_revision":1,"expected_revision":0}`。工作流修订必须明确存在，更新绑定使用当前应用修订。
3. 在目标 Workspace 调用 `POST /apps/{app}/preview`，body 为 `{"bindings":{"models":{"reasoning":"your-text-profile"}}}`。只读检查职责、操作与模型能力。
4. 确认后调用 `POST /apps/{app}/install?expected_revision=N&binding_revision=M`，提交相同 bindings；N 为当前空间安装修订，新建为 0，M 为预览返回的应用修订。安装由空间所有者或管理员执行，任一修订变化都拒绝旧预览。

组织使用 `key` / `parent` 稳定别名，operation 和计划节点使用 `unit` 引用别名；定义不能携带实例 UUID、实际模型绑定或凭据。结构、Schema、文件名、环路和返工范围先校验，能力不足的安装/调用整体回滚。CrewAI 运行对象由平台按团队声明创建，消费应用只提交操作输入。

`GET /apps/{app}` 返回应用 revision、installed_revision、操作、manifest 和固定的 workflow 来源。应用更新引用不会自动升级空间，显式升级保留旧任务引用的组织与快照。完整修订与权限语义见 [工作流协议](WORKFLOWS.md)。

接入脚本可以调用 `orchpact.interfaces.client.configure`：

```sh
uv run python examples/register-workflow.py examples/workflows/department-review.json \
  --application analysis-app --url http://127.0.0.1:8780
# 本地绑定文件只包含 {"models":{"reasoning":"your-text-profile"}}。
# 显式发布新修订、更新此应用引用并升级指定空间：
uv run python examples/register-workflow.py examples/workflows/department-review.json \
  --application analysis-app --url http://127.0.0.1:8780 \
  --update --workspace WORKSPACE_ID --install --bindings /absolute/private/bindings.json
```

管理凭据只从环境 `ORCHPACT_API_TOKEN` 读取。普通代码发布不加 `--update`。客户端的 `--update` 明确发布修订并更新所选应用引用；`--install` 才执行空间安装，其他应用继续保持原引用。更新职责时保留已有启用与签名开关。

按应用登记的内联组织包使用 `POST /organization-packages?revision=N`，示例见 [evidence-team.json](../examples/evidence-team.json)。已绑定独立工作流的应用拒绝由此覆盖；多应用共享定义使用上述独立目录方式。内联组织包同样不携带账号、密钥或运行历史。

## 请求与查询

以下路径均带 `/api/v1` 前缀：

| 操作 | 入口 |
| --- | --- |
| 发起委托 | `POST /apps/{app}/runs`，`Idempotency-Key` 必填 |
| 查询/列出 | `GET /apps/{app}/runs/{id}` / `/runs` |
| 轻量分页 | `GET /apps/{app}/runs-page?limit=25&cursor=…` |
| 文档 | `GET/PUT /apps/{app}/documents/{key}`，写入 `{revision,value}` |
| 项目命令 | `POST /runs/{id}/commands`，`{key,action,revision,payload}` |
| 取消/重试 | `POST /runs/{id}/cancel` / `/work-items/{task}/retry` |
| 回答问题 | `POST /questions/{id}/answers`，`{content}` |
| 账务与事件 | `GET /runs/{id}/usage`、`/requests`、`/events` |
| 回执 | `GET /requests/{id}`，返回 `{request,receipt}` |
| 文件 | `GET /artifacts/{id}`、`/download`、`/preview` |
| 尝试 | `GET /work-items/{id}/attempts` |
| 授权 | `GET/POST /runs/{id}/mandates`，`DELETE …/mandates/{id}` |

查询 run 返回 id、root_task_id、status、revision、tasks、questions、requests、usage、artifact_id、result 和 retryable_tasks。`result` 只在 completed 时返回。客户端以实际状态和 retryable_tasks 恢复，不根据前端余额猜测已受理任务是否丢失。

幂等范围是 Workspace + 稳定业务键，内容不同返回 409。项目命令绑定主体、项目和键；相同键重放不会重复返工或回复。文档/计划 revision 冲突返回 409，客户端应保留输入并刷新修订。

[共享浏览器客户端实现](../src/orchpact/static/orchpact-client.js)（公开入口 `/static/orchpact-client.js`，全局名称 `OrchpactClient`） 负责路径、会话、错误和恢复。`receipt()` 返回供应商回执部分；HTTP 原始响应另有 request 台账。产品可使用独立薄封装传入 app ID。工作空间组件将当前空间放入请求头，异步页面仍需自己的切换/离开保护。

## 签名与隔离

Ed25519 签名算法与 canonical bytes 在 `application_signing.py`；wire format 标记与 API 路径版本是不同概念。签名包含方法、完整原始路径及 query、Host、body、幂等键、时间和 nonce。用户委托还绑定个人会话及 Workspace。服务端检查 audience、应用、成员资格、当前资源、撤销和有效期。

管理员 `POST /apps/{app}/keys` 仅登记公钥。`user_session=true` 由实际登录用户付款；固定预算密钥绑定明确账号和空间。每应用使用独立密钥对，不把平台管理员凭据交给产品。

网关拒绝浏览器自带 Bearer/签名身份头，只开放明确的方法/路径清单。管理接口不能通过产品域名访问。

## 存储部署

Orchpact 使用 PostgreSQL，产品通过网关签名和 Workspace scope 调用平台，页面不接触数据库凭据。消费应用无需增加数据库驱动或直连数据库；集成测试使用隔离 PostgreSQL，参见 [POSTGRESQL.md](POSTGRESQL.md)。


### 请求账务与冻结验收元数据

run 的每个 request 增加 `accounting`：`state` 为 `held`、`settled` 或 `untracked`，`reserved_points` 与 `settled_points` 为内部积分，可为 null。无记录或金额未知不能按 0 处理；这不是供应商币种金额。`credits.status=missing_usage` 说明用量缺失，即使人工核定费用后也可能保留；扣账是否完成以 accounting 为准。`status=unknown` 描述调用结果，不会因账务核定自动变为完成。

每个 task 的 `requires_independent_review` 来自创建时冻结的策略，用于解释该任务的验收要求。客户端展示这些字段不会赋予新的权限，服务端继续执行现有授权和验收检查。


## 工作流来源与定义导出

run 的 workflow 元数据保存定义 ID、作者版本、目录修订、SHA-256、应用绑定修订与本次模型 bindings。查询可解释一次执行使用了什么，不从当前目录头推测历史配置。

`GET /apps/{app}/definition` 导出应用固定引用的作者定义，不包含本地绑定、运行记录或凭据。工作流目录管理、全局应用改绑和安装预览保持管理域名范围，不扩展产品网关白名单。消费应用继续使用自己的签名、公钥和运行路径，不能访问其他应用。

## Agent 执行步骤

run 查询结果的 `agent_steps` 列出当前项目的步骤元数据：工作项、attempt、序号、model/tool 类型、名称、started/completed/failed/unknown 状态及时间。权限与 run 相同；工具参数和观察正文不包含在该列表中。供应商费用仍从 requests.accounting 读取。设计见 [执行边界](EXECUTION_BOUNDARY.md)。

## 团队执行元数据

run 的 `crew_runs` 返回每次 Crew 启动的 id、unit_id、task_id、attempt_id、status、时间和 roster。roster 包含参与岗位 key、实际 Agent ID、名称、角色、本次模型绑定和能力，不包含提示词或凭据。`agent_steps` 的 crew_run_id、member_key、runtime_agent_id 关联实际团队及岗位。

组织创建／编辑 API 的 crew 字段接受本实例模型标识；可移植工作流使用 model 槽位。省略 crew 的组织编辑保留原声明，显式 null 才清除。查询和编辑继续执行 Workspace 权限，团队声明变更不回写已受理工作的名单。参见 [团队设计](TEAM_EXECUTION.md)。
