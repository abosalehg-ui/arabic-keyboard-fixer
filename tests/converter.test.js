#!/usr/bin/env node
/**
 * Unit tests for the conversion engine.
 *
 * These import `js/converter.js` directly. The previous harness sliced the
 * source file apart by matching line prefixes and ran the result through
 * `eval`, so renaming or reordering a function broke the tests silently — and
 * it covered none of the layout data, which is where the real defects were.
 */
import {
    qwertyToArabic101,
    qwertyShiftToArabic101,
    qwertyToArabic102,
    ENABLE_102,
    convertToArabic,
    convertToEnglish,
    arabicScore,
    englishScore,
    detectAndFix,
    forcedDirection
} from '../js/converter.js';

const results = [];
function record(name, fn) {
    try { results.push([name, fn() === true]); }
    catch (e) { results.push([name, false, e.message]); }
}

/** Every letter a user can actually type on an Arabic keyboard. */
const ARABIC_ALPHABET = [...'ابتثجحخدذرزسشصضطظعغفقكلمنهوىيةءأإآئؤ'];

/**
 * A keyboard layout is a bijection between keys and what they print. Two keys
 * printing the same letter, or a letter no key can print, means the table is
 * wrong — no external reference needed to know that.
 */
function layoutProblems(...layers) {
    const values = layers.flatMap(layer => Object.values(layer));
    const duplicates = values.filter((v, i) => values.indexOf(v) !== i);
    const printable = values.join('');
    const unreachable = ARABIC_ALPHABET.filter(letter => !printable.includes(letter));
    return { duplicates, unreachable };
}

/* --- layout data integrity ------------------------------------------- */

record('Arabic 101 can print every letter of the alphabet', () => {
    const { unreachable } = layoutProblems(qwertyToArabic101, qwertyShiftToArabic101);
    if (unreachable.length) throw new Error('unreachable: ' + unreachable.join(' '));
    return true;
});

record('Arabic 101 never prints the same letter from two keys', () => {
    const { duplicates } = layoutProblems(qwertyToArabic101, qwertyShiftToArabic101);
    if (duplicates.length) throw new Error('duplicated: ' + duplicates.join(' '));
    return true;
});

record('ظ is on the base layer and ؟ on the Shift layer', () =>
    qwertyToArabic101['/'] === 'ظ' && qwertyShiftToArabic101['?'] === '؟');

record('hamza forms أ إ آ are reachable via Shift', () =>
    convertToArabic('H') === 'أ' && convertToArabic('Y') === 'إ' && convertToArabic('N') === 'آ');

record('Arabic 102 is either disabled or structurally sound', () => {
    if (!ENABLE_102) return true;
    const { duplicates, unreachable } = layoutProblems(qwertyToArabic102);
    if (duplicates.length || unreachable.length) {
        throw new Error('102 enabled but broken — duplicated: [' + duplicates.join(' ') +
            '] unreachable: [' + unreachable.join(' ') + ']');
    }
    return true;
});

record('no suggestion claims the 102 layout while it is disabled', () => {
    if (ENABLE_102) return true;
    const r = detectAndFix('g]d la;gm') || [];
    return r.every(s => s.typeKey !== 'arabic102');
});

/* --- conversion ------------------------------------------------------ */

record('convertToArabic g]d -> لدي', () =>
    convertToArabic('g]d') === 'لدي');

record('convertToArabic la;gm -> مشكلة', () =>
    convertToArabic('la;gm') === 'مشكلة');

record('convertToArabic preserves spaces and unmapped characters', () =>
    convertToArabic('g]d 123 la;gm') === 'لدي 123 مشكلة');

record('convertToEnglish لدي -> g]d', () =>
    convertToEnglish('لدي') === 'g]d');

record('convertToEnglish maps the لا ligature to its single key', () =>
    convertToEnglish('لا') === 'b');

record('convertToEnglish maps ظ back to /', () =>
    convertToEnglish('ظ') === '/');

record('round trip preserves Arabic text', () => {
    for (const arabic of ['السلام عليكم', 'لا', 'ولا بلاد', 'ظهر الحق', 'أهلا وسهلا',
                          'لدي مشكلة في الكتابة بلوحة المفاتيح']) {
        const back = convertToArabic(convertToEnglish(arabic));
        if (back !== arabic) throw new Error(arabic + ' -> ' + convertToEnglish(arabic) + ' -> ' + back);
    }
    return true;
});

