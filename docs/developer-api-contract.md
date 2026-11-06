# Tianshu 开发者接口约定

所有路径相对 `/api/v1`。Browser 使用站点 Cookie，写请求带同源 Origin 与 X-XPI-CSRF，列明处另验当前密码。CI 使用独立 Bearer `XSPCI1_…`，绑定发布者、一个插件、一条准入分区、最长期限 30 天和精确 scopes。既有 XSPUB1 和设备凭据的用途不变。错误体沿用 XPI v1。

| 方法与路径 | 主要输入和成功结果 | 身份 |
|---|---|---|
| GET /tianshu/capabilities | 协议、分区、运行形态、限制、启用能力与文档/契约链接 | 公开 |
| GET /tianshu/schemas/:name | manifest、release、contents 的 JSON Schema | 公开 |
| GET /plugins/:id/releases/:version | query admission_class，返回 {release}，默认官方 | 公开 |
| POST /tianshu/compatibility | {plugin_id, version?, admission_class?, host:{core,tpi,os,arch}} → {status,plugin_id,version,release_id,admission_class,reasons} | 公开 |
| GET /developer/profile | {publisher_id,verified,credential,plugin_id,admission_class,scopes}，浏览器的插件和分区为 null | Browser 或 CI |
| GET /developer/intake | 返回 `{draft}`。无待核验包时为 `{draft:null}`。 | Browser |
| POST /developer/intake | 沿用 `/submissions` 的查询参数和原始 ZIP 请求体。新建返回 201，同包与同资料重试返回 200，正文为 `{draft}`。 | 未核验 Browser，写请求需 CSRF |
| DELETE /developer/intake | query `intake_id`，取消该待核验提交，成功返回 204。 | Browser，写请求需 CSRF |
| GET /developer/plugins | query cursor,limit → {plugins:[{plugin_id,publisher_id,created_at}],next_cursor} | Browser 或 CI releases:read |
| POST /developer/plugins | {plugin_id,password} → {plugin} | 已核验 Browser |
| GET /developer/plugins/:id/releases | query cursor,limit → {releases:[Submission],next_cursor} | Browser 或 CI releases:read |
| GET /developer/releases/:id | {submission,reviews,review_request} | Browser 或 CI releases:read |
| POST /developer/packages/validate | query admission_class，application/zip → {valid,release_id,plugin_id,version,artifact_sha256,manifest_sha256,artifact_bytes,compatibility} | Browser 或 CI packages:validate |
| POST /submissions | 原有参数不变。允许新的 CI releases:submit，同一版本、相同字节与元数据重试返回原提交 200 | Browser、CI 或既有付费 XSPUB1 |
| POST /developer/releases/:id/review-request | {artifact_sha256,expected_revision,note} → {review_request}，记录精确包的官方审核申请 | Browser 或 CI reviews:request |
| POST /developer/releases/:id/withdraw | {reason,expected_revision,password} → {submission} | 版本所有者 Browser |
| GET /developer/keys | {keys:[{id,plugin_id,admission_class,scopes,hint,created_at,expires_at,revoked_at}]} | Browser |
| POST /developer/keys | {plugin_id,admission_class,scopes,expires_in_days,password} → {key,credential}，credential 原文只返回一次 | Browser |
| POST /developer/keys/:id/rotate | {expires_in_days,password} → {key,credential} | 版本所有者 Browser |
| DELETE /developer/keys/:id | {password} → 204 | 版本所有者 Browser |
| GET /cloud/executions | query cursor,limit,state → {executions,next_cursor} | XPI 设备证明 |
| GET /cloud/plugins/:id/tools | 已登记目标与对应精确工具 schema | XPI 设备证明 |
| POST /cloud/executions | 既有 {plugin_id,tool,version,input,idempotency_key} 及 202/200 响应 | XPI 设备证明 |
| GET/DELETE /cloud/executions/:id | 查询或取消本人任务 | XPI 设备证明 |

准入分区仅为 official_reviewed 或 paid_unreviewed。兼容结果 status 为 compatible、incompatible 或 unavailable。reasons 为 release_unavailable、tpi_version、core_version、platform 中的数组。找不到本分区版本时 version 与 release_id 为 null。CI 的分区依据提交时选择的 requested_class。CI 无法访问其他分区的提交记录，也不具备付款、签名、审批、提现或宿主设备权限。请求官方审查的状态为 queued、decided 或 cancelled，批准签名由管理员另行执行。

归档暂不可用时，轮换使用相同 expires_in_days 重试，撤回使用原 reason 和 expected_revision 重试。
