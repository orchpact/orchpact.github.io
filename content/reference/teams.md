# 执行团队、岗位声明与 Crew 实例

Orchpact 保存可复用的团队与工作流声明；实际的 Agent、Task、Crew 由 CrewAI 创建和执行。团队可以命名为部门、小组或临时项目组，运行时不固定某种组织形式。

## 声明与实例

| 对象 | 声明或持久化记录 | 实际执行对象 |
| --- | --- | --- |
| 团队 | `units[].crew`，保存岗位、职责和协作方式 | 每次团队执行创建一个新的 Crew |
| 岗位／人员 | `crew.members[]`，稳定 key、目标、提示词、模型和工具能力 | 为本次参与的每个岗位创建独立 Agent |
| 团队工作 | 工作流阶段、输入、依赖、输出与验收契约 | CrewAI Task 列表；成员之间的推进和上下文交接由 CrewAI 完成 |
| 业务执行 | run、工作项、attempt、付款人、授权与交付 | Orchpact 衔接团队阶段、管理治理边界 |

Crew 是进程内的执行团队对象，不是独立部署的 CrewAI 服务。长期存在的是团队声明，Crew、Task、Agent 都不作为跨项目共享的常驻对象。声明相同也不会共享执行会话、工具缓存或角色实例。

## 声明一个团队

可移植工作流中的团队示例：

```json
{
  "key": "analysis",
  "name": "分析部",
  "purpose": "根据原始材料交付可核验结果",
  "model": "reasoning",
  "crew": {
    "process": "sequential",
    "members": [
      {"key":"analyst","name":"分析员","role":"核实原始事实", "instruction":"整理可验证的分析记录", "capabilities":["text","json"],"model":"reasoning"},
      {"key":"writer","name":"撰稿员","role":"编制最终结果", "instruction":"根据分析记录交付约定文件", "capabilities":["text","json"],"model":"reasoning"}
    ]
  }
}
```

`model` 引用工作流声明的资源槽位，安装时绑定实例模型。成员省略模型时继承团队模型；每个模型必须满足该岗位所需能力。团队最多六个岗位，key 不重复，当前支持文本、JSON 与搜索能力。

当前支持 CrewAI 顺序协作：按照参与岗位清单生成 Tasks，由 CrewAI 顺序推进。前面的岗位提交有界 `notes` 对象，后面的岗位通过 CrewAI Task context 获得这些记录；最后一个岗位提交阶段的最终 JSON 契约。团队内部记录保存在私有回执中，不自动发布为对外交付。

## 选择本次参与岗位

固定计划的执行节点使用 `participants` 引用本团队的岗位 key：

```json
{"key":"analysis","unit":"analysis","participants":["analyst","writer"],
 "description":"核算输入并交付结果","expected":"result.json",
 "outputs":{"result.json":{"type":"object"}}}
```

清单决定参与范围与顺序；不能引用其他团队的岗位，也不能同时声明 `staff`。原生计划中不带执行角色的组织节点继续负责确定性的交付汇总，不创建额外 Agent。

没有固定计划、直接指向带 crew 声明的团队时，该操作作为团队工作直接执行。单岗位工作也通过一个成员的 Crew 执行。未声明团队的组织协调阶段仍可生成工作流命令提案；平台负责校验这些提案，模型不能自行修改任务图或授权。

完整的两个团队交接示例见 [department-review.json](../examples/workflows/department-review.json)：分析部的分析员和撰稿员协作，独立审校团队检查当前不可变产物。可离线验证：

```sh
uv run orchpact workflow-check examples/workflows/department-review.json
```

## 隔离、快照与治理

- 工作项受理时冻结本次参与名单、职责、模型、能力与限制。修改团队声明只影响随后创建的工作项；重试保留原工作项快照。
- 每次实际启动创建新的 Crew、Task 和 Agent。不同项目、Workspace、调用方以及重试不共享这些对象。一个 attempt 内的有界协议修正或辅助阶段可以产生多个 Crew 启动记录，各自独立标识，共享该 attempt 的执行额度。
- 岗位只能使用自身声明的能力。工作项的授权池可以覆盖团队所需能力，但某个岗位不会因此获得同事的工具或模型绑定。
- 模型、搜索和产物读取仍由平台适配器检查当前身份、attempt、范围、期限、预算与停止标志。原付款人固定；每次实际调用独立保存回执与结算。
- 同一 attempt 的模型、工具次数及总时限由全部成员共享，不能通过增加成员或启动另一个 Crew 扩大额度。
- 团队内部上下文按声明交接。跨团队传递的是平台已登记、经过契约检查和适用验收的不可变交付物；CrewAI 的团队执行结束不代表平台已经接受交付。

当前不启用 CrewAI 的自主跨成员委派或层级式 Manager 流程；协作顺序由声明给定，成员各自的工具选择和多轮行动仍由 CrewAI 执行。不允许团队内部临时增加未声明岗位、工具或权限。

## 记录与恢复

`crew_runs` 记录每次实际 Crew 的 ID、所属团队／工作项／attempt、参与岗位和实际 Agent ID。`agent_steps` 关联 crew_run_id、member_key、runtime_agent_id。查询 run 返回这些受相同 Workspace 与应用权限保护的元数据。

框架默认的共享任务重放日志通过一个固定版本的存储适配缝替换为每个 Crew 私有的内存日志，避免产生跨执行的共享 SQLite 输出记录。执行循环和协作仍由原生 CrewAI 实现；PostgreSQL、平台回执和文件是持久化真相。该适配缝需要在 CrewAI 依赖升级时重新验证。

重启先恢复真实回执和账务。未确认的 Crew 启动标记为 unknown，工作项转为 interrupted；不自动恢复框架检查点或重放付费工具。新的明确重试创建全新的执行对象。

职责矩阵和调用链见 [Orchpact 与 CrewAI 的执行边界](EXECUTION_BOUNDARY.md)。
