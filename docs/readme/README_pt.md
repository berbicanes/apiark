<p align="center">
  <img src="../../apps/desktop/src-tauri/icons/128x128@2x.png" alt="ApiArk" width="96" height="96" />
</p>

<h1 align="center">ApiArk</h1>

<p align="center">
  <strong>A plataforma de APIs que respeita sua privacidade, sua RAM e seu fluxo de trabalho com Git.</strong>
</p>

<p align="center">
  Sem login. Sem nuvem. Sem excesso.
</p>

<p align="center">
  <em>Postman usa 800 MB de RAM. ApiArk usa 60 MB.</em>
</p>

<p align="center">
  <a href="https://github.com/berbicanes/apiark/releases/latest"><img src="https://img.shields.io/github/v/release/berbicanes/apiark?style=flat-square&color=6366f1" alt="Versão mais recente" /></a>
  <a href="https://github.com/berbicanes/apiark/releases/latest"><img src="https://img.shields.io/github/downloads/berbicanes/apiark/total?style=flat-square&color=22c55e" alt="Downloads" /></a>
  <a href="https://github.com/berbicanes/apiark/stargazers"><img src="https://img.shields.io/github/stars/berbicanes/apiark?style=flat-square&color=eab308" alt="Estrelas" /></a>
  <a href="https://github.com/berbicanes/apiark/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/berbicanes/apiark/ci.yml?style=flat-square&label=CI" alt="CI" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/berbicanes/apiark?style=flat-square" alt="Licença MIT" /></a>
</p>

<p align="center">
  <a href="#download">Download</a> &bull;
  <a href="#funcionalidades">Funcionalidades</a> &bull;
  <a href="#migrando-do-postman">Migrando do Postman</a> &bull;
  <a href="#desempenho">Desempenho</a> &bull;
  <a href="#comunidade">Comunidade</a> &bull;
  <a href="#desenvolvimento">Desenvolvimento</a>
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

## Por que ApiArk?

| | Postman | Bruno | Hoppscotch | **ApiArk** |
|---|---|---|---|---|
| **Framework** | Electron | Electron | Tauri | **Tauri v2** |
| **Uso de RAM** | 300-800 MB | 150-300 MB | 50-80 MB | **~60 MB** |
| **Inicialização** | 10-30s | 3-8s | <2s | **<2s** |
| **Conta obrigatória** | Sim | Não | Opcional | **Não** |
| **Armazenamento** | Nuvem | Sistema de arquivos | IndexedDB | **Sistema de arquivos (YAML)** |
| **Compatível com Git** | Não | Sim (.bru) | Não | **Sim (YAML padrão)** |
| **gRPC** | Sim | Sim | Não | **Sim** |
| **WebSocket** | Sim | Não | Sim | **Sim** |
| **SSE** | Sim | Não | Sim | **Sim** |
| **MQTT** | Não | Não | Não | **Sim** |
| **Servidores mock** | Apenas nuvem | Não | Não | **Local** |
| **Monitores** | Apenas nuvem | Não | Não | **Local** |
| **Sistema de plugins** | Não | Não | Não | **JS + WASM** |
| **Captura de proxy** | Não | Não | Não | **Sim** |
| **Comparação de respostas** | Não | Não | Não | **Sim** |

## Download

