<p align="center">
  <img src="../../apps/desktop/src-tauri/icons/128x128@2x.png" alt="ApiArk" width="96" height="96" />
</p>

<h1 align="center">ApiArk</h1>

<p align="center">
  <strong>La plateforme API qui respecte votre vie privée, votre RAM et votre workflow Git.</strong>
</p>

<p align="center">
  Pas de compte. Pas de cloud. Pas de surplus.
</p>

<p align="center">
  <em>Postman utilise 800 Mo de RAM. ApiArk en utilise 60 Mo.</em>
</p>

<p align="center">
  <a href="https://github.com/berbicanes/apiark/releases/latest"><img src="https://img.shields.io/github/v/release/berbicanes/apiark?style=flat-square&color=6366f1" alt="Dernière version" /></a>
  <a href="https://github.com/berbicanes/apiark/releases/latest"><img src="https://img.shields.io/github/downloads/berbicanes/apiark/total?style=flat-square&color=22c55e" alt="Téléchargements" /></a>
  <a href="https://github.com/berbicanes/apiark/stargazers"><img src="https://img.shields.io/github/stars/berbicanes/apiark?style=flat-square&color=eab308" alt="Étoiles" /></a>
  <a href="https://github.com/berbicanes/apiark/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/berbicanes/apiark/ci.yml?style=flat-square&label=CI" alt="CI" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/berbicanes/apiark?style=flat-square" alt="Licence MIT" /></a>
</p>

<p align="center">
  <a href="#télécharger">Télécharger</a> &bull;
  <a href="#fonctionnalités">Fonctionnalités</a> &bull;
  <a href="#migrer-depuis-postman">Migrer depuis Postman</a> &bull;
  <a href="#performance">Performance</a> &bull;
  <a href="#communauté">Communauté</a> &bull;
  <a href="#développement">Développement</a>
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

## Pourquoi ApiArk ?

| | Postman | Bruno | Hoppscotch | **ApiArk** |
|---|---|---|---|---|
| **Framework** | Electron | Electron | Tauri | **Tauri v2** |
| **Utilisation RAM** | 300-800 Mo | 150-300 Mo | 50-80 Mo | **~60 Mo** |
| **Démarrage** | 10-30s | 3-8s | <2s | **<2s** |
| **Compte requis** | Oui | Non | Optionnel | **Non** |
| **Stockage** | Cloud | Système de fichiers | IndexedDB | **Système de fichiers (YAML)** |
| **Compatible Git** | Non | Oui (.bru) | Non | **Oui (YAML standard)** |
| **gRPC** | Oui | Oui | Non | **Oui** |
| **WebSocket** | Oui | Non | Oui | **Oui** |
| **SSE** | Oui | Non | Oui | **Oui** |
| **MQTT** | Non | Non | Non | **Oui** |
| **Serveurs mock** | Cloud uniquement | Non | Non | **Local** |
| **Moniteurs** | Cloud uniquement | Non | Non | **Local** |
| **Système de plugins** | Non | Non | Non | **JS + WASM** |
| **Capture proxy** | Non | Non | Non | **Oui** |
| **Comparaison de réponses** | Non | Non | Non | **Oui** |

## Télécharger

