# XPI v1 插件发行接口

开发者预检、CI、审核申请、精确版本和兼容性见 [开发者接口约定](developer-api-contract.md) 与 [OpenAPI 3.1](openapi.json)。

API 基地址 `{origin}/api/v1`。发布和测试环境各使用自己的可信引导文件与密钥。时间字段用 UTC ISO 8601，令牌时间戳为 Unix 秒。错误为 `{code,message,request_id,retryable}`。

## 浏览器

成功响应使用下列对象。所有浏览器写操作要求当前站点的 Origin。登录后的写操作另带 `X-XPI-CSRF`，其值由 session 响应提供。敏感操作额外要求当前密码 `password`。认证用 HttpOnly Cookie。

| 方法与路径 | 请求和返回 |
|---|---|
| GET /meta | `{protocol:"xpi/1",payment_mode:"sandbox"\|"disabled",site_name}` |
| POST /auth/register 或 /auth/login | `{email,password}` → `{user:{id,email,roles,publisher_verified},csrf}` |
| GET /auth/session | `{user:null}` 或与登录相同 |
| POST /auth/logout | `{}` → 204 |
| GET /plugins | `?admission_class=official_reviewed\|paid_unreviewed&q=&limit=&cursor=` → `{plugins:[Plugin],next_cursor}`，缺省免费区 |
| GET /plugins/:id/releases | 同一分区参数 → `{plugin:Plugin,releases:[Plugin]}` |
| GET /me/applications | `{applications:[{id,purpose,status,reason,revision,created_at}]}` |
| POST /applications | `{purpose}` → `{application}` |
| GET /me/entitlements | `{entitlements:[{id,status,device_limit,plugin_scope,expires_at,activation_key_hint}]}` |
| POST /me/activation-keys | `{entitlement_id,password}` → `{activation_key,activation_key_hint}`，仅本次返回原文 |
| GET /me/devices | `{devices:[{id,name,last_seen_at,revoked_at}]}` |
| DELETE /me/devices/:id | `{password}` → 204 |
| GET /me/submissions | `{submissions:[{id,plugin_id,version,technical_status,state,admission_class,review_status,artifact_sha256,policy_revision}]}` |
| POST /submissions | 只接受已验证发布者。原始 ZIP 二进制，Content-Type application/zip。查询参数 `admission_class`、`license`、`data_use`、`source_url`、`release_notes`。返回 `{submission}` |
| GET /me/publisher-grants | `{grants:[{id,plugin_id,status,expires_at,order_id}]}` |
| GET /publisher-orders | `{orders:[Order]}` |
| POST /publisher-orders | `{release_id,accept_unreviewed:true}` 和 Idempotency-Key → `{order:Order}` |
| GET /publisher-orders/:id | `{order:Order}` |
| POST /publisher-orders/:id/sandbox-pay | 沙盒结账，CSRF，`{}` → `{order:Order}` |

`Plugin` 是一个按精确版本投影的对象。字段为 `plugin_id,display_name,description,release_id,version,channel,admission_class,review_status,qualification_basis,policy_revision,compatibility:{core,tpi,platforms},permissions,tools,published_at,release_notes,data_use,license,publisher_name`。同 ID 两区可出现不同版本。目录每 ID 选择本区最新已发布版本。付费状态统一显示“付费授权 · 未经官方审核”。免费状态为“xiaosi 官方授权 · 已审核”。

`Order` 字段 `id,plugin_id,release_id,status,amount_minor,currency,term_days,terms_version,created_at`。状态 pending, paid, authorized, refund_pending, refunded, revoked, review_required。沙盒采用测试金额，无真实资金流。发布者付费授权凭据与个人激活码完全分开。

## 宿主客户端

`GET /meta` 公共。先从可信渠道获取 `trust.json`，对象结构为 `{origin,tuf_root,entitlement_keys:{[kid]:raw_public_key_base64url}}`。API 不自动信任其自身返回的任何新根。根文件由操作者通过安全分发装入宿主；测试可信根仅用于本地。

所有设备操作（挑战接口除外）带 `X-XPI-Challenge`、`X-XPI-Signature`。预先 POST `/auth/challenges`，请求 `{purpose:"activate"|"refresh"|"device",public_key}`，公钥为 Ed25519 的 32 字节裸公钥的 base64url，返回 `{challenge_id,nonce,audience,expires_at}`，有效期 90 秒。签名是 Ed25519 原始签名 base64url。签名输入 UTF-8：

