const qwertyToArabic101 = {
    'q': 'ض', 'w': 'ص', 'e': 'ث', 'r': 'ق', 't': 'ف', 'y': 'غ', 'u': 'ع', 'i': 'ه', 'o': 'خ', 'p': 'ح', '[': 'ج', ']': 'د',
    'a': 'ش', 's': 'س', 'd': 'ي', 'f': 'ب', 'g': 'ل', 'h': 'ا', 'j': 'ت', 'k': 'ن', 'l': 'م', ';': 'ك', "'": 'ط',
    'z': 'ئ', 'x': 'ء', 'c': 'ؤ', 'v': 'ر', 'b': 'لا', 'n': 'ى', 'm': 'ة', ',': 'و', '.': 'ز', '/': '؟',
    '`': 'ذ'
};

const qwertyToArabic102 = {
    'q': 'ف', 'w': 'ك', 'e': 'ج', 'r': 'د', 't': 'ش', 'y': 'غ', 'u': 'س', 'i': 'ا', 'o': 'ي', 'p': 'ب', '[': 'ص', ']': 'ض',
    'a': 'ل', 's': 'م', 'd': 'ن', 'f': 'ت', 'g': 'ة', 'h': 'خ', 'j': 'ه', 'k': 'ع', 'l': 'ق', ';': 'ط', "'": 'و',
    'z': 'ئ', 'x': 'ء', 'c': 'ؤ', 'v': 'ر', 'b': 'لا', 'n': 'ى', 'm': 'ز', ',': 'و', '.': 'ز', '/': '؟',
    '`': 'ذ'
};

const arabicToQwerty101 = {};
Object.entries(qwertyToArabic101).forEach(([key, value]) => {
    if (!(value in arabicToQwerty101)) arabicToQwerty101[value] = key;
});

const arabicChars = new Set(Object.values(qwertyToArabic101).flatMap(v => [...v]));
const englishLayoutChars = /[a-zA-Z\[\]';,./`]/;

const textInput = document.getElementById('textInput');
const suggestionsContainer = document.getElementById('suggestionsContainer');
const charCountSpan = document.getElementById('charCount');
const historyContainer = document.getElementById('historyContainer');
const themeToggleBtn = document.getElementById('themeToggle');
const swapDirectionBtn = document.getElementById('swapDirection');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const exportHistoryBtn = document.getElementById('exportHistoryBtn');

const STORAGE_HISTORY = 'akf_history';
const STORAGE_THEME = 'akf_theme';
const MAX_HISTORY = 20;
const MAX_INPUT_LENGTH = 50000;

let history = loadHistory();

function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_HISTORY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(it => it && typeof it.original === 'string' && typeof it.fixed === 'string');
    } catch (e) {
        return [];
    }
}

function saveHistory() {
    try {
        localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
    } catch (e) {
        // quota exceeded or storage disabled — keep in-memory copy only
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    themeToggleBtn.setAttribute('aria-label', theme === 'dark' ? 'تبديل إلى المظهر الفاتح' : 'تبديل إلى المظهر الداكن');
}

function initTheme() {
    let theme;
    try { theme = localStorage.getItem(STORAGE_THEME); } catch (e) { /* ignore */ }
    if (!theme) {
        theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    applyTheme(theme);
}

themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(STORAGE_THEME, next); } catch (e) { /* ignore */ }
});

clearHistoryBtn.addEventListener('click', () => {
    if (history.length === 0) return;
    history = [];
    saveHistory();
    renderHistory();
    showToast('🗑️ تم مسح السجل');
});

/**
 * Force-convert input in the opposite direction when auto-detection
 * is wrong or the text mixes characters from both layouts.
 */
swapDirectionBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (!text) {
        showToast('لا يوجد نص للتبديل');
        return;
    }
    let arabicCount = 0;
    for (const ch of text) if (arabicChars.has(ch)) arabicCount++;
    const isArabicMajority = arabicCount > [...text].length / 2;
    const converted = isArabicMajority
        ? convertToEnglish(text)
        : convertToArabic(text, qwertyToArabic101);
    textInput.value = converted;
    addToHistory(text, converted);
    detectInput();
    showToast(isArabicMajority ? '⇄ حُوّل إلى إنجليزي' : '⇄ حُوّل إلى عربي');
});

