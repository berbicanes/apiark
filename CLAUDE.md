# APIARK — THE COMPLETE PRODUCT & ENGINEERING BLUEPRINT

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Competitive Landscape Analysis](#2-competitive-landscape-analysis)
3. [Market Opportunity & Positioning](#3-market-opportunity--positioning)
4. [Product Vision & Philosophy](#4-product-vision--philosophy)
5. [Feature Matrix — Full Inventory](#5-feature-matrix--full-inventory)
6. [Architecture & Tech Stack](#6-architecture--tech-stack)
7. [Data Model & Storage Format](#7-data-model--storage-format)
8. [UI/UX Design System](#8-uiux-design-system)
9. [Protocol Support — Deep Spec](#9-protocol-support--deep-spec)
10. [Scripting Engine & Sandbox](#10-scripting-engine--sandbox)
11. [Authentication System](#11-authentication-system)
12. [Testing & Assertions Framework](#12-testing--assertions-framework)
13. [CLI Tool — `apiark`](#13-cli-tool--apiark)
14. [Plugin / Extension System](#14-plugin--extension-system)
15. [Business Model & Pricing Strategy](#15-business-model--pricing-strategy)
16. [Development Roadmap — Phased](#16-development-roadmap--phased)
17. [Go-To-Market Strategy](#17-go-to-market-strategy)
18. [Development Guidelines & Conventions](#18-development-guidelines--conventions)
19. [Error Handling, Logging & Recovery](#19-error-handling-logging--recovery)
20. [File Watching & Conflict Resolution](#20-file-watching--conflict-resolution)
21. [YAML Format Versioning & Migration](#21-yaml-format-versioning--migration)
22. [Accessibility (a11y)](#22-accessibility-a11y)
23. [Internationalization (i18n)](#23-internationalization-i18n)
24. [Deep Links & URL Scheme](#24-deep-links--url-scheme)
25. [Scalability & Large Collection Handling](#25-scalability--large-collection-handling)
26. [Onboarding & First-Run Experience](#26-onboarding--first-run-experience)
27. [Licensing & Feature Gating](#27-licensing--feature-gating)
28. [Privacy Policy & Legal](#28-privacy-policy--legal)
29. [Auto-Save Strategy](#29-auto-save-strategy)
30. [Update Mechanism](#30-update-mechanism)
31. [Multi-Window Support](#31-multi-window-support)
32. [Data Portability & Exit Strategy](#32-data-portability--exit-strategy)
33. [Offline Behavior & Graceful Degradation](#33-offline-behavior--graceful-degradation)
34. [Undo/Redo System](#34-undoredo-system)
35. [Security Hardening (Tauri v2 Capabilities)](#35-security-hardening-tauri-v2-capabilities)
36. [Backup & State Export](#36-backup--state-export)
37. [Cookie Jar Management](#37-cookie-jar-management)
38. [Proxy Capture Mode](#38-proxy-capture-mode)

---

## 1. Executive Summary

**ApiArk** is a next-generation, local-first API development platform built with **Tauri v2 + React + TypeScript**. It is designed to be the definitive Postman replacement for developers who demand speed, privacy, and Git-native workflows.

### The Problem

- **Postman** (30M+ users, $5.6B valuation) has become bloated, cloud-dependent, and expensive. Forced logins, 300-800MB RAM usage, 10-30s startup times, and a 30,000-workspace data leak in 2024 have eroded trust.
- **Insomnia** destroyed its reputation in 2023 by forcing cloud sync without consent, losing user data, and uploading secrets to Kong's servers. Its original creator left and built a new tool (Yaak).
- **Bruno** (41K GitHub stars, 200K MAU) proved the demand for local-first, but it's still Electron-based, lacks mock servers, monitoring, and real-time collaboration.
- **Hoppscotch** (66K+ stars) is web-first with a Tauri desktop app, but lacks gRPC, mock servers, and mature testing.

### The Opportunity

No tool currently delivers ALL of these simultaneously:
1. Native-speed desktop app (not Electron)
2. Local-first, zero-login, git-native storage
3. Full protocol support (REST, GraphQL, gRPC, WebSocket, SSE, MQTT)
4. Enterprise-grade testing, mocking, and monitoring
5. AI-assisted development (intelligent, not gimmicky)
6. Plugin ecosystem for extensibility

**ApiArk will.**

### Key Metrics Targets (Year 1)

- 10,000+ GitHub stars
- 50,000+ downloads
- 5,000+ monthly active users
- Working MVP in 90 days
- Revenue-generating Pro tier in 180 days

---

## 2. Competitive Landscape Analysis

### 2.1 Postman — The Incumbent Giant

| Aspect | Detail |
|--------|--------|
| **Users** | 30M+ developers, 500K+ organizations, 98% Fortune 500 |
| **Revenue** | $313.1M (2024), up 82% YoY |
| **Valuation** | $5.6B (2021 Series D) |
| **Tech Stack** | Electron (Chromium + Node.js) |
| **RAM Usage** | 300-800MB baseline, reported spikes to 15-18GB |
| **Startup Time** | 10-30 seconds |
| **Download Size** | ~200MB+ |
| **Account Required** | Yes (forced since 2023) |
| **Data Storage** | Cloud-synced by default |

**Postman's Weaknesses (Our Attack Surface):**
1. Forced cloud sync / account requirement — privacy and compliance nightmare
2. Electron bloat — 200MB download, 300-800MB RAM, slow startup
3. 30,000-workspace data leak (Dec 2024) — trust destruction
4. Overwhelming UI — feature creep, upsell modals, marketing clutter
5. Pricing: Free plan reduced to 1 user (March 2026), $19/user/mo for teams
6. Scratchpad removal controversy (2023) — alienated offline-first developers
7. Proprietary data format — vendor lock-in
8. Usage-based AI credits — unpredictable costs

### 2.2 Competitive Matrix Summary

| Feature | Postman | Bruno | Insomnia | Hoppscotch | **ApiArk** |
|---------|---------|-------|----------|------------|------------|
| **App Framework** | Electron | Electron | Electron | Tauri | **Tauri v2** |
| **RAM Usage** | 300-800MB | 150-300MB | 200-400MB | 50-80MB | **Target: 50-100MB** |
| **Startup Time** | 10-30s | 3-8s | 3-8s | <2s (web) | **Target: <2s** |
| **Account Required** | Yes | No | Optional | Optional | **No** |
| **Data Storage** | Cloud | Filesystem | Cloud/Git | IndexedDB/PG | **Filesystem (Git)** |
| **REST** | Yes | Yes | Yes | Yes | **Yes** |
| **GraphQL** | Yes | Yes | Yes (best) | Yes | **Yes** |
| **gRPC** | Yes | Yes | Yes | No | **Yes** |
| **WebSocket** | Yes | Yes | Yes | Yes | **Yes** |
| **SSE** | Yes | No | Yes | Yes | **Yes** |
| **Mock Servers** | Yes (cloud) | No | Basic | No | **Yes (local)** |
| **Monitoring** | Yes (cloud) | No | No | No | **Yes (local)** |
| **Plugin System** | No | No | Yes (npm) | No | **Yes (WASM+JS)** |
| **CLI Tool** | Newman | bru CLI | inso | hopp | **apiark** |
| **Open Source** | No | MIT | MIT | MIT | **MIT (core)** |
| **Price (Team)** | $19/user/mo | $6/user/mo | $12-15/user/mo | Custom | **$8/user/mo** |

---

## 3. Market Opportunity & Positioning

### 3.1 Positioning Statement

> **ApiArk**: The API platform that respects your privacy, your RAM, and your Git workflow. Local-first. Native-speed. Zero login. Full power.

### 3.2 Key Differentiators

1. **Tauri v2 Native Performance**: 50-100MB RAM, <2s startup, 20-50MB download
2. **Filesystem-First with YAML**: Standard format, zero learning curve, fully git-diffable
3. **Local Mock Servers**: No cloud dependency, no usage limits
4. **Local Scheduled Testing**: Cron-based, desktop notifications, webhook alerts
5. **TypeScript-First Scripting**: Native TS in pre/post scripts with full type definitions
6. **WASM + JS Plugin System**: Plugins in JS (easy) or WASM (fast)
7. **Unified Multi-Protocol Tabs**: REST, GraphQL, gRPC, WebSocket, SSE in same interface

---

## 4. Product Vision & Philosophy

### 4.1 Core Principles

1. **Local-First, Always**: Your data stays on your machine. No accounts, no cloud sync, no telemetry.
2. **Native Speed**: Tauri v2 = Rust backend + native OS webview. Target: <100MB RAM, <2s startup.
3. **Standards Over Proprietary**: YAML for storage, OpenAPI for design, Git for collaboration.
4. **Progressive Complexity**: Simple things instant, complex things possible.
5. **Developer-Native UX**: IDE-like feel. Keyboard-first, command palette, split panes.
6. **Open Core**: MIT-licensed core with clear, fair boundary.

### 4.2 What We Will NOT Do

- No forced accounts (never)
- No cloud sync (Git-based only)
- No telemetry (opt-in crash reports only)
- No feature gating of core workflows
- No Electron
- No custom markup language (standard YAML)

---

## 5. Feature Matrix — Full Inventory

### Phase 1 — MVP (Days 1-90) — COMPLETE

**Core HTTP Client:**
- [x] URL bar with method selector (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- [x] Request body editor: JSON, XML, Form Data, URL-encoded, Raw Text, Binary, None
- [x] Headers editor (key-value table with enable/disable toggles, bulk edit)
- [x] Query parameters editor (key-value table with enable/disable toggles)
- [x] Path variables (`:paramName` in URL auto-detected)
- [x] Response viewer: Pretty (syntax-highlighted JSON/XML/HTML), Raw, Preview (HTML render)
- [x] Response metadata: status code (color-coded), response time (ms), response size (bytes/KB/MB)
- [x] Response headers viewer
- [x] Response cookies viewer
- [x] Copy response to clipboard, save response to file
- [x] cURL import (paste cURL -> auto-parse to request)
- [x] cURL export (any request -> copy as cURL)
- [x] Code generation (JavaScript fetch, Python requests, cURL)

**Collections & Organization:**
- [x] Create/rename/delete collections
- [x] Create/rename/delete folders (unlimited nesting)
- [x] Create/rename/delete/duplicate requests
- [x] Drag-and-drop reordering of requests and folders
- [x] Collection stored as directory on filesystem
- [x] Each request = one `.yaml` file
- [x] Collection config = `apiark.yaml` at collection root
- [x] Request search/filter across all collections

**Tabbed Interface:**
- [x] Multiple request tabs (like browser tabs)
- [x] Tab persistence across sessions
- [x] Unsaved changes indicator (dot on tab)
- [x] Close / Close Others / Close All
- [x] Tab reordering via drag-and-drop

**Environment Variables:**
- [x] Global environment (applies to all collections)
- [x] Collection-scoped environments
- [x] Multiple named environments per collection (dev, staging, prod)
- [x] One-click environment switching (dropdown in header)
- [x] Variable reference: `{{variableName}}` syntax
- [x] Variable quick-view (eye icon to peek current values)
- [x] Secret variables (masked in UI, excluded from Git)
- [x] `.env` file support (auto-load from collection root)
- [x] Environment files stored as `environments/*.yaml`

**Basic Authentication:**
- [x] None
- [x] Bearer Token
- [x] Basic Auth (username/password)
- [x] API Key (header or query parameter)
- [x] Auth inheritance (collection -> folder -> request)

**Request History:**
- [x] Auto-save every sent request to history
- [x] Searchable history
- [x] Restore request from history
- [x] Clear history

**Settings:**
- [x] Proxy configuration (HTTP/SOCKS)
- [x] SSL certificate verification toggle
- [x] Custom CA certificates
- [x] Client certificates (PFX, PEM)
- [x] Request timeout configuration
- [x] Follow redirects toggle
- [x] Theme: Light / Dark / System

**Keyboard Shortcuts:**
- [x] `Ctrl/Cmd + Enter` — Send request
- [x] `Ctrl/Cmd + N` — New request
- [x] `Ctrl/Cmd + T` — New tab
- [x] `Ctrl/Cmd + W` — Close tab
- [x] `Ctrl/Cmd + S` — Save request
- [x] `Ctrl/Cmd + E` — Switch environment
- [x] `Ctrl/Cmd + K` — Command palette
- [x] `Ctrl/Cmd + L` — Focus URL bar
- [x] `Ctrl/Cmd + ,` — Settings
- [x] `Ctrl/Cmd + \` — Toggle sidebar

### Phase 2 — Power Features (Days 91-180) — IN PROGRESS

**Advanced Authentication:**
- [x] OAuth 2.0 (Authorization Code, Client Credentials, Implicit, Password, PKCE)
- [x] Digest Auth
- [x] AWS Signature v4
- [x] NTLM
- [x] JWT Bearer (built-in JWT generation)

**Scripting Engine:**
- [x] Pre-request scripts (JavaScript/TypeScript)
- [x] Post-response scripts (JavaScript/TypeScript)
- [x] `ark` API object (request, response, env, globals, variables, test, expect, sendRequest, visualize, utils, info)
- [x] Built-in libraries: Chai.js, CryptoJS, Lodash, Ajv, Faker, moment
- [x] Script editor with auto-complete and type hints

**Testing & Assertions:**
- [x] Declarative assertions in YAML
- [x] JavaScript/TypeScript test blocks with Chai.js
- [x] Test results panel
- [x] Response time assertions

**Collection Runner:**
- [x] Run all requests in a collection/folder sequentially
- [x] Configurable delay between requests
- [x] Iteration count, data-driven testing (CSV/JSON/YAML)
- [x] Results summary with pass/fail breakdown
- [x] Export results as JSON/JUnit XML/HTML

**GraphQL Support:**
- [x] Schema introspection, auto-complete, variables, schema explorer

**WebSocket Support:**
- [x] Connection management, send/receive, message log, auto-reconnect

**SSE (Server-Sent Events):**
- [x] Connect, real-time event stream viewer, event type filtering

**Import/Export:**
- [x] Import from Postman, Bruno, Insomnia, OpenAPI
- [x] Import from Hoppscotch, HAR
- [x] Import from cURL
- [x] Export to Postman, OpenAPI
- [x] Export to ApiArk YAML

**CLI Tool (`apiark`):**
- [x] `apiark run`, `apiark import`, `apiark export`
- [x] Reporters: json, junit, html
- [x] npm package: `@apiark/cli`

**Auto-Save (§29):**
- [x] Debounced 1s auto-save for saved requests (atomic write)
- [x] Unsaved-on-quit dialog for new requests
- [x] `Ctrl+S` forces immediate save
- [x] Auto-save failure banner with retry

**Undo/Redo (§34):**
- [x] Per-tab undo/redo stack (100 depth) for request editing
- [x] Global collection tree undo stack (20 depth) for delete/rename/move
- [x] Soft delete trash UI (browse/restore from `~/.apiark/trash/`)
- [x] Context-aware `Ctrl+Z` (tab editor vs collection tree)

**File Watching (§20):**
- [x] `notify` crate for watching collection directories
- [x] Debounced (300ms) external change detection
- [x] Auto-reload for unchanged tabs, conflict banner for dirty tabs
- [x] Git merge conflict marker detection

**Onboarding (§26):**
- [x] Welcome screen (start from scratch / import / open folder)
- [x] Sample collection with example requests (httpbin.org)
- [x] Contextual hints (dismissible, shown once)
- [x] Empty states with action buttons for all panels

**Error Handling & Logging (§19):**
- [x] `tracing` log rotation (daily, 7 days / 50MB max)
- [x] SQLite integrity check on startup with auto-recovery
- [x] Opt-in crash report banner (local JSON files)
- [x] In-app Console panel (bottom bar) for logs and script output
- [x] Categorized network errors with suggestions

**Scalability (§25):**
- [x] Virtual scrolling for collection tree and history (TanStack Virtual)
- [x] Lazy loading — parse request YAML only when tab opens
- [x] Response body >1MB truncated with temp file and "Load full response" button
- [x] Background YAML parsing on Rust thread (skeleton UI during load)
- [x] In-memory fuzzy search index for collections

**Cookie Jar Management (§37):**
- [x] Cookie viewer/editor UI in response panel and sidebar
- [x] Per-collection isolated cookie jars
- [x] Persistent cookie mode (opt-in per collection)
- [x] Per-request cookie override in YAML
- [x] Collection-level sendCookies/storeCookies toggles

### Phase 3 — Enterprise Features (Days 181-365)

**Core Enterprise Features:**
- [x] gRPC support (proto loading, reflection, all call types)
- [x] Local mock servers (axum-based, Faker.js, latency/error simulation)
- [x] Local scheduled testing (cron, notifications, webhooks, charts)
- [x] API documentation generation (HTML + Markdown export)
- [x] OpenAPI spec editor with Spectral linting
- [ ] Plugin system (JS + WASM)
- [ ] MQTT, Socket.IO support
- [x] Response diff
- [x] Performance profiling

**Proxy Capture Mode (§38):**
- [ ] Local intercepting HTTP/HTTPS proxy (hyper + rcgen + rustls)
- [ ] Real-time traffic log with filtering (domain, method, status, regex)
- [ ] Save captured request to collection / replay / edit & replay
- [ ] Local CA certificate generation for HTTPS interception
- [ ] Passthrough domains configuration

**Security Hardening (§35):**
- [x] Tauri v2 capability-based permissions (main-window.json)
- [x] Content Security Policy (no eval, no remote scripts)
- [x] Secret redaction in history (`[REDACTED]` for auth tokens)
- [x] IPC command allowlist (no arbitrary shell/fs access)
- [x] `cargo audit` + `pnpm audit` in CI

**Accessibility (§22):**
- [x] WCAG 2.1 Level AA compliance
- [x] Full keyboard navigation (tab order, arrow keys in tree, focus indicators)
- [x] Screen reader support (ARIA roles, live regions, method/status announcements)
- [x] `prefers-reduced-motion` and `prefers-contrast` support
- [ ] axe-core in CI for automated a11y audits

**YAML Format Versioning (§21):**
- [x] Migration system with chained version functions (v1→v2→v3)
- [x] Upgrade dialog with read-only fallback
- [x] Deprecated field support for 2 major versions
- [x] Migration code in `storage/migration.rs`

**Update Mechanism (§30):**
- [x] Tauri v2 updater plugin with signed manifests
- [x] Stable / Beta / Nightly update channels
- [x] Non-blocking update banner (never auto-install)
- [ ] Rollback system (keep last 3 binaries)
- [ ] Code signing (macOS, Windows, Linux GPG)

**Internationalization (§23):**
- [x] `react-i18next` with JSON locale files
- [x] All UI strings via `t('key')` (English-only initially)
- [ ] `Intl.DateTimeFormat` / `Intl.NumberFormat` for formatting
- [x] CSS logical properties for future RTL support
- [ ] Community translation via Weblate/Crowdin

**Licensing & Feature Gating (§27):**
- [x] Signed JWT license keys (offline validation)
- [x] 14-day grace period after expiry
- [x] Pro tier: mock servers, monitors, docs gen, response diff
- [x] Team tier: Git UI, team env sharing, SSO/SAML, audit logs

**Data Portability (§32):**
- [x] Schema documentation (`docs/schema.md`) with JSON Schema definitions
- [x] No Lock-In Pledge on website and README

**Backup & State Export (§36):**
- [x] Export app state as .zip (settings, window state, history)
- [x] Import app state from .zip with merge
- [x] Document manual sync approaches (symlink, dotfiles repo)

**Multi-Window (§31):**
- [x] Tauri v2 multi-window API (`Ctrl+Shift+N`)
- [ ] Drag tab to detach into new window
- [x] Shared collection/environment state across windows via Tauri events
- [ ] Window state persistence (positions, sizes, tabs per window)

### Phase 4 — AI & Ecosystem (Year 2)

- [ ] AI assistant (natural language -> requests, auto-test generation)
- [ ] MCP server for AI editor integration
- [ ] VS Code extension, JetBrains plugin
- [ ] GitHub Action, GitLab CI template
- [ ] Plugin marketplace, auto-updater

**Deep Links (§24):**
- [ ] `apiark://` custom URL scheme via Tauri deep-link plugin
- [ ] OAuth callback via `apiark://oauth/callback`
- [ ] Collection sharing links (`apiark://import?url=...`)
- [ ] Open specific request links (`apiark://open?collection=...&request=...`)

**Privacy & Legal (§28):**
- [ ] Privacy policy at `apiark.dev/privacy`
- [ ] Terms of service at `apiark.dev/terms`
- [ ] SECURITY.md with responsible disclosure process
- [ ] GDPR compliance documentation

**Offline Behavior (§33):**
- [ ] Explicit graceful degradation for OAuth (cached tokens work offline)
- [ ] Webhook failures handled silently in scheduled testing
- [ ] Plugin install requires network; installed plugins work offline
- [ ] GraphQL/gRPC schema cached locally after first fetch

---

## 6. Architecture & Tech Stack

### 6.1 Application Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Request  │ │ Response │ │Collection│ │Environment│  │
│  │ Builder  │ │ Viewer   │ │ Manager  │ │ Manager   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│                                                          │
│  State: Zustand  │  UI: Tailwind + shadcn/ui            │
│  Editor: Monaco  │  Routing: TanStack Router             │
└──────────────────────┬──────────────────────────────────┘
                       │ Tauri IPC (invoke commands)
┌──────────────────────┴──────────────────────────────────┐
│                   BACKEND (Rust / Tauri v2)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │  HTTP    │ │   File   │ │  Script  │ │   Mock    │  │
│  │  Engine  │ │  System  │ │  Engine  │ │  Server   │  │
│  │ (reqwest)│ │  (tokio) │ │ (deno)   │ │ (axum)    │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Tech Stack

**Frontend:**
| Component | Technology |
|-----------|------------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 6 |
| State Management | Zustand |
| UI Components | shadcn/ui + Radix |
| Styling | Tailwind CSS 4 |
| Code Editor | Monaco Editor |
| Routing | TanStack Router |
| Icons | Lucide React |
| Form Handling | React Hook Form + Zod |
| Drag & Drop | dnd-kit |
| Virtualization | TanStack Virtual |
| Charts | Recharts |

**Backend (Rust):**
| Component | Crate |
|-----------|-------|
| App Framework | tauri v2 |
| HTTP Client | reqwest |
| Async Runtime | tokio |
| YAML Parsing | serde + serde_yaml |
| JSON Parsing | serde_json |
| gRPC Client | tonic |
| WebSocket | tokio-tungstenite |
| Mock Server | axum |
| Script Engine | deno_core |
| WASM Runtime | wasmtime |
| Scheduler | tokio-cron-scheduler |
| Database | rusqlite (SQLite) |
| CLI | clap |

### 6.3 Project Structure

```
apiark/
├── CLAUDE.md                           # This file — master reference
├── LICENSE                             # MIT License
├── README.md
├── package.json                        # Root workspace package.json
├── pnpm-workspace.yaml
├── turbo.json
│
├── apps/
│   ├── desktop/                        # Tauri v2 desktop application
│   │   ├── src-tauri/                  # Rust backend
│   │   │   ├── Cargo.toml
│   │   │   ├── tauri.conf.json
│   │   │   ├── capabilities/
│   │   │   ├── src/
│   │   │   │   ├── main.rs
│   │   │   │   ├── lib.rs
│   │   │   │   ├── commands/           # Tauri IPC command handlers
│   │   │   │   │   ├── mod.rs
│   │   │   │   │   ├── http.rs
│   │   │   │   │   ├── collection.rs
│   │   │   │   │   ├── environment.rs
│   │   │   │   │   └── settings.rs
│   │   │   │   ├── http/               # HTTP engine (reqwest wrapper)
│   │   │   │   │   ├── mod.rs
│   │   │   │   │   ├── client.rs
│   │   │   │   │   ├── request.rs
│   │   │   │   │   ├── response.rs
│   │   │   │   │   └── cookies.rs
│   │   │   │   ├── storage/            # File system + SQLite
│   │   │   │   │   ├── mod.rs
│   │   │   │   │   ├── collection.rs
│   │   │   │   │   ├── environment.rs
│   │   │   │   │   ├── history.rs
│   │   │   │   │   └── settings.rs
│   │   │   │   └── models/             # Shared Rust data models
│   │   │   │       ├── mod.rs
│   │   │   │       ├── request.rs
│   │   │   │       ├── response.rs
│   │   │   │       ├── collection.rs
│   │   │   │       ├── environment.rs
│   │   │   │       └── auth.rs
│   │   │   └── icons/
│   │   ├── src/                        # React frontend source
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── routes/
│   │   │   ├── components/
│   │   │   │   ├── ui/                 # shadcn/ui base components
│   │   │   │   ├── request/            # Request builder
│   │   │   │   ├── response/           # Response viewer
│   │   │   │   ├── collection/         # Collection sidebar
│   │   │   │   ├── environment/        # Environment management
│   │   │   │   ├── tabs/               # Tab management
│   │   │   │   ├── settings/           # Settings panels
│   │   │   │   └── layout/             # Layout components
│   │   │   ├── stores/                 # Zustand stores
│   │   │   ├── hooks/                  # Custom React hooks
│   │   │   ├── lib/                    # Utility functions
│   │   │   ├── types/                  # TypeScript type definitions
│   │   │   └── styles/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   └── components.json            # shadcn/ui config
│   │
│   └── cli/                           # CLI application
│       ├── Cargo.toml
│       └── src/
│           ├── main.rs
│           ├── runner.rs
│           ├── reporter.rs
│           └── import.rs
│
├── packages/
│   ├── types/                         # Shared TypeScript types
│   │   ├── package.json
│   │   └── src/
│   └── importer/                      # Collection importers
│       ├── package.json
│       └── src/
│
└── .github/
    └── workflows/
        ├── ci.yml
        ├── release.yml
        └── nightly.yml
```

---

## 7. Data Model & Storage Format

### 7.1 Design Principles

1. **YAML everywhere**: Human-readable, git-diffable, widely understood
2. **One file per request**: Each API request = single `.yaml` file
3. **Directory = Collection**: Folder structure on disk IS the collection structure
4. **Secrets separate**: Secret variables in `.env` files, gitignored
5. **Minimal metadata**: No UUIDs, no timestamps. File path IS the identifier

### 7.2 Collection Structure on Disk

```
my-api-project/
├── .apiark/
│   ├── apiark.yaml                     # Collection configuration
│   ├── .env                            # Secrets (gitignored)
│   ├── .gitignore
│   └── environments/
│       ├── development.yaml
│       ├── staging.yaml
│       └── production.yaml
├── users/
│   ├── _folder.yaml                    # Folder-level config (optional)
│   ├── get-all-users.yaml
│   ├── create-user.yaml
│   └── auth/
│       ├── login.yaml
│       └── refresh-token.yaml
└── products/
    ├── list-products.yaml
    └── create-product.yaml
```

### 7.3 Request File Format

```yaml
name: Create User
method: POST
url: "{{baseUrl}}/api/users"
description: Creates a new user account.

headers:
  X-Request-ID: "{{$uuid}}"

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

preRequestScript: |
  ark.env.set("userName", `User_${Date.now()}`);

postResponseScript: |
  const body = ark.response.json();
  if (body.id) ark.env.set("createdUserId", body.id);

examples:
  - name: Success Response
    status: 201
    headers:
      Content-Type: application/json
    body: |
      {"id": "usr_abc123", "name": "John Doe"}
```

### 7.4 Environment File Format

```yaml
name: Development
variables:
  baseUrl: http://localhost:3000
  apiKey: dev-key-12345
secrets:
  - accessToken     # Value stored in .env file
  - adminToken
```

### 7.5 Built-in Dynamic Variables

| Variable | Description |
|----------|-------------|
| `{{$uuid}}` | Random UUID v4 |
| `{{$timestamp}}` | Unix timestamp (seconds) |
| `{{$timestampMs}}` | Unix timestamp (milliseconds) |
| `{{$isoTimestamp}}` | ISO 8601 timestamp |
| `{{$randomInt}}` | Random integer 0-1000 |
| `{{$randomFloat}}` | Random float 0-1 |
| `{{$randomString}}` | Random 16-char alphanumeric |
| `{{$randomEmail}}` | Random email |

---

## 8. UI/UX Design System

### 8.1 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] ApiArk    [Env: Development ▾]    [Settings] [Theme]   │
├────────────┬────────────────────────────────────────────────────┤
│            │  [Tab1: GET Users] [Tab2: POST Create] [+]         │
│  SIDEBAR   ├────────────────────────────────────────────────────┤
│            │  [GET ▾] [https://api.example.com/users___] [Send] │
│ Collections│  ┌─────────────────────────────────────────────────┤
│  ├─ Users  │  │ [Params] [Headers] [Body] [Auth] [Scripts]     │
│  │ ├─ GET  │  │                                                 │
│  │ └─ POST │  │  Key     │ Value    │ Enabled                   │
│  ├─Products│  │  page    │ 1        │ Yes                       │
│            │  ├─────────────────────────────────────────────────┤
│ Environ.   │  │ RESPONSE  [200 OK] [245ms] [1.2KB]             │
│ History    │  │ [Body] [Headers] [Cookies] [Tests] [Timing]    │
│            │  │  { "users": [...] }                             │
├────────────┴──┴─────────────────────────────────────────────────┤
│  [Console]           [Cmd+K: Command Palette]                    │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Color System (Dark Theme Default)

- Background: `#0a0a0b`
- Surface: `#141416`
- Elevated: `#1c1c1f`
- Border: `#2a2a2e`
- Text Primary: `#e4e4e7`
- Text Secondary: `#a1a1aa`
- Accent: `#3b82f6` (blue)
- Success: `#22c55e` (green — 2xx, pass)
- Warning: `#eab308` (yellow — 3xx)
- Error: `#ef4444` (red — 4xx/5xx, fail)
- Method Colors: GET `#22c55e`, POST `#eab308`, PUT `#3b82f6`, PATCH `#a855f7`, DELETE `#ef4444`, HEAD `#06b6d4`, OPTIONS `#6b7280`

---

## 9. Scripting Engine — `ark` API

```typescript
// ark.request (pre-request: read/write, post-response: read-only)
ark.request.url / .method / .headers / .body
ark.request.setUrl() / .setMethod() / .setHeader() / .removeHeader() / .setBody()

// ark.response (post-response only)
ark.response.status / .statusText / .headers / .cookies / .body / .time / .size
ark.response.json() / .text()

// ark.env / ark.globals / ark.variables
ark.env.get(key) / .set(key, value) / .unset(key) / .toObject()

// ark.test / ark.expect
ark.test(name, fn)
ark.expect(value) // Chai.js assertions

// ark.sendRequest(config) -> Promise<Response>
// ark.visualize(template, data)
// ark.utils.uuid() / .timestamp() / .base64Encode() / .sha256() / .hmac()
// ark.info.requestName / .collectionName / .environment / .iteration
```

### Script Execution Order

```
1. Collection pre-request script
2. Folder pre-request script
3. Request pre-request script
4. ──── HTTP REQUEST SENT ────
5. Request post-response script
6. Folder post-response script
7. Collection post-response script
8. Declarative assertions (assert block)
9. JavaScript tests (tests block)
```

---

## 10. Authentication System

### Auth Inheritance

```
Collection auth (default) -> Folder auth (override) -> Request auth (override)
```

**Phase 1:** None, Bearer Token, Basic Auth, API Key
**Phase 2:** OAuth 2.0 (all grants + PKCE), Digest, AWS Sig v4, NTLM, JWT Bearer

---

## 11. Declarative Assertions

```yaml
assert:
  status: 200
  body.users.length: { gt: 0 }
  body.users[0].email: { matches: "^.+@.+$" }
  headers.content-type: { contains: "application/json" }
  responseTime: { lt: 2000 }
```

**Operators:** eq, neq, gt, gte, lt, lte, in, notIn, contains, notContains, matches, type, exists, length, schema

---

## 12. CLI Tool — `apiark`

```bash
apiark run <collection>              # Run collection
apiark run --env <name>              # With environment
apiark run --data <file>             # Data-driven testing
apiark run --reporter json|junit|html
apiark import <file> --format postman|insomnia|openapi
apiark export <collection> --format postman
apiark lint <collection>
apiark mock <collection> --port 4000
```

Exit codes: 0 = pass, 1 = failures, 2 = not found, 3 = invalid config, 4 = network error

---

## 13. Development Guidelines & Conventions

### Code Standards

**Rust:**
- `rustfmt` defaults, `clippy` with `warn` level
- `thiserror` for library errors, `anyhow` for application errors
- Async by default (tokio), all Tauri commands return `Result<T, String>`

**TypeScript/React:**
- ESLint + Prettier
- Functional components only, hooks for state/effects
- Zustand stores in `/stores/`, types in `/types/`
- No `any` unless absolutely necessary
- File naming: `kebab-case.tsx` for components, `camelCase.ts` for utilities
- Component naming: PascalCase, one component per file

**Git:**
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Branch naming: `feat/description`, `fix/description`
- Main branch: `main`, no force-push to `main`

### Performance Budgets

| Metric | Target | Hard Limit |
|--------|--------|------------|
| Binary size | 20MB | 50MB |
| RAM at idle | 50MB | 100MB |
| Startup time | 1s | 3s |
| Request send latency | <10ms | <50ms |
| UI interaction response | <16ms (60fps) | <33ms (30fps) |

---

## 14. Development Roadmap Summary

### Phase 1: MVP (Days 1-90) — COMPLETE
- **Week 1-2:** Project setup (Tauri v2 + React + TS + Vite + Tailwind + shadcn/ui + Rust workspace + CI/CD)
- **Week 3-4:** HTTP engine (reqwest, timing, cookies, proxy, TLS)
- **Week 5-6:** Request builder UI (URL bar, params, headers, body, auth, send)
- **Week 7-8:** Response viewer + collections (filesystem-backed tree, CRUD, drag-drop)
- **Week 9-10:** Environments + tabs + history (YAML envs, variable interpolation, SQLite history)
- **Week 11-12:** Polish + alpha release (command palette, shortcuts, settings, themes, code gen)

### Phase 2: Power Features (Days 91-180) — IN PROGRESS
- **Month 4:** ~~Scripting + testing (rquickjs, ark API, assertions, Chai-like expect)~~ — DONE
- **Month 5:** ~~Protocols + runner (GraphQL, WebSocket, SSE, collection runner)~~ — DONE
- **Month 6:** ~~Import/export (Postman, Insomnia, Bruno, OpenAPI)~~ + ~~OAuth 2.0~~ — DONE
- **Month 6 remaining:** CLI tool (`apiark`), advanced auth (Digest, AWS Sig v4, NTLM, JWT Bearer)
- **Month 6 polish:** Auto-save (§29), undo/redo (§34), file watching (§20), onboarding (§26), error handling & logging (§19), scalability (§25), cookie jar UI (§37)

### Phase 3: Enterprise (Days 181-365)
- gRPC, mock servers, monitoring, docs generation, OpenAPI editor, plugin system
- Proxy capture mode (§38), security hardening (§35), accessibility (§22)
- YAML versioning & migration (§21), update mechanism (§30), i18n (§23)
- Licensing & feature gating (§27), backup & state export (§36), multi-window (§31), data portability docs (§32)

### Phase 4: AI & Ecosystem (Year 2)
- AI assistant, MCP server, IDE extensions, marketplace
- Deep links (§24), privacy & legal (§28), offline behavior hardening (§33)

---

## 19. Error Handling, Logging & Recovery

### 19.1 Crash Reporting

- **No telemetry by default.** Zero data leaves the machine unless the user explicitly opts in.
- **Opt-in crash reports**: On first launch, a non-modal banner offers: _"Help improve ApiArk by sending anonymous crash reports?"_ Default: **No**.
- If opted in, reports contain: stack trace, OS/version, app version, anonymized error context. **Never** request URLs, headers, bodies, env variables, or secrets.
- Crash reports stored locally in `~/.apiark/crash-reports/` as JSON files. User can inspect/delete them at any time.
- Phase 1: Local crash log files only. Phase 3+: Optional remote reporting via self-hostable endpoint (no third-party services like Sentry).

### 19.2 Application Logging

- **Rust backend**: `tracing` crate with structured logging. Levels: `error`, `warn`, `info`, `debug`, `trace`.
- **Frontend**: Minimal `console.*` in development; no production logging to avoid DevTools noise.
- Log output: `~/.apiark/logs/apiark.log`, rotated daily, max 7 days / 50MB.
- Log level configurable in settings (default: `info` in release, `debug` in dev).
- In-app Console panel (bottom bar) shows request execution logs, script output, and errors.

### 19.3 SQLite Recovery

- History, settings, and monitor results are stored in SQLite at `~/.apiark/data.db`.
- On startup, run `PRAGMA integrity_check`. If corruption detected:
  1. Log the error.
  2. Rename corrupt DB to `data.db.corrupt.{timestamp}`.
  3. Create a fresh DB.
  4. Show a non-blocking toast: _"History database was reset due to corruption. Old data saved as backup."_
- SQLite WAL mode enabled for crash resilience.
- Collections and environments are YAML on disk — not affected by DB issues.

### 19.4 Rust Error Strategy

- **Tauri commands**: Return `Result<T, String>` per Tauri convention. Frontend displays error in toast/inline.
- **Internal errors**: Use `thiserror` for typed errors within modules, `anyhow` at the application boundary.
- **Panics**: Global panic hook catches, logs stack trace, shows user-friendly dialog: _"Something went wrong. The app will restart."_
- **Network errors**: Categorize into: timeout, DNS failure, connection refused, TLS error, HTTP error. Show specific message + suggestion (e.g., "Connection refused — is the server running?").

---

## 20. File Watching & Conflict Resolution

### 20.1 File Watcher

- Use `notify` crate (Rust) to watch collection directories for external changes.
- **Debounce**: 300ms window — batch rapid file changes (e.g., `git checkout` touching many files).
- **Events watched**: Create, Modify, Delete, Rename.
- On external change:
  - If the file is **not open in a tab**: Silently update the collection tree.
  - If the file **is open in a tab with no unsaved changes**: Auto-reload content, show brief toast _"File updated externally"_.
  - If the file **is open in a tab with unsaved changes**: Show conflict banner at top of editor: _"This file was changed externally. [Reload] [Keep Mine] [Diff]"_.
  - If the file is **deleted externally**: Mark tab as orphaned with warning banner: _"This file was deleted. [Save As] [Close]"_.

### 20.2 Git Merge Conflicts

- ApiArk does **not** manage Git. Users use their own Git tools (CLI, VS Code, etc.).
- YAML files are designed to minimize merge conflicts: one file per request, flat structure, no auto-generated IDs.
- If a YAML file contains Git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`), detect on load and show: _"This file has merge conflicts. Please resolve them in your editor or Git tool."_ Do not attempt to parse the file.

### 20.3 Concurrent Write Safety

- All file writes from ApiArk use **atomic write**: write to `.tmp` file, then `rename()` to target. Prevents partial writes on crash.
- File saves are serialized per-collection (no two saves to the same collection directory at the same time).

---

## 21. YAML Format Versioning & Migration

### 21.1 Version Field

Every `apiark.yaml` collection config includes a `version` field:
```yaml
name: My API
version: 1
```

Request files inherit the collection version. No version field in individual request YAML files.

### 21.2 Migration Strategy

- **Forward-compatible by default**: New fields added to the schema are optional. Old files without them work fine.
- **Breaking changes** (field renames, structural changes) bump the version number.
- On loading a collection with an older version:
  1. Show dialog: _"This collection uses format v{old}. Upgrade to v{new}? [Upgrade] [Open Read-Only]"_
  2. On upgrade: Run migration function, rewrite all affected files, commit message suggested: _"chore: upgrade apiark collection format to v{new}"_
  3. On read-only: Load with best-effort parsing, disable editing.
- **Migration functions** are versioned and chained: v1→v2, v2→v3, etc. Each is a pure function: `(oldYaml) → newYaml`.
- **Never auto-migrate without user consent.** User's Git history matters.
- Migration code lives in `src-tauri/src/storage/migration.rs`.

### 21.3 Deprecation Policy

- Deprecated fields supported for 2 major versions with console warnings.
- Removed fields cause a migration prompt, not a hard error.

---

## 22. Accessibility (a11y)

### 22.1 Standards

- Target **WCAG 2.1 Level AA** compliance.
- All interactive elements must be keyboard-accessible.
- All UI components must have appropriate ARIA roles, labels, and states.
- shadcn/ui + Radix primitives provide built-in a11y (focus management, screen reader announcements, keyboard navigation) — leverage this, don't fight it.

### 22.2 Requirements

**Keyboard Navigation:**
- Full tab order through all panels (sidebar → URL bar → request config → response).
- Arrow keys navigate the collection tree.
- `Escape` closes modals, dropdowns, and popovers.
- All keyboard shortcuts listed in Settings and discoverable via Command Palette.
- Focus indicators visible on all interactive elements (not just browser default outlines — custom styled rings).

**Screen Reader Support:**
- HTTP method + status codes announced with meaning (e.g., "200 OK, success" not just "200").
- Collection tree items announce: name, type (folder/request), method, expanded/collapsed state.
- Response content has ARIA live region for status updates ("Request sent", "Response received: 200 OK, 245 milliseconds").
- Toast notifications use `role="alert"`.
- Monaco Editor has built-in screen reader mode — enable it.

**Visual:**
- Minimum 4.5:1 contrast ratio for all text.
- Color is never the only indicator — method colors always paired with text labels (GET, POST, etc.).
- Status codes: color + text + icon (checkmark for 2xx, warning for 4xx, X for 5xx).
- Respect `prefers-reduced-motion` — disable all animations.
- Respect `prefers-contrast` — switch to high-contrast variant.
- Support system font size scaling.

### 22.3 Testing

- Use `axe-core` in CI for automated a11y audits.
- Manual screen reader testing with NVDA (Windows), VoiceOver (macOS) before each release.

---

## 23. Internationalization (i18n)

### 23.1 Strategy

- **Phase 1-2: English only.** Focus on getting the product right first.
- **Phase 3+: i18n framework in place, community translations.**

### 23.2 Implementation

- Use `react-i18next` for frontend string management.
- All user-facing strings extracted to JSON locale files: `locales/en.json`, `locales/es.json`, etc.
- **No hardcoded strings in components.** Use `t('key')` from day one (even if only English exists). This avoids a painful retrofit later.
- Date/time formatting via `Intl.DateTimeFormat` (not moment/dayjs for display).
- Number formatting via `Intl.NumberFormat`.
- RTL support: Not Phase 1, but layout uses CSS logical properties (`margin-inline-start` not `margin-left`) from the start to make RTL feasible later.

### 23.3 What Gets Translated

- All UI labels, buttons, tooltips, error messages, dialog text.
- **Not translated**: YAML field names, CLI commands, `ark` API, technical terms (HTTP, JSON, GraphQL), code editor content.

### 23.4 Community Translation

- Locale files in a `locales/` directory in the repo.
- Contribution guide for translators.
- Use Weblate or Crowdin (free for OSS) for community-managed translations.

---

## 24. Deep Links & URL Scheme

### 24.1 Custom Protocol

Register `apiark://` as a custom URL scheme via Tauri v2's deep link plugin.

**Use Cases:**
- **OAuth 2.0 callbacks**: Redirect URI = `apiark://oauth/callback`. The app intercepts the redirect, extracts the authorization code, and completes the token exchange. No localhost server needed.
- **Collection sharing**: `apiark://import?url=https://github.com/user/repo/tree/main/.apiark` — opens the app and triggers a Git clone + import flow.
- **Open request**: `apiark://open?collection=/path/to/collection&request=users/create-user` — opens a specific request in a tab.

### 24.2 Implementation

- Tauri v2 `deep-link` plugin handles registration on install.
- On macOS: registers via `Info.plist` URL types.
- On Windows: registers via registry keys during installation.
- On Linux: registers via `.desktop` file `MimeType` field.
- All deep link URLs are parsed and validated in Rust before any action is taken. No arbitrary command execution.

---

## 25. Scalability & Large Collection Handling

### 25.1 Performance Targets

| Collection Size | Load Time Target | RAM Overhead |
|-----------------|-----------------|--------------|
| 100 requests | <100ms | <5MB |
| 1,000 requests | <500ms | <20MB |
| 5,000 requests | <2s | <80MB |
| 10,000 requests | <5s | <150MB |

### 25.2 Strategy

- **Lazy loading**: Collection tree loads file names and metadata only. Full request YAML is parsed only when a tab is opened.
- **Virtual scrolling**: Collection tree and history list use `TanStack Virtual` — only visible items are rendered. 10,000 items in the tree renders the same as 20.
- **Indexed search**: Collection search uses an in-memory index (built on load) for instant fuzzy search. Rebuild index incrementally on file changes.
- **Chunked file watching**: For very large collections (5,000+ files), use polling fallback instead of per-file watchers to avoid OS file descriptor limits.
- **Background parsing**: YAML parsing for collection loads happens on a Rust background thread (tokio task), not the main/IPC thread. Frontend shows skeleton UI during load.
- **Response body limits**: Responses >10MB are streamed to a temp file. Response viewer shows first 1MB with a "Load full response" button. Prevents UI freeze on huge payloads.

### 25.3 Stress Testing

- CI includes a benchmark suite that generates collections of 100, 1,000, and 5,000 requests and measures load time + memory.
- Regression alert if load time increases >20% between commits.

---

## 26. Onboarding & First-Run Experience

### 26.1 First Launch Flow

1. **Welcome screen** (one-time, dismissible):
   - _"Welcome to ApiArk"_ — brief tagline, no marketing.
   - Three options:
     - **"Start from scratch"** → Creates a sample collection in `~/ApiArk/` with 3-4 example requests (public APIs like httpbin.org, jsonplaceholder).
     - **"Import existing collection"** → Opens import dialog (Postman, Bruno, Insomnia, OpenAPI, cURL).
     - **"Open a folder"** → File picker to open a directory containing `.apiark/apiark.yaml`.
   - Optional: _"Choose your theme"_ toggle (dark/light/system).
   - No account creation. No email capture. No newsletter signup.

2. **Sample collection** (if "Start from scratch"):
   ```
   ~/ApiArk/getting-started/
   ├── .apiark/
   │   ├── apiark.yaml
   │   └── environments/
   │       └── default.yaml
   ├── basics/
   │   ├── simple-get.yaml          # GET https://httpbin.org/get
   │   ├── post-json.yaml           # POST https://httpbin.org/post
   │   └── with-auth.yaml           # GET with Bearer token example
   └── advanced/
       └── chained-requests.yaml    # Example with pre/post scripts
   ```

3. **Contextual hints** (non-blocking, dismissible):
   - First time opening a request: tooltip near Send button — _"Ctrl+Enter to send"_
   - First time editing params: tooltip — _"Use {{variableName}} for dynamic values"_
   - Hints stored in localStorage, shown once each, never again after dismissed.

### 26.2 Empty States

Every panel has a helpful empty state (not just a blank screen):
- **No collections**: _"Open a folder or import a collection to get started"_ with action buttons.
- **No tabs open**: _"Open a request from the sidebar, or press Ctrl+N to create one"_
- **No history**: _"Send your first request to see it here"_
- **No environments**: _"Create an environment to manage variables across requests"_ with Create button.

### 26.3 Migration Guides

- In-app help link: _"Switching from Postman?"_ → opens docs page with step-by-step migration guide.
- Import wizard auto-detects file format and shows a preview before importing.
- Post-import summary: _"Imported 47 requests, 3 environments, 2 folders. 2 requests had warnings."_ with clickable warnings.

---

## 27. Licensing & Feature Gating

### 27.1 Enforcement Mechanism

- **Free tier**: No license needed. All core features work forever, no limits, no expiry.
- **Pro/Team tier**: License key stored locally at `~/.apiark/license.key`.
- License key format: Signed JWT containing: `tier`, `seats`, `expiresAt`, `email`.
- **Validation**: Offline-first. The JWT signature is verified locally against ApiArk's public key embedded in the binary. No network call required to validate.
- **Online check**: On app launch (if internet available), check license status against `api.apiark.dev/v1/license/verify`. If the server is unreachable, **the license remains valid** — no phone-home lockout.
- **Grace period**: If a license expires, Pro features remain functional for 14 days with a banner: _"Your license expired on {date}. [Renew] [Dismiss]"_. After 14 days, Pro features are disabled (not the app — just Pro features revert to free behavior).

### 27.2 What Gets Gated

| Feature | Free | Pro | Team |
|---------|------|-----|------|
| HTTP client, collections, envs, scripting, CLI | Unlimited | Unlimited | Unlimited |
| Mock servers | — | Unlimited | Unlimited |
| Scheduled testing (monitors) | — | Unlimited | Unlimited |
| API docs generation | — | Unlimited | Unlimited |
| OpenAPI spec editor | — | Unlimited | Unlimited |
| Response diff | — | Yes | Yes |
| Parallel collection runner | — | Yes | Yes |
| Built-in Git UI | — | — | Yes |
| Team environment sharing | — | — | Yes |
| SSO/SAML | — | — | Yes |
| Audit logs | — | — | Yes |

### 27.3 Anti-Piracy Philosophy

- We do **not** use DRM, obfuscation, or aggressive anti-tamper.
- If someone cracks the license check, they were never going to pay anyway.
- Focus on making the paid tiers genuinely valuable, not on punishing users.
- Open-core model means the free tier is the product — Pro is for power users who want to support development.

---

## 28. Privacy Policy & Legal

### 28.1 Privacy Principles

- **Zero data collection by default.** ApiArk collects nothing — no analytics, no tracking, no fingerprinting, no usage metrics.
- **Opt-in crash reports only** (see Section 19.1). If opted in, data is minimal and inspectable.
- **No third-party SDKs** that phone home (no Google Analytics, no Mixpanel, no Segment, no Sentry SaaS).
- **License validation** (Pro/Team only) sends: license key + app version. Nothing else. No usage data, no collection info, no request data.

### 28.2 Data Residency

- All user data stays on the local filesystem: collections (YAML), environments (YAML), secrets (.env), history (SQLite), settings (JSON/YAML).
- Nothing is uploaded anywhere unless the user explicitly uses Git push, export, or webhook features.
- License validation endpoint hosted in the EU (GDPR compliance).

### 28.3 Legal Documents (to be published at launch)

1. **Privacy Policy** (`apiark.dev/privacy`):
   - What we collect: nothing by default. Opt-in crash reports. License checks for Pro/Team.
   - What we don't collect: API requests, responses, URLs, headers, bodies, secrets, usage patterns.
   - Third parties: none (unless user opts into crash reporting, which uses our own infra).
   - Data deletion: uninstall the app + delete `~/.apiark/`. That's it.

2. **Terms of Service** (`apiark.dev/terms`):
   - MIT license for the open-source core.
   - Commercial license for Pro/Team features.
   - No warranty, limitation of liability (standard).

3. **Security Policy** (`SECURITY.md` in repo):
   - Responsible disclosure process.
   - Security contact email.
   - PGP key for encrypted reports.
   - Scope: the desktop app, CLI, and apiark.dev website.

### 28.4 Compliance

- **GDPR**: Compliant by design — no personal data processed unless user opts in.
- **SOC 2**: Not applicable at launch (no cloud services). If Team tier adds hosted sync in the future, pursue SOC 2 Type II.
- **HIPAA**: Not applicable (we don't handle PHI). But our local-first architecture is inherently friendly to healthcare orgs that need tools that don't leak data.

---

## 29. Auto-Save Strategy

### 29.1 The Problem

Bruno's #1 complaint is lack of auto-save. Postman auto-saves to cloud. We need to get this right — auto-save to local filesystem without surprising the user.

### 29.2 Behavior

**Saved requests (existing `.yaml` file on disk):**
- **Auto-save after 1 second of inactivity** (debounced). User types, pauses for 1s, file is written.
- Atomic write (write to `.tmp`, rename to target) — no partial writes.
- Tab dot indicator clears on save.
- No manual save needed, but `Ctrl+S` forces an immediate save (and clears the debounce timer).
- If auto-save fails (e.g., disk full, permission denied), show a persistent error banner on the tab: _"Auto-save failed: {reason}. [Retry] [Save As]"_. Do not silently lose data.

**New unsaved requests (no file yet):**
- New requests created via `Ctrl+N` or "New Request" button live **in memory only** until explicitly saved.
- Tab shows "Untitled Request" with a persistent dot.
- On first `Ctrl+S` or "Send" (which triggers save): prompt for file name and location within collection.
- On app quit with unsaved new requests: show dialog _"You have unsaved requests. [Save All] [Discard] [Cancel]"_.

**What triggers auto-save:**
- URL change
- Method change
- Headers/params/body edit (debounced)
- Auth config change
- Script content change
- Assert block change
- Drag-and-drop reorder (saves `_folder.yaml` order immediately)

**What does NOT auto-save:**
- Response data (ephemeral — stored in memory only, not on disk)
- Tab order and open tabs (saved to `~/.apiark/state.json` on quit, not per-keystroke)
- Environment variable edits (saved on blur or explicit save, not debounced — too dangerous to auto-save secrets mid-typing)

### 29.3 Undo Integration

Auto-save writes to disk, but the in-memory undo stack remains intact. User can `Ctrl+Z` to undo changes even after they've been auto-saved. The next auto-save will write the undone state.

---

## 30. Update Mechanism

### 30.1 Tauri Auto-Updater

Use Tauri v2's built-in `updater` plugin backed by a static JSON manifest.

### 30.2 Update Channels

| Channel | Audience | Frequency | Stability |
|---------|----------|-----------|-----------|
| **Stable** | All users (default) | Every 2-4 weeks | Release-candidate tested |
| **Beta** | Opt-in early adopters | Weekly | Feature-complete, may have bugs |
| **Nightly** | Developers/contributors | Daily (automated) | May break, no guarantees |

Users select their channel in Settings → Updates. Default: Stable.

### 30.3 Update Flow

1. On app launch (and every 6 hours while running), check update endpoint: `https://releases.apiark.dev/{channel}/latest.json`.
2. If new version available, show **non-blocking banner** at top of window: _"ApiArk {version} is available. [Update Now] [Release Notes] [Later]"_.
3. **Never auto-install without user action.** User clicks "Update Now" → download in background → show progress → _"Update downloaded. [Restart Now] [Restart Later]"_.
4. On restart: Tauri replaces binary, launches new version.
5. If update fails (download corruption, signature mismatch): show error, keep running current version. Never leave the app in a broken state.

### 30.4 Rollback

- Tauri updater does not natively support rollback. Our approach:
  - Before applying update, copy current binary to `~/.apiark/backups/apiark-{version}`.
  - Keep last 3 versions.
  - If new version crashes on startup (detected via crash-on-launch counter), show dialog: _"The latest update may have caused issues. [Rollback to {prev_version}] [Continue]"_.
  - Rollback = copy backup binary back + restart.

### 30.5 Release Signing

- All releases are code-signed:
  - **macOS**: Apple Developer ID certificate (required for Gatekeeper).
  - **Windows**: EV code signing certificate (required for SmartScreen).
  - **Linux**: GPG-signed `.AppImage` / `.deb` / `.rpm`.
- Tauri updater verifies signatures before applying updates. Unsigned or tampered updates are rejected.

---

## 31. Multi-Window Support

### 31.1 Approach

- **Phase 1: Single window only.** Keep it simple. All tabs, sidebar, and panels in one window.
- **Phase 2+: Multi-window support** via Tauri v2's multi-window API.

### 31.2 Multi-Window Behavior (Phase 2+)

**Opening new windows:**
- `Ctrl+Shift+N` — New empty window.
- Drag a tab out of the tab bar → detaches into a new window (like Chrome/VS Code).
- Right-click tab → "Move to New Window".

**State sharing between windows:**
- All windows share the same Rust backend process (Tauri manages this).
- Collection tree, environments, and settings are shared — a change in one window reflects in all others immediately (via Tauri event system).
- Each window has its own independent set of open tabs.
- Active environment is global (shared across windows) — switching in one window switches everywhere.

**Window state persistence:**
- On quit, save all window positions, sizes, and open tabs to `~/.apiark/state.json`.
- On launch, restore all windows from previous session.

### 31.3 Detached Panels (Future)

- Response viewer, console, and collection tree could be detached into separate windows for multi-monitor setups.
- Not in scope for Phase 1-2. Evaluate demand before building.

---

## 32. Data Portability & Exit Strategy

### 32.1 Philosophy

We criticize Postman for vendor lock-in. We must make it trivially easy to leave ApiArk.

### 32.2 Your Data is Already Portable

- **Collections**: Plain YAML files on your filesystem. You can read them, edit them in any text editor, process them with any YAML library, and version them with Git. No proprietary encoding.
- **Environments**: Plain YAML files. Same deal.
- **Secrets**: Standard `.env` files. Compatible with dotenv, Docker, Node.js, etc.
- **History**: SQLite database. Open it with any SQLite client (`sqlite3`, DB Browser, DBeaver). Schema is documented.
- **Settings**: JSON file at `~/.apiark/settings.json`. Human-readable.

### 32.3 Export to Competitors

Built-in export to (Phase 2):
- **Postman Collection v2.1** — Import directly into Postman.
- **OpenAPI 3.0/3.1** — Universal standard, import into any tool.
- **cURL** — Per-request export, works everywhere.
- **Insomnia YAML** — Compatible with Insomnia import.
- **HAR** — HTTP Archive format, browser-compatible.

### 32.4 Schema Documentation

- The YAML request file schema is documented in `docs/schema.md` with JSON Schema definitions.
- Third-party tools can parse ApiArk collections without our software.
- Schema is versioned (see Section 21) and backward-compatible.

### 32.5 No Lock-In Pledge

> _"If you decide to leave ApiArk, your data leaves with you. Every file is a standard format. Every database is open. We will never make it hard to switch away."_

This pledge is published on the website and in the README.

---

## 33. Offline Behavior & Graceful Degradation

### 33.1 Principle

ApiArk is designed to work **100% offline** for core workflows. Network is only needed for: sending API requests (the user's intent), OAuth flows, license validation, and update checks.

### 33.2 Feature-by-Feature Offline Behavior

| Feature | Offline Behavior |
|---------|-----------------|
| Send HTTP requests | Works (to reachable hosts — localhost, LAN, VPN) |
| Collections CRUD | Fully offline — filesystem only |
| Environments | Fully offline — filesystem only |
| Scripting | Fully offline — deno_core runs locally |
| Collection runner | Fully offline |
| History | Fully offline — SQLite |
| cURL import/export | Fully offline |
| Code generation | Fully offline |
| Mock servers | Fully offline — localhost |
| Scheduled testing | Fully offline (desktop notifications work; webhooks fail gracefully) |
| GraphQL introspection | Needs network to target server |
| OAuth 2.0 | Needs network to auth provider. **Cached tokens work offline until expiry.** |
| License validation | Offline-first (JWT verified locally). Online check is opportunistic. See Section 27.1. |
| Update check | Silently skipped if offline. No error, no banner. |
| Plugin install | Needs network to download. Installed plugins work offline. |
| Schema fetch (GraphQL/gRPC) | Cached locally after first fetch. Works offline from cache. |

### 33.3 Network Error Handling

- **No global "you're offline" banner.** That's patronizing. Developers know when they're offline.
- Network errors are shown **per-action** where they occur:
  - Send request fails → error in response panel with specific message (timeout, DNS, connection refused).
  - OAuth flow fails → error in auth panel: _"Could not reach authorization server."_
  - Update check fails → silently skipped.
- **Never block the UI** waiting for a network call. All network operations are async with timeouts.

---

## 34. Undo/Redo System

### 34.1 Scope

Undo/Redo applies to **request editing** and **collection tree operations**.

### 34.2 Request Editing (Per-Tab)

- Each open tab maintains its own undo/redo stack.
- **Undo depth**: 100 operations per tab.
- `Ctrl+Z` / `Ctrl+Shift+Z` (or `Ctrl+Y`).
- Undoable operations:
  - URL text changes
  - Method changes
  - Header add/edit/delete/toggle
  - Param add/edit/delete/toggle
  - Body content changes
  - Auth config changes
  - Script content changes
  - Assert block changes
- Undo stack is **in-memory only** — cleared when tab is closed.
- Monaco Editor (body, scripts) has its own built-in undo — we use it. For non-Monaco fields (URL bar, key-value editors), we maintain our own stack in the Zustand store.

### 34.3 Collection Tree Operations (Global)

- Undoable operations with a separate global stack:
  - Delete request → Undo restores file from trash (see below)
  - Delete folder → Undo restores folder + all contents
  - Rename request/folder → Undo reverts name
  - Move (drag-and-drop) → Undo reverts position
- **Undo depth**: 20 operations (tree operations are heavier).
- `Ctrl+Z` applies to the last focused context: if a tab editor was last focused, undo goes to the tab. If the collection tree was last focused, undo goes to the tree.

### 34.4 Soft Delete (Trash)

- Deleting a request or folder moves it to `~/.apiark/trash/{collection-name}/{timestamp}/` instead of permanent deletion.
- Trash auto-cleans after 30 days.
- This enables undo for deletes even after the undo stack is cleared.
- "Empty Trash" option in Settings.

---

## 35. Security Hardening (Tauri v2 Capabilities)

### 35.1 Tauri v2 Permission Model

Tauri v2 uses a **capability-based permission system**. Each capability grants specific IPC commands to specific windows. We follow the principle of least privilege.

### 35.2 Capability Configuration

```json
// capabilities/main-window.json
{
  "identifier": "main-window",
  "description": "Permissions for the main application window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-close",
    "core:window:allow-set-size",
    "fs:default",
    "fs:allow-read",
    "fs:allow-write",
    "fs:scope-home",
    "dialog:default",
    "shell:allow-open",
    "notification:default",
    "updater:default",
    "deep-link:default"
  ]
}
```

### 35.3 IPC Command Allowlist

- Only explicitly defined Tauri commands are callable from the frontend.
- No `shell:allow-execute` — the frontend cannot run arbitrary commands.
- No `fs:allow-write` outside scoped directories (collection dirs + `~/.apiark/`).
- Commands that handle user secrets (env vars, auth tokens) never log values at `info` level or above.

### 35.4 Content Security Policy

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
connect-src 'self' ipc: tauri: https://releases.apiark.dev https://api.apiark.dev;
font-src 'self' data:;
```

- **No `eval()`** — Monaco Editor works without it (uses web workers).
- **No remote scripts** — everything bundled locally.
- `connect-src` allows IPC (Tauri commands), our update server, and our license server. Nothing else.
- If a plugin needs network access, it goes through the Rust backend — never directly from the webview.

### 35.5 Secret Handling

- Environment secrets (from `.env` files) are loaded into Rust memory. They are sent to the frontend **only** when:
  - Rendering the environment editor (masked by default, revealable per-variable).
  - Interpolating variables into a request (the interpolated request is sent to Rust, not the raw secret).
- Secrets are **never** written to SQLite (history stores requests with variables unresolved: `{{token}}`, not the actual value).
- Secrets are **never** written to log files.
- When a request is saved to history, auth tokens and secret-tagged variables are replaced with `[REDACTED]`.

### 35.6 Dependency Auditing

- **Rust**: `cargo audit` in CI on every PR. Block merge on known vulnerabilities (RUSTSEC advisories).
- **npm**: `pnpm audit` in CI. Block merge on high/critical severity.
- **Dependabot** / **Renovate** enabled for automated dependency update PRs.
- Manual review of new dependencies before adding them — check: maintenance status, license, transitive dependency count, security history.

---

## 36. Backup & State Export

### 36.1 What Constitutes "App State"

| Data | Location | Backup Method |
|------|----------|---------------|
| Collections | User's chosen directory (YAML files) | User manages via Git / file backup |
| Environments | Inside collection directory (YAML) | Same as collections |
| Secrets | `.env` in collection directory | User manages (gitignored) |
| History | `~/.apiark/data.db` (SQLite) | Exportable |
| Settings | `~/.apiark/settings.json` | Exportable |
| Window state | `~/.apiark/state.json` | Exportable |
| License | `~/.apiark/license.key` | Portable (copy to new machine) |
| Crash logs | `~/.apiark/crash-reports/` | Optional |
| Logs | `~/.apiark/logs/` | Optional |
| Trash | `~/.apiark/trash/` | Optional |

### 36.2 Full State Export

Settings → Backup → **"Export App State"**:
- Exports a single `.zip` file containing:
  - `settings.json`
  - `state.json` (open tabs, window positions)
  - `data.db` (history) — optional, user can uncheck
  - List of collection paths (not the collections themselves — those are user-managed)
- Does **NOT** include: collections (too large, user manages via Git), secrets, license key, logs.

### 36.3 Full State Import

Settings → Backup → **"Import App State"**:
- Import a previously exported `.zip`.
- Merges settings (new values override old, unrecognized keys preserved).
- Replaces history DB (with confirmation).
- Restores window state.
- Shows summary: _"Restored: settings, history (1,247 entries), window layout. Collection paths may need to be re-opened if they've moved."_

### 36.4 Settings Sync Across Machines

- No built-in sync. Users who want settings on multiple machines can:
  1. Export → transfer `.zip` → Import.
  2. Symlink `~/.apiark/settings.json` to a cloud-synced folder (Dropbox, iCloud, etc.).
  3. Version `settings.json` in a dotfiles Git repo.
- We document these approaches. We don't build sync infrastructure.

---

## 37. Cookie Jar Management

### 37.1 Behavior

- ApiArk maintains a **per-collection cookie jar** in the Rust backend (using `reqwest`'s cookie store).
- Cookies set by responses (`Set-Cookie` header) are **automatically stored** and **automatically sent** on subsequent requests to matching domains/paths.
- This mirrors browser behavior — essential for session-based auth flows (login → receive session cookie → subsequent requests include it).

### 37.2 Cookie Storage

- **In-memory by default**: Cookie jar lives in Rust memory for the duration of the app session. Restarting the app clears cookies.
- **Persistent mode** (opt-in per collection in `apiark.yaml`):
  ```yaml
  defaults:
    persistCookies: true
  ```
  When enabled, cookies are saved to `~/.apiark/cookies/{collection-hash}.json` and restored on app launch.

### 37.3 Cookie Viewer/Editor (UI)

- Response panel → **Cookies tab**: Shows all cookies set by the response (`Set-Cookie` headers parsed).
- Sidebar → **Cookie Jar** panel (or via Settings): Shows all stored cookies for the active collection.
  - Per cookie: name, value, domain, path, expires, httpOnly, secure, sameSite.
  - Actions: Edit value, Delete individual cookie, Clear all cookies for a domain, Clear entire jar.
- Cookie values are shown in plain text (not masked) — cookies are not treated as secrets unless the user marks them.

### 37.4 Cookie Scope

| Scope | Behavior |
|-------|----------|
| Per-collection | Each collection has its own isolated cookie jar. No cookie leakage between collections. |
| Per-environment | Same cookie jar regardless of environment. Switching from dev to prod does NOT clear cookies. |
| Cross-request | Cookies are shared across all requests in the same collection (matching domain/path rules). |

### 37.5 Cookie Control

- Per-request override in YAML:
  ```yaml
  cookies:
    session: "manual-value"
    tracking: ""  # empty = delete this cookie for this request
  ```
- Collection-level setting to disable automatic cookie handling:
  ```yaml
  defaults:
    sendCookies: false    # Don't auto-send stored cookies
    storeCookies: false   # Don't auto-store response cookies
  ```

---

## 38. Proxy Capture Mode

### 38.1 Overview (Phase 3)

Proxy capture mode turns ApiArk into a **local intercepting proxy** — it sits between a browser/app and the internet, capturing all HTTP traffic for inspection, modification, and replay.

This is similar to Charles Proxy, Fiddler, or mitmproxy, but integrated directly into ApiArk.

### 38.2 How It Works

```
┌──────────┐     ┌───────────────┐     ┌──────────────┐
│  Browser  │────▶│  ApiArk Proxy │────▶│  Target API  │
│  or App   │◀────│  (localhost:   │◀────│  Server      │
│           │     │   8080)        │     │              │
└──────────┘     └───────────────┘     └──────────────┘
```

1. User starts proxy capture mode from the UI: **Tools → Start Proxy Capture**.
2. ApiArk starts a local HTTP/HTTPS proxy server on a configurable port (default: `8080`).
3. User configures their browser or application to use `localhost:8080` as its HTTP proxy.
4. All HTTP/HTTPS traffic flows through ApiArk.
5. For HTTPS: ApiArk generates a local CA certificate on first use. User must trust this CA in their browser/OS to intercept HTTPS traffic. Clear warning shown: _"To capture HTTPS traffic, you need to trust ApiArk's CA certificate."_

### 38.3 Capture Features

- **Traffic log**: Real-time list of all captured requests/responses with: method, URL, status, size, time.
- **Request inspection**: Click any captured request to view full details (headers, body, cookies, timing).
- **Filtering**: Filter by domain, method, status code, content type, URL pattern (regex).
- **Search**: Full-text search across all captured requests and responses.
- **Save to collection**: Right-click any captured request → "Save to Collection" → creates a `.yaml` request file.
- **Replay**: Right-click → "Replay" sends the exact same request through ApiArk's HTTP engine.
- **Modify & Replay**: Right-click → "Edit & Replay" opens the request in a new tab for modification.

### 38.4 HTTPS Interception

- Local CA certificate generated on first proxy start: `~/.apiark/proxy/ca-cert.pem` + `ca-key.pem`.
- Per-domain certificates generated on-the-fly (like mitmproxy).
- User can export the CA cert for installation in their browser/OS.
- **Passthrough domains**: User can configure domains that should NOT be intercepted (traffic passes through untouched). Useful for: banking sites, corporate SSO, etc.

### 38.5 Implementation

- Rust-based proxy server using `hyper` (low-level HTTP) + `rcgen` (certificate generation) + `rustls` (TLS termination).
- Runs on a separate tokio task — does not block the main app.
- Traffic stored in a temporary SQLite table (not the main history DB) — cleared when proxy mode is stopped.
- Memory limit: Capture retains last 10,000 requests. Older requests are evicted FIFO.
- Binary body content (images, etc.) stored as references to temp files, not in memory.

### 38.6 Safety

- Proxy only binds to `127.0.0.1` (localhost) — not accessible from the network.
- CA private key stored with OS-level file permissions (600 on Unix).
- Clear UI indicator when proxy mode is active (colored bar at top of window).
- Easy one-click stop: same button that started it.
- On app quit while proxy is running: stop proxy, show reminder to reconfigure browser proxy settings.

---

*This document is the single source of truth for ApiArk development. Update it as decisions evolve.*
