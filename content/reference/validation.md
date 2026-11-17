# 发行候选验收

此文记录可复现流程。每次实际结果、源码提交、文件指纹与日志写在候选之外的验收目录，每次结论只对应被测提交。

## 从候选重新开始

维护者在源码目录运行：

```sh
python3 scripts/prepare_release.py --output /absolute/new/orchpact-candidate
# 输出目录必须不存在。只复制 release/files.json 白名单，生成一个无父提交的独立 Git 仓库和 bundle。
git clone --single-branch /absolute/new/orchpact-candidate/orchpact.bundle /absolute/new/orchpact-checkout
cd /absolute/new/orchpact-checkout
uv sync --frozen
uv run orchpact workflow-check examples/workflows/evidence-review.json
uv run python scripts/smoke_release.py --output /absolute/new/orchpact-smoke.json
uv run python -m unittest discover -s tests -p 'test_*.py'
node --test tests/*.test.cjs
uv run python evals/verify_contracts.py --output /absolute/new/orchpact-contracts.json
uv run python evals/run.py --output /absolute/new/orchpact-eval.json
uv build --out-dir /absolute/new/orchpact-packages
```

测试和 smoke 只使用 `ORCHPACT_TEST_DATABASE_URL` 指定的专用测试服务器，或 `ORCHPACT_PG_BIN` 指定的临时 PostgreSQL 集群；需要 CREATEDB 权限。不能指向业务数据库。源码验收使用 Python 3.11–3.13、Node 和 uv。

smoke 在全新私有临时实例中运行真实 CLI 与 HTTP 服务，自动创建测试库、随机凭据、本机端口和本地 OpenAI 兼容模拟供应商。发布示例工作流，两个签名应用固定引用同一修订，安装模型槽位、执行计算与独立审校、下载产物、检查越权和幂等、发布新修订并重启核验旧引用。退出时关闭子进程、模拟服务器并清理本次实例和测试库。既有输出文件不覆盖。

## 独立容器

按 [Docker 文档](../docker/README.md)在候选检出中构建唯一标签，以独立项目名、私有凭据文件和未占用端口运行 Compose。验证 readyz、非超级用户数据库角色和无数据库宿主机端口。完整备份恢复遵循 [PostgreSQL 运维](POSTGRESQL.md)。仅按本次项目的准确名称清理临时资源，不清理已有实例或卷。

Linux ARM64 与 AMD64 分别记录镜像 ID 和运行证据；构建成功不能替代启动验收。远端 CI 需推送后由实际运行证明，本地结果不代替远端结果。

## 放行依据

候选必须能脱离开发工作区安装和启动，wheel、sdist、Git bundle 均不含凭据、运行数据或业务目录。记录 Python/Node/PostgreSQL/容器平台、实际命令、退出码、通过/跳过数量、提交和 SHA-256；失败与未验证项单独说明。

所有默认验证使用合成数据与供应商传输，只证明执行、权限、账务和恢复行为。真实模型质量、搜索效果、性能与生产部署不包含在这些证据中。源文件扫描和依赖许可证清单是辅助检查，不能视为已完成外部安全审计。
