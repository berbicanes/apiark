<p align="center">
  <img src="../../apps/desktop/src-tauri/icons/128x128@2x.png" alt="ApiArk" width="96" height="96" />
</p>

<h1 align="center">ApiArk</h1>

<p align="center">
  <strong>La plataforma de APIs que respeta tu privacidad, tu RAM y tu flujo de trabajo con Git.</strong>
</p>

<p align="center">
  Sin inicio de sesión. Sin nube. Sin excesos.
</p>

<p align="center">
  <em>Postman usa 800 MB de RAM. ApiArk usa 60 MB.</em>
</p>

<p align="center">
  <a href="https://github.com/berbicanes/apiark/releases/latest"><img src="https://img.shields.io/github/v/release/berbicanes/apiark?style=flat-square&color=6366f1" alt="Última versión" /></a>
  <a href="https://github.com/berbicanes/apiark/releases/latest"><img src="https://img.shields.io/github/downloads/berbicanes/apiark/total?style=flat-square&color=22c55e" alt="Descargas" /></a>
  <a href="https://github.com/berbicanes/apiark/stargazers"><img src="https://img.shields.io/github/stars/berbicanes/apiark?style=flat-square&color=eab308" alt="Estrellas" /></a>
  <a href="https://github.com/berbicanes/apiark/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/berbicanes/apiark/ci.yml?style=flat-square&label=CI" alt="CI" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/berbicanes/apiark?style=flat-square" alt="Licencia MIT" /></a>
</p>

<p align="center">
  <a href="#descargar">Descargar</a> &bull;
  <a href="#características">Características</a> &bull;
  <a href="#migrando-desde-postman">Migrando desde Postman</a> &bull;
  <a href="#rendimiento">Rendimiento</a> &bull;
  <a href="#comunidad">Comunidad</a> &bull;
  <a href="#desarrollo">Desarrollo</a>
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

<!-- TODO: Add hero screenshot/GIF here -->
<!-- <p align="center"><img src="../../docs/hero.gif" alt="Demo de ApiArk" width="800" /></p> -->

## ¿Por qué ApiArk?

| | Postman | Bruno | Hoppscotch | **ApiArk** |
|---|---|---|---|---|
| **Framework** | Electron | Electron | Tauri | **Tauri v2** |
| **Uso de RAM** | 300-800 MB | 150-300 MB | 50-80 MB | **~60 MB** |
| **Arranque** | 10-30s | 3-8s | <2s | **<2s** |
| **Requiere cuenta** | Sí | No | Opcional | **No** |
| **Almacenamiento** | Nube | Sistema de archivos | IndexedDB | **Sistema de archivos (YAML)** |
| **Compatible con Git** | No | Sí (.bru) | No | **Sí (YAML estándar)** |
| **gRPC** | Sí | Sí | No | **Sí** |
| **WebSocket** | Sí | No | Sí | **Sí** |
| **SSE** | Sí | No | Sí | **Sí** |
| **MQTT** | No | No | No | **Sí** |
| **Servidores mock** | Solo nube | No | No | **Local** |
| **Monitores** | Solo nube | No | No | **Local** |
| **Sistema de plugins** | No | No | No | **JS + WASM** |
| **Captura de proxy** | No | No | No | **Sí** |
| **Comparación de respuestas** | No | No | No | **Sí** |

## Descargar

