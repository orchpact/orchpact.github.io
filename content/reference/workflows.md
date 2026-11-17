# 工作流资产、应用绑定、空间安装与执行

Orchpact 是可自托管的声明式工作流执行服务。定义描述团队、岗位、阶段依赖、资源需求、交付和验收，CrewAI 执行团队内部协作。定义不依附某个消费应用；多个使用方可以引用同一资产与修订，同时保留各自的接入身份和执行边界。

## 四个独立动作

| 动作 | 标识与版本 | 作用 |
| --- | --- | --- |
| 发布定义 | workflow_id + workflow revision | 独立目录；保存作者 version、SHA-256 与不可覆盖的 JSON 定义 |
| 应用绑定 | application_id + application binding revision | 应用以独立签名身份固定引用 workflow_id + workflow_revision；不使用隐式 latest |
| 空间安装 | Workspace + application_id + installed_revision | 解析职责别名和本地模型绑定，生成该空间/应用独立的组织实例 |
| 发起执行 | run ID | 固定本次输入、原付款人、工作流来源、应用绑定修订、模型与任务快照 |

发布不会修改任何应用；应用更新引用不会升级已安装空间；显式空间升级不重写旧执行。工作流修订与应用绑定修订分别计数，不能混用。

例如 analysis-app 和 report-app 都绑定 department-review revision 1：定义 ID 和指纹相同，应用 ID、公钥、资源绑定、运行、文件和账务边界分别保留。即使在同一个 Workspace 中，A 的应用身份也不能读取 B 的执行、文件或调用回执。

## 声明如何成为一次团队执行

| 定义字段 | 含义 | 实例化边界 |
| --- | --- | --- |
| `resources.models` | 文本、JSON、搜索等模型能力需求 | Workspace 安装时解析本地模型绑定 |
| `units[].crew.members` | 稳定岗位 key、职责、指令、能力与模型槽位 | 工作项创建时冻结参与岗位和资源；实际启动时创建 CrewAI Agent |
| `execution_plan.nodes[].participants` | 本团队参与岗位及协作顺序 | 按声明创建 CrewAI Tasks，不能引用其他团队岗位 |
| `depends_on`、`outputs` | 跨团队依赖和文件契约 | 由 Orchpact 工作项图与不可变产物实现 |
| `gate`、`repair_from`、`rules` | 审校门禁、允许返工范围与确定性检查 | 由平台检查当前产物和推进有界返工 |

完整团队示例见 [department-review.json](../examples/workflows/department-review.json)。团队内部 notes 通过 CrewAI 上下文交接，跨团队依赖通过平台产物交接；团队结束只是候选输出，仍须通过交付契约和适用验收。每次实际启动创建新运行对象，工作流 JSON 不嵌入 Crew、Task、Python 回调或实例凭据。声明与实际对象的完整映射见 [执行团队设计](TEAM_EXECUTION.md)。

## 定义与模型资源

format 固定为 orchpact-workflow，id 是工作流资产标识，version 是作者版本；units 使用稳定 key，操作/计划使用 unit 别名。resources.models 声明能力槽位，unit、crew member、agent 和节点 staff 可通过 model 引用它。下面是无固定计划的最小定义；多岗位、跨团队审校示例使用上面的 department-review.json，更小的固定计划见 [evidence-review.json](../examples/workflows/evidence-review.json)。

```json
{"format":"orchpact-workflow","id":"shared-workflow","name":"Example","version":"1.0.0",
 "resources":{"models":{"reasoning":{"capabilities":["text","json"]}}},
 "units":[{"key":"entry","name":"处理组","purpose":"交付约定结果","model":"reasoning"}],
 "operations":{"create":{"unit":"entry","instruction":"交付 result.json","input_schema":{"type":"object"},"output_schema":{"type":"object"},"output_file":"result.json"}}}
```

本地模型绑定另存为 `{"models":{"reasoning":"local-profile-id"}}`。绑定必须恰好覆盖声明槽位，所选模型必须满足能力要求。未指定槽位的角色沿用能力选模机制；需要明确使用方模型时应声明 model。

