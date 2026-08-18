import {
    convertToArabic,
    convertToEnglish,
    detectAndFix,
    forcedDirection
} from './converter.js';

/* ------------------------------------------------------------------ *
 * Elements and constants
 * ------------------------------------------------------------------ */

const textInput = document.getElementById('textInput');
const suggestionsContainer = document.getElementById('suggestionsContainer');
const charCountSpan = document.getElementById('charCount');
const lengthWarning = document.getElementById('lengthWarning');
const historyContainer = document.getElementById('historyContainer');
const historyList = document.getElementById('historyList');
const historyNotice = document.getElementById('historyNotice');
const historyToggle = document.getElementById('historyToggle');
const themeToggleBtn = document.getElementById('themeToggle');
const swapDirectionBtn = document.getElementById('swapDirection');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const exportHistoryBtn = document.getElementById('exportHistoryBtn');
const purgeStoredBtn = document.getElementById('purgeStoredBtn');
const languageToggleBtn = document.getElementById('languageToggle');

const STORAGE_HISTORY = 'akf_history';
const STORAGE_HISTORY_ENABLED = 'akf_history_enabled';
const STORAGE_THEME = 'akf_theme';
const STORAGE_LOCALE = 'akf_locale';
const MAX_HISTORY = 20;
/** Beyond this we stop analysing, but we never delete what the user typed. */
const MAX_INPUT_LENGTH = 50000;
/** Suggestions are previewed, not dumped — the full text still applies and copies. */
const PREVIEW_LIMIT = 500;
/** Saved corrections are forgotten after a day even when history is on. */
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
const UNDO_TIMEOUT_MS = 6000;

const SUPPORTED_LOCALES = ['ar', 'en'];
let currentLocale = 'ar';
let strings = {};

/** The suggestions currently on screen — the single source of truth for Apply. */
let currentSuggestions = null;

/* ------------------------------------------------------------------ *
 * i18n
 * ------------------------------------------------------------------ */

/**
 * Look up a localized string by key, with optional template substitution.
 * Falls back to the key itself if the translation is missing.
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 */
function t(key, vars) {
    let value = strings[key] != null ? strings[key] : key;
    if (vars) {
        for (const [name, replacement] of Object.entries(vars)) {
            value = value.split('{' + name + '}').join(String(replacement));
        }
    }
    return value;
}

async function loadLocale(locale) {
    const safe = SUPPORTED_LOCALES.includes(locale) ? locale : 'ar';
    const res = await fetch(`locales/${safe}.json`);
    if (!res.ok) throw new Error('locale fetch failed');
    strings = await res.json();
    currentLocale = safe;
    document.documentElement.setAttribute('lang', strings.lang || safe);
    document.documentElement.setAttribute('dir', strings.dir || (safe === 'ar' ? 'rtl' : 'ltr'));
    applyStaticStrings();
}

/**
 * Push every translated string into the DOM.
 *
 * Elements declare what they want via `data-i18n` (text), `data-i18n-title`
 * and `data-i18n-aria`, so adding a label to the page no longer means adding a
 * line here and silently getting nothing when you forget.
 */
function applyStaticStrings() {
    document.title = t('meta.pageTitle');

    for (const node of document.querySelectorAll('[data-i18n]')) {
        node.textContent = t(node.dataset.i18n);
    }
    for (const node of document.querySelectorAll('[data-i18n-title]')) {
        node.setAttribute('title', t(node.dataset.i18nTitle));
    }
    for (const node of document.querySelectorAll('[data-i18n-aria]')) {
        node.setAttribute('aria-label', t(node.dataset.i18nAria));
    }
    for (const node of document.querySelectorAll('[data-i18n-placeholder]')) {
        node.setAttribute('placeholder', t(node.dataset.i18nPlaceholder));
    }

    renderKeyboardInfo();
    renderShortcutsHint();
    applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
}

/** Built from elements rather than injected as HTML from the locale files. */
function renderKeyboardInfo() {
    const node = document.getElementById('keyboardInfo');
    if (!node) return;
    clearChildren(node);
    node.append(
        el('strong', { text: t('labels.keyboardInfoTitle') }),
        ' ',
        t('labels.keyboardInfoBody')
    );
}

function renderShortcutsHint() {
    const node = document.getElementById('shortcutsHint');
    if (!node) return;
    clearChildren(node);
    const shortcuts = [
        [['Ctrl', 'Enter'], t('shortcuts.apply')],
        [['Alt', 'K'], t('shortcuts.clear')],
        [['Alt', 'C'], t('shortcuts.copy')]
    ];
    shortcuts.forEach(([keys, label], index) => {
        if (index > 0) node.append(' · ');
        keys.forEach((key, i) => {
            if (i > 0) node.append('+');
            node.append(el('kbd', { text: key }));
        });
        node.append(' ' + label);
    });
}

