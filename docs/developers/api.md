# 开发者 API 与 CI

接口统一以站点可信源的 `/api/v1` 为前缀。[OpenAPI 3.1](../openapi.json) 描述路径、请求体和响应。认证失败或请求错误返回 `{code,message,request_id,retryable}`。日志可保留请求 ID、错误码与版本号，避免记录凭据、密码和用户数据。

## 能力发现与兼容性

这些接口可公开调用。

| 方法与路径（相对 `/api/v1`） | 用途 |
| --- | --- |
| `GET /tianshu/capabilities` | 查协议、发行限制、启用的服务和契约链接。 |
| `GET /tianshu/schemas/:name` | 下载 `manifest`、`release` 或 `contents` 的 JSON Schema。 |
| `GET /plugins/:id/releases/:version` | 查指定分区公开的精确版本，返回 `{release}`。查询参数 `admission_class` 默认 `official_reviewed`。 |
| `POST /tianshu/compatibility` | 比较已发布版本与指定宿主。省略 `version` 时优先返回分区中最新的兼容公开版本，全部不兼容时返回最新版本及原因。 |

```bash
export XPI_ORIGIN='https://xiaosiai.cn'
curl -fsS "$XPI_ORIGIN/api/v1/tianshu/capabilities"

curl -fsS "$XPI_ORIGIN/api/v1/tianshu/compatibility" \
  -H 'Content-Type: application/json' \
  --data '{"plugin_id":"my-plugin","version":"1.0.0","admission_class":"official_reviewed","host":{"core":"4.0.2","tpi":"1.0","os":"darwin","arch":"arm64"}}'
```

响应 `status` 为 `compatible`、`incompatible` 或 `unavailable`。检查 `reasons` 中的 `release_unavailable`、`tpi_version`、`core_version` 和 `platform`。版本不可用时，`version` 和 `release_id` 为 `null`。未公开的开发版本可在提交前用验包接口检查声明。

## 身份与令牌

| 凭据 | 使用场景 |
| --- | --- |
| 浏览器会话 | 站点用 HttpOnly Cookie 维持登录。登录后的写请求需要同源 `Origin` 和会话响应提供的 `X-XPI-CSRF`。签发、轮换或吊销 CI 凭据，以及登记插件与撤回版本需要当前密码。 |
| CI Bearer `XSPCI1_…` | 绑定一个发布者、一个插件 ID、一条准入分区和明确授权项，有效期最长 30 天。 |
| 付费发布者凭据 `XSPUB1_…` | 用于其付费接入资格绑定的原有提交路径。 |
| XPI 设备证明 | 用于宿主激活、安装、更新和云端巡检。详见[设备证明与云端巡检](security.md)。 |

在开发者中心（`/developers/authorization`）使用已核验的发布者账号登记插件 ID，再创建 CI 凭据。同一插件和分区最多保留 5 个有效 CI 凭据。凭据原文只在签发或轮换时返回一次，保存在流水线机密变量 `XPI_PUBLISHER_TOKEN` 中。轮换会吊销原凭据，完成后同步替换流水线的密钥。泄露时立即吊销。避免在命令跟踪、构建输出、Git 仓库或 ZIP 中写入令牌。CI 只需以下与工作相关的权限。

| Scope | 接口 |
| --- | --- |
| `packages:validate` | `POST /developer/packages/validate` 接收原始 ZIP 和查询参数 `admission_class`，返回 `valid`、发行与插件 ID、版本、产物摘要、清单摘要、体积与兼容性。 |
| `releases:submit` | `POST /submissions` 接收原始 ZIP 与分区、许可、数据用途、HTTPS 源码 URL 和发行说明。首次成功为 HTTP 201，同包与相同元数据的重试为 HTTP 200。 |
| `releases:read` | `GET /developer/plugins`、`GET /developer/plugins/:id/releases`、`GET /developer/releases/:id`。列表带 `cursor` 和 `limit`，详情返回 `{submission,reviews,review_request}`。 |
| `reviews:request` | `POST /developer/releases/:id/review-request`，携带精确包 SHA-256、当前修订号和备注。 |

`GET /developer/profile` 返回 `publisher_id`、核验状态、凭据类型、插件、准入分区与 scopes。浏览器资料中的插件和分区为 `null`。CI 的记录范围按提交时选定的 `requested_class` 隔离。CI 无法付款、执行官方审批、签名、撤回或使用宿主设备权限。

## CI 示例

先按[快速开始](quickstart.md)生成 ZIP。沿用上文的 `XPI_ORIGIN`，或将其设为目标环境的 HTTPS 源，不带末尾斜线和路径。由流水线的机密变量设置 `XPI_PUBLISHER_TOKEN`。以下示例使用官方分区的凭据和 curl 7.87.0 或更新版本。验包以 `Content-Type: application/zip` 上传原始文件字节。

