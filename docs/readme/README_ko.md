<p align="center">
  <img src="../../apps/desktop/src-tauri/icons/128x128@2x.png" alt="ApiArk" width="96" height="96" />
</p>

<h1 align="center">ApiArk</h1>

<p align="center">
  <strong>당신의 프라이버시, 메모리, 그리고 Git 워크플로를 존중하는 API 플랫폼.</strong>
</p>

<p align="center">
  로그인 없음. 클라우드 없음. 불필요한 것 없음.
</p>

<p align="center">
  <em>Postman은 800 MB의 RAM을 사용합니다. ApiArk는 60 MB만 사용합니다.</em>
</p>

<p align="center">
  <a href="https://github.com/berbicanes/apiark/releases/latest"><img src="https://img.shields.io/github/v/release/berbicanes/apiark?style=flat-square&color=6366f1" alt="최신 릴리스" /></a>
  <a href="https://github.com/berbicanes/apiark/releases/latest"><img src="https://img.shields.io/github/downloads/berbicanes/apiark/total?style=flat-square&color=22c55e" alt="다운로드" /></a>
  <a href="https://github.com/berbicanes/apiark/stargazers"><img src="https://img.shields.io/github/stars/berbicanes/apiark?style=flat-square&color=eab308" alt="스타" /></a>
  <a href="https://github.com/berbicanes/apiark/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/berbicanes/apiark/ci.yml?style=flat-square&label=CI" alt="CI" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/berbicanes/apiark?style=flat-square" alt="MIT 라이선스" /></a>
</p>

<p align="center">
  <a href="#다운로드">다운로드</a> &bull;
  <a href="#기능">기능</a> &bull;
  <a href="#postman에서-전환하기">Postman에서 전환하기</a> &bull;
  <a href="#성능">성능</a> &bull;
  <a href="#커뮤니티">커뮤니티</a> &bull;
  <a href="#개발">개발</a>
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

## 왜 ApiArk인가?

| | Postman | Bruno | Hoppscotch | **ApiArk** |
|---|---|---|---|---|
| **프레임워크** | Electron | Electron | Tauri | **Tauri v2** |
| **메모리 사용량** | 300-800 MB | 150-300 MB | 50-80 MB | **약 60 MB** |
| **시작 시간** | 10-30초 | 3-8초 | <2초 | **<2초** |
| **계정 필수** | 예 | 아니오 | 선택 | **아니오** |
| **데이터 저장** | 클라우드 | 파일 시스템 | IndexedDB | **파일 시스템 (YAML)** |
| **Git 호환** | 불가 | 가능 (.bru) | 불가 | **가능 (표준 YAML)** |
| **gRPC** | 지원 | 지원 | 미지원 | **지원** |
| **WebSocket** | 지원 | 미지원 | 지원 | **지원** |
| **SSE** | 지원 | 미지원 | 지원 | **지원** |
| **MQTT** | 미지원 | 미지원 | 미지원 | **지원** |
| **Mock 서버** | 클라우드만 | 미지원 | 미지원 | **로컬** |
| **모니터** | 클라우드만 | 미지원 | 미지원 | **로컬** |
| **플러그인 시스템** | 미지원 | 미지원 | 미지원 | **JS + WASM** |
| **프록시 캡처** | 미지원 | 미지원 | 미지원 | **지원** |
| **응답 비교** | 미지원 | 미지원 | 미지원 | **지원** |

## 다운로드