/* ------------------------------------------------------------------ *
 * DOM helpers
 * ------------------------------------------------------------------ */

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

function renderList(container, items, emptyMessage, builder) {
    clearChildren(container);
    if (!items || items.length === 0) {
        container.append(emptyState(emptyMessage));
        return;
    }
    items.forEach((item, i) => container.append(builder(item, i)));
}

/* ------------------------------------------------------------------ *
 * Toasts (with optional undo)
 * ------------------------------------------------------------------ */

function toastStack() {
    let stack = document.getElementById('toastStack');
    if (!stack) {
        stack = el('div', { className: 'toast-stack', id: 'toastStack' });
        document.body.appendChild(stack);
    }
    return stack;
}

/**
 * Show a transient message. Pass `action` to offer an undo button — every
 * destructive action in this app is reversible for a few seconds rather than
 * gated behind a confirm dialog.
 * @param {string} message
 * @param {{label: string, onAction: () => void}} [action]
 */
function showToast(message, action) {
    const toast = el('div', { className: 'toast', role: 'status' },
        el('span', { text: message }));
    const dismiss = () => {
        clearTimeout(timer);
        toast.classList.remove('toast-visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        setTimeout(() => toast.remove(), 400);
    };
    if (action) {
        toast.classList.add('toast-actionable');
        toast.append(el('button', {
            className: 'toast-action',
            type: 'button',
            text: action.label,
            onClick: () => { action.onAction(); dismiss(); }
        }));
    }
    toastStack().appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    // Declared after `dismiss` on purpose: the closure only reads it when the
    // toast is actually dismissed, by which time it is assigned.
    const timer = setTimeout(dismiss, action ? UNDO_TIMEOUT_MS : 1800);
}

/* ------------------------------------------------------------------ *
 * History — opt-in, expiring, and never silently collected
 * ------------------------------------------------------------------ */

/**
 * This tool is reached for after typing into a field that hides what you type
 * — which is exactly what a password field is. Recording that text by default,
 * with no prompt and no expiry, is the one genuinely dangerous thing this app
 * could do, so history is off until the user turns it on.
 */
let historyEnabled = false;
let history = [];

function readStoredHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_HISTORY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const cutoff = Date.now() - HISTORY_TTL_MS;
        return parsed.filter(it =>
            it && typeof it.original === 'string' && typeof it.fixed === 'string' &&
            typeof it.time === 'string' && typeof it.savedAt === 'number' && it.savedAt > cutoff);
    } catch (e) {
        return [];
    }
}

function hasStoredHistory() {
    try { return !!localStorage.getItem(STORAGE_HISTORY); } catch (e) { return false; }
}

function saveHistory() {
    if (!historyEnabled) return;
    try {
        localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
    } catch (e) {
        // quota exceeded or storage disabled — keep the in-memory copy only
    }
}

function purgeStoredHistory() {
    try { localStorage.removeItem(STORAGE_HISTORY); } catch (e) { /* ignore */ }
}

function setHistoryEnabled(enabled) {
    historyEnabled = enabled;
    try { localStorage.setItem(STORAGE_HISTORY_ENABLED, enabled ? '1' : '0'); } catch (e) { /* ignore */ }
    if (enabled) {
        history = readStoredHistory();
    } else {
        history = [];
        purgeStoredHistory();
    }
    renderHistory();
}

function addToHistory(original, fixed) {
    if (!historyEnabled || original === fixed) return;
    const timeLocale = currentLocale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';
    history.unshift({
        original,
        fixed,
        time: new Date().toLocaleTimeString(timeLocale),
        savedAt: Date.now()
    });
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    saveHistory();
    renderHistory();
}

