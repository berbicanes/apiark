<p align="center">
  <img src="../../apps/desktop/src-tauri/icons/128x128@2x.png" alt="ApiArk" width="96" height="96" />
</p>

<h1 align="center">ApiArk</h1>

<p align="center">
  <strong>あなたのプライバシー、メモリ、Git ワークフローを尊重する API プラットフォーム。</strong>
</p>

<p align="center">
  ログイン不要。クラウド不要。無駄なし。
</p>

<p align="center">
  <em>Postman は 800 MB の RAM を使用。ApiArk はわずか 60 MB。</em>
</p>

<p align="center">
  <a href="https://github.com/berbicanes/apiark/releases/latest"><img src="https://img.shields.io/github/v/release/berbicanes/apiark?style=flat-square&color=6366f1" alt="最新リリース" /></a>
  <a href="https://github.com/berbicanes/apiark/releases/latest"><img src="https://img.shields.io/github/downloads/berbicanes/apiark/total?style=flat-square&color=22c55e" alt="ダウンロード数" /></a>
  <a href="https://github.com/berbicanes/apiark/stargazers"><img src="https://img.shields.io/github/stars/berbicanes/apiark?style=flat-square&color=eab308" alt="スター数" /></a>
  <a href="https://github.com/berbicanes/apiark/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/berbicanes/apiark/ci.yml?style=flat-square&label=CI" alt="CI" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/berbicanes/apiark?style=flat-square" alt="MIT ライセンス" /></a>
</p>

<p align="center">
  <a href="#ダウンロード">ダウンロード</a> &bull;
  <a href="#機能">機能</a> &bull;
  <a href="#postman-からの移行">Postman からの移行</a> &bull;
  <a href="#パフォーマンス">パフォーマンス</a> &bull;
  <a href="#コミュニティ">コミュニティ</a> &bull;
  <a href="#開発">開発</a>
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

## なぜ ApiArk なのか？

| | Postman | Bruno | Hoppscotch | **ApiArk** |
|---|---|---|---|---|
| **フレームワーク** | Electron | Electron | Tauri | **Tauri v2** |
| **メモリ使用量** | 300-800 MB | 150-300 MB | 50-80 MB | **約 60 MB** |
| **起動時間** | 10-30 秒 | 3-8 秒 | <2 秒 | **<2 秒** |
| **アカウント必須** | はい | いいえ | 任意 | **不要** |
| **データ保存** | クラウド | ファイルシステム | IndexedDB | **ファイルシステム (YAML)** |
| **Git 対応** | 不可 | 可 (.bru) | 不可 | **可（標準 YAML）** |
| **gRPC** | 対応 | 対応 | 非対応 | **対応** |
| **WebSocket** | 対応 | 非対応 | 対応 | **対応** |
| **SSE** | 対応 | 非対応 | 対応 | **対応** |
| **MQTT** | 非対応 | 非対応 | 非対応 | **対応** |
| **Mock サーバー** | クラウドのみ | 非対応 | 非対応 | **ローカル** |
| **モニター** | クラウドのみ | 非対応 | 非対応 | **ローカル** |
| **プラグインシステム** | 非対応 | 非対応 | 非対応 | **JS + WASM** |
| **プロキシキャプチャ** | 非対応 | 非対応 | 非対応 | **対応** |
| **レスポンス比較** | 非対応 | 非対応 | 非対応 | **対応** |

## ダウンロード

