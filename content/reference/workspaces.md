# 账号与 Workspace

管理身份与个人身份分开，应用签名绑定应用与已验证个人会话。默认安装仅包含账号、邀请、Workspace 和资源账户，不包含手机号、会员或微信字段。

管理员在 `/admin/` 验证管理凭据；`/account/` 管理个人登录、空间及管理员账号/资源操作。Cookie 使用 HttpOnly、SameSite=Strict，HTTPS 场景标记 Secure，按 audience 限制跨域重放。服务端校验 Origin，不接受任意跨站写请求或宽泛 CORS。

私人空间只属于所有者；协作空间按成员共享。请求通过 `X-Workspace-Id` 明确空间，成员移除后立即失去资源权限。普通所有者可以编辑自己空间的组织；成员可以在已登记的可信组织包中发起委托，但不能因此取得任意组织管理或升级权限。管理员可管理平台资源。

## 核心接口

以下均以 `/api/v1` 开头：

- `POST /auth/login`、`POST /auth/register`（管理员一次性邀请码）、`GET /auth/me`、`DELETE /session`。
- `PUT /auth/password`：旧密码与新密码，成功后撤销其他会话并轮换当前会话。
- `POST /admin/users/{id}/password`：管理员重置、撤销全部会话并审计。
- `GET/POST /workspaces`、`POST /workspaces/join`、`PATCH /workspaces/{id}`。
- `/workspaces/{id}/members` 与 `/invitations`：成员、加入、移除、邀请的服务端权限校验。
- `GET /admin/users`、`GET /admin/users/{id}/workspaces`、`PATCH /admin/users/{id}`（启停）。
- `GET /auth/credits`、`POST /admin/users/{id}/credits`（幂等调整）、`POST /admin/credit-requests/{id}/settle`（人工核定）。
- `GET /admin/audit`：游标分页及 action/workspace_id/actor_id 筛选。

新用户默认零额度。账务调整不能扣走已预留资金，余额不足在新调用前失败；已受理请求仍可读取。重试沿用原付款人，协作者不会替换原付款人。
