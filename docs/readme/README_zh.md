<p align="center">
  <img src="../../apps/desktop/src-tauri/icons/128x128@2x.png" alt="ApiArk" width="96" height="96" />
</p>

<h1 align="center">ApiArk</h1>

<p align="center">
  <strong>尊重你的隐私、你的内存和你的 Git 工作流的 API 平台。</strong>
</p>

<p align="center">
  无需登录。无需云端。无多余负担。
</p>

<p align="center">
  <em>Postman 占用 800 MB 内存。ApiArk 仅需 60 MB。</em>
</p>

<p align="center">
  <a href="https://github.com/berbicanes/apiark/releases/latest"><img src="https://img.shields.io/github/v/release/berbicanes/apiark?style=flat-square&color=6366f1" alt="最新版本" /></a>
  <a href="https://github.com/berbicanes/apiark/releases/latest"><img src="https://img.shields.io/github/downloads/berbicanes/apiark/total?style=flat-square&color=22c55e" alt="下载量" /></a>
  <a href="https://github.com/berbicanes/apiark/stargazers"><img src="https://img.shields.io/github/stars/berbicanes/apiark?style=flat-square&color=eab308" alt="Star 数" /></a>
  <a href="https://github.com/berbicanes/apiark/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/berbicanes/apiark/ci.yml?style=flat-square&label=CI" alt="CI" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/berbicanes/apiark?style=flat-square" alt="MIT 许可证" /></a>
</p>

<p align="center">
  <a href="#下载">下载</a> &bull;
  <a href="#功能特性">功能特性</a> &bull;
  <a href="#从-postman-迁移">从 Postman 迁移</a> &bull;
  <a href="#性能">性能</a> &bull;
  <a href="#社区">社区</a> &bull;
  <a href="#开发">开发</a>
</p>

<p align="center">
  <a href="../../README.md">English</a> &bull;
  <a href="README_es.md">Espa&#241;ol</a> &bull;
  <a href="README_fr.md">Fran&#231;ais</a> &bull;
  <a href="README_de.md">Deutsch</a> &bull;
  <a href="README_pt.md">Portugu&#234;s</a> &bull;
  <a href="README_zh.md">&#20013;&#25991;</a> &bull;
  <a href="README_ja.md">&#26085;&#26412;&#35486;</a> &bull;
  <a href="README_ko.md">&#54620;&#44397;&#50612;</a> &bull;
  <a href="README_ar.md">&#1575;&#1604;&#1593;&#1585;&#1576;&#1610;&#1577;</a>
</p>

---

## 为什么选择 ApiArk？

| | Postman | Bruno | Hoppscotch | **ApiArk** |
|---|---|---|---|---|
| **框架** | Electron | Electron | Tauri | **Tauri v2** |
| **内存占用** | 300-800 MB | 150-300 MB | 50-80 MB | **约 60 MB** |
| **启动时间** | 10-30 秒 | 3-8 秒 | <2 秒 | **<2 秒** |
| **需要账号** | 是 | 否 | 可选 | **否** |
| **数据存储** | 云端 | 文件系统 | IndexedDB | **文件系统 (YAML)** |
| **Git 友好** | 否 | 是 (.bru) | 否 | **是（标准 YAML）** |
| **gRPC** | 是 | 是 | 否 | **是** |
| **WebSocket** | 是 | 否 | 是 | **是** |
| **SSE** | 是 | 否 | 是 | **是** |
| **MQTT** | 否 | 否 | 否 | **是** |
| **Mock 服务器** | 仅云端 | 否 | 否 | **本地** |
| **监控** | 仅云端 | 否 | 否 | **本地** |
| **插件系统** | 否 | 否 | 否 | **JS + WASM** |
| **代理抓包** | 否 | 否 | 否 | **是** |
| **响应对比** | 否 | 否 | 否 | **是** |

## 下载

