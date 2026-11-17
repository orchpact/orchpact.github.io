# 第三方资源

## Mermaid 12.3.0

- 上游：https://github.com/mermaid-js/mermaid
- 许可：MIT，完整文本见 [LICENSE](src/assets/vendor/mermaid/LICENSE)。
- 使用官方 npm 包中的 `dist/mermaid.min.js` 独立构建，不修改内容。文件末尾保留其捆绑依赖的许可声明，包括 DOMPurify、lodash、Cytoscape 等。
- 包地址、npm SHA-512 完整性值和本地文件 SHA-256 记录在 [provenance.json](src/assets/vendor/mermaid/provenance.json)。构建检查同时核验源文件和发布文件的 SHA-256。
- 浏览器仅从本站加载；构建不下载依赖。渲染器使用 strict 安全模式，禁用图内 HTML 标签与交互，源码始终保留。

更新时，从官方 npm registry 获取明确版本的包，先按 registry 元数据验证包完整性，再提取上述原始文件与 LICENSE，更新 provenance.json 与本文的版本。运行构建、检查和测试，并在浏览器验证架构与执行文档、窄屏横向滚动、源码展开和渲染失败回退，再提交更新。不要用移动版本的 CDN URL 替代本地资源。

## Python-Markdown

构建依赖，版本由 uv.lock 固定，遵循上游 BSD-3-Clause 许可。它不作为浏览器运行时发送。上游：https://github.com/Python-Markdown/markdown