exportHistoryBtn.addEventListener('click', () => {
    if (history.length === 0) {
        showToast('لا يوجد سجل للتصدير');
        return;
    }
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arabic-keyboard-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

/**
 * Convert a QWERTY-typed string to Arabic using the given mapping.
 * Characters not in the mapping (digits, spaces, punctuation already in Arabic) are kept as-is.
 * @param {string} text
 * @param {Record<string,string>} mapping - e.g. qwertyToArabic101 or qwertyToArabic102
 * @returns {string}
 */
function convertToArabic(text, mapping) {
    let result = '';
    for (const char of text) {
        const lower = char.toLowerCase();
        result += mapping[lower] || char;
    }
    return result;
}

/**
 * Convert Arabic text back to QWERTY characters via the reverse Arabic-101 map.
 * @param {string} text
 * @returns {string}
 */
function convertToEnglish(text) {
    let result = '';
    for (const char of text) {
        result += arabicToQwerty101[char] || char;
    }
    return result;
}

/**
 * Fraction (0-100) of characters in `text` that belong to the Arabic alphabet.
 * Used as a heuristic to rank 101 vs 102 conversion candidates.
 * @param {string} text
 * @returns {number}
 */
function scoreArabicness(text) {
    if (!text) return 0;
    let arabicMatches = 0;
    for (const char of text) {
        if (arabicChars.has(char)) arabicMatches++;
    }
    return Math.round((arabicMatches / [...text].length) * 100);
}

/**
 * Fraction (0-100) of characters in `text` that are English letters or common ASCII punctuation.
 * @param {string} text
 * @returns {number}
 */
function scoreEnglishness(text) {
    if (!text) return 0;
    let matches = 0;
    const stripped = [...text];
    for (const char of stripped) {
        if (/[a-zA-Z\s.,!?'"()\-]/.test(char)) matches++;
    }
    return Math.round((matches / stripped.length) * 100);
}

/**
 * Inspect text and return a sorted list of conversion suggestions, or null if none apply.
 * Behavior:
 *  - Mostly English-layout chars → propose Arabic 101 + 102 (sorted by Arabic-ness score)
 *  - Mostly Arabic chars → propose English (Arabic-101 reverse)
 * @param {string} text
 * @returns {Array<{type:string,text:string,confidence:number,original:string}>|null}
 */
function detectAndFix(text) {
    if (!text.trim()) return null;

    let arabicCount = 0, englishCount = 0;
    for (const char of text) {
        if (arabicChars.has(char)) arabicCount++;
        else if (englishLayoutChars.test(char)) englishCount++;
    }

    const suggestions = [];
    const totalCount = arabicCount + englishCount || 1;

    if (englishCount > arabicCount && englishCount > text.length * 0.5) {
        const arabic101 = convertToArabic(text, qwertyToArabic101);
        const arabic102 = convertToArabic(text, qwertyToArabic102);

        suggestions.push({
            type: 'تحويل إلى عربي (101)',
            text: arabic101,
            confidence: scoreArabicness(arabic101),
            original: text
        });
        if (arabic102 !== arabic101) {
            suggestions.push({
                type: 'تحويل إلى عربي (102)',
                text: arabic102,
                confidence: scoreArabicness(arabic102),
                original: text
            });
        }
        suggestions.sort((a, b) => b.confidence - a.confidence);
    }

    if (arabicCount > englishCount && arabicCount > text.length * 0.5) {
        const english = convertToEnglish(text);
        suggestions.push({
            type: 'تحويل إلى إنجليزي',
            text: english,
            confidence: Math.round((arabicCount / totalCount) * 100),
            original: text
        });
    }

    return suggestions.length > 0 ? suggestions : null;
}

/**
 * Tiny element builder: el('div', { className: 'x' }, child, child, …).
 * `children` may be DOM nodes, strings (escaped via textContent), or arrays of either.
 * @param {string} tag
 * @param {Object} [attrs]
 * @param  {...(Node|string|Array)} children
 */
function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
            if (v == null) continue;
            if (k === 'className') node.className = v;
            else if (k === 'text') node.textContent = v;
            else if (k === 'onClick') node.addEventListener('click', v);
            else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
            else if (k === 'dataset') Object.assign(node.dataset, v);
            else node.setAttribute(k, v);
        }
    }
    for (const child of children.flat(Infinity)) {
        if (child == null || child === false) continue;
        node.append(child);
    }
    return node;
}

function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
}

function emptyState(message) {
    return el('div', { className: 'empty-state', text: message });
}

