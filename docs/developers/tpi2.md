# TPI 2.0：隔离运行与界面接口

> 接口已开放供开发；插件库已支持接收和校验。天枢宿主适配仍在验收，`4.0.5` 是插件库最低兼容性约束，不代表现有正式版已支持。请在目标宿主正式发布并通过对应平台验收后，再声明兼容性和发布。本文描述的 2.0 宿主行为以适配完成后的发行版为准。

TPI 2.0 是天枢专用的插件接口。和 TPI 1.0 相比，它多了两件事：插件可以申请更多宿主能力（联网、读写项目文件、运行命令、调用模型、读取会话、保存密钥），也可以给天枢添加界面、改动天枢自带的界面。相应地，TPI 2.0 插件不在天枢的进程里运行，而是在一个隔离的子进程里运行，每一项能力都要先在清单里声明，再由宿主逐次检查后代为执行。

TPI 1.0 插件照常可用，不需要迁移。只有需要上面这些新能力时才用 2.0。

## 运行条件

| 项目 | 要求 |
| --- | --- |
| 天枢版本 | 4.0.5 及以上。清单的 `engines.tianshu` 和发行记录的 `compatibility.core` 都必须只包含 4.0.5 以上的版本。 |
| 系统 | macOS、Linux、Windows。天枢用系统自带的机制切断插件进程的网络，各系统的要求见[各系统的网络隔离](#各系统的网络隔离)。`platforms` 填你实际验证过的系统和架构。 |
| 来源 | 只有从插件库安装、通过签名与完整性校验的发行包才会以 2.0 方式运行。本地目录里的 2.0 插件不会被加载。 |
| 准入分区 | 官方审核分区可以申请全部能力。付费未审核分区只能申请低风险能力，见[付费未审核分区的限制](#付费未审核分区的限制)。 |

## 隔离意味着什么

插件进程启动时：

- 环境变量是空的，拿不到天枢的令牌、账号文件路径或模型密钥。
- 只能读自己的安装目录，只能写自己的数据目录（`host.storage.dataDir()` 返回的那个目录，按账号分开）。读写其他路径会得到 `ERR_ACCESS_DENIED`。
- 不能启动子进程、工作线程、原生扩展或调试端口，不能用 `eval` 和 `new Function`。
- 不能直接联网。联网只能经 `host.net.fetch`，由宿主按清单里的主机名单放行。
- 内存上限 256 MB。与宿主之间单条消息上限 4 MiB，同时进行的宿主调用上限 64 个。

数据目录里如果出现符号链接、硬链接或特殊文件，插件不会启动。

### 各系统的网络隔离

「不能直接联网」由操作系统保证，不是靠约定。插件进程连不上互联网，也连不上本机的端口、Unix 套接字和命名管道。

| 系统 | 机制 | 要求 |
| --- | --- | --- |
| macOS | Seatbelt 沙箱 | 系统自带，无额外要求。 |
| Linux | seccomp 过滤器，禁止创建任何套接字 | x86-64 或 arm64；系统里要有 `python3` 或 `perl`（用来在启动 Node 之前装上过滤器）。不需要管理员权限。 |
| Windows | 不带任何权限的 AppContainer | Windows 10 及以上，系统自带的 Windows PowerShell 5.1 可用。天枢会在插件的安装目录和数据目录上给这个容器加访问权限。 |

天枢每次启动后、第一次运行 2.0 插件之前，会用同一套机制启动一个测试进程，确认它连不上本机的 TCP 端口、UDP 端口、本机套接字和外部地址。有一项连得上，或者测试进程起不来，2.0 插件就不会启动，并给出原因。所以在不满足上表要求的机器上，结果是插件不运行，而不是插件带着网络运行。

## 最小清单

```json
{
  "$tpi": "2.0",
  "kind": "tianshu.plugin",
  "id": "my-plugin",
  "displayName": "汇率查询",
  "version": "1.0.0",
  "description": "查询当日汇率",
  "entry": "index.mjs",
  "engines": { "tianshu": ">=4.0.5" },
  "capabilities": ["tools", "net"],
  "permissions": { "net": { "hosts": ["api.example.com"] } },
  "contributes": {
    "tools": [{ "name": "exchange_rate", "description": "查询两种货币的汇率" }]
  }
}
```

发行记录 `xiaosi.release.json` 里的 `compatibility.tpi` 必须同为 `"2.0"`。[2.0 清单 JSON Schema](../schemas/manifest-v2.schema.json) 也可从实例的 `/api/v1/tianshu/schemas/manifest-v2` 获取。[2.0 类型声明](../../tpi/tpi-v2.d.mts)描述宿主提供的接口。

和 1.0 清单的差别：

- `engines.tianshu` 必填。
- 不接受 `contributes.hookScripts`（外部脚本在隔离之外执行）。改用 `contributes.lifecycle`。
- 不接受 `supersedes` 和 `desktop`。
- 可以只贡献界面：`tools`、`lifecycle`、`ui` 至少有一项即可。

## 能力与权限

`capabilities` 写插件要用的宿主能力。凡是「需要的 `permissions`」一栏不为「无」的能力，都必须在 `permissions` 里同时写明范围，缺一边或多一边都会被拒绝。权限随安装计划一起签名，并在用户安装前逐项展示。

| 能力 | 宿主接口 | 需要的 `permissions` | 说明 |
| --- | --- | --- | --- |
| `tools` | 贡献工具 | 无 | 贡献工具时必填。 |
| `storage` | `host.storage.dataDir()` | 无 | 插件自己的数据目录。 |
| `net` | `host.net.fetch(url, init)` | `net.hosts` | 主机名单，最多 32 项。 |
| `workspace` | `host.workspace.read / list / write` | `workspace.read`、`workspace.write` 至少一项为 `true` | 只限当前项目目录。写入属于高风险。 |
| `shell` | `host.shell.run(command, { timeoutMs })` | `shell.run: true` | 在当前项目目录运行命令。高风险。 |
| `ui` | `host.ui.setStatus / post`，以及 `contributes.ui` | 改动自带界面时需要 `ui.overrides` 或 `ui.stylesheet` | 见[界面接口](#界面接口)。 |
| `transcripts` | `host.transcripts.listSessions / read` | `conversations.history: true` | 读取本项目的历史对话。高风险。 |
| `sessions` | `host.sessions.messages(limit)` | `conversations.current: true` | 读取当前会话最近的用户与助手文字。高风险。 |
| `models` | `host.models.complete(prompt)` | `models.complete: true` | 调用用户配置的模型，消耗用户的额度。高风险。 |
| `sidePathLLM` | `host.sidePathLLM.complete(prompt, { timeoutMs })` | 无 | 侧路模型，同 1.0。 |
| `embeddings` | `host.embeddings.available / embed` | 无 | 同 1.0。 |
| `promptContext` | `host.promptContext.setBlock(block)` | 无 | 同 1.0：一个以插件 ID 命名的 XML 元素，最多 32 KiB。 |
| `secrets` | `host.secrets.get / set / delete` | 无 | 见[保存密钥](#保存密钥)。 |
| `notifications` | `host.notifications.show(message, { level })` | 无 | 在天枢里弹出一条通知，开头总是插件名。 |
| `settings`、`commands` | 保留 | 无 | 4.0.5 中 `host.settings.get()` 返回空对象。插件设置请用设置页面加自己的数据目录。 |

`host.sessions.append` 在 4.0.5 中不可用，调用会失败。

`net.hosts` 每项是一个域名（`api.example.com`）、一级通配（`*.example.com`）或单独的 `"*"`。不能写协议、端口或 IP 地址，`"*"` 不能和其他项同时出现。

## 入口

```js
export default globalThis.__tianshuTPI.defineTianshuPlugin({
  id: 'my-plugin',
  activate(host) {
    return {
      tools: [{
        name: 'exchange_rate',
        description: '查询两种货币的汇率',
        inputSchema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] },
        async execute({ args, cwd, signal }) {
          const response = await host.net.fetch(`https://api.example.com/rate?from=${args.from}&to=${args.to}`)
          if (response.status !== 200) return { content: `查询失败：${response.status}`, isError: true }
          return { content: response.body }
        },
      }],
      lifecycle: { async turnEnd(event) { /* event.signal 可用于取消 */ } },
      dispose() {},
    }
  },
})
```

`host` 的能力调用是异步的；`host.log.debug` 和 `host.log.warn` 不返回调用结果。清单里没有声明的能力，`host` 上就没有对应的成员；即使绕过去直接发调用，宿主也会拒绝。入口提供的工具必须和清单里声明的一一对应，否则插件不会接入会话。

插件启动超过 15 秒、单个生命周期阶段超过 10 秒会被终止。

### 各接口的限制

| 接口 | 限制 |
| --- | --- |
| `net.fetch` | 只允许 `https`，URL 不能带账号密码。每一跳重定向都重新核对主机名单，最多 5 跳。解析到内网、回环或链路本地地址的主机一律拒绝。方法限 GET、HEAD、POST、PUT、PATCH、DELETE。请求体和响应体各最多 2 MiB，超时 30 秒。不能设置 `host`、`cookie`、`proxy-authorization` 等传输类请求头。返回 `{ status, url, headers, body }`，`body` 是文本。 |
| `workspace.read` | 文本文件，最多 1 MiB。路径不能离开项目目录，也不能经链接离开。 |
| `workspace.list` | 最多 1000 项，返回 `{ name, type }`。 |
| `workspace.write` | 同样限制在项目目录内。只在工具调用期间可用，见下一节。 |
| `shell.run` | 默认超时 60 秒，最长 10 分钟。输出最多 1 MiB。返回 `{ exitCode, output }`。命令经天枢自己的命令工具执行，用户的禁用规则同样生效。只在工具调用期间可用。 |
| `models.complete` | 提示词最多 256 KiB。 |
| `sessions.messages` | 默认 50 条，最多 500 条。只有用户与助手的文字，不含工具调用和工具结果。 |
| `ui.setStatus` | 文字最多 120 个字符，传 `null` 清除。 |
| `ui.post`、页面消息 | 单条最多 256 KiB。 |

## 高风险操作怎样确认

清单里有 `shell.run` 或 `workspace.write` 的插件，它的每一次工具调用都会先让用户确认。自动审批档位、「始终允许」规则和已记住的批准都不会免除这次确认；只有用户把天枢设为跳过全部确认时才不问。确认框里显示的是工具名和调用参数，所以请让工具名和参数能说明它要做什么。

写文件和运行命令只在这样一次已确认的工具调用进行期间可用。命令经天枢自己的命令工具执行，用户的禁用规则照常生效。生命周期阶段、页面发来的消息、命令面板里的命令都不能写文件或运行命令，调用会得到「用户没有同意」的错误。需要这类操作时，请把它做成工具，由模型调用。

## 保存密钥

`host.secrets` 用来保存用户填给插件的密钥（比如第三方服务的 API key）。密钥放在插件目录之外，用天枢的密钥存储加密（有系统钥匙串时用钥匙串），按账号、按插件分开。插件进程读不到存放文件，只能按名字逐个取回。

名字匹配 `^[A-Za-z0-9._-]{1,64}$`，值最多 16 KiB，每个插件最多 64 个。不要把密钥写进数据目录或日志。

## 界面接口

界面贡献写在 `contributes.ui` 里，需要 `ui` 能力。

```json
"contributes": {
  "ui": {
    "views": [{ "id": "main", "title": "汇率面板", "entry": "views/main.html" }],
    "navigation": [{ "view": "main", "icon": "icon.svg" }],
    "panels": [{ "view": "main", "label": "汇率" }],
    "settings": [{ "view": "main" }],
    "commands": [{ "id": "refresh", "title": "刷新汇率" }, { "id": "open", "title": "打开汇率面板", "view": "main" }],
    "toolRenderers": [{ "tool": "exchange_rate", "view": "main" }],
    "statusItems": [{ "id": "rate", "view": "main" }],
    "themes": [{ "id": "day", "label": "晴日", "file": "themes/day.json" }]
  }
}
```

| 贡献项 | 出现的位置 | 数量上限 |
| --- | --- | --- |
| `views` | 被下面各项引用的页面。入口是包内的 `.html` 文件。 | 16 |
| `navigation` | 侧栏的「插件」分组，点开是整页。图标是包内的 `.svg` 或 `.png`。 | 4 |
| `panels` | 右侧面板的目录里，「插件」分组。 | 4 |
| `settings` | 设置 → 插件界面。 | 2 |
| `commands` | 命令面板。带 `view` 的打开页面；不带的交给插件进程的 `ui.onCommand(id)`。 | 32 |
| `toolRenderers` | 用页面显示本插件某个工具的结果。原始结果仍可一键展开。 | 16 |
| `statusItems` | 输入框下方的状态行。文字由 `host.ui.setStatus(id, text)` 设置。带 `view` 的可点击打开页面。 | 2 |
| `themes` | 设置 → 插件界面里的「加入主题库」。主题文件是天枢主题 JSON，加入前按主题令牌白名单校验。 | 8 |

所有引用的文件都必须在发行包里，并写进内容摘要表。工具结果页面只能绑定本插件自己声明的工具；如果工具名和天枢自带工具、MCP 工具或另一个插件的工具重名，这一项不会生效。

### 页面在哪里运行

每个页面在一个沙箱 iframe 里显示（只开放脚本），来源是插件专用的本机地址，和天枢的窗口不同源。页面读不到天枢的窗口、存储、Cookie 和令牌。页面上方始终有一行标明「插件内容」和插件名。

页面文件带有内容安全策略：

- 脚本只能来自本插件包内的文件，普通脚本和 ES 模块（`<script type="module">`）都可以。不能写内联脚本（`<script>…</script>` 和 `onclick="…"` 都不行），不能用 `eval`，也不能加载其他插件的脚本。
- 不能发起任何网络请求（`fetch`、`XMLHttpRequest`、WebSocket 都被禁止），不能加载包外的图片、字体、样式或框架，不能提交表单。
- 样式可以内联。图片、字体、音视频可以用包内文件或 `data:` 地址。

可用的文件类型：`.html`、`.js`、`.mjs`、`.css`、`.json`、`.svg`、`.png`、`.jpg`、`.jpeg`、`.webp`、`.gif`、`.woff`、`.woff2`、`.mp3`、`.mp4`、`.webm`。单个文件最多 32 MiB。页面里不能运行 WebAssembly；需要 WASM 时放在插件进程里。页面也用不了 `localStorage` 和 Cookie，要保存的状态请交给插件进程。

页面需要数据或联网时，发消息给插件进程，由插件进程经 `host` 去做。

### 页面与插件进程通信

页面一侧（`views/main.js`）：

```js
let nextId = 1
const pending = new Map()