定义的结构字段拒绝实际 model_id、unit_id、账号、空间、绑定和部署开关。业务 Schema 与提示词内容不会被关键字删除，导出不是任意文本秘密扫描。工作流指纹包含定义 id，但与消费应用 id 无关。

```sh
uv run orchpact workflow-check examples/workflows/department-review.json
```

离线校验不加载实例配置、不连接数据库或调用模型。

## 目录与应用 API

以下路径均带 /api/v1。目录和全局应用绑定仅管理员访问，不加入产品域名或网关白名单。

| 操作 | 接口 |
| --- | --- |
| 校验提交内容 | POST /workflows/validate，已认证上下文，只读 |
| 发布修订 | POST /workflows?revision=N，body 为定义；N 是当前目录头修订，新建为 0 |
| 列目录 | GET /workflows |
| 读特定修订 | GET /workflows/{workflow_id}?revision=N；省略仅用于读取当前头 |
| 导出特定修订 | GET /workflows/{workflow_id}/definition?revision=N |
| 创建/更新应用绑定 | POST /apps/{application_id}/binding |
| 读取应用与固定来源 | GET /apps/{application_id}，沿用应用签名和成员检查 |
| 导出应用引用的定义 | GET /apps/{application_id}/definition |
| 预览空间安装 | POST /apps/{application_id}/preview，body 为 {bindings:{models:{...}}} |
| 确认安装 | POST /apps/{application_id}/install?expected_revision=N&binding_revision=M，同上 body |
| 发起执行 | POST /apps/{application_id}/runs，沿用原有幂等、授权、余额与付款人规则 |

应用绑定示例：

```json
{"name":"研究应用","workflow_id":"shared-workflow","workflow_revision":1,"expected_revision":0}
```

workflow_revision 必须明确且存在。expected_revision 是当前应用绑定修订，新应用为 0。可由管理员显式传 enabled/require_signature，省略时新建默认均为 true，更新时保留原值。应用标识不需要与工作流标识相同。

应用读模型的 revision 是应用绑定修订，workflow.revision 是固定工作流修订，installed_revision 是当前空间已安装的应用修订。manifest 返回所引用的作者定义，其 id 仍是工作流 ID。

安装时 expected_revision 使用当前空间安装修订（新建 0），binding_revision 使用预览返回的应用 revision。任一变化会拒绝旧预览。显式绑定/升级仍需空间所有者或管理员。相同应用修订不能暗中改绑模型；先生成新的应用绑定修订，再显式升级空间。

run.workflow 保存 id、version、revision、sha256、application_binding_revision 与本次模型 bindings。不同应用可有不同绑定修订和资源映射，但同一工作流修订的定义指纹保持相同。

## SDK 与内联组织包

orchpact.interfaces.client.configure 支持 --application、--application-name、--install 和 --bindings。公开包装入口为 examples/register-workflow.py。绑定文件只发送安装接口，不混入工作流定义。管理凭据只从环境读取，私钥由应用独立保管。

--update 明确发布工作流新修订并更新指定应用引用；其他应用继续使用自己的固定引用。空间安装还需 --install。没有 --application 时，configure 通过 organization-packages 登记与应用同标识的内联组织包。需要多个应用复用时，应发布独立工作流资产。

organization-packages 保留按应用登记的内联组织包。已引用独立工作流的应用拒绝通过该入口覆盖，必须显式更新 binding。内联组织包与目录引用是两种明确的登记方式；应用身份与执行权限保持各自边界。

## 存储与边界

workflows 保存头修订；workflow_versions 保存不可覆盖的历史定义；application_bindings 保存每次应用绑定。业务写入、修订检查和事件同事务提交，外键保证引用的工作流版本存在。

首次初始化统一创建完整 Schema，记录 0001_initial_schema；目录、绑定与执行在同一数据库事务边界内维护。

当前仍为单主进程，节点能力侧重模型协作与文件交付。通用人工资格解析、完整异常分支语言和远程执行尚未实现；外部 Agent 适配不纳入当前路线。定义复用不意味着共享账号、运行权限、凭据或余额。