function buildHistoryItem(item) {
    const preview = item.fixed.length > 50 ? item.fixed.substring(0, 50) + '…' : item.fixed;
    const load = () => {
        setInputValue(item.fixed);
        textInput.focus();
    };
    return el('div', {
        className: 'history-item',
        role: 'button',
        tabindex: '0',
        dir: 'auto',
        'aria-label': t('aria.historyItemPrefix') + item.time + ': ' + preview,
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
}

function renderHistory() {
    if (historyToggle) {
        historyToggle.checked = historyEnabled;
        historyToggle.setAttribute('aria-checked', String(historyEnabled));
    }
    if (historyNotice) historyNotice.hidden = historyEnabled;
    if (historyList) historyList.hidden = !historyEnabled;
    if (exportHistoryBtn) exportHistoryBtn.disabled = !historyEnabled || history.length === 0;
    if (clearHistoryBtn) clearHistoryBtn.disabled = !historyEnabled || history.length === 0;
    if (purgeStoredBtn) purgeStoredBtn.hidden = historyEnabled || !hasStoredHistory();

    if (historyEnabled && historyContainer) {
        renderList(historyContainer, history, t('empty.history'), buildHistoryItem);
    } else if (historyContainer) {
        clearChildren(historyContainer);
    }
}

/* ------------------------------------------------------------------ *
 * Theme
 * ------------------------------------------------------------------ */

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (!themeToggleBtn) return;
    themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    themeToggleBtn.setAttribute('aria-label', t(theme === 'dark' ? 'aria.theme.toLight' : 'aria.theme.toDark'));
}

function initTheme() {
    let theme;
    try { theme = localStorage.getItem(STORAGE_THEME); } catch (e) { /* ignore */ }
    if (!theme) {
        theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    applyTheme(theme);
}

/* ------------------------------------------------------------------ *
 * Suggestions
 * ------------------------------------------------------------------ */

function suggestionLabel(suggestion) {
    return t('suggestion.type.' + suggestion.typeKey);
}

function buildSuggestionItem(suggestion) {
    const full = suggestion.text;
    const preview = full.length > PREVIEW_LIMIT ? full.slice(0, PREVIEW_LIMIT) + '…' : full;
    const label = suggestionLabel(suggestion);
    const scope = suggestion.partial
        ? t('suggestion.partial', { changed: suggestion.changedWords, total: suggestion.totalWords })
        : t('suggestion.whole');

    return el('div', { className: 'suggestion-item' },
        el('div', { className: 'suggestion-text' },
            el('div', { className: 'suggestion-type', text: label }),
            el('div', { className: 'suggestion-content', dir: 'auto', text: preview }),
            el('div', { className: 'confidence', text: t('suggestion.confidence', { n: suggestion.confidence }) + ' · ' + scope })
        ),
        el('div', { className: 'suggestion-actions' },
            el('button', {
                className: 'btn-fix',
                type: 'button',
                text: t('buttons.apply'),
                'aria-label': t('aria.applyPrefix') + label,
                onClick: () => applySuggestion(suggestion)
            }),
            el('button', {
                className: 'btn-copy',
                type: 'button',
                text: t('buttons.copy'),
                'aria-label': t('aria.copyPrefix') + label,
                onClick: () => copyText(full)
            })
        )
    );
}

function renderSuggestions(suggestions) {
    renderList(suggestionsContainer, suggestions, t('empty.suggestionsNone'), buildSuggestionItem);
}

/**
 * Update the visually-hidden live region with a concise summary of the current
 * suggestions so screen readers announce a short result instead of re-reading
 * the whole rebuilt suggestions panel on every keystroke. Silent while the
 * input is empty to avoid idle chatter.
 * @param {Array|null} suggestions
 */
function announceSuggestions(suggestions) {
    const node = document.getElementById('srStatus');
    if (!node) return;
    if (!textInput.value.trim()) { node.textContent = ''; return; }
    node.textContent = (suggestions && suggestions.length)
        ? t('aria.suggestionsAnnounce', { n: suggestions.length })
        : t('empty.suggestionsNone');
}

/**
 * Apply a suggestion the user can see, not a freshly recomputed one — the
 * displayed list is debounced, so re-deriving it here could apply something
 * else entirely. Reversible for a few seconds.
 * @param {{text: string}} suggestion
 */
function applySuggestion(suggestion) {
    const previous = textInput.value;
    setInputValue(suggestion.text);
    addToHistory(previous, suggestion.text);
    showToast(t('messages.applied'), {
        label: t('buttons.undo'),
        onAction: () => {
            setInputValue(previous);
            showToast(t('messages.undone'));
        }
    });
}

function copyText(text) {
    const onSuccess = () => showToast(t('messages.copied'));
    const onFailure = () => showToast(t('messages.copyFailed'));
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

/* ------------------------------------------------------------------ *
 * Input handling
 * ------------------------------------------------------------------ */

/** Set the field programmatically and bring every derived view back in sync. */
function setInputValue(value) {
    textInput.value = value;
    detectInput();
}

function detectInput() {
    try {
        const value = textInput.value;
        charCountSpan.textContent = value.length;

        // Over the cap we stop analysing, but we do not touch the text. The old
        // behaviour truncated the field and announced it in a toast that faded
        // after two seconds, which destroyed pasted work.
        const tooLong = value.length > MAX_INPUT_LENGTH;
        if (lengthWarning) {
            lengthWarning.hidden = !tooLong;
            if (tooLong) lengthWarning.textContent = t('messages.tooLong', { n: MAX_INPUT_LENGTH });
        }
        if (tooLong) {
            currentSuggestions = null;
            renderSuggestions(null);
            announceSuggestions(null);
            return;
        }

        currentSuggestions = detectAndFix(value);
        renderSuggestions(currentSuggestions);
        announceSuggestions(currentSuggestions);
    } catch (err) {
        console.error('detectInput failed:', err);
        currentSuggestions = null;
        clearChildren(suggestionsContainer);
        suggestionsContainer.append(emptyState(t('messages.unexpectedError')));
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

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */

textInput.addEventListener('input', () => {
    charCountSpan.textContent = textInput.value.length;
    debouncedDetect();
});

themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(STORAGE_THEME, next); } catch (e) { /* ignore */ }
});

if (historyToggle) {
    historyToggle.addEventListener('change', () => {
        setHistoryEnabled(historyToggle.checked);
        showToast(t(historyToggle.checked ? 'messages.historyOn' : 'messages.historyOff'));
    });
}

if (purgeStoredBtn) {
    purgeStoredBtn.addEventListener('click', () => {
        purgeStoredHistory();
        renderHistory();
        showToast(t('messages.storedPurged'));
    });
}

clearHistoryBtn.addEventListener('click', () => {
    if (history.length === 0) return;
    const removed = history;
    history = [];
    saveHistory();
    renderHistory();
    showToast(t('messages.cleared'), {
        label: t('buttons.undo'),
        onAction: () => {
            history = removed;
            saveHistory();
            renderHistory();
        }
    });
});

exportHistoryBtn.addEventListener('click', () => {
    if (history.length === 0) {
        showToast(t('messages.exportEmpty'));
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
 * Force-convert in the direction the text is not currently in. This is the
 * deliberate override for when detection stays quiet — it never refuses.
 */
swapDirectionBtn.addEventListener('click', () => {
    const text = textInput.value;
    if (!text.trim()) {
        showToast(t('messages.swapEmpty'));
        return;
    }
    const direction = forcedDirection(text);
    const converted = direction === 'toEnglish' ? convertToEnglish(text) : convertToArabic(text);
    setInputValue(converted);
    addToHistory(text, converted);
    showToast(t(direction === 'toEnglish' ? 'messages.swappedToEn' : 'messages.swappedToAr'), {
        label: t('buttons.undo'),
        onAction: () => setInputValue(text)
    });
});

if (languageToggleBtn) {
    languageToggleBtn.addEventListener('click', async () => {
        const next = currentLocale === 'ar' ? 'en' : 'ar';
        try {
            await loadLocale(next);
            try { localStorage.setItem(STORAGE_LOCALE, next); } catch (e) { /* ignore */ }
            renderHistory();
            detectInput();
        } catch (err) {
            console.error('Locale switch failed:', err);
            showToast(t('messages.localeFailed'));
        }
    });
}

/**
 * Shortcuts are matched on `event.code` (physical key) rather than `event.key`,
 * so they still work while an Arabic keyboard layout is active. Alt is used for
 * clear and copy because Ctrl+L is the browser address bar and Ctrl+Shift+C
 * opens the DevTools inspector.
 */
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.code === 'Enter') {
        if (currentSuggestions && currentSuggestions[0]) {
            e.preventDefault();
            applySuggestion(currentSuggestions[0]);
        }
        return;
    }
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.code === 'KeyK') {
        e.preventDefault();
        const previous = textInput.value;
        if (!previous) return;
        setInputValue('');
        textInput.focus();
        showToast(t('messages.inputCleared'), {
            label: t('buttons.undo'),
            onAction: () => setInputValue(previous)
        });
    } else if (e.code === 'KeyC') {
        if (currentSuggestions && currentSuggestions[0]) {
            e.preventDefault();
            copyText(currentSuggestions[0].text);
        }
    }
});

/* ------------------------------------------------------------------ *
 * Startup
 * ------------------------------------------------------------------ */

function pickInitialLocale() {
    try {
        const stored = localStorage.getItem(STORAGE_LOCALE);
        if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
    } catch (e) { /* ignore */ }
    const nav = (navigator.language || 'ar').toLowerCase();
    return nav.startsWith('en') ? 'en' : 'ar';
}

function initHistory() {
    let stored = null;
    try { stored = localStorage.getItem(STORAGE_HISTORY_ENABLED); } catch (e) { /* ignore */ }
    historyEnabled = stored === '1';
    history = historyEnabled ? readStoredHistory() : [];
    if (historyEnabled) saveHistory(); // rewrite without entries that just expired
    renderHistory();
}

(async function init() {
    initTheme();
    try {
        await loadLocale(pickInitialLocale());
    } catch (err) {
        console.warn('Locale load failed; keeping baseline HTML:', err);
    }
    initHistory();
    clearChildren(suggestionsContainer);
    suggestionsContainer.append(emptyState(t('empty.suggestionsIdle')));
})();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
}
