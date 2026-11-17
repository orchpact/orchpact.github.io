# 两个独立仓库

Orchpact 分为主项目和官方网站，分别使用独立 Git 历史、依赖和构建流程。

| 仓库 | 维护内容 | 独立验证 |
| --- | --- | --- |
| [orchpact/orchpact](https://github.com/orchpact/orchpact) | 执行服务、管理台、CLI、接口与契约、示例、测试、Docker 和原始技术文档 | uv、PostgreSQL、Node；发布服务前运行相关回归 |
| [orchpact/orchpact.github.io](https://github.com/orchpact/orchpact.github.io) | 官方介绍、在线文档、静态搜索、导航与 GitHub Pages 构建 | uv、Python-Markdown、Node；构建和链接检查无需数据库或模型 |

官网地址为 https://orchpact.github.io/ 。主服务的 `/` 与 `/about/` 保留随安装包提供的介绍页；它们不是官网部署入口，官网也不连接任何用户的管理 API。

## 文档的来源

主仓库的 docs、docker/README.md、contracts/README.md 及社区材料是技术内容的来源。官网保存明确提交的 Markdown 快照，并在 source-docs.json 记录来源仓库、提交与逐文件 SHA-256；构建只使用官网仓库内的内容，不读取相邻目录、不自动拉取 main 的最新内容。

修改技术行为时先在主仓库更新文档。提交并验证后，在官网仓库执行：

```sh
uv sync --frozen
uv run python scripts/sync_docs.py --source /absolute/path/to/orchpact
uv run python scripts/build.py
uv run python scripts/check.py
```

同步程序只复制白名单内的文档。若官网已有快照被手工修改，先停止并保留该改动；不要直接覆盖。内容同步、官网构建和 Pages 发布分别可核验。官网自己的导航、介绍内容和样式在官网仓库维护。

## 发行边界

完整消费端示例另见 [orchpact/examples](https://github.com/orchpact/examples)。观测、映序、拾页和诗境分别维护页面与可移植工作流，提供独立的 Docker 启动和入门教程。示例仓库固定引用公开 Orchpact 提交构建运行时，不读取相邻工作区，不向主项目添加业务分支；主项目和官网的构建也不依赖这些示例。

源码仓库按公开白名单维护工作流引擎、契约、示例与文档。官网仓库不携带服务端实现、私钥、数据库或 Sites 托管身份。两个仓库都使用 MIT，并保留各自需要的第三方许可证说明。

推送源码不代表 Python 包或容器镜像已经发布。GitHub Pages 由官网仓库自己的工作流构建；启用方式见其 README。服务部署仍需要独立配置、备份与验收，不由官网工作流执行。
