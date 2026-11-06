# 清单与兼容性

插件根目录必须包含 UTF-8 文件 `tianshu.plugin.json`。宿主读取此清单并校验入口握手。插件库同时验证清单、发行记录和内容摘要表。此页描述插件库首期可发行的范围。[清单 JSON Schema](../schemas/manifest.schema.json)

## 一个最小工具插件

```json
{
  "$tpi": "1.0",
  "kind": "tianshu.plugin",
  "id": "my-plugin",
  "displayName": "文本统计",
  "version": "1.0.0",
  "description": "统计输入文本的 Unicode 码点",
  "runtime": "agent",
  "entry": "index.mjs",
  "capabilities": ["tools"],
  "contributes": {
    "tools": [{ "name": "count_text", "description": "统计文本" }],
    "lifecycle": []
  },
  "permissions": {},
  "engines": { "tianshu": ">=4.0.2 <5.0.0" }
}
```

| 字段 | 发行约束 |
| --- | --- |
| `$tpi`、`kind`、`runtime` | 分别为 `1.0`、`tianshu.plugin`、`agent`，运行形态省略时为 `agent`。 |
| `id` | 1–128 个字符，以字母或数字开头，后续允许字母、数字、点、下划线与连字符。尾点、系统保留文件名和内置插件 ID `xiaosi-axiom` 禁用。与入口定义和发行记录一致。 |
| `displayName`、`description` | 均必填，分别最多 64 与 500 个字符，可用中文。 |
| `version` | 最多 32 个字符的稳定 SemVer，例如 `1.2.3`，仅接受主、次、修订版本。 |
| `entry` | 包内相对路径，指向非空 UTF-8 `.js`、`.mjs` 或 `.cjs` 文件。推荐使用 `.mjs` 明确 ESM 模块格式。 |
| `capabilities` | 列出实际使用的宿主能力。贡献工具时须含 `tools`，详见 [SDK](sdk.md)。 |
| `contributes.tools` | 工具名称与入口提供的工具一一对应。名称最多 64 个字符，匹配 `^[a-z][a-z0-9_]*$`，插件内唯一。描述最多 200 个字符。 |
| `contributes.lifecycle` | 支持 `turnStart`、`turnEnd`、`toolEnd` 和 `sessionEnd`。agent 至少贡献一个工具或一个生命周期阶段。 |
| `contributes.skills` | 每项为包内相对目录，必须含 `SKILL.md`。 |
| `contributes.commands` | 包内 Markdown 文件路径，或包含 Markdown 文件的目录。 |
| `contributes.hookScripts` | 每项包含 `event`、包内 JavaScript `script` 以及可选的正整数 `timeoutMs`。详见 [SDK](sdk.md)。 |
| `permissions` | `fs`、`net`、`shell` 各为可选布尔值，供审查和安装提示。只声明真实用途。 |
| `engines.tianshu` | 可选 SemVer 范围。如果填写，归一化后须与发行记录的 `compatibility.core` 一致。 |
| `supersedes`、`builtin` | 前者为启用插件时让位的内置工具名称，可省略。后者省略或填 `false`。 |

清单不接受额外字段。插件库不收桌面托管插件。付费未审核分区要求至少一个工具，禁止声明生命周期和外部 hook。

## 发布前验证兼容性

`xiaosi.release.json` 的 `compatibility` 声明核心 SemVer 范围 `core`、协议 `tpi: "1.0"` 和实际验证过的 `platforms`。平台用 Node.js 的 OS 和架构名称拼接，支持 `darwin`、`linux`、`win32` 与 `x64`、`arm64` 的组合。填写平台前至少验证入口加载、工具调用和插件使用的宿主服务。

公开 [兼容性 API](api.md)按请求的准入分区查询已公开版本，并比较核心版本、TPI 版本和平台。兼容结果只覆盖声明中的条件。真实安装还会检查签名目标、当前资格、设备授权及安装确认。可选能力是否可用依然取决于会话配置。