**[Última versión](https://github.com/berbicanes/apiark/releases/latest)**

| Plataforma | Descarga |
|----------|----------|
| **Windows** | [Instalador `.exe`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.msi`](https://github.com/berbicanes/apiark/releases/latest) |
| **macOS** | [Apple Silicon `.dmg`](https://github.com/berbicanes/apiark/releases/latest) &bull; [Intel `.dmg`](https://github.com/berbicanes/apiark/releases/latest) |
| **Linux** | [`.AppImage`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.deb`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.rpm`](https://github.com/berbicanes/apiark/releases/latest) |

<details>
<summary><strong>Gestores de paquetes</strong></summary>

```bash
# Homebrew (macOS/Linux) — próximamente
brew install --cask apiark

# Chocolatey (Windows) — próximamente
choco install apiark

# Snap (Linux) — próximamente
sudo snap install apiark

# AUR (Arch Linux) — próximamente
yay -S apiark-bin
```

¿Te interesa mantener un paquete? [Abre un issue](https://github.com/berbicanes/apiark/issues/new) y trabajaremos contigo.
</details>

<details>
<summary><strong>Compilar desde el código fuente</strong></summary>

**Requisitos previos:** Node.js 22+, pnpm 10+, toolchain de Rust, [dependencias del sistema para Tauri v2](https://v2.tauri.app/start/prerequisites/)

```bash
git clone https://github.com/berbicanes/apiark.git
cd apiark
pnpm install
pnpm tauri build
```
</details>

## Migrando desde Postman

1. Exporta tu colección de Postman (Collection v2.1 JSON)
2. Abre ApiArk
3. `Ctrl+K` > "Importar colección" > selecciona tu archivo
4. Listo. Tus peticiones ahora son archivos YAML que te pertenecen.

También importa desde: **Insomnia**, **Bruno**, **Hoppscotch**, **OpenAPI 3.x**, **HAR**, **cURL**.

## Características

**Multi-Protocolo** — REST, GraphQL, gRPC, WebSocket, SSE, MQTT, Socket.IO en una sola aplicación. Ninguna otra herramienta cubre tantos protocolos.

**Almacenamiento local** — Cada petición es un archivo `.yaml`. Las colecciones son directorios. Todo es compatible con diff de Git. Sin formatos propietarios.

**Modo oscuro + Temas** — Temas oscuro, claro y negro/OLED con 8 colores de acento.

**Scripts en TypeScript** — Scripts pre/post-petición con definiciones de tipo completas. `ark.test()`, `ark.expect()`, `ark.env.set()`.

**Ejecutor de colecciones** — Ejecuta colecciones completas con pruebas basadas en datos (CSV/JSON), iteraciones configurables, informes JUnit/HTML.

**Servidores mock locales** — Crea APIs simuladas desde tus colecciones. Datos con Faker.js, simulación de latencia, inyección de errores. Sin nube, sin límites de uso.

**Monitorización programada** — Pruebas automatizadas basadas en cron con notificaciones de escritorio y alertas por webhook. Se ejecuta localmente, no en el servidor de otro.

**Generación de documentación de API** — Genera documentación en HTML + Markdown desde tus colecciones.

**Editor OpenAPI** — Edita y valida especificaciones OpenAPI con integración de Spectral.

**Comparación de respuestas** — Compara respuestas lado a lado entre ejecuciones.

**Captura de proxy** — Proxy HTTP/HTTPS interceptor local para inspección y repetición de tráfico.

**Asistente de IA** — Lenguaje natural a peticiones, generación automática de pruebas, API compatible con OpenAI.

**Sistema de plugins** — Extiende ApiArk con plugins en JavaScript o WASM.

**Importa todo** — Postman, Insomnia, Bruno, Hoppscotch, OpenAPI, HAR, cURL. Migración con un clic.

## Rendimiento

Construido con Tauri v2 (backend en Rust + webview nativa del SO), no con Electron.

| Métrica | Objetivo |
|---|---|
| Tamaño del binario | ~20 MB |
| RAM en reposo | ~60 MB |
| Arranque en frío | <2s |
| Latencia de envío de petición | <10ms de overhead |

## Formato de datos

Tus datos son YAML puro. Sin dependencia de proveedor. Sin codificación propietaria.

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
# Ejecutar una colección
apiark run ./my-collection --env production

# Con pruebas basadas en datos
apiark run ./my-collection --data users.csv --reporter junit

# Importar una colección de Postman
apiark import postman-export.json
```

## Compromiso de no dependencia

> Si decides dejar ApiArk, tus datos se van contigo. Cada archivo está en un formato estándar. Cada base de datos es abierta. Nunca haremos difícil el cambio a otra herramienta.

## Comunidad

- [Discord](https://discord.gg/apiark) — Chat, preguntas y comentarios
- [Twitter / X](https://x.com/apiabordes) — Actualizaciones y anuncios
- [GitHub Discussions](https://github.com/berbicanes/apiark/discussions) — Ideas, preguntas y respuestas, muestra tu proyecto
- [GitHub Issues](https://github.com/berbicanes/apiark/issues) — Reportes de errores y solicitudes de funcionalidades

## Traducciones

La interfaz de ApiArk soporta internacionalización a través de `react-i18next`. Actualmente disponible en **inglés**.

¡Ayúdanos a traducir ApiArk a tu idioma! Consulta el directorio [`locales/`](../../apps/desktop/src/locales/) y envía un PR.

## Desarrollo

```bash
# Instalar dependencias
pnpm install

# Ejecutar en modo de desarrollo
pnpm tauri dev

# Verificación de TypeScript
pnpm -C apps/desktop exec tsc --noEmit

# Compilar para producción
pnpm tauri build
```

### Estructura del proyecto

```
apiark/
├── apps/
│   ├── desktop/           # Aplicación de escritorio Tauri v2
│   │   ├── src/           # Frontend en React
│   │   └── src-tauri/     # Backend en Rust
│   ├── cli/               # Herramienta CLI (Rust)
│   ├── mcp-server/        # Servidor MCP para editores con IA
│   └── vscode-extension/  # Extensión de VS Code
├── packages/
│   ├── types/             # Tipos TypeScript compartidos
│   └── importer/          # Importadores de colecciones
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

## Licencia

[MIT](../../LICENSE)

---

<p align="center">
  <sub>Si ApiArk mejora tu flujo de trabajo, considera darle una estrella. Ayuda a que otros descubran el proyecto.</sub>
</p>
