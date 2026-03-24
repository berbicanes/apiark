<div dir="rtl">

<p align="center">
  <img src="../../apps/desktop/src-tauri/icons/128x128@2x.png" alt="ApiArk" width="96" height="96" />
</p>

<h1 align="center">ApiArk</h1>

<p align="center">
  <strong>منصة API التي تحترم خصوصيتك وذاكرتك وسير عملك مع Git.</strong>
</p>

<p align="center">
  بدون تسجيل دخول. بدون سحابة. بدون تضخم.
</p>

<p align="center">
  <em>Postman يستهلك 800 ميجابايت من الذاكرة. ApiArk يستهلك 60 ميجابايت.</em>
</p>

<p align="center">
  <a href="https://github.com/berbicanes/apiark/releases/latest"><img src="https://img.shields.io/github/v/release/berbicanes/apiark?style=flat-square&color=6366f1" alt="آخر إصدار" /></a>
  <a href="https://github.com/berbicanes/apiark/releases/latest"><img src="https://img.shields.io/github/downloads/berbicanes/apiark/total?style=flat-square&color=22c55e" alt="التنزيلات" /></a>
  <a href="https://github.com/berbicanes/apiark/stargazers"><img src="https://img.shields.io/github/stars/berbicanes/apiark?style=flat-square&color=eab308" alt="النجوم" /></a>
  <a href="https://github.com/berbicanes/apiark/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/berbicanes/apiark/ci.yml?style=flat-square&label=CI" alt="CI" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/github/license/berbicanes/apiark?style=flat-square" alt="رخصة MIT" /></a>
</p>

<p align="center">
  <a href="#التنزيل">التنزيل</a> &bull;
  <a href="#الميزات">الميزات</a> &bull;
  <a href="#الانتقال-من-postman">الانتقال من Postman</a> &bull;
  <a href="#الأداء">الأداء</a> &bull;
  <a href="#المجتمع">المجتمع</a> &bull;
  <a href="#التطوير">التطوير</a>
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

</div>

---

<!-- TODO: Add hero screenshot/GIF here -->
<!-- <p align="center"><img src="../../docs/hero.gif" alt="عرض ApiArk التوضيحي" width="800" /></p> -->

## لماذا ApiArk؟

| | Postman | Bruno | Hoppscotch | **ApiArk** |
|---|---|---|---|---|
| **إطار العمل** | Electron | Electron | Tauri | **Tauri v2** |
| **استهلاك الذاكرة** | 300-800 MB | 150-300 MB | 50-80 MB | **~60 MB** |
| **وقت التشغيل** | 10-30s | 3-8s | <2s | **<2s** |
| **يتطلب حسابًا** | نعم | لا | اختياري | **لا** |
| **تخزين البيانات** | سحابي | نظام الملفات | IndexedDB | **نظام الملفات (YAML)** |
| **متوافق مع Git** | لا | نعم (.bru) | لا | **نعم (YAML قياسي)** |
| **gRPC** | نعم | نعم | لا | **نعم** |
| **WebSocket** | نعم | لا | نعم | **نعم** |
| **SSE** | نعم | لا | نعم | **نعم** |
| **MQTT** | لا | لا | لا | **نعم** |
| **خوادم وهمية** | سحابي فقط | لا | لا | **محلي** |
| **المراقبة** | سحابي فقط | لا | لا | **محلي** |
| **نظام الإضافات** | لا | لا | لا | **JS + WASM** |
| **التقاط الوكيل** | لا | لا | لا | **نعم** |
| **مقارنة الاستجابات** | لا | لا | لا | **نعم** |

## التنزيل