function buildSuggestionItem(s, index) {
    return el('div', { className: 'suggestion-item' },
        el('div', { className: 'suggestion-text' },
            el('div', { className: 'suggestion-type', text: s.type }),
            el('div', { className: 'suggestion-content', text: s.text }),
            el('div', { className: 'confidence', text: `دقة الكشف: ${s.confidence}%` })
        ),
        el('div', { className: 'suggestion-actions' },
            el('button', {
                className: 'btn-fix',
                type: 'button',
                text: '✓ تطبيق',
                'aria-label': `تطبيق الاقتراح: ${s.type}`,
                onClick: () => applySuggestion(index)
            }),
            el('button', {
                className: 'btn-copy',
                type: 'button',
                text: '📋 نسخ',
                'aria-label': `نسخ نص الاقتراح: ${s.type}`,
                onClick: () => copySuggestion(s.text)
            })
        )
    );
}

function renderList(container, items, emptyMessage, builder) {
    clearChildren(container);
    if (!items || items.length === 0) {
        container.append(emptyState(emptyMessage));
        return;
    }
    items.forEach((item, i) => container.append(builder(item, i)));
}

function renderSuggestions(suggestions) {
    renderList(
        suggestionsContainer,
        suggestions,
        'لم يتم اكتشاف أخطاء لوحة مفاتيح',
        buildSuggestionItem
    );
}

function applySuggestion(index) {
    const text = textInput.value.trim();
    const suggestions = detectAndFix(text);
    if (suggestions && suggestions[index]) {
        const fixed = suggestions[index];
        textInput.value = fixed.text;
        addToHistory(text, fixed.text);
        charCountSpan.textContent = fixed.text.length;
        detectInput();
    }
}

function copySuggestion(text) {
    const onSuccess = () => showToast('✓ تم النسخ إلى الحافظة');
    const onFailure = () => showToast('⚠ فشل النسخ');
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(onSuccess, onFailure);
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'absolute';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            onSuccess();
        }
    } catch (err) {
        onFailure();
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 1800);
}

function addToHistory(original, fixed) {
    if (original === fixed) return;
    history.unshift({ original, fixed, time: new Date().toLocaleTimeString('ar-SA') });
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    saveHistory();
    renderHistory();
}

function buildHistoryItem(item) {
    const preview = item.fixed.length > 50 ? item.fixed.substring(0, 50) + '…' : item.fixed;
    const load = () => {
        textInput.value = item.fixed;
        charCountSpan.textContent = item.fixed.length;
        textInput.focus();
        detectInput();
    };
    const node = el('div', {
        className: 'history-item',
        role: 'button',
        tabindex: '0',
        'aria-label': `استرجاع التصحيح من ${item.time}: ${preview}`,
        onClick: load,
        onKeydown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                load();
            }
        }
    },
        el('strong', { text: item.time }),
        ` - ${preview}`
    );
    return node;
}

function renderHistory() {
    renderList(
        historyContainer,
        history,
        'لا يوجد سجل حتى الآن',
        buildHistoryItem
    );
}

function detectInput() {
    try {
        const value = textInput.value;
        if (value.length > MAX_INPUT_LENGTH) {
            textInput.value = value.substring(0, MAX_INPUT_LENGTH);
            showToast(`الحد الأقصى ${MAX_INPUT_LENGTH} حرف`);
        }
        charCountSpan.textContent = textInput.value.length;
        renderSuggestions(detectAndFix(textInput.value));
    } catch (err) {
        console.error('detectInput failed:', err);
        clearChildren(suggestionsContainer);
        suggestionsContainer.append(emptyState('حدث خطأ غير متوقع — حاول إدخال نص آخر.'));
    }
}

function debounce(fn, wait) {
    let timer;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(fn, wait);
    };
}

const debouncedDetect = debounce(detectInput, 120);

textInput.addEventListener('input', () => {
    charCountSpan.textContent = textInput.value.length;
    debouncedDetect();
});

textInput.addEventListener('paste', function(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    textInput.value = text;
    detectInput();
});

document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key === 'Enter') {
        const suggestions = detectAndFix(textInput.value);
        if (suggestions && suggestions[0]) {
            e.preventDefault();
            applySuggestion(0);
        }
    } else if (e.key === 'l' || e.key === 'L') {
        if (document.activeElement === textInput) {
            e.preventDefault();
            textInput.value = '';
            detectInput();
        }
    } else if (e.shiftKey && (e.key === 'c' || e.key === 'C' || e.key === 'C')) {
        const suggestions = detectAndFix(textInput.value);
        if (suggestions && suggestions[0]) {
            e.preventDefault();
            copySuggestion(suggestions[0].text);
        }
    }
});

initTheme();
renderHistory();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
}
