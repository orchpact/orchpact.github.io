# 名称、配置与接口标识

项目名称为 **Orchpact · 序契**。安装包、Python 模块与命令均为 `orchpact`。

英文建议读音（美式）为 **/ˈɔːrk.pækt/**，可分为 **ORK-pakt** 两个音节，重音在前。`ch` 按 orchestra 中的 **/k/** 发音，后半部分按 pact 的 **/pækt/** 发音。

| 标识 | 约定 |
| --- | --- |
| 项目版本 | `0.1.0`；见 `pyproject.toml` |
| HTTP API | `/api/v1` |
| 工作流格式 | `orchpact-workflow` |
| 数据库格式 | `orchpact-postgresql-v1` |
| 配置环境变量 | `ORCHPACT_*` |
| 会话 Cookie | `orchpact_session` |
| 签名头 | `X-Orchpact-*` |
| 浏览器客户端 | `/static/orchpact-client.js`，全局 `OrchpactClient` |

实例管理凭据使用 `ORCHPACT_API_TOKEN`，数据库使用 `ORCHPACT_DATABASE_URL`。同一配置项先读取进程环境，再读取实例 `.env`。管理凭据与数据库 URL 不注入全局 dotenv 状态；供应商凭据只由服务端解析。

应用网关使用 `ORCHPACT_UPSTREAM` 指定服务地址。私钥保存在应用服务器，浏览器不能提供签名身份或管理凭据。签名字节定义见 `application_signing.py`，应用接入见 [应用协议](APPLICATIONS.md)。
