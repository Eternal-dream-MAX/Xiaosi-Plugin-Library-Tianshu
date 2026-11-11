# TPI SDK 与运行时

本页描述 TPI 1.0；TPI 2.0 的隔离宿主和异步能力接口见 [TPI 2.0 开发指南](tpi2.md)与[类型声明](../../tpi/tpi-v2.d.mts)。两者的宿主对象不能互换。

## 入口和会话

宿主先安装只读的 `globalThis.__tianshuTPI`，随后加载插件入口。保存下面的模块为 `tpi.mjs`，并可在同一目录放入 [TPI 类型声明](../../tpi/tpi.d.mts)。

```js
const sdk = globalThis.__tianshuTPI;
if (typeof sdk?.defineTianshuPlugin !== "function") {
  throw new Error("请在支持 TPI 1.0 的天枢中加载插件。");
}
export const { defineTianshuPlugin } = sdk;
```

在 `index.mjs` 中默认导出或以具名 `plugin` 导出 `defineTianshuPlugin({ id, activate })` 的返回值。把 `id` 设为清单 ID，把会话资源的初始化放入 `activate(host)`。

```js
import { defineTianshuPlugin } from "./tpi.mjs";

export default defineTianshuPlugin({
  id: "my-plugin",
  activate(host) {
    host.log.debug("文本统计工具已注册");
    return {
      tools: [{
        name: "count_text",
        description: "统计文本中的 Unicode 码点",
        inputSchema: {
          type: "object",
          properties: { text: { type: "string", maxLength: 10000 } },
          required: ["text"],
          additionalProperties: false
        },
        concurrencySafe: true,
        async execute({ args }) {
          if (typeof args.text !== "string") {
            return { content: "请输入文本。", isError: true };
          }
          const codePoints = Array.from(args.text).length;
          if (codePoints > 10000) {
            return { content: "请输入最多 10000 个 Unicode 码点。", isError: true };
          }
          return { content: String(codePoints) };
        }
      }]
    };
  }
});
```

会话绑定时宿主检查工具名与清单是否一致。返回未声明的生命周期处理器或与已有工具重名时，会话会拒绝接入插件。需要关闭文件、数据库或定时器时返回 `dispose()`，清理当前会话持有的资源。

## 工具接口

- `execute({ args, cwd, sessionId, signal })` 接收展平的模型参数，返回 `{ content: string, isError?: boolean }`。按真实输入验证类型、长度和范围，使用 `cwd` 作为会话工作目录。
- 对接收文件路径的工具，为相应参数声明 `pathParams: { file_path: "read" }` 或 `"write"`。宿主会对声明的非空字符串调用路径守卫，校验通过后传入规范化的绝对路径。工具仍须检查参数类型和预期文件范围。
- `requiresApproval: true` 标记需要用户审批的工具。仅对只读且无副作用的操作设置 `concurrencySafe: true`。使用 `timeoutMs` 设置宿主管理的调用预算，同时为自己的外部调用设置超时。
- SDK 的工具调用类型含可选 `signal`。当前基线的工具包装器未转发该字段。代码可在收到信号时协作退出，并应为无信号的调用自行设置超时和清理。宿主超时无法终止已在同进程运行的任意代码。

## 宿主能力

`host` 含 `tpiVersion`、`pluginId`、`cwd`、可选 `sessionId` 和 `isWorker`。下表的可选服务取决于清单和会话配置。

| 能力 | 接口与边界 |
| --- | --- |
| `tools` | 通过 `activate` 返回工具数组。 |
| `storage` | `host.storage?.dataDir()` 返回插件数据目录，`openDatabase("state.db")` 打开该目录下的 SQLite 数据库。使用单一相对文件名，及时关闭连接。 |
| `account` | `host.account?.userKey()` 返回账号 ID 的稳定哈希，未登录时为 `local-default`。 |
| `embeddings` | `available()`、`modelId()`、`embed(texts, signal?)`。通道由宿主配置，可能不可用或使用远程服务。记录模型标识以判断何时重建本地向量。 |
| `sidePathLLM` | `available()`、`complete(prompt, { timeoutMs, signal? })`。仅在宿主装配该会话通道时调用。 |
| `promptContext` | `setBlock(blockOrNull)` 仅在 `turnStart` 生效。块使用单一 XML 根元素，根标签以标准化插件 ID 为前缀。传 `null` 清除当前块。 |
| `transcripts` | `listSessions(limit?)`、`read(sessionId)`，只读当前项目历史会话的用户与助手文本。 |
| `log` | 宿主提供 `host.log.debug(message)` 和 `warn(message)`。日志内容应省略令牌、原始会话文本和敏感参数。 |

天枢以进程内 JavaScript 运行 agent 插件。清单 `permissions.fs/net/shell` 是用户可见的用途声明。能力清单约束宿主交给插件的接口，文件、网络、进程与环境访问仍受天枢进程自身权限支配。避免用 Node.js 直接访问插件范围外的数据。私有目录是存储约定，隔离取决于宿主环境。声明会读取哪些数据、是否持久化、是否传往模型或外部服务、保留多久及删除方式。`isWorker` 为真时，跳过用户数据写入，防止子会话重复写入。

## 生命周期与外部 hook

| SDK 阶段 | 事件与执行 |
| --- | --- |
| `turnStart` | 收到用户输入、轮次模式与轮次编号，具有可选 `signal`。基线预算为 2 秒。 |
| `turnEnd` | 收到轮次编号、用户输入和助手最终文本，具有可选 `signal`。 |
| `toolEnd` | 收到轮次编号、工具名、成功状态和可选目标及结果预览。预览最多 400 个字符。 |
| `sessionEnd` | 后台处理，基线预算 180 秒，具有可选 `signal`。 |

先在 `contributes.lifecycle` 声明阶段，再在 `activate` 返回相应处理器。开始异步任务前检查可用的中止信号，将其传给支持取消的操作，在 `finally` 释放资源。避免把关键的持久化工作全部留到后台会话结束。

`contributes.hookScripts` 是独立的观察机制，事件名为 `preTurn`、`postTurn`、`postTool`、`postSession`、`onError`。插件库要求脚本是发行包内 JavaScript 文件。外部 hook 与 SDK 生命周期分别声明，适合有限的观察工作。付费未审核包禁用这两类自动入口。

## 测试

对自己的工具测试空值、边界和无效数据，对网络与存储测试缺席、超时和失败清理。在计划支持的天枢版本及操作系统上测试加载、路径守卫、审批、会话关闭与权限声明。提交前通过[验包 API](api.md#ci-示例)检查静态产物，并在宿主中确认实际行为。
