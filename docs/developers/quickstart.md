# 快速开始

示例插件注册 `count_text` 工具，统计输入中的 Unicode 码点。准备支持 TPI 1.0 的天枢测试宿主。下面的示例清单声明最低核心版本为天枢 `4.0.2`。手动打包步骤使用 Node.js 和 ZIP 工具。

## 1. 创建插件目录

1. 新建目录 `my-plugin`，把[最小插件清单](manifest.md#一个最小工具插件)保存为 `tianshu.plugin.json`。
2. 按 [SDK 入口与会话](sdk.md#入口和会话)创建 `tpi.mjs` 和 `index.mjs`。宿主加载入口时提供握手函数。使用 TypeScript 或 JSDoc 时，把 [`tpi.d.mts`](../../tpi/tpi.d.mts) 放在 `tpi.mjs` 旁作为类型声明。
3. 发布时把清单和入口中的 `my-plugin` 改为自己登记的插件 ID。工具名须与清单一致，并且在目标宿主中可用。

## 2. 在天枢里试运行

在测试环境的天枢终端界面输入 `/plugin install /绝对路径/my-plugin`。核对天枢展示的清单和权限，再按终端提示加上 `--confirm` 完成安装。在新会话中用 `count_text` 检查一段非敏感文本。传入 `{"text":"甲😀\r\n乙\n"}` 应返回字符串 `"6"`。修改插件后，重新安装测试目录并启动新的宿主进程。

本地安装从插件目录加载 JavaScript。签名包的安装、更新和授权可在支持 XPI 的天枢中使用测试插件库验证。操作步骤见实例的安装文档（`/docs#install`）。

## 3. 打包和验包

在开发者中心（`/developers/authorization`）完成发布者核验并登记插件 ID。登录后从发布者资料（`/api/v1/developer/profile`）取得 `publisher_id`。按[手动打包](publishing.md#手动打包)生成发行记录、内容摘要表和 ZIP，再使用[开发者 API](api.md#ci-示例)验包。

## 4. 提交版本

登录开发者中心（`/developers/authorization`），提交验证后的 ZIP、软件许可、数据用途、HTTPS 源码地址和版本说明。按[发布指南](publishing.md#选择准入分区)选择分区并跟踪结果。通过流水线提交时，为对应插件和分区签发 CI 凭据。步骤见[开发者 API 与 CI](api.md)。

## 已有离线开发套件

已经持有离线套件 ZIP 的开发者可继续使用原命令。套件需要 Node.js `>=24.22.1 <27` 和 npm。将下面的 ZIP 文件名替换为手头的文件名。

```bash
mkdir tianshu-devkit
unzip tianshu-developer-kit.zip -d tianshu-devkit
cd tianshu-devkit
npm ci
npm run plugin -- init ./my-plugin --id my-plugin
npm test
npm test -- ./my-plugin
```

套件自带的 `count_text` 同时统计码点与文本行，上例在套件版本中的预期结果是 `{"codePoints":6,"lines":3}`。修改工具后，按自己的输入输出调整本地测试。

完成发布者登记后，在套件目录运行以下命令。使用自己的发布者 ID、源码 Git 提交、唯一发行 ID 和已验证的平台。

```bash
npm run plugin -- pack ./my-plugin ./my-plugin.zip \
  --release-id rel_my_plugin_100 \
  --publisher-id publisher-id \
  --source-commit 0123456789abcdef0123456789abcdef01234567 \
  --platforms darwin-arm64,linux-x64
npm run plugin -- validate ./my-plugin.zip --lane official_reviewed
```