window.addEventListener('message', event => {
  const data = event.data
  if (!data || data.tpi !== 'host') return
  if (data.type === 'hello') render(data.context)          // 页面就绪后的第一条消息
  if (data.type === 'push') update(data.message)           // 插件进程用 host.ui.post 推来的消息
  if (data.type === 'reply') {
    const waiter = pending.get(data.id)
    pending.delete(data.id)
    if (waiter) data.ok ? waiter.resolve(data.value) : waiter.reject(new Error(data.error))
  }
})

function ask(message) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    parent.postMessage({ tpi: 'view', type: 'post', id, message }, '*')
  })
}

parent.postMessage({ tpi: 'view', type: 'ready' }, '*')
parent.postMessage({ tpi: 'view', type: 'resize', height: document.body.scrollHeight }, '*')
```

插件进程一侧，在 `activate` 的返回值里加上：

```js
ui: {
  async onMessage(view, message) { return { rate: await loadRate(message) } },   // 返回值就是页面收到的 reply
  async onCommand(id) { if (id === 'refresh') await host.ui.post('main', { refreshed: true }) },
}
```

页面只能发这三种消息：`ready`、`post`、`resize`。其他形状的消息会被丢弃。`resize` 的高度上限是 4000。用作工具结果页面时，`hello` 里的 `context` 是 `{ tool, result, isError }`，过大的结果会被截短并带上 `truncated: true`。

插件没有运行时（还没有打开过会话），页面发消息会失败，命令面板里的命令会提示先打开会话。

### 改动天枢自带的界面

改动自带界面需要额外的权限，并且会在插件页面上标为高风险。

```json
"permissions": { "ui": { "overrides": true, "stylesheet": true } },
"contributes": {
  "ui": {
    "views": [{ "id": "board", "title": "任务看板", "entry": "views/board.html" }],
    "overrides": {
      "hide": ["nav:git"],
      "replace": [{ "target": "surface:mission", "view": "board" }],
      "stylesheet": "look.css"
    }
  }
}
```

`hide` 和 `replace` 只对下面这些目标生效，其他目标会被忽略：

- 侧栏入口：`nav:mission`、`nav:automations`、`nav:git`、`nav:insights`、`nav:cockpit`、`nav:delegation`、`nav:council`、`nav:hooks`、`nav:imageGen`、`nav:audio`、`nav:resonance`、`nav:monitor`
- 页面：`surface:mission`、`surface:automations`、`surface:insights`、`surface:cockpit`、`surface:monitor`

`hide` 最多 16 项，`replace` 最多 8 项。

`stylesheet` 是一份受限的样式表，只作用在侧栏、对话区和输入区，规则如下：

- 只能写平铺的规则 `选择器 { 属性: 值; }`。不能用任何 `@` 规则、嵌套、转义、`url()`、`!important`。
- 选择器只能由类名、标签名、属性选择器和这些伪类组成：`:hover`、`:focus`、`:focus-visible`、`:focus-within`、`:active`、`:disabled`、`:first-child`、`:last-child`。不能用伪元素，不能选 `html`、`body`、`iframe`。
- 属性只能是不会继承的外观属性：`background`、`background-color`、`background-image`、各 `border*`、`border-radius`、`box-shadow`、各 `outline*`、`backdrop-filter`、各 `transition*`，以及间距 `padding*`、`margin*`、`gap`、`row-gap`、`column-gap`。
- 间距只能是 `0`、`auto` 或不超过 64px（4rem、4em）的非负长度。
- 文件最多 64 KiB，最多 200 条规则，每条最多 24 个声明。

文字颜色和字体会继承到样式表作用范围之内的受保护区域，所以不在样式表里开放，请用主题来改。不符合规则的样式表在上传时就会被拒绝，并说明原因。

### 任何插件都不能改动的界面

登录、授权、付款、权限确认（审批卡片）、账号入口和插件中心不在可隐藏、可替换的目标里，样式表也作用不到它们。设置 → 插件界面会列出每个插件对界面做了哪些改动。

## 发行包大小

| 项目 | 上限 |
| --- | --- |
| ZIP 文件 | 100 MiB |
| 解压后总大小 | 400 MiB |
| 文件数 | 8192 |
| 单个 WASM 文件 | 64 MiB |

插件库目前接收的上传大小以开发者中心的提示为准（`/api/v1/tianshu/capabilities` 的 `limits.upload_bytes`；未核验发布者的首份发行包看 `limits.first_upload_bytes`，为 30 MiB）。超过 30 MiB 的发行包由对象存储分发。天枢安装时把发行包流式写入磁盘并边写边校验大小和摘要，不会把整个包读进内存。

## 付费未审核分区的限制

付费未审核分区里的 2.0 插件不能申请：

- `shell`
- `workspace.write`
- `net.hosts` 为 `"*"`
- `conversations.history`、`conversations.current`（也就是 `transcripts` 和 `sessions` 能力）
- `ui.overrides`、`ui.stylesheet`

并且和 1.0 一样，必须至少贡献一个工具，不能声明生命周期阶段。需要这些能力的插件请走官方审核分区。

## 上传时会检查什么

除了 [打包、发布与更新](publishing.md) 里的通用检查，2.0 发行包还会检查：

- 清单符合 2.0 规则，能力与权限成对。
- `compatibility.tpi` 与清单的 `$tpi` 一致，`compatibility.core` 只包含 4.0.5 以上的版本。
- 清单里引用的页面、图标、主题和样式表文件都在包里。
- 样式表符合上面的规则。
- 所选分区允许清单申请的能力。

插件页面会把权限写成用户能看懂的话，高风险项单独标出，并列出对界面的影响和安装包大小。
