# 🔧 مُصحّح لوحة المفاتيح العربية | Arabic Keyboard Fixer

[![Deploy to GitHub Pages](https://github.com/abosalehg-ui/arabic-keyboard-fixer/actions/workflows/deploy.yml/badge.svg)](https://github.com/abosalehg-ui/arabic-keyboard-fixer/actions/workflows/deploy.yml)
[![Test](https://github.com/abosalehg-ui/arabic-keyboard-fixer/actions/workflows/test.yml/badge.svg)](https://github.com/abosalehg-ui/arabic-keyboard-fixer/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?style=flat&logo=pwa&logoColor=white)](https://abosalehg-ui.github.io/arabic-keyboard-fixer)
[![No build](https://img.shields.io/badge/build-none-success?style=flat)](#-التشغيل-محلياً)

تطبيق ويب يحل مشكلة الكتابة بتخطيط لوحة مفاتيح خاطئ — عندما تنسى التبديل بين العربية والإنجليزية. يكتشف الخطأ تلقائياً ويقترح التصحيح في كلا الاتجاهين.

**[🚀 جرّب التطبيق مباشرة](https://abosalehg-ui.github.io/arabic-keyboard-fixer)**

---

## 🎯 المشكلة والحل

```
❌ الإدخال:  g]d la;gm td hg;jhfm fg,pm hglthjdp
✅ النتيجة:  لدي مشكلة في الكتابة بلوحة المفاتيح
```

---

## ✨ الميزات

### الأساسيات
- **معالجة فورية** — كل شيء يحدث في المتصفح، بدون تأخير ولا اتصال بخادم.
- **كشف تلقائي ذكي** — يحلّل النص ويقترح التحويل في الاتجاه المرجّح، مع ترتيب الاقتراحات حسب درجة الثقة.
- **تخطيطات متعددة** — Arabic 101 (الشائع في Windows) و Arabic 102.
- **تحويل ثنائي** — عربي ↔ إنجليزي، مع زر تبديل يدوي ⇄ للحالات الصعبة.

### تجربة المستخدم
- **وضع ليلي/فاتح** — تبديل سلس مع حفظ التفضيل، ويحترم `prefers-color-scheme` عند أول زيارة.
- **واجهة بلغتين** — عربي/إنجليزي مع تبديل فوري وحفظ الاختيار.
- **اختصارات لوحة المفاتيح:**
  - `Ctrl+Enter` — تطبيق أول اقتراح
  - `Ctrl+L` — مسح الإدخال
  - `Ctrl+Shift+C` — نسخ أول اقتراح
- **سجل تصحيحات** — يحفظ آخر 20 تصحيحاً محلياً مع زر مسح وتصدير JSON.

### بنية تحتية
- **PWA** — قابل للتثبيت ويعمل بالكامل دون اتصال عبر service worker.
- **استجابة كاملة** — يعمل على الموبايل والديسكتوب مع أحجام لمس مناسبة.
- **متاح للجميع (a11y)** — ARIA labels، skip link، تشغيل بلوحة المفاتيح، وملاحظة `prefers-reduced-motion`.
- **بيئة آمنة** — لا `innerHTML` للنص المُدخل، لا `eval`، لا تتبع، لا إعلانات.

---

## 🚀 الاستخدام

### الطريقة الأسهل
افتح التطبيق مباشرة: [abosalehg-ui.github.io/arabic-keyboard-fixer](https://abosalehg-ui.github.io/arabic-keyboard-fixer)

### التشغيل محلياً
```bash
git clone https://github.com/abosalehg-ui/arabic-keyboard-fixer.git
cd arabic-keyboard-fixer
# أي خادم HTTP محلي بسيط (يحتاج HTTP حتى يعمل service worker و fetch للـ locales)
python3 -m http.server 8000
# ثم افتح: http://localhost:8000
```

> فتح `index.html` مباشرة من القرص يعمل لكن قد تتعطل ميزة تبديل اللغة وتسجيل service worker بسبب قيود `file://`.

التطبيق لا يحتاج أي بنية بناء (build)، ولا تبعيات npm، ولا transpilation.

---

## 📁 بنية المشروع

```
arabic-keyboard-fixer/
├── index.html              # هيكل HTML والبيانات الوصفية (SEO/OG/JSON-LD)
├── css/styles.css          # كل التنسيقات (CSS variables للوضع الليلي/الفاتح)
├── js/app.js               # المنطق: التحويل، الواجهة، السجل، السمات، i18n
├── locales/
│   ├── ar.json             # النصوص العربية للواجهة
│   └── en.json             # النصوص الإنجليزية للواجهة
├── manifest.webmanifest    # بيانات PWA (الاسم، الأيقونة، السمة)
├── service-worker.js       # تخزين stale-while-revalidate للعمل دون اتصال
├── tests/converter.test.js # اختبارات الوحدة بدون تبعيات
└── .github/workflows/
    ├── deploy.yml          # نشر تلقائي إلى GitHub Pages عند push إلى main
    └── test.yml            # تشغيل الاختبارات على كل push و PR
```

---

## ⌨️ تخطيطات لوحة المفاتيح المدعومة

### QWERTY → Arabic 101 (الأكثر شيوعاً)

| q | w | e | r | t | y | u | i | o | p | \[ | \] |
|---|---|---|---|---|---|---|---|---|---|----|----|
| ض | ص | ث | ق | ف | غ | ع | ه | خ | ح | ج | د |

| a | s | d | f | g | h | j | k | l | ; | ' |
|---|---|---|---|---|---|---|---|---|---|---|
| ش | س | ي | ب | ل | ا | ت | ن | م | ك | ط |

| z | x | c | v | b | n | m | , | . | / |
|---|---|---|---|---|---|---|---|---|---|
| ئ | ء | ؤ | ر | لا | ى | ة | و | ز | ؟ |

> تخطيط **Arabic 102** مدعوم أيضاً — يظهر تلقائياً كاقتراح ثانٍ مع درجة ثقة مستقلة.

---

## 🧪 الاختبارات

```bash
node tests/converter.test.js
```

تُشغَّل تلقائياً على كل push و pull request عبر [GitHub Actions](.github/workflows/test.yml). الاختبارات تستخرج الدوال الصافية من `js/app.js` وتُجري assertions بدون مكتبات خارجية.

---

## 📈 خريطة الطريق

### مُنجز
- [x] تصحيح جداول التحويل (Arabic 101 و 102)
- [x] واجهة احترافية بوضعَي ليلي وفاتح
- [x] تحويل ثنائي عربي ↔ إنجليزي
- [x] كشف تلقائي مع ترتيب الاقتراحات حسب الثقة
- [x] سجل تصحيحات محفوظ في `localStorage` (20 عنصر، تصدير/مسح)
- [x] اختصارات لوحة مفاتيح
- [x] زر تبديل اتجاه يدوي
- [x] PWA (تثبيت + offline)
- [x] واجهة بلغتين (i18n)
- [x] إمكانية الوصول (ARIA، skip link، prefers-reduced-motion)
- [x] SEO + Open Graph + JSON-LD
- [x] اختبارات وحدة + CI

### قادم
- [ ] دعم تخطيطات إضافية (Mac Arabic، Phonetic…)
- [ ] تصحيح إملائي عربي بسيط
- [ ] إضافة لمتصفحات Chrome/Firefox
- [ ] دعم لغات أخرى (فارسي، عبري…)

---

## 🤝 المساهمة

نرحب بالمساهمات! راجع [CONTRIBUTING.md](CONTRIBUTING.md) لإرشادات التطوير.

```bash
git checkout -b feature/your-feature
# قم بالتعديلات
node tests/converter.test.js     # تأكد أن الاختبارات تمر
git commit -m "Add: وصف مختصر"
git push origin feature/your-feature
# افتح Pull Request
```

---

## 📝 الترخيص

هذا المشروع مرخص تحت [رخصة MIT](LICENSE).

**تطوير:** عبدالكريم العبود — [abo.saleh.g@gmail.com](mailto:abo.saleh.g@gmail.com)

---

### 🌟 أعجبك المشروع؟ أضف ⭐ Star!
