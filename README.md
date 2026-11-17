# Orchpact 官方网站

项目介绍与在线文档，官网地址为 [orchpact.github.io](https://orchpact.github.io/)。服务源码在独立的 [orchpact/orchpact](https://github.com/orchpact/orchpact) 仓库。

这是原生 HTML/CSS/JavaScript 静态网站，用 Python-Markdown 在构建时渲染 Markdown；不需要 npm、数据库、模型密钥或相邻主仓库。页面包括项目介绍、19 个文档页面、页内目录、本地全文搜索、代码复制、来源提交链接与 404 页面。关闭 JavaScript 仍可阅读和导航。

首页采用纸白、森林绿与浅草绿的架构手册设计，介绍工作流层与 CrewAI 团队执行层、定义/绑定/安装/执行四个边界，以及单主进程和配套持久化模型。代码浏览器区分团队声明、安装请求和运行记录片段；执行事件浏览器提供正常交付、审校返工和未知结果三种本地机制示意，不连接实例或供应商，不使用私有消费应用和验收数据作宣传。

首页交互以原生按钮、键盘与渐进增强实现；禁用脚本仍保留架构、契约和恢复说明，手机导航使用原生 details。尊重减少动态效果设置。`tests/runtime.test.cjs` 检查演示中的验收身份、返工代次、未知结果预留与不重放语义，演示不是实际执行记录。

品牌图形使用两条相互咬合的流程轨道组成 O 形契环。`src/assets/orchpact-logo.svg` 为已转曲的横向字标，`src/assets/mark.svg` 为圆角方形 icon，`src/assets/orchpact-avatar.png` 为 1024×1024 头像；与主仓库公开品牌素材保持一致，不依赖远程字体或相邻目录。

## 本地构建

要求 Python 3.11–3.13 和 uv；JavaScript 检查使用 Node。

```sh
git clone git@github.com:orchpact/orchpact.github.io.git
cd orchpact.github.io
uv sync --frozen
uv run python scripts/build.py
uv run python scripts/check.py
uv run python -m unittest discover -s tests
node --test tests/*.test.cjs
uv run python -m http.server 8000 --bind 127.0.0.1 --directory dist
```

打开 http://127.0.0.1:8000/ ，文档在 /docs/。dist 是生成物，不提交；构建会拒绝覆盖一个没有本项目生成标识的既有 dist 目录。

## 内容归属

- src/index.html 和 src/assets/：官网介绍、交互与视觉。它们在本仓库独立维护。
- content/pages/：官网自己的文档入口。
- content/reference/：主仓库技术 Markdown 的已提交快照，不手工编辑。
- content/navigation.json：文档分组、标题与稳定 URL。
- source-docs.json：主仓库来源提交和逐文件 SHA-256。构建会检查快照，页面提供对应来源链接。
- scripts/：显式文档同步、静态构建与本地链接/锚点检查。

## 更新技术文档

先在主仓库更新、验证并提交文档，再在本仓库运行：

```sh
uv run python scripts/sync_docs.py --source /absolute/path/to/orchpact
uv run python scripts/build.py
uv run python scripts/check.py
```

主仓库必须干净，复制内容来自 HEAD 的明确 Git blob，路径受白名单约束。官网快照如果有手工修改，同步会停止并保留原内容；先在上游合并这些改动，再同步。构建和 CI 不自动下载主仓库的 main，两个仓库可分别检出和构建。

新增文档时，先在 content/navigation.json 增加 source、slug、title 和 section，再显式同步。技术文档的 .md 相对链接转换为本站对应页面；示例和源码文件链接指向同一主仓库提交。搜索索引只包含公开文档，不访问用户实例。

## GitHub Pages

仓库名 orchpact.github.io 对应组织站根路径，无额外项目名前缀。GitHub 仓库 Settings → Pages → Build and deployment 中，将 Source 设为 **GitHub Actions**。

`.github/workflows/pages.yml` 对 main 的 push 和手动运行执行独立构建、测试与上传。部署使用官方 configure-pages、upload-pages-artifact 和 deploy-pages，通过 github-pages 环境完成；不需要手工创建 PAT，不连接应用服务器。发布前会读取当前 Pages 来源；若仍是分支发布，会给出显式告警，避免将重复部署误认为正常配置。并发部署串行处理，构建或检查失败不会执行部署。

PR 只运行构建和检查，不执行发布；部署权限仅在部署 job 中授予。首次启用后，在 Actions 查看实际结果并访问目标 URL。本地构建成功不能当成远端 Pages 已发布；自定义域名不在当前配置中。

参考 [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 许可证与安全

本站采用 [MIT](LICENSE)。Python-Markdown 是独立的构建依赖，遵循其上游 BSD-3-Clause 许可；它不作为浏览器运行时发送。不要把其他站点的 .openai 托管身份、凭据、用户内容或运行目录迁入此仓库。漏洞报告见 [SECURITY.md](SECURITY.md)。