**[最新版本](https://github.com/berbicanes/apiark/releases/latest)**

| 平台 | 下载 |
|----------|----------|
| **Windows** | [`.exe` 安装包](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.msi`](https://github.com/berbicanes/apiark/releases/latest) |
| **macOS** | [Apple Silicon `.dmg`](https://github.com/berbicanes/apiark/releases/latest) &bull; [Intel `.dmg`](https://github.com/berbicanes/apiark/releases/latest) |
| **Linux** | [`.AppImage`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.deb`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.rpm`](https://github.com/berbicanes/apiark/releases/latest) |

<details>
<summary><strong>包管理器</strong></summary>

```bash
# Homebrew (macOS/Linux) — 即将推出
brew install --cask apiark

# Chocolatey (Windows) — 即将推出
choco install apiark

# Snap (Linux) — 即将推出
sudo snap install apiark

# AUR (Arch Linux) — 即将推出
yay -S apiark-bin
```

有兴趣维护一个安装包吗？[创建一个 issue](https://github.com/berbicanes/apiark/issues/new)，我们会与你一起合作。
</details>

<details>
<summary><strong>从源码构建</strong></summary>

**前置条件：** Node.js 22+、pnpm 10+、Rust 工具链、[Tauri v2 系统依赖](https://v2.tauri.app/start/prerequisites/)

```bash
git clone https://github.com/berbicanes/apiark.git
cd apiark
pnpm install
pnpm tauri build
```
</details>

## 从 Postman 迁移

1. 导出你的 Postman 集合（Collection v2.1 JSON）
2. 打开 ApiArk
3. `Ctrl+K` > "导入集合" > 选择你的文件
4. 完成。你的请求现在是属于你自己的 YAML 文件了。

同样支持从以下工具导入：**Insomnia**、**Bruno**、**Hoppscotch**、**OpenAPI 3.x**、**HAR**、**cURL**。

## 功能特性

**多协议支持** — REST、GraphQL、gRPC、WebSocket、SSE、MQTT、Socket.IO 集于一身。没有任何工具拥有更广泛的协议覆盖。

**本地优先存储** — 每个请求都是一个 `.yaml` 文件。集合就是目录。一切都可以 Git diff。没有私有格式。

**深色模式 + 主题** — 深色、浅色、纯黑/OLED 主题，配备 8 种强调色。

**TypeScript 脚本** — 带完整类型定义的请求前/后脚本。`ark.test()`、`ark.expect()`、`ark.env.set()`。

**集合运行器** — 使用数据驱动测试（CSV/JSON）运行整个集合，可配置迭代次数，输出 JUnit/HTML 报告。

**本地 Mock 服务器** — 从你的集合创建模拟 API。Faker.js 数据、延迟模拟、错误注入。无需云端，无使用限制。

**定时监控** — 基于 cron 的自动化测试，支持桌面通知和 webhook 告警。在本地运行，而不是在别人的服务器上。

**API 文档生成** — 从你的集合生成 HTML + Markdown 文档。

**OpenAPI 编辑器** — 使用 Spectral 集成来编辑和校验 OpenAPI 规范。

**响应对比** — 在不同运行之间并排对比响应。

**代理抓包** — 本地拦截式 HTTP/HTTPS 代理，用于流量检查和重放。

**AI 助手** — 自然语言转请求、自动生成测试、兼容 OpenAI 的 API。

**插件系统** — 使用 JavaScript 或 WASM 插件扩展 ApiArk。

**导入一切** — Postman、Insomnia、Bruno、Hoppscotch、OpenAPI、HAR、cURL。一键迁移。

## 性能

基于 Tauri v2 构建（Rust 后端 + 原生 OS webview），而非 Electron。

| 指标 | 目标 |
|---|---|
| 二进制大小 | 约 20 MB |
| 空闲内存 | 约 60 MB |
| 冷启动 | <2 秒 |
| 请求发送延迟 | <10ms 开销 |

## 数据格式

你的数据是纯 YAML。无供应商锁定。无私有编码。

```yaml
# users/create-user.yaml
name: Create User
method: POST
url: "{{baseUrl}}/api/users"

headers:
  Content-Type: application/json

auth:
  type: bearer
  token: "{{adminToken}}"

body:
  type: json
  content: |
    {
      "name": "{{userName}}",
      "email": "{{userEmail}}"
    }

assert:
  status: 201
  body.id: { type: string }
  responseTime: { lt: 2000 }

tests: |
  ark.test("should return created user", () => {
    const body = ark.response.json();
    ark.expect(body).to.have.property("id");
  });
```

## CLI

```bash
# 运行一个集合
apiark run ./my-collection --env production

# 使用数据驱动测试
apiark run ./my-collection --data users.csv --reporter junit

# 导入 Postman 集合
apiark import postman-export.json
```

## 无锁定承诺

> 如果你决定离开 ApiArk，你的数据会随你一起走。每个文件都是标准格式。每个数据库都是开放的。我们永远不会让迁移变得困难。

## 社区

- [Discord](https://discord.gg/apiark) — 聊天、提问、分享反馈
- [Twitter / X](https://x.com/apiabordes) — 更新与公告
- [GitHub Discussions](https://github.com/berbicanes/apiark/discussions) — 创意、问答、项目展示
- [GitHub Issues](https://github.com/berbicanes/apiark/issues) — Bug 报告和功能请求

## 翻译

ApiArk 界面通过 `react-i18next` 支持国际化。目前提供**英语**版本。

帮助我们将 ApiArk 翻译成你的语言！请查看 [`locales/`](../../apps/desktop/src/locales/) 目录并提交 PR。

## 开发

```bash
# 安装依赖
pnpm install

# 以开发模式运行
pnpm tauri dev

# TypeScript 类型检查
pnpm -C apps/desktop exec tsc --noEmit

# 构建生产版本
pnpm tauri build
```

### 项目结构

```
apiark/
├── apps/
│   ├── desktop/           # Tauri v2 桌面应用
│   │   ├── src/           # React 前端
│   │   └── src-tauri/     # Rust 后端
│   ├── cli/               # CLI 工具 (Rust)
│   ├── mcp-server/        # 面向 AI 编辑器的 MCP 服务器
│   └── vscode-extension/  # VS Code 扩展
├── packages/
│   ├── types/             # 共享 TypeScript 类型
│   └── importer/          # 集合导入器
└── docs/                  # Documentation
```

### 技术栈

**前端：** React 19、TypeScript、Vite 6、Zustand、Tailwind CSS 4、Monaco Editor、Radix UI

**后端：** Rust、Tauri v2、reqwest、tokio、tonic (gRPC)、axum (Mock 服务器)、deno_core (脚本引擎)

## 贡献

Contributions are welcome! Check out the [GitHub Issues](https://github.com/berbicanes/apiark/issues) for open tasks and feature requests.

<a href="https://github.com/berbicanes/apiark/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=berbicanes/apiark" alt="贡献者" />
</a>

## 许可证

[MIT](../../LICENSE)

---

<p align="center">
  <sub>如果 ApiArk 改善了你的工作流，请给它一个 Star。这能帮助更多人发现这个项目。</sub>
</p>