```js
JSON.stringify(["xpi-proof-v1", audience, purpose, challenge_id, nonce, method,
  pathIncludingQuery, sha256Hex(JCS(body ?? null)), sha256Hex(accessToken ?? "")])
```

`audience` 必须等于可信 origin + "/api/v1"。method 大写，path 以 /api/v1 起始，GET 正文为 null。对 JSON 正文按 RFC 8785 序列化。访问令牌放 Authorization Bearer，只用于 purpose=device。挑战一次性消费。任何来自网络的 URL 都限制到可信 origin，拒绝重定向。

| 方法与路径 | 请求和返回 |
|---|---|
| POST /activations | `{activation_key,device_name}`，purpose activate |
| POST /tokens/refresh | `{refresh_token}`，purpose refresh |
| GET /me/entitlements | 设备读取自己的授权，purpose device |
| POST /install-plans | `{plugin_id,channel:"stable",admission_class,installed_version:null\|string,host:{core,tpi,os,arch},version?:string}` → Plan |
| POST /download-tickets | `{plan_id,plan_digest,confirmed:true,paid_confirmed?:true,automatic?:true}` → `{ticket,download_path,expires_at}` |
| GET /downloads/:planId | Bearer、设备证明以及 `X-XPI-Download-Ticket`，返回 ZIP 字节 |
| POST /updates/check | `{host:{core,tpi,os,arch},installed:[{plugin_id,channel:"stable",admission_class,version,release_id,pinned_version?}]}` → `{updates:[{plugin_id,admission_class,status:"current"\|"update"\|"revoked"\|"unavailable",version?,release_id?,requires_confirmation?}]}` |
| GET /metadata/:name | TUF 标准元数据公开 GET，可选 ETag；`1.root.json` 为引导后版本升级，不提供可自动信任的初始根 |

激活、刷新返回 `{access_token,access_expires_at,refresh_token,refresh_expires_at,entitlement,device_id}`。entitlement 是紧凑 JWS，header `{alg:"EdDSA",typ:"xiaosi.entitlement.v1",kid}`，payload 字段 `iss,aud:"xiaosi-plugin-host",subject,entitlement_id,device_id,device_key_thumbprint,plugin_scope,admission_classes,iat,nbf,exp,authority_revision`。校验发行者、受众、固定算法、可信公钥、设备摘要、时间和修订。7 天上限，无额外宽限。

Plan 字段 `plan_id,plugin_id,release_id,version,channel,admission_class,review_status,qualification_basis,policy_revision,artifact_sha256,artifact_bytes,manifest_sha256,permission_digest,permissions,tools,compatibility,data_schema,data_migration,data_use,data_use_digest,requires_confirmation,apply_boundary:"runtime_restart",expires_at,trusted_target,plan_digest`。plan_digest 为去掉自身后 JCS SHA256。付费必须 paid_confirmed，服务器拒绝 automatic。正式版更新仍需宿主确认权限与数据不变。下载链接是同源路径 `/api/v1/downloads/:planId`。客户端逐项对照签名目标及计划。

签名目标命名为 `official/:pluginId/:version/:releaseId.zip` 或 `paid_unreviewed/:pluginId/:version/:releaseId.zip`。TUF 目标 length/hashes.sha256 绑定 ZIP。custom 绑定 `release_id,plugin_id,version,channel,admission_class,review_status,qualification_basis,policy_revision,manifest_sha256,permission_digest,data_use_digest,compatibility,data_schema,migration_kind`。包中资格独立于可变的目录资格。

ZIP 根目录文件 `tianshu.plugin.json`、`xiaosi.release.json`、`xiaosi.contents.json`。内容表 `{schema:"xiaosi.contents/1",files:{[relativePath]:sha256hex}}` 覆盖除自身外所有文件。发行记录遵循[发行 JSON Schema](schemas/release.schema.json)，`permission_digest=SHA256(JCS(manifest.permissions ?? {}))`。首期仅 agent JS、stable、数据模式 1 和 migration_kind none，无依赖安装、链接、原生文件。平台与宿主分别校验。来源标识和离线状态只写入宿主专用目录。

同版本产物的用途披露由数据用途字段和签名摘要绑定，data_use_digest 是对 data_use 字符串进行 JCS 后的 SHA256。自动更新比较已安装版本与目标版本的签名摘要。