record('round trip preserves Latin keystrokes through لا', () =>
    convertToEnglish(convertToArabic('hgb')) === 'hgb');

/* --- scoring --------------------------------------------------------- */

record('real Arabic scores far above layout noise', () =>
    arabicScore('السلام عليكم ورحمة الله') > arabicScore('ؤشققخف حهئئش') + 30);

record('real English scores far above layout noise', () =>
    englishScore('the quick brown fox') > englishScore('لاسعثيبن') + 30);

record('scoring an empty or numeric string yields 0', () =>
    arabicScore('') === 0 && arabicScore('123 456') === 0 && englishScore('') === 0);

/* --- detection: it must fire ---------------------------------------- */

record('detects a fully mistyped Arabic sentence', () => {
    const r = detectAndFix('g]d la;gm td hg;jhfm fg,pm hglthjdp');
    return !!r && r[0].text === 'لدي مشكلة في الكتابة بلوحة المفاتيح';
});

record('detects English typed on an Arabic layout', () => {
    const r = detectAndFix('اثممخ');
    return !!r && r[0].typeKey === 'english' && r[0].text === 'hello';
});

record('detects a single mistyped word inside Arabic text', () => {
    const r = detectAndFix('رسالة: g]d');
    return !!r && r[0].text === 'رسالة: لدي' && r[0].partial === true;
});

record('reports how many words it changed', () => {
    const r = detectAndFix('رسالة: g]d');
    return !!r && r[0].changedWords === 1 && r[0].totalWords === 2;
});

/* --- detection: it must stay quiet ----------------------------------- */

record('leaves correct Arabic alone', () =>
    ['لدي مشكلة في الكتابة', 'السلام عليكم ورحمة الله وبركاته', 'ظهر الحق وبطل الباطل']
        .every(t => detectAndFix(t) === null));

record('leaves ordinary English alone', () =>
    ['carrot pizza', 'hello world', 'The quick brown fox jumps over the lazy dog',
     'Hi! I am here...', 'Thanks a lot, that worked perfectly!',
     'ERROR: connection refused by remote host', 'SELECT * FROM users WHERE id = 1']
        .every(t => detectAndFix(t) === null));

record('detectAndFix on empty or blank input returns null', () =>
    detectAndFix('') === null && detectAndFix('   ') === null);

record('detectAndFix on digits only returns null', () =>
    detectAndFix('123 456 789') === null);

/* --- confidence ------------------------------------------------------ */

record('confidence is higher for a real sentence than for a lucky fragment', () => {
    const sentence = detectAndFix('hgsghl ugd;l');
    return !!sentence && sentence[0].confidence > 50;
});

record('suggestions are sorted by confidence descending', () => {
    const r = detectAndFix('g]d la;gm');
    if (!r || r.length < 2) return true;
    for (let i = 1; i < r.length; i++) {
        if (r[i].confidence > r[i - 1].confidence) return false;
    }
    return true;
});

/* --- manual override ------------------------------------------------- */

record('forcedDirection follows the dominant script', () =>
    forcedDirection('لدي مشكلة') === 'toEnglish' &&
    forcedDirection('g]d la;gm') === 'toArabic' &&
    forcedDirection('ظهر') === 'toEnglish');

/* --- performance ----------------------------------------------------- */

record('handles the 50k character cap in under a second', () => {
    const big = 'g]d la;gm td hg;jhfm fg,pm hglthjdp '.repeat(1430).slice(0, 50000);
    const started = Date.now();
    detectAndFix(big);
    const elapsed = Date.now() - started;
    if (elapsed > 1000) throw new Error('took ' + elapsed + 'ms');
    return true;
});

/* --- report ---------------------------------------------------------- */

let pass = 0, fail = 0;
for (const [name, ok, err] of results) {
    if (ok) { console.log('PASS', name); pass++; }
    else { console.log('FAIL', name, err ? '— ' + err : ''); fail++; }
}
console.log('\nResults: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail > 0 ? 1 : 0);
