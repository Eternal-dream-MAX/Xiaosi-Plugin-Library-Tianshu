# 打包、发布与更新

## 发行 ZIP

发行 ZIP 的根目录直接包含插件入口、资源和以下三个 JSON 文件。

| 根文件 | 用途 |
| --- | --- |
| `tianshu.plugin.json` | TPI 1.0 或 [TPI 2.0](tpi2.md) 插件清单。 |
| `xiaosi.release.json` | `schema: "xiaosi.release/1"`，绑定发行 ID、插件 ID、发布者 ID、稳定版本、源码提交、权限摘要、兼容性、数据模式和迁移类型。 |
| `xiaosi.contents.json` | `schema: "xiaosi.contents/1"`，`files` 记录其他所有文件相对路径及小写 SHA-256。 |

发行记录中 `plugin_id` 和 `version` 与清单一致，`source_commit` 是 40 或 64 位小写 Git 提交摘要，`permission_digest` 是清单权限对象（缺省 `{}`）的 JCS 规范化 JSON SHA-256。当前固定 `runtime: "agent"`、`channel: "stable"`、`data_schema: 1`、`migration_kind: "none"`。使用 [发行记录 Schema](../schemas/release.schema.json) 和[内容表 Schema](../schemas/contents.schema.json)检查字段。

| 约束 | 上限或规则 |
| --- | --- |
| ZIP | 格式上限为 100 MiB 压缩体积、400 MiB 解包体积、8,192 项，元数据 JSON 每份最多 1 MiB。插件库当前接收的上传大小见 `/api/v1/tianshu/capabilities` 的 `limits`：`upload_bytes` 是已核验发布者的上限（开通对象存储后为 100 MiB，否则 30 MiB），`first_upload_bytes` 是未核验发布者首份发行包的上限（30 MiB）。 |
| 压缩格式 | ZIP32，支持存储和 Deflate。单项解包大小不超过 1 KiB 与压缩体积 200 倍中的较大者。 |
| 文件路径 | 使用 `/` 分隔的相对路径。最多 512 字符、32 层、每段 128 字符。避免绝对路径、点段、重名、大小写碰撞、符号链接和系统保留名。 |
| 运行代码 | 入口及声明的 hook 必须是包内 JavaScript。禁止依赖目录、运行时安装、包脚本、锁文件、原生二进制和原生构建脚本。 |
| WASM | 仅免费官方审核通道可提交核心模块 v1，使用 `.wasm` 后缀、单文件不超过 64 MiB，内容须纳入摘要表。付费未审核通道拒绝 WASM。 |
| 包内容 | 只纳入运行所需的代码、许可和资源。排除凭据、`.env`、`.npmrc`、`.git`、测试输出和一次性文件。 |

在仓库中保留对应源码版本和最终 ZIP 的 SHA-256，CI 和人工审核均提交同一份 ZIP。发布记录以插件 ID 和版本唯一识别。包内容、清单、许可、用途或发布说明需要修改时，使用新 SemVer 和新发行 ID。按破坏性变更、向后兼容功能和修复分别递增主、次、修订号。重复提交相同 ZIP、分区和元数据可以返回已存在的记录。

## WASM 官方审核要求

包含 WASM 的包仍以 JavaScript 为入口。发行包内每个模块须使用 `.wasm` 文件名和核心模块 v1 头；技术预检只检查基本格式、大小和内容摘要，不执行模块，也不证明模块完整有效或安全。模块及其 JavaScript 加载代码必须随 ZIP 固定，禁止运行时下载、更新或拼接其他可执行代码。文件改动须重新打包并审核。

开发者应提供：模块用途、文件名和 SHA-256；对应源码与固定提交、编译器和构建参数，以及可复现构建或可核对产物来源的证据；导入接口（包括 JS 回调、WASI 能力）、第三方许可与版权；处理的数据、网络用途；CPU、内存、执行时长限制和异常退出方式；目标平台及真实宿主的安装、加载、功能和更新测试结果。

审核员需核对同一份 ZIP 的每个模块与构建来源及许可；检查 JavaScript 加载代码、模块导入能力、权限和数据流，确认没有未经披露的文件、网络、进程、动态代码获取或敏感数据访问；验证可用性和资源耗尽处理，并将证据和结论绑定到被审核 ZIP 的摘要。审核通过含 WASM 的版本时，审核员须填写审核证据，平台将其与该版本的产物摘要一起记录；这只是证据留存要求，不能替代人工核验。缺证据或检查不通过时，不应批准。运行时和模块解析器漏洞仍有风险；审核不保证绝对安全。

