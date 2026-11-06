# Tianshu 开发者文档

TPI（Tianshu Plugin Interface）定义插件如何进入天枢的会话、注册工具和使用宿主能力。XPI 是 xiaosi 插件库的发行协议，负责发现版本、发布审核、安装授权和签名校验。按快速开始创建插件并在天枢验证，再通过开发者中心或 CI 提交精确版本。

## 从这里开始

| 我想做什么 | 阅读 |
| --- | --- |
| 创建并试运行第一个文本统计工具 | [快速开始](quickstart.md) |
| 声明插件 ID、入口、工具、权限和宿主版本 | [清单与兼容性](manifest.md) |
| 实现工具，处理会话数据、生命周期与取消 | [TPI SDK 与运行时](sdk.md) |
| 打包、选择分区、申请审核或撤回版本 | [打包、发布与更新](publishing.md) |
| 从构建流水线校验、提交并跟踪版本 | [开发者 API 与 CI](api.md) |
| 集成宿主设备证明和固定云端巡检 | [设备证明与云端巡检](security.md) |

## 下载和契约

文档中以 `/` 开头的站点路径都相对于运行实例的可信站点源。

- [TPI 类型声明](../../tpi/tpi.d.mts)以及[完整开发者手册 PDF](../downloads/Xiaosi插件库开发者手册.pdf)和 [Word](../downloads/Tianshu插件开发者手册.docx)。
- 开发者中心（`/developers/authorization`），管理插件 ID、发行版本、付费测试资格和 CI 凭据。
- 能力发现（`/api/v1/tianshu/capabilities`）与 [OpenAPI 3.1](../openapi.json)，查询服务当前开放的能力并生成接口客户端。
- [插件清单](../schemas/manifest.schema.json)、[发行记录](../schemas/release.schema.json)和[内容摘要表](../schemas/contents.schema.json)的 JSON Schema。

## 首期支持范围

插件库接收 TPI 1.0 纯 JavaScript agent 发行包，使用 `stable` 通道、数据模式 `1` 和迁移类型 `none`。在真实天枢上测试后再声明平台。XPI 安装与云端工具还要求支持对应功能的天枢宿主、可信引导文件和有效设备授权。付费接入使用测试结账，当前宿主阻止付费未审核包执行。已开通的云端功能是针对运营方登记目标的 HTTPS 巡检。