**[آخر إصدار](https://github.com/berbicanes/apiark/releases/latest)**

| المنصة | التنزيل |
|----------|----------|
| **Windows** | [مثبّت `.exe`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.msi`](https://github.com/berbicanes/apiark/releases/latest) |
| **macOS** | [Apple Silicon `.dmg`](https://github.com/berbicanes/apiark/releases/latest) &bull; [Intel `.dmg`](https://github.com/berbicanes/apiark/releases/latest) |
| **Linux** | [`.AppImage`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.deb`](https://github.com/berbicanes/apiark/releases/latest) &bull; [`.rpm`](https://github.com/berbicanes/apiark/releases/latest) |

<details>
<summary><strong>مديرو الحزم</strong></summary>

```bash
# Homebrew (macOS/Linux) — قريبًا
brew install --cask apiark

# Chocolatey (Windows) — قريبًا
choco install apiark

# Snap (Linux) — قريبًا
sudo snap install apiark

# AUR (Arch Linux) — قريبًا
yay -S apiark-bin
```

هل أنت مهتم بصيانة حزمة؟ [افتح issue](https://github.com/berbicanes/apiark/issues/new) وسنعمل معك.
</details>

<details>
<summary><strong>البناء من الشيفرة المصدرية</strong></summary>

**المتطلبات الأساسية:** Node.js 22+، pnpm 10+، أدوات Rust، [متطلبات نظام Tauri v2](https://v2.tauri.app/start/prerequisites/)

```bash
git clone https://github.com/berbicanes/apiark.git
cd apiark
pnpm install
pnpm tauri build
```
</details>

## الانتقال من Postman

1. صدّر مجموعتك من Postman (Collection v2.1 JSON)
2. افتح ApiArk
3. `Ctrl+K` > "Import Collection" > اختر ملفك
4. انتهى. طلباتك الآن ملفات YAML تملكها أنت.

يمكن الاستيراد أيضًا من: **Insomnia**، **Bruno**، **Hoppscotch**، **OpenAPI 3.x**، **HAR**، **cURL**.

## الميزات

**متعدد البروتوكولات** — REST، GraphQL، gRPC، WebSocket، SSE، MQTT، Socket.IO في تطبيق واحد. لا توجد أداة أخرى تغطي هذا العدد من البروتوكولات.

**تخزين محلي أولًا** — كل طلب هو ملف `.yaml`. المجموعات هي مجلدات. كل شيء متوافق مع Git diff. بدون صيغ مملوكة.

**الوضع الداكن + السمات** — سمات داكنة وفاتحة وسوداء/OLED مع 8 ألوان تمييز.

**برمجة TypeScript** — سكريبتات ما قبل/بعد الطلب مع تعريفات أنواع كاملة. `ark.test()`، `ark.expect()`، `ark.env.set()`.

**منفّذ المجموعات** — شغّل مجموعات كاملة مع اختبارات مبنية على البيانات (CSV/JSON)، تكرارات قابلة للتخصيص، تقارير JUnit/HTML.

**خوادم وهمية محلية** — أنشئ واجهات API وهمية من مجموعاتك. بيانات Faker.js، محاكاة التأخير، حقن الأخطاء. بدون سحابة، بدون حدود استخدام.

**مراقبة مجدولة** — اختبارات آلية مبنية على cron مع إشعارات سطح المكتب وتنبيهات webhook. تعمل محليًا، وليس على خادم شخص آخر.

**توليد وثائق API** — إنشاء وثائق HTML + Markdown من مجموعاتك.

**محرر OpenAPI** — تحرير والتحقق من مواصفات OpenAPI مع تكامل Spectral.

**مقارنة الاستجابات** — قارن الاستجابات جنبًا إلى جنب عبر عمليات التشغيل المختلفة.

**التقاط الوكيل** — وكيل HTTP/HTTPS محلي اعتراضي لفحص حركة المرور وإعادة تشغيلها.

**مساعد الذكاء الاصطناعي** — من اللغة الطبيعية إلى الطلبات، توليد اختبارات تلقائيًا، API متوافق مع OpenAI.

**نظام الإضافات** — وسّع ApiArk بإضافات JavaScript أو WASM.

**استيراد كل شيء** — Postman، Insomnia، Bruno، Hoppscotch، OpenAPI، HAR، cURL. انتقال بنقرة واحدة.

## الأداء

مبني بتقنية Tauri v2 (واجهة خلفية Rust + webview أصلي لنظام التشغيل)، وليس Electron.

| المقياس | الهدف |
|---|---|
| حجم الملف التنفيذي | ~20 MB |
| الذاكرة في وضع الخمول | ~60 MB |
| بدء التشغيل البارد | <2s |
| تأخير إرسال الطلب | <10ms حمل إضافي |

## صيغة البيانات

بياناتك هي YAML بسيط. بدون تقييد بمزوّد. بدون ترميز مملوك.

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
# تشغيل مجموعة
apiark run ./my-collection --env production

# مع اختبارات مبنية على البيانات
apiark run ./my-collection --data users.csv --reporter junit

# استيراد مجموعة Postman
apiark import postman-export.json
```

## تعهد عدم التقييد

> إذا قررت مغادرة ApiArk، فإن بياناتك تغادر معك. كل ملف بصيغة قياسية. كل قاعدة بيانات مفتوحة. لن نجعل الانتقال إلى أداة أخرى صعبًا أبدًا.

## المجتمع

- [Discord](https://discord.gg/apiark) — محادثة، أسئلة وملاحظات
- [Twitter / X](https://x.com/apiabordes) — تحديثات وإعلانات
- [GitHub Discussions](https://github.com/berbicanes/apiark/discussions) — أفكار، أسئلة وأجوبة، شارك مشروعك
- [GitHub Issues](https://github.com/berbicanes/apiark/issues) — تقارير الأخطاء وطلبات الميزات

## الترجمات

واجهة ApiArk تدعم التدويل عبر `react-i18next`. متوفرة حاليًا باللغة **الإنجليزية**.

ساعدنا في ترجمة ApiArk إلى لغتك! راجع مجلد [`locales/`](../../apps/desktop/src/locales/) وأرسل PR.

## التطوير

```bash
# تثبيت التبعيات
pnpm install

# التشغيل في وضع التطوير
pnpm tauri dev

# فحص TypeScript
pnpm -C apps/desktop exec tsc --noEmit

# البناء للإنتاج
pnpm tauri build
```

### هيكل المشروع

```
apiark/
├── apps/
│   ├── desktop/           # تطبيق سطح المكتب Tauri v2
│   │   ├── src/           # واجهة React الأمامية
│   │   └── src-tauri/     # واجهة Rust الخلفية
│   ├── cli/               # أداة CLI (Rust)
│   ├── mcp-server/        # خادم MCP لمحررات الذكاء الاصطناعي
│   └── vscode-extension/  # إضافة VS Code
├── packages/
│   ├── types/             # أنواع TypeScript المشتركة
│   └── importer/          # مستوردو المجموعات
└── docs/                  # Documentation
```

### التقنيات المستخدمة

**الواجهة الأمامية:** React 19, TypeScript, Vite 6, Zustand, Tailwind CSS 4, Monaco Editor, Radix UI

**الواجهة الخلفية:** Rust, Tauri v2, reqwest, tokio, tonic (gRPC), axum (خوادم وهمية), deno_core (محرك البرمجة)

## المساهمة

Contributions are welcome! Check out the [GitHub Issues](https://github.com/berbicanes/apiark/issues) for open tasks and feature requests.

<a href="https://github.com/berbicanes/apiark/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=berbicanes/apiark" alt="المساهمون" />
</a>

## الرخصة

[MIT](../../LICENSE)

---

<p align="center">
  <sub>إذا ساعدك ApiArk في سير عملك، فكّر في منحه نجمة. يساعد ذلك الآخرين على اكتشاف المشروع.</sub>
</p>