```bash
curl -fsS "$XPI_ORIGIN/api/v1/developer/profile" \
  -H "Authorization: Bearer $XPI_PUBLISHER_TOKEN"
curl -fsS "$XPI_ORIGIN/api/v1/developer/packages/validate?admission_class=official_reviewed" \
  -H "Authorization: Bearer $XPI_PUBLISHER_TOKEN" \
  -H 'Content-Type: application/zip' --data-binary @./my-plugin.zip
```

验包通过后可直接提交同一份 ZIP。将示例中的许可、用途、源码 URL 和发行说明替换为实际值。

```bash
curl -fsS "$XPI_ORIGIN/api/v1/submissions" \
  -H "Authorization: Bearer $XPI_PUBLISHER_TOKEN" \
  -H 'Content-Type: application/zip' \
  --url-query 'admission_class=official_reviewed' \
  --url-query 'license=MIT' \
  --url-query 'data_use=仅在本机统计输入文本，不持久化或传出。' \
  --url-query 'source_url=https://example.com/my-plugin' \
  --url-query 'release_notes=首个稳定版本' \
  --data-binary @./my-plugin.zip

curl -fsS "$XPI_ORIGIN/api/v1/developer/releases/rel_my_plugin_100" \
  -H "Authorization: Bearer $XPI_PUBLISHER_TOKEN"
```

提交成功后，读取精确版本详情，将其中 `artifact_sha256` 与 `policy_revision` 分别填入官方审核申请的 `artifact_sha256` 和 `expected_revision`，并添加 `note`。审核申请进入 `queued`，审核员决定后进入 `decided`，撤回版本时待审申请进入 `cancelled`。平台另行发布与签名。

```bash
curl -fsS "$XPI_ORIGIN/api/v1/developer/releases/rel_my_plugin_100/review-request" \
  -H "Authorization: Bearer $XPI_PUBLISHER_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"artifact_sha256":"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef","expected_revision":1,"note":"已在指定天枢和平台测试。"}'
```

### 已有离线开发套件

已有离线套件的开发者可在套件目录使用以下命令，使用相同的可信站点源、CI 凭据和发行元数据。

```bash
npm run plugin -- validate ./my-plugin.zip --lane official_reviewed --remote
npm run plugin -- submit ./my-plugin.zip --lane official_reviewed \
  --source-url https://example.com/my-plugin --license MIT \
  --data-use '仅在本机统计输入文本，不持久化或传出。' \
  --release-notes '首个稳定版本'
npm run plugin -- status rel_my_plugin_100
```

## 浏览器管理接口

| 方法与路径（相对 `/api/v1`） | 主要字段 |
| --- | --- |
| `POST /developer/plugins` | `plugin_id`、`password` |
| `POST /developer/releases/:id/withdraw` | `reason`、`expected_revision`、`password` |
| `GET /developer/keys` | 返回 `{keys}`，含令牌 ID、范围、提示、创建、过期与吊销时间。 |
| `POST /developer/keys` | `plugin_id`、`admission_class`、`scopes`、`expires_in_days`、`password` |
| `POST /developer/keys/:id/rotate` | `expires_in_days`、`password` |
| `DELETE /developer/keys/:id` | `password`，成功返回 HTTP 204。 |

## 错误和重试

| HTTP 或错误 | 处理 |
| --- | --- |
| 400 `INVALID_REQUEST`、413 或 415 | 检查请求字段、查询参数、包大小与 MIME。 |
| 401 `AUTH_INVALID` 或 403 | 检查凭据的签发环境、有效期、发布者核验、插件归属、准入分区与 scope。浏览器同时核对 Origin 和 CSRF。 |
| 404 `NOT_FOUND` | 核对分区、发行 ID、版本可见性与记录归属。 |
| 409 `STATE_CONFLICT` | 重新读取版本和策略修订号。若现有版本的 ZIP 或提交元数据不同，使用新版本和发行 ID。 |
| 409 `KEY_LIMIT` 或 `RELEASE_LIMIT` | 检查该插件和分区的有效 CI 凭据数量，或联系平台维护者处理发行容量。 |
| 422 `ARTIFACT_REJECTED` | 检查清单、路径、内容摘要及分区限制，再调用验包接口。 |
| 429 `RATE_LIMITED` 或可重试 5xx | 对 `retryable: true` 使用有上限的退避。有 `Retry-After` 时按其等待。提交重试应保留原始 ZIP 和元数据。 |
