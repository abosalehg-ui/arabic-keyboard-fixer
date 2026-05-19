# 🔧 مُصحّح لوحة المفاتيح العربية | Arabic Keyboard Fixer

[![Deploy to GitHub Pages](https://github.com/abosalehg-ui/arabic-keyboard-fixer/actions/workflows/deploy.yml/badge.svg)](https://github.com/abosalehg-ui/arabic-keyboard-fixer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![HTML5](https://img.shields.io/badge/HTML5-E34C26?style=flat&logo=html5&logoColor=white)](https://html.spec.whatwg.org)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://www.javascript.com)

تطبيق ويب يحل مشكلة الكتابة بتخطيط لوحة مفاتيح خاطئ — عندما تنسى التبديل بين العربية والإنجليزية.

**[🚀 جرّب التطبيق مباشرة](https://abosalehg-ui.github.io/arabic-keyboard-fixer)**

---

## المشكلة والحل

```
❌ الإدخال:  g]d la;gm td hg;jhfm fg,pm hglthjdp
✅ النتيجة:  لدي مشكلة في الكتابة بلوحة المفاتيح
```

---

## ✨ الميزات

- **معالجة فورية** — بدون تأخير، يعمل بالكامل في المتصفح بدون إنترنت
- **كشف تلقائي** — يكتشف التخطيط الخاطئ ويقترح التصحيح ويرتّب الاقتراحات حسب الثقة
- **تخطيطات متعددة** — دعم Arabic 101 (الشائع في Windows) و Arabic 102
- **تحويل ثنائي** — عربي ↔ إنجليزي
- **وضع ليلي وفاتح** — تبديل المظهر مع حفظ التفضيل، واحترام `prefers-color-scheme`
- **سجل التصحيحات** — يحفظ آخر 20 تصحيحاً في `localStorage` مع زر مسح وتصدير JSON
- **اختصارات لوحة المفاتيح** — `Ctrl+Enter` لتطبيق أول اقتراح، `Ctrl+L` لمسح الإدخال
- **PWA** — قابل للتثبيت ويعمل دون اتصال عبر service worker
- **خصوصية تامة** — لا تتبع، لا إعلانات، لا إرسال بيانات لأي خادم

---

## 🚀 الاستخدام

### الطريقة الأسهل
افتح التطبيق مباشرة: [abosalehg-ui.github.io/arabic-keyboard-fixer](https://abosalehg-ui.github.io/arabic-keyboard-fixer)

### التشغيل محلياً
```bash
git clone https://github.com/abosalehg-ui/arabic-keyboard-fixer.git
cd arabic-keyboard-fixer
open index.html   # أو start index.html على Windows
```

التطبيق ملف `index.html` واحد فقط — لا يحتاج تثبيت أو تبعيات.

---

## ⌨️ تخطيطات لوحة المفاتيح المدعومة

### QWERTY → Arabic 101 (الأكثر شيوعاً)

| q | w | e | r | t | y | u | i | o | p | \[ | \] |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ض | ص | ث | ق | ف | غ | ع | ه | خ | ح | ج | د |

| a | s | d | f | g | h | j | k | l | ; | ' |
|---|---|---|---|---|---|---|---|---|---|---|
| ش | س | ي | ب | ل | ا | ت | ن | م | ك | ط |

| z | x | c | v | b | n | m | , | . | / |
|---|---|---|---|---|---|---|---|---|---|
| ئ | ء | ؤ | ر | لا | ى | ة | و | ز | ؟ |

> تخطيط **Arabic 102** مدعوم أيضاً — اختره من القائمة داخل التطبيق.

---

## 📈 خريطة الطريق

- [x] تصحيح جداول التحويل (101 و 102)
- [x] واجهة احترافية مع وضع ليلي وفاتح
- [x] سجل التصحيحات مع حفظ محلي وتصدير JSON
- [x] تحويل ثنائي عربي ↔ إنجليزي
- [x] اختصارات لوحة المفاتيح
- [x] PWA (تثبيت + offline)
- [x] اختبارات وحدة
- [ ] دعم تخطيطات إضافية
- [ ] نسخة تطبيق سطح مكتب
- [ ] نسخة تطبيق موبايل
- [ ] تصحيح إملائي
- [ ] دعم لغات أخرى

## 🧪 الاختبارات

```bash
node tests/converter.test.js
```

---

## 🤝 المساهمة

نرحب بالمساهمات! راجع ملف [CONTRIBUTING.md](CONTRIBUTING.md) للتفاصيل.

```bash
# الخطوات السريعة
git checkout -b feature/your-feature
# قم بالتعديلات واختبرها
git commit -m "Add: وصف مختصر"
git push origin feature/your-feature
# ثم افتح Pull Request
```

---

## 📝 الترخيص

هذا المشروع مرخص تحت [رخصة MIT](LICENSE).

**تطوير:** عبدالكريم العبود — [abo.saleh.g@gmail.com](mailto:abo.saleh.g@gmail.com)

---

### 🌟 أعجبك المشروع؟ أضف ⭐ Star!
