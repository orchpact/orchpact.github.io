# 公共契约

Orchpact 的公开契约覆盖工作流声明、应用引用、空间安装与执行。CrewAI 的 Crew、Task、Agent 是每次运行创建的内部执行对象，不属于跨应用交换格式或承诺兼容的 Python 扩展 API。

## 工作流、资源与版本

可复用工作流使用 `format: orchpact-workflow`，声明团队与岗位、模型能力槽位、输入输出、阶段依赖、审校与有界返工。结构字段拒绝实例身份、实际模型标识和凭据；业务 Schema 与提示词按原文保存，分享前由作者审阅。

| 契约 | 校验与说明 |
| --- | --- |
| 可移植定义 | `orchpact workflow-check` 离线校验；完整行为见 [工作流协议](../docs/WORKFLOWS.md) |
| 团队与岗位 | `units[].crew`、节点 `participants`；声明到运行对象的映射见 [团队设计](../docs/TEAM_EXECUTION.md) |
| 资源安装 | `{"models":{"reasoning":"local-profile-id"}}` 为独立绑定；能力必须覆盖声明要求，不能混入定义 |
| 应用固定引用 | [application-binding.schema.json](application-binding.schema.json)，明确 workflow_id、workflow_revision 和 expected_revision |
| 运行与交付 | [应用 API](../docs/APPLICATIONS.md)，包含权限、幂等、状态、文件与执行步骤元数据 |

工作流作者 `version`、目录修订、应用绑定修订和 Workspace 安装修订分别管理。应用不使用隐式 latest；发布、改绑、安装和执行不自动串联。后续更新不改写已发布定义或已经保存的执行快照。

团队示例可直接校验，无需实例、数据库或模型：

```sh
uv run orchpact workflow-check examples/workflows/department-review.json
```

## 命令、权限与错误

机器结构：[command.schema.json](command.schema.json)、[mandate.schema.json](mandate.schema.json)、[governance.schema.json](governance.schema.json)。运行实例的完整 OpenAPI 由管理员访问 `/api/v1/openapi.json`；交互文档为 `/api/docs`，不会因此向应用签名身份开放管理权限。

错误为 HTTP 状态码与 `{detail,code?}`。401 身份失效，403 动作或能力未授权，404 资源不存在或不可见，409 幂等/版本/状态/契约冲突，422 请求结构非法，413 请求体超限。授权拒绝不发送供应商请求。

`Command` 统一承载 plan/amend/decide/publish/review/retry/cancel/reply；HTTP 用户入口仅允许用户可执行的 amend/review/retry/cancel/reply，执行尝试的模型决策与发布由内部服务提交，不能通过匿名 Worker 接口伪造。

计划修改中 `changes[].task_id` 是实际工作项 ID；新增 `add_nodes` 使用运行时 PlanNode（unit_id，可省略使用父组织），依赖和父节点为项目内 node key。组织包导入时的 `unit` 稳定别名在安装阶段解析，两种边界不可混用。

执行状态、幂等范围、结果与文件见 [应用接入](../docs/APPLICATIONS.md)；权限和快照语义见 [架构](../docs/ARCHITECTURE.md)。

## 组织包与实现入口

按应用登记的内联组织包由 `orchpact.kernel.packages.validate_package` 进行语义校验，示例见 [evidence-team.json](../examples/evidence-team.json)。包作者 `version` 与服务端并发控制 `revision` 分开处理；多应用共享定义应使用独立工作流资产和应用绑定。

`orchpact.kernel.workflows` 实现纯定义校验、指纹、能力绑定与白名单导出。此处列出源码定位，不将内部模块承诺为稳定库接口。公开兼容边界见 [接口与版本策略](../docs/COMPATIBILITY.md)。