**[最新リリース](https://github.com/berbicanes/apiark/releases/latest)**

| プラットフォーム | ダウンロード |
|----------|----------|
| **Windows** | [`.exe` インストーラー](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.msi`](https://github.com/berbicanes/apiark/releases/latest) |
| **macOS** | [Apple Silicon `.dmg`](https://github.com/berbicanes/apiark/releases/latest) &bull; [Intel `.dmg`](https://github.com/berbicanes/apiark/releases/latest) |
| **Linux** | [`.AppImage`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.deb`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.rpm`](https://github.com/berbicanes/apiark/releases/latest) |

<details>
<summary><strong>パッケージマネージャー</strong></summary>

```bash
# Homebrew (macOS/Linux) — 近日公開
brew install --cask apiark

# Chocolatey (Windows) — 近日公開
choco install apiark

# Snap (Linux) — 近日公開
sudo snap install apiark

# AUR (Arch Linux) — 近日公開
yay -S apiark-bin
```

パッケージのメンテナンスに興味がありますか？[Issue を作成](https://github.com/berbicanes/apiark/issues/new)していただければ、一緒に取り組みます。
</details>

<details>
<summary><strong>ソースからビルド</strong></summary>

**前提条件：** Node.js 22+、pnpm 10+、Rust ツールチェーン、[Tauri v2 システム依存関係](https://v2.tauri.app/start/prerequisites/)

```bash
git clone https://github.com/berbicanes/apiark.git
cd apiark
pnpm install
pnpm tauri build
```
</details>

## Postman からの移行

1. Postman のコレクションをエクスポート（Collection v2.1 JSON）
2. ApiArk を開く
3. `Ctrl+K` > 「コレクションをインポート」 > ファイルを選択
4. 完了。リクエストはあなた自身が所有する YAML ファイルになりました。

以下からのインポートにも対応：**Insomnia**、**Bruno**、**Hoppscotch**、**OpenAPI 3.x**、**HAR**、**cURL**。

## 機能

**マルチプロトコル** — REST、GraphQL、gRPC、WebSocket、SSE、MQTT、Socket.IO を一つのアプリで。これほど幅広いプロトコルをカバーするツールは他にありません。

**ローカルファースト** — すべてのリクエストは `.yaml` ファイル。コレクションはディレクトリ。すべて Git diff 可能。独自フォーマットなし。

**ダークモード + テーマ** — ダーク、ライト、ブラック/OLED テーマと 8 種類のアクセントカラー。

**TypeScript スクリプト** — 完全な型定義付きのリクエスト前/後スクリプト。`ark.test()`、`ark.expect()`、`ark.env.set()`。

**コレクションランナー** — データ駆動テスト（CSV/JSON）でコレクション全体を実行。反復回数の設定や JUnit/HTML レポートに対応。

**ローカル Mock サーバー** — コレクションからモック API を作成。Faker.js データ、レイテンシシミュレーション、エラー注入。クラウド不要、使用制限なし。

**スケジュール監視** — cron ベースの自動テスト。デスクトップ通知と webhook アラートに対応。ローカルで動作し、他人のサーバーに依存しません。

**API ドキュメント生成** — コレクションから HTML + Markdown ドキュメントを生成。

**OpenAPI エディター** — Spectral 統合で OpenAPI 仕様を編集・検証。

**レスポンス比較** — 異なる実行間でレスポンスをサイドバイサイドで比較。

**プロキシキャプチャ** — トラフィックの検査とリプレイのためのローカル HTTP/HTTPS インターセプトプロキシ。

**AI アシスタント** — 自然言語からリクエスト生成、テスト自動生成、OpenAI 互換 API。

**プラグインシステム** — JavaScript または WASM プラグインで ApiArk を拡張。

**あらゆるフォーマットをインポート** — Postman、Insomnia、Bruno、Hoppscotch、OpenAPI、HAR、cURL。ワンクリックで移行。

## パフォーマンス

Tauri v2（Rust バックエンド + ネイティブ OS webview）で構築。Electron ではありません。

| 指標 | 目標値 |
|---|---|
| バイナリサイズ | 約 20 MB |
| アイドル時メモリ | 約 60 MB |
| コールドスタート | <2 秒 |
| リクエスト送信レイテンシ | <10ms オーバーヘッド |

## データフォーマット

あなたのデータはプレーンな YAML です。ベンダーロックインなし。独自エンコーディングなし。

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
# コレクションを実行
apiark run ./my-collection --env production

# データ駆動テスト
apiark run ./my-collection --data users.csv --reporter junit

# Postman コレクションをインポート
apiark import postman-export.json
```

## ロックインなしの誓約

> ApiArk を離れると決めたとき、あなたのデータも一緒に去ります。すべてのファイルは標準フォーマットです。すべてのデータベースはオープンです。乗り換えを困難にすることは決してしません。

## コミュニティ

- [Discord](https://discord.gg/apiark) — チャット、質問、フィードバック
- [Twitter / X](https://x.com/apiabordes) — アップデートとお知らせ
- [GitHub Discussions](https://github.com/berbicanes/apiark/discussions) — アイデア、Q&A、プロジェクト紹介
- [GitHub Issues](https://github.com/berbicanes/apiark/issues) — バグ報告と機能リクエスト

## 翻訳

ApiArk の UI は `react-i18next` による国際化に対応しています。現在は**英語**で利用可能です。

ApiArk をあなたの言語に翻訳するのを手伝ってください！[`locales/`](../../apps/desktop/src/locales/) ディレクトリを確認して PR を送ってください。

## 開発

```bash
# 依存関係をインストール
pnpm install

# 開発モードで実行
pnpm tauri dev

# TypeScript 型チェック
pnpm -C apps/desktop exec tsc --noEmit

# プロダクションビルド
pnpm tauri build
```

### プロジェクト構成

```
apiark/
├── apps/
│   ├── desktop/           # Tauri v2 デスクトップアプリ
│   │   ├── src/           # React フロントエンド
│   │   └── src-tauri/     # Rust バックエンド
│   ├── cli/               # CLI ツール (Rust)
│   ├── mcp-server/        # AI エディター向け MCP サーバー
│   └── vscode-extension/  # VS Code 拡張機能
├── packages/
│   ├── types/             # 共有 TypeScript 型定義
│   └── importer/          # コレクションインポーター
└── docs/                  # Documentation
```

### 技術スタック

**フロントエンド：** React 19、TypeScript、Vite 6、Zustand、Tailwind CSS 4、Monaco Editor、Radix UI

**バックエンド：** Rust、Tauri v2、reqwest、tokio、tonic (gRPC)、axum (Mock サーバー)、deno_core (スクリプトエンジン)

## コントリビュート

Contributions are welcome! Check out the [GitHub Issues](https://github.com/berbicanes/apiark/issues) for open tasks and feature requests.

<a href="https://github.com/berbicanes/apiark/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=berbicanes/apiark" alt="コントリビューター" />
</a>

## ライセンス

[MIT](../../LICENSE)

---

<p align="center">
  <sub>ApiArk があなたのワークフローを改善するなら、スターを付けてください。他の人がプロジェクトを見つける助けになります。</sub>
</p>
