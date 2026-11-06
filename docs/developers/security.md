# 设备证明与云端巡检

## 宿主信任边界

使用安全渠道交付的 `trust.json` 初始化宿主，其中包含可信站点 `origin`、TUF 初始根与权益签名公钥。开发和生产环境使用独立的可信引导与密钥。首次建立信任时，通过运营方给出的独立渠道核对该文件。网络返回的根只用于受信任 TUF 更新链。

宿主以精确版本生成安装计划，核对 TUF 目标、包大小、ZIP 与清单 SHA-256、权限、数据用途和平台资格。在执行安装或更新前按计划确认。权益 JWS 使用固定 EdDSA 算法，校验发行者、受众、签名键、设备密钥指纹、插件范围、准入分区、时间与修订号。签发的离线权益最长 7 天。访问、刷新和下载凭据均由宿主保存，插件及发布流水线应只持有各自所需权限。对用户展示计划和授权来源。详见使用文档（`/docs#install`）与 [OpenAPI](../openapi.json)。

## 设备请求如何签署

宿主为设备生成 Ed25519 密钥。设备私钥留在宿主的凭据存储。以下协议供原生宿主集成使用；已集成 XPI 的客户端应使用其原生签名通道。

1. 向 `POST /api/v1/auth/challenges` 提交 JSON `{purpose,public_key}`。公钥是 32 字节裸 Ed25519 公钥的 base64url 编码。purpose 为 `activate`、`refresh` 或 `device`。
2. 验证返回的 `audience` 等于信任文件的 `origin + "/api/v1"`。挑战 90 秒有效且只能消费一次。每次重新发起请求使用新挑战。
3. 将下列数组按 `JSON.stringify` 序列化为 UTF-8 并签署。方法大写，请求路径包括原始查询字符串。JCS 使用 RFC 8785，GET 正文用 `null`。只有 `device` 模式把 access token 放入 Bearer 并对其取摘要。激活和刷新正文分别含激活密钥和刷新令牌。
4. 请求附上 `X-XPI-Challenge: <challenge_id>` 和 `X-XPI-Signature: <base64url 原始签名>`。请求仅发往可信 origin，拒绝重定向。设备级访问令牌须与证明的密钥配对。

```js
JSON.stringify([
  "xpi-proof-v1", audience, purpose, challenge_id, nonce,
  method, pathIncludingQuery,
  sha256Hex(JCS(body ?? null)), sha256Hex(accessToken ?? "")
])
```

激活使用 `POST /api/v1/activations` 的 `{activation_key,device_name}`。续期使用 `POST /api/v1/tokens/refresh` 的 `{refresh_token}`。接收新会话凭据后由宿主更新持久状态。设备撤销、授权失效或挑战重放时应检查服务器错误并按宿主流程重新认证。

## 固定云端巡检

查询公开能力发现（`/api/v1/tianshu/capabilities`）确认巡检开放。云端工作进程执行运营方拥有的 `xiaosi-api-watch` 的官方稳定版本，范围限设备授权和运营方为账号登记的目标。请求输入是目标编号，使用可见版本与返回的工具 schema。URL、HTTP 方法、请求头和远程代码由服务端控制。

| 方法与路径（相对 `/api/v1`） | 用途 |
| --- | --- |
| `GET /cloud/plugins/xiaosi-api-watch/tools` | 返回可用精确版本、`check_registered_endpoint` 的 `input_schema` 和本账号的 `endpoint_ids`。 |
| `POST /cloud/executions` | 创建任务。排队或执行中返回 202，同幂等标识的终态返回 200。 |
| `GET /cloud/executions` | 分页列出本账号任务。用 `state` 筛选，`limit` 默认为 20、上限 100，使用返回的 `next_cursor` 翻页。 |
| `GET /cloud/executions/:id` | 获取本账号任务状态与结果。 |
| `DELETE /cloud/executions/:id` | 取消本账号的排队或运行任务，已结束的任务返回现有终态。 |

状态包括 `queued`、`running`、`succeeded`、`failed`、`cancelled`。同一逻辑操作在网络失败后使用原幂等标识、版本与目标，签署请求时使用新挑战。新操作生成新幂等标识。取消不会回收已经送达目标站的 HEAD 请求。

```json
{
  "plugin_id": "xiaosi-api-watch",
  "tool": "check_registered_endpoint",
  "version": "1.0.0",
  "input": { "endpoint_id": "ops_health" },
  "idempotency_key": "f22073af-e515-43d8-92b3-abd169c4024a"
}
```

启用云端适配的宿主还提供本机入口 `GET /plugins/xpi/cloud/tools`、`GET/POST /plugins/xpi/cloud/executions` 与 `GET/DELETE /plugins/xpi/cloud/executions/:id`。这些是使用本机宿主 Bearer 的回环接口，由宿主生成 XPI 设备证明。提交前向用户展示目标编号、版本和数据用途，确认后在上述 JSON 中额外提供 `confirmed: true`。本机确认字段由宿主处理。

### 运行限制和数据

- 单账号最多 3 个待执行任务、滚动 24 小时内 30 次创建。全站最多 50 个待执行、同一窗口 2,000 次创建和 5,000 条任务记录。工作进程逐项执行，排队超过 60 秒失效，单次连接与 DNS 合计最多 6 秒。
- 创建任务的请求体上限为 4 KiB。任务只对已登记的公网 HTTPS 目标发一次 HEAD，解析公网 IPv4 并验证原域名的 TLS。收到重定向时只记录响应状态。响应成功时返回 `http_status`、`ok` 与 `latency_ms`，其中 `ok` 表示 HTTP 2xx。
- 任务完成后保留 24 小时。结果仅含状态、耗时和固定错误码，任务记录按账号隔离。巡检目标可以记录收到的 HEAD 请求。平台发送的请求不携带用户凭据。
- `CLOUD_DISABLED` 表示当前环境未开通。遇到 `CLOUD_BUSY` 或 `RATE_LIMITED` 按响应退避。已运行过的任务在工作进程中断时可能进入失败终态。需要发起新的检查时使用新幂等标识。