**[Versão mais recente](https://github.com/berbicanes/apiark/releases/latest)**

| Plataforma | Download |
|----------|----------|
| **Windows** | [Instalador `.exe`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.msi`](https://github.com/berbicanes/apiark/releases/latest) |
| **macOS** | [Apple Silicon `.dmg`](https://github.com/berbicanes/apiark/releases/latest) &bull; [Intel `.dmg`](https://github.com/berbicanes/apiark/releases/latest) |
| **Linux** | [`.AppImage`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.deb`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.rpm`](https://github.com/berbicanes/apiark/releases/latest) |

<details>
<summary><strong>Gerenciadores de pacotes</strong></summary>

```bash
# Homebrew (macOS/Linux) — em breve
brew install --cask apiark

# Chocolatey (Windows) — em breve
choco install apiark

# Snap (Linux) — em breve
sudo snap install apiark

# AUR (Arch Linux) — em breve
yay -S apiark-bin
```

Tem interesse em manter um pacote? [Abra um issue](https://github.com/berbicanes/apiark/issues/new) e trabalharemos juntos.
</details>

<details>
<summary><strong>Compilar a partir do código-fonte</strong></summary>

**Pré-requisitos:** Node.js 22+, pnpm 10+, toolchain Rust, [dependências do sistema Tauri v2](https://v2.tauri.app/start/prerequisites/)

```bash
git clone https://github.com/berbicanes/apiark.git
cd apiark
pnpm install
pnpm tauri build
```
</details>

## Migrando do Postman

1. Exporte sua coleção do Postman (Collection v2.1 JSON)
2. Abra o ApiArk
3. `Ctrl+K` > "Importar coleção" > selecione seu arquivo
4. Pronto. Suas requisições agora são arquivos YAML que pertencem a você.

Também importa de: **Insomnia**, **Bruno**, **Hoppscotch**, **OpenAPI 3.x**, **HAR**, **cURL**.

## Funcionalidades

**Multi-Protocolo** — REST, GraphQL, gRPC, WebSocket, SSE, MQTT, Socket.IO em um único aplicativo. Nenhuma outra ferramenta tem cobertura de protocolos tão ampla.

**Armazenamento local** — Cada requisição é um arquivo `.yaml`. Coleções são diretórios. Tudo é compatível com diff do Git. Sem formatos proprietários.

**Modo escuro + Temas** — Temas escuro, claro e preto/OLED com 8 cores de destaque.

**Scripts em TypeScript** — Scripts pré/pós-requisição com definições de tipo completas. `ark.test()`, `ark.expect()`, `ark.env.set()`.

**Executor de coleções** — Execute coleções inteiras com testes orientados a dados (CSV/JSON), iterações configuráveis, relatórios JUnit/HTML.

**Servidores mock locais** — Crie APIs simuladas a partir de suas coleções. Dados com Faker.js, simulação de latência, injeção de erros. Sem nuvem, sem limites de uso.

**Monitoramento programado** — Testes automatizados baseados em cron com notificações no desktop e alertas por webhook. Roda localmente, não no servidor de outra pessoa.

**Geração de documentação de API** — Gere documentação em HTML + Markdown a partir de suas coleções.

**Editor OpenAPI** — Edite e valide especificações OpenAPI com integração Spectral.

**Comparação de respostas** — Compare respostas lado a lado entre execuções.

**Captura de proxy** — Proxy HTTP/HTTPS interceptador local para inspeção e repetição de tráfego.

**Assistente de IA** — Linguagem natural para requisições, geração automática de testes, API compatível com OpenAI.

**Sistema de plugins** — Estenda o ApiArk com plugins em JavaScript ou WASM.

**Importe tudo** — Postman, Insomnia, Bruno, Hoppscotch, OpenAPI, HAR, cURL. Migração com um clique.

## Desempenho

Construído com Tauri v2 (backend em Rust + webview nativa do SO), não com Electron.

| Métrica | Objetivo |
|---|---|
| Tamanho do binário | ~20 MB |
| RAM em repouso | ~60 MB |
| Inicialização a frio | <2s |
| Latência de envio de requisição | <10ms de overhead |

## Formato de dados

Seus dados são YAML puro. Sem dependência de fornecedor. Sem codificação proprietária.

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
# Executar uma coleção
apiark run ./my-collection --env production

# Com testes orientados a dados
apiark run ./my-collection --data users.csv --reporter junit

# Importar uma coleção do Postman
apiark import postman-export.json
```

## Compromisso de não dependência

> Se você decidir deixar o ApiArk, seus dados vão com você. Cada arquivo está em um formato padrão. Cada banco de dados é aberto. Nunca tornaremos difícil a troca para outra ferramenta.

## Comunidade

- [Discord](https://discord.gg/apiark) — Chat, perguntas e feedback
- [Twitter / X](https://x.com/apiabordes) — Atualizações e anúncios
- [GitHub Discussions](https://github.com/berbicanes/apiark/discussions) — Ideias, perguntas e respostas, mostre seu projeto
- [GitHub Issues](https://github.com/berbicanes/apiark/issues) — Relatórios de bugs e solicitações de funcionalidades

## Traduções

A interface do ApiArk suporta internacionalização via `react-i18next`. Atualmente disponível em **inglês**.

Ajude-nos a traduzir o ApiArk para o seu idioma! Confira o diretório [`locales/`](../../apps/desktop/src/locales/) e envie um PR.

## Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Executar em modo de desenvolvimento
pnpm tauri dev

# Verificação de TypeScript
pnpm -C apps/desktop exec tsc --noEmit

# Compilar para produção
pnpm tauri build
```

### Estrutura do projeto

```
apiark/
├── apps/
│   ├── desktop/           # Aplicativo desktop Tauri v2
│   │   ├── src/           # Frontend React
│   │   └── src-tauri/     # Backend Rust
│   ├── cli/               # Ferramenta CLI (Rust)
│   ├── mcp-server/        # Servidor MCP para editores com IA
│   └── vscode-extension/  # Extensão do VS Code
├── packages/
│   ├── types/             # Tipos TypeScript compartilhados
│   └── importer/          # Importadores de coleções
└── docs/                  # Documentation
```

### Stack tecnológico

**Frontend:** React 19, TypeScript, Vite 6, Zustand, Tailwind CSS 4, Monaco Editor, Radix UI

**Backend:** Rust, Tauri v2, reqwest, tokio, tonic (gRPC), axum (servidores mock), deno_core (scripting)

## Contribuir

Contributions are welcome! Check out the [GitHub Issues](https://github.com/berbicanes/apiark/issues) for open tasks and feature requests.

<a href="https://github.com/berbicanes/apiark/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=berbicanes/apiark" alt="Contribuidores" />
</a>

## Licença

[MIT](../../LICENSE)

---

<p align="center">
  <sub>Se o ApiArk melhora seu fluxo de trabalho, considere dar uma estrela. Isso ajuda outros a descobrirem o projeto.</sub>
</p>
