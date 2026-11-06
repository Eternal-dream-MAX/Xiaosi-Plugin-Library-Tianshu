# 技术支持

## 先定位问题

| 场景 | 可核对的资料 |
| --- | --- |
| 插件初始化、加载、工具调用 | [快速开始](docs/developers/quickstart.md) 和 [TPI SDK](docs/developers/sdk.md) |
| 验包、版本审核、撤回、自动更新 | [打包发布与更新](docs/developers/publishing.md) |
| CI 调用失败或接口响应异常 | [开发者 API 与 CI](docs/developers/api.md) 和 [OpenAPI](docs/openapi.json) |
| 设备激活、签名验证、云端巡检 | [设备证明与云端巡检](docs/developers/security.md) |

## 提交可复现的问题

在 [GitHub Issues](https://github.com/Eternal-dream-MAX/Xiaosi-Plugin-Library-Tianshu/issues) 搜索已有记录，再提交一个问题。提供尽量小的示例，说明预期与实际结果。

- 写明仓库提交、天枢版本、Node.js 版本、操作系统和架构。
- 如涉及发行，附插件 ID、版本、准入分区、ZIP 的 SHA-256 和验包结果。
- 如涉及接口，附 HTTP 方法、路径、状态、`code`、`request_id` 和脱敏的响应片段。
- 如涉及宿主，说明步骤发生在安装、激活、重启加载还是更新，并附必要的脱敏日志。

公开报告使用测试数据，并在提交前移除邮箱、用户数据、激活码、API 凭据、数据库连接串和签名材料。具体实例的账号、审批、付费资格或订单问题请联系该实例的运营方。发现安全漏洞时请使用 [安全报告渠道](SECURITY.md)。
