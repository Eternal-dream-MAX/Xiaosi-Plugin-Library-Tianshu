# XiaoSi插件库

这里公开天枢插件的 TPI 1.0、TPI 2.0 接口、XPI HTTP 接口和插件包格式，供开发者创建和发布插件。TPI 约定插件如何注册工具、使用宿主能力和处理会话事件；XPI 约定插件库如何接收、审核、签名和分发插件版本。

| 接口 | 适用场景 | 开发入口 |
| --- | --- | --- |
| TPI 1.0 | 使用现有工具、生命周期和基础宿主能力。 | [快速开始](docs/developers/quickstart.md) · [1.0 类型](tpi/tpi.d.mts) · [1.0 清单](docs/schemas/manifest.schema.json) |
| TPI 2.0 | 使用隔离运行、联网、项目文件、命令或插件界面等能力，需声明相应权限。 | [2.0 开发指南](docs/developers/tpi2.md) · [最小示例](examples/tpi2-minimal/) · [2.0 类型](tpi/tpi-v2.d.mts) · [2.0 清单](docs/schemas/manifest-v2.schema.json) |

插件库已支持接收和校验两种版本。TPI 2.0 的天枢宿主适配目前仍在验收，`4.0.5` 是插件库的最低兼容性约束，并不代表现有正式版宿主已经具备该能力；开发者可按公开接口开发，并在目标宿主正式支持后完成真实平台测试再发布。能力与版本以[线上能力接口](https://xiaosiai.cn/api/v1/tianshu/capabilities)和实际宿主发行说明为准。

## 开发第一个插件

从[快速开始](docs/developers/quickstart.md)创建插件，在兼容的天枢宿主中安装测试。准备发行时，按[打包发布与更新](docs/developers/publishing.md)生成 ZIP，从上传入口提交首份插件。发布者核验通过后，可通过开发者中心或 [CI 接口](docs/developers/api.md#ci-示例)提交后续版本。

| 文档 | 内容 |
| --- | --- |
| [开发文档目录](docs/developers/README.md) | 覆盖两代接口、清单、运行时、发行、CI 和宿主安全。 |
| [开发者手册 PDF](docs/downloads/Xiaosi插件库开发者手册.pdf) · [Word](docs/downloads/Tianshu插件开发者手册.docx) | 离线参考；TPI 2.0 与最新上传限制以在线文档为准。 |
| [上传插件](https://xiaosiai.cn/developers/upload) | 提交首份 ZIP 等待发布者核验。已核验开发者可提交后续版本。[上传接口](docs/developers/api.md#首份插件上传) |
| [开发者中心](https://xiaosiai.cn/developers/authorization) | 管理版本、申请官方审核和签发 CI 凭据。 |

## 接口与包格式

| 契约 | 用途 |
| --- | --- |
| [TPI 1.0 类型声明](tpi/tpi.d.mts) · [TPI 2.0 类型声明](tpi/tpi-v2.d.mts) · [SDK](docs/developers/sdk.md) | 插件入口、工具调用、生命周期和宿主能力；2.0 的接口以隔离宿主为准。 |
| [OpenAPI 3.1](docs/openapi.json) · [开发者接口约定](docs/developer-api-contract.md) | 能力发现、兼容性、发行预检、提交、审核申请和 CI。 |
| [1.0 清单 Schema](docs/schemas/manifest.schema.json) · [2.0 清单 Schema](docs/schemas/manifest-v2.schema.json) · [发行 Schema](docs/schemas/release.schema.json) · [内容摘要 Schema](docs/schemas/contents.schema.json) | ZIP 内的 JSON 契约，发行记录的 TPI 版本须与清单一致。 |
| [XPI v1 协议](docs/xpi-contract.md) | 宿主设备证明、签名安装、版本更新与授权。 |

接口路径使用可信实例的站点源。访问[线上能力发现接口](https://xiaosiai.cn/api/v1/tianshu/capabilities)可查询当前启用的能力、准入分区和发行限制。签名安装与更新需要支持 XPI 的宿主，以及实例运营方通过可信渠道提供的引导文件。

## 支持与许可

普通问题见[技术支持](SUPPORT.md)。漏洞可通过[安全报告渠道](SECURITY.md)私密提交。仓库中的接口定义和开发文档按 [Apache License 2.0](LICENSE) 发布。
