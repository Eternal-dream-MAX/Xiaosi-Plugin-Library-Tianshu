# XiaoSi插件库

这里发布 XiaoSi插件库的 TPI 1.0 类型声明、XPI HTTP 接口和插件包格式。插件兼容支持 TPI 的 TianShu 宿主。TPI 约定插件如何注册工具、使用宿主能力和处理会话事件。XPI 约定插件库如何接收、审核、签名和分发插件版本。

## 开发第一个插件

从[快速开始](docs/developers/quickstart.md)创建插件，在兼容的天枢宿主中安装测试。准备发行时，按[打包发布与更新](docs/developers/publishing.md)生成 ZIP，再通过开发者中心提交，或通过 [HTTP API](docs/developers/api.md) 接入 CI。

| 文档 | 内容 |
| --- | --- |
| [开发文档目录](docs/developers/README.md) | 七章在线指南，覆盖清单、运行时、发行、CI 和宿主安全。 |
| [开发者手册 PDF](docs/downloads/Xiaosi插件库开发者手册.pdf) · [Word](docs/downloads/Tianshu插件开发者手册.docx) | 可离线阅读的完整手册。 |
| [开发者中心](https://xiaosiai.cn/developers/authorization) | 核验发布者、登记插件 ID、管理版本和签发 CI 凭据。 |

## 接口与包格式

| 契约 | 用途 |
| --- | --- |
| [TPI 类型声明](tpi/tpi.d.mts) · [TPI SDK 与运行时](docs/developers/sdk.md) | 插件入口、工具调用、生命周期和宿主能力。 |
| [OpenAPI 3.1](docs/openapi.json) · [开发者接口约定](docs/developer-api-contract.md) | 能力发现、兼容性、发行预检、提交、审核申请和 CI。 |
| [清单 Schema](docs/schemas/manifest.schema.json) · [发行 Schema](docs/schemas/release.schema.json) · [内容摘要 Schema](docs/schemas/contents.schema.json) | ZIP 内的三份 JSON 契约。 |
| [XPI v1 协议](docs/xpi-contract.md) | 宿主设备证明、签名安装、版本更新与授权。 |

接口路径使用可信实例的站点源。访问[线上能力发现接口](https://xiaosiai.cn/api/v1/tianshu/capabilities)可查询当前启用的能力、准入分区和发行限制。签名安装与更新需要支持 XPI 的宿主，以及实例运营方通过可信渠道提供的引导文件。

## 支持与许可

普通问题见[技术支持](SUPPORT.md)。漏洞可通过[安全报告渠道](SECURITY.md)私密提交。仓库中的接口定义和开发文档按 [Apache License 2.0](LICENSE) 发布。