**[Dernière version](https://github.com/berbicanes/apiark/releases/latest)**

| Plateforme | Téléchargement |
|----------|----------|
| **Windows** | [Installateur `.exe`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.msi`](https://github.com/berbicanes/apiark/releases/latest) |
| **macOS** | [Apple Silicon `.dmg`](https://github.com/berbicanes/apiark/releases/latest) &bull; [Intel `.dmg`](https://github.com/berbicanes/apiark/releases/latest) |
| **Linux** | [`.AppImage`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.deb`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.rpm`](https://github.com/berbicanes/apiark/releases/latest) |

<details>
<summary><strong>Gestionnaires de paquets</strong></summary>

```bash
# Homebrew (macOS/Linux) — bientôt disponible
brew install --cask apiark

# Chocolatey (Windows) — bientôt disponible
choco install apiark

# Snap (Linux) — bientôt disponible
sudo snap install apiark

# AUR (Arch Linux) — bientôt disponible
yay -S apiark-bin
```

Vous souhaitez maintenir un paquet ? [Ouvrez un issue](https://github.com/berbicanes/apiark/issues/new) et nous travaillerons avec vous.
</details>

<details>
<summary><strong>Compiler depuis les sources</strong></summary>

**Prérequis :** Node.js 22+, pnpm 10+, toolchain Rust, [dépendances système Tauri v2](https://v2.tauri.app/start/prerequisites/)

```bash
git clone https://github.com/berbicanes/apiark.git
cd apiark
pnpm install
pnpm tauri build
```
</details>

## Migrer depuis Postman

1. Exportez votre collection Postman (Collection v2.1 JSON)
2. Ouvrez ApiArk
3. `Ctrl+K` > « Importer une collection » > sélectionnez votre fichier
4. Terminé. Vos requêtes sont désormais des fichiers YAML qui vous appartiennent.

Importe aussi depuis : **Insomnia**, **Bruno**, **Hoppscotch**, **OpenAPI 3.x**, **HAR**, **cURL**.

## Fonctionnalités

**Multi-Protocole** — REST, GraphQL, gRPC, WebSocket, SSE, MQTT, Socket.IO dans une seule application. Aucun outil n'offre une couverture de protocoles aussi large.

**Stockage local** — Chaque requête est un fichier `.yaml`. Les collections sont des répertoires. Tout est compatible avec le diff Git. Pas de formats propriétaires.

**Mode sombre + Thèmes** — Thèmes sombre, clair et noir/OLED avec 8 couleurs d'accentuation.

**Scripts TypeScript** — Scripts pré/post-requête avec définitions de types complètes. `ark.test()`, `ark.expect()`, `ark.env.set()`.

**Exécuteur de collections** — Exécutez des collections entières avec des tests pilotés par les données (CSV/JSON), itérations configurables, rapports JUnit/HTML.

**Serveurs mock locaux** — Créez des APIs simulées à partir de vos collections. Données Faker.js, simulation de latence, injection d'erreurs. Sans cloud, sans limites d'utilisation.

**Surveillance programmée** — Tests automatisés basés sur cron avec notifications de bureau et alertes webhook. Fonctionne localement, pas sur le serveur de quelqu'un d'autre.

**Génération de documentation API** — Générez de la documentation HTML + Markdown à partir de vos collections.

**Éditeur OpenAPI** — Éditez et validez des spécifications OpenAPI avec intégration Spectral.

**Comparaison de réponses** — Comparez les réponses côte à côte entre les exécutions.

**Capture proxy** — Proxy HTTP/HTTPS intercepteur local pour l'inspection et la relecture du trafic.

**Assistant IA** — Du langage naturel aux requêtes, génération automatique de tests, API compatible OpenAI.

**Système de plugins** — Étendez ApiArk avec des plugins JavaScript ou WASM.

**Importez tout** — Postman, Insomnia, Bruno, Hoppscotch, OpenAPI, HAR, cURL. Migration en un clic.

## Performance

Construit avec Tauri v2 (backend Rust + webview native de l'OS), pas avec Electron.

| Métrique | Objectif |
|---|---|
| Taille du binaire | ~20 Mo |
| RAM au repos | ~60 Mo |
| Démarrage à froid | <2s |
| Latence d'envoi de requête | <10ms d'overhead |

## Format de données

Vos données sont du YAML pur. Pas de dépendance fournisseur. Pas d'encodage propriétaire.

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
# Exécuter une collection
apiark run ./my-collection --env production

# Avec des tests pilotés par les données
apiark run ./my-collection --data users.csv --reporter junit

# Importer une collection Postman
apiark import postman-export.json
```

## Engagement de non-verrouillage

> Si vous décidez de quitter ApiArk, vos données partent avec vous. Chaque fichier est dans un format standard. Chaque base de données est ouverte. Nous ne rendrons jamais le changement difficile.

## Communauté

- [Discord](https://discord.gg/apiark) — Discussion, questions et retours
- [Twitter / X](https://x.com/apiabordes) — Mises à jour et annonces
- [GitHub Discussions](https://github.com/berbicanes/apiark/discussions) — Idées, questions-réponses, présentations
- [GitHub Issues](https://github.com/berbicanes/apiark/issues) — Rapports de bugs et demandes de fonctionnalités

## Traductions

L'interface d'ApiArk supporte l'internationalisation via `react-i18next`. Actuellement disponible en **anglais**.

Aidez-nous à traduire ApiArk dans votre langue ! Consultez le répertoire [`locales/`](../../apps/desktop/src/locales/) et soumettez un PR.

## Développement

```bash
# Installer les dépendances
pnpm install

# Lancer en mode développement
pnpm tauri dev

# Vérification TypeScript
pnpm -C apps/desktop exec tsc --noEmit

# Compiler pour la production
pnpm tauri build
```

### Structure du projet

```
apiark/
├── apps/
│   ├── desktop/           # Application de bureau Tauri v2
│   │   ├── src/           # Frontend React
│   │   └── src-tauri/     # Backend Rust
│   ├── cli/               # Outil CLI (Rust)
│   ├── mcp-server/        # Serveur MCP pour éditeurs IA
│   └── vscode-extension/  # Extension VS Code
├── packages/
│   ├── types/             # Types TypeScript partagés
│   └── importer/          # Importateurs de collections
└── docs/                  # Documentation
```

### Stack technique

**Frontend :** React 19, TypeScript, Vite 6, Zustand, Tailwind CSS 4, Monaco Editor, Radix UI

**Backend :** Rust, Tauri v2, reqwest, tokio, tonic (gRPC), axum (serveurs mock), deno_core (scripting)

## Contribuer

Contributions are welcome! Check out the [GitHub Issues](https://github.com/berbicanes/apiark/issues) for open tasks and feature requests.

<a href="https://github.com/berbicanes/apiark/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=berbicanes/apiark" alt="Contributeurs" />
</a>

## Licence

[MIT](../../LICENSE)

---

<p align="center">
  <sub>Si ApiArk améliore votre workflow, pensez à lui donner une étoile. Cela aide les autres à découvrir le projet.</sub>
</p>