WASM 准入暂以 `>=4.0.5` 为兼容性下限：`engines.tianshu` 和发行兼容范围不得包含更早版本。该版本号是协调发布的最低约束，不代表现有 4.0.5 已具备此能力；上线前须先将宿主补丁合入并发布到所声明的版本，完成真实平台验收。旧宿主继续拒绝带 WASM 的包。未完成上述宿主发布和验收前，不应发布此类插件。

当前 agent JavaScript 与宿主同进程，`fs`、`net`、`shell` 是用途声明而非强制沙箱。WASM 的隔离不能限制外围 JavaScript；不得将本规则宣传为对不可信插件的隔离或零风险保证。Node 自带 WASI 的限制也不应作为安全边界。

## 手动打包

下面以[快速开始](quickstart.md)创建的插件为例。在插件目录创建 `xiaosi.release.json`。将示例中的发行 ID、插件 ID、版本、发布者 ID、平台和源码 Git 提交替换为实际值。示例权限摘要对应清单中的空权限对象 `{}`。权限变更时按 RFC 8785 规范化 `permissions`，计算其 UTF-8 字节的 SHA-256。

```json
{
  "schema": "xiaosi.release/1",
  "release_id": "rel_my_plugin_100",
  "publisher_id": "publisher-id",
  "plugin_id": "my-plugin",
  "version": "1.0.0",
  "channel": "stable",
  "runtime": "agent",
  "compatibility": {
    "tpi": "1.0",
    "core": ">=4.0.2 <5.0.0",
    "platforms": ["darwin-arm64"]
  },
  "data_schema": 1,
  "migration_kind": "none",
  "permission_digest": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
  "source_commit": "0123456789abcdef0123456789abcdef01234567"
}
```

在同一目录运行下列命令，按原始文件字节生成内容摘要表，并将文件添加到新 ZIP。额外的资源文件应同时加入摘要和 ZIP 的文件列表。修改任何包内文件后重新生成摘要与 ZIP。

```bash
node --input-type=module - >xiaosi.contents.json <<'JS'
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const paths = ["tianshu.plugin.json", "index.mjs", "tpi.mjs", "xiaosi.release.json"];
const files = Object.fromEntries(paths.map(path => [
  path, createHash("sha256").update(readFileSync(path)).digest("hex")
]));
console.log(JSON.stringify({ schema: "xiaosi.contents/1", files }, null, 2));
JS

test ! -e ../my-plugin.zip && zip -X -0 ../my-plugin.zip \
  tianshu.plugin.json index.mjs tpi.mjs xiaosi.release.json xiaosi.contents.json
```

将新 ZIP 交给[验包 API](api.md#ci-示例)，查询返回的 `valid`、发行 ID 和摘要。已有离线套件也可使用[原打包命令](quickstart.md#已有离线开发套件)。

## 选择准入分区

| 分区 | 流程 | 安装与更新 |
| --- | --- | --- |
| 免费官方授权 `official_reviewed` | 核验发布者，登记插件 ID，提交 ZIP 与披露信息，申请官方审核。审核绑定到该版本的精确 ZIP 摘要，通过后由管理员签名发布。 | 用户确认安装。满足宿主条件且用户开启时，合格更新可自动应用。 |
| 付费授权 `paid_unreviewed` | 发布者提交同类资料，版本须通过技术检测并取得该插件的有效接入资格。现有结账走测试沙盒，目录明确显示未经官方审核。 | 每个版本都要求额外确认，禁止自动更新。当前宿主阻止此分区的插件执行。 |

从[上传插件](/developers/upload)登录或注册，页面会显示打包所需的发布者 ID。提交时提供许可标识、数据用途、HTTPS 源码地址和更新说明。数据用途说明应覆盖本地读写、网络或模型调用、发送的数据、保留与删除方式。对使用者收取的外部服务费用也应披露。付费接入费由发布者承担，个人激活由设备授权流程管理。

新账号可以先上传一份 ZIP 等待发布者核验。待核验的发行包保留 14 天，可在开发者中心取消。身份核验通过后，原包转入已提交版本。在免费通道申请官方审核，等待管理员核对发行包并发布。已核验的发布者可以直接提交新版本。

## 跟踪、更新与撤回

- 在开发者中心查看技术状态、版本状态、审核结论、发行摘要与当前策略修订号。审核补充资料按反馈处理。任何改变包字节的修改都需要新版本。
- 自动更新只在官方区有资格。除递增版本外，还须满足当前授权及宿主兼容性，权限、能力、贡献项、数据用途及模式保持一致，迁移类型为 `none`。否则需要重新核对并确认。更新在宿主重启边界切换。
- 撤回使用版本所有者的浏览器会话、当前密码、撤回原因和最新策略修订号。更新后重新查询状态；其他操作改变修订号时先读取最新记录。撤回通过平台资格与宿主重新验证生效。已签离线权益有有效期，离线设备无法立即获得新状态。