**[최신 릴리스](https://github.com/berbicanes/apiark/releases/latest)**

| 플랫폼 | 다운로드 |
|----------|----------|
| **Windows** | [`.exe` 설치 프로그램](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.msi`](https://github.com/berbicanes/apiark/releases/latest) |
| **macOS** | [Apple Silicon `.dmg`](https://github.com/berbicanes/apiark/releases/latest) &bull; [Intel `.dmg`](https://github.com/berbicanes/apiark/releases/latest) |
| **Linux** | [`.AppImage`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.deb`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.rpm`](https://github.com/berbicanes/apiark/releases/latest) |

<details>
<summary><strong>패키지 관리자</strong></summary>

```bash
# Homebrew (macOS/Linux) — 곧 출시
brew install --cask apiark

# Chocolatey (Windows) — 곧 출시
choco install apiark

# Snap (Linux) — 곧 출시
sudo snap install apiark

# AUR (Arch Linux) — 곧 출시
yay -S apiark-bin
```

패키지 관리에 관심이 있으신가요? [Issue를 열어주시면](https://github.com/berbicanes/apiark/issues/new) 함께 작업하겠습니다.
</details>

<details>
<summary><strong>소스에서 빌드</strong></summary>

**필수 조건:** Node.js 22+, pnpm 10+, Rust 툴체인, [Tauri v2 시스템 의존성](https://v2.tauri.app/start/prerequisites/)

```bash
git clone https://github.com/berbicanes/apiark.git
cd apiark
pnpm install
pnpm tauri build
```
</details>

## Postman에서 전환하기

1. Postman 컬렉션 내보내기 (Collection v2.1 JSON)
2. ApiArk 열기
3. `Ctrl+K` > "컬렉션 가져오기" > 파일 선택
4. 완료. 이제 요청은 당신이 소유하는 YAML 파일입니다.

다음에서도 가져오기 지원: **Insomnia**, **Bruno**, **Hoppscotch**, **OpenAPI 3.x**, **HAR**, **cURL**.

## 기능

**멀티 프로토콜** — REST, GraphQL, gRPC, WebSocket, SSE, MQTT, Socket.IO를 하나의 앱에서. 이보다 넓은 프로토콜 커버리지를 가진 도구는 없습니다.

**로컬 우선 저장** — 모든 요청은 `.yaml` 파일. 컬렉션은 디렉토리. 모든 것이 Git diff 가능. 독점 포맷 없음.

**다크 모드 + 테마** — 다크, 라이트, 블랙/OLED 테마와 8가지 강조 색상.

**TypeScript 스크립팅** — 완전한 타입 정의가 포함된 요청 전/후 스크립트. `ark.test()`, `ark.expect()`, `ark.env.set()`.

**컬렉션 러너** — 데이터 기반 테스트(CSV/JSON)로 전체 컬렉션을 실행. 반복 횟수 설정, JUnit/HTML 리포트.

**로컬 Mock 서버** — 컬렉션에서 모의 API를 생성. Faker.js 데이터, 지연 시뮬레이션, 에러 주입. 클라우드 없음, 사용 제한 없음.

**예약 모니터링** — cron 기반 자동 테스트. 데스크톱 알림과 webhook 알림 지원. 로컬에서 실행되며 다른 사람의 서버에 의존하지 않습니다.

**API 문서 생성** — 컬렉션에서 HTML + Markdown 문서를 생성.

**OpenAPI 편집기** — Spectral 통합으로 OpenAPI 스펙을 편집하고 검증.

**응답 비교** — 서로 다른 실행 간 응답을 나란히 비교.

**프록시 캡처** — 트래픽 검사 및 재생을 위한 로컬 HTTP/HTTPS 인터셉트 프록시.

**AI 어시스턴트** — 자연어를 요청으로 변환, 자동 테스트 생성, OpenAI 호환 API.

**플러그인 시스템** — JavaScript 또는 WASM 플러그인으로 ApiArk를 확장.

**모든 것을 가져오기** — Postman, Insomnia, Bruno, Hoppscotch, OpenAPI, HAR, cURL. 원클릭 마이그레이션.

## 성능

Tauri v2(Rust 백엔드 + 네이티브 OS webview)로 구축. Electron이 아닙니다.

| 지표 | 목표 |
|---|---|
| 바이너리 크기 | 약 20 MB |
| 유휴 시 메모리 | 약 60 MB |
| 콜드 스타트 | <2초 |
| 요청 전송 지연 | <10ms 오버헤드 |

## 데이터 형식

당신의 데이터는 순수 YAML입니다. 벤더 종속 없음. 독점 인코딩 없음.

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
# 컬렉션 실행
apiark run ./my-collection --env production

# 데이터 기반 테스트
apiark run ./my-collection --data users.csv --reporter junit

# Postman 컬렉션 가져오기
apiark import postman-export.json
```

## 잠금 없음 서약

> ApiArk를 떠나기로 결정하면, 당신의 데이터도 함께 갑니다. 모든 파일은 표준 형식입니다. 모든 데이터베이스는 개방되어 있습니다. 전환을 어렵게 만드는 일은 절대 없을 것입니다.

## 커뮤니티

- [Discord](https://discord.gg/apiark) — 채팅, 질문, 피드백
- [Twitter / X](https://x.com/apiabordes) — 업데이트 및 공지
- [GitHub Discussions](https://github.com/berbicanes/apiark/discussions) — 아이디어, Q&A, 프로젝트 공유
- [GitHub Issues](https://github.com/berbicanes/apiark/issues) — 버그 리포트 및 기능 요청

## 번역

ApiArk UI는 `react-i18next`를 통한 국제화를 지원합니다. 현재 **영어**로 이용 가능합니다.

ApiArk를 당신의 언어로 번역하는 것을 도와주세요! [`locales/`](../../apps/desktop/src/locales/) 디렉토리를 확인하고 PR을 제출해 주세요.

## 개발

```bash
# 의존성 설치
pnpm install

# 개발 모드로 실행
pnpm tauri dev

# TypeScript 타입 체크
pnpm -C apps/desktop exec tsc --noEmit

# 프로덕션 빌드
pnpm tauri build
```

### 프로젝트 구조

```
apiark/
├── apps/
│   ├── desktop/           # Tauri v2 데스크톱 앱
│   │   ├── src/           # React 프론트엔드
│   │   └── src-tauri/     # Rust 백엔드
│   ├── cli/               # CLI 도구 (Rust)
│   ├── mcp-server/        # AI 에디터용 MCP 서버
│   └── vscode-extension/  # VS Code 확장
├── packages/
│   ├── types/             # 공유 TypeScript 타입
│   └── importer/          # 컬렉션 임포터
└── docs/                  # Documentation
```

### 기술 스택

**프론트엔드:** React 19, TypeScript, Vite 6, Zustand, Tailwind CSS 4, Monaco Editor, Radix UI

**백엔드:** Rust, Tauri v2, reqwest, tokio, tonic (gRPC), axum (Mock 서버), deno_core (스크립팅)

## 기여하기

Contributions are welcome! Check out the [GitHub Issues](https://github.com/berbicanes/apiark/issues) for open tasks and feature requests.

<a href="https://github.com/berbicanes/apiark/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=berbicanes/apiark" alt="기여자" />
</a>

## 라이선스

[MIT](../../LICENSE)

---

<p align="center">
  <sub>ApiArk가 당신의 워크플로에 도움이 된다면, 스타를 눌러주세요. 다른 사람들이 프로젝트를 발견하는 데 도움이 됩니다.</sub>
</p>
