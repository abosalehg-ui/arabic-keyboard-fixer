/**
 * محرّك التحويل — Conversion engine.
 *
 * This module is deliberately free of DOM and i18n access so it can be imported
 * directly by tests (and any future runtime) instead of being sliced out of a
 * larger file and `eval`ed.
 */

/* ------------------------------------------------------------------ *
 * Keyboard layout tables
 * ------------------------------------------------------------------ */

/**
 * Arabic (101) base layer — what each unshifted QWERTY key produces.
 * Note `/` produces ظ; the question mark ؟ lives on the Shift layer below.
 */
export const qwertyToArabic101 = {
    'q': 'ض', 'w': 'ص', 'e': 'ث', 'r': 'ق', 't': 'ف', 'y': 'غ', 'u': 'ع', 'i': 'ه', 'o': 'خ', 'p': 'ح', '[': 'ج', ']': 'د',
    'a': 'ش', 's': 'س', 'd': 'ي', 'f': 'ب', 'g': 'ل', 'h': 'ا', 'j': 'ت', 'k': 'ن', 'l': 'م', ';': 'ك', "'": 'ط',
    'z': 'ئ', 'x': 'ء', 'c': 'ؤ', 'v': 'ر', 'b': 'لا', 'n': 'ى', 'm': 'ة', ',': 'و', '.': 'ز', '/': 'ظ',
    '`': 'ذ'
};

/**
 * Arabic (101) Shift layer, keyed by the character a US layout produces when
 * the same physical key is pressed with Shift. Without this layer the letters
 * أ إ آ (and the lam-alef ligatures) are unreachable.
 */
export const qwertyShiftToArabic101 = {
    'H': 'أ', 'Y': 'إ', 'N': 'آ',
    'G': 'لأ', 'T': 'لإ', 'B': 'لآ',
    'J': 'ـ', '?': '؟', 'K': '،',
    'Q': 'َ', 'W': 'ً', 'E': 'ُ', 'R': 'ٌ', 'A': 'ِ', 'S': 'ٍ', 'X': 'ْ', '~': 'ّ'
};

/**
 * Arabic (102) — QUARANTINED, see ENABLE_102 below.
 *
 * This table is provably wrong and is kept only so the fix has a starting
 * point: `و` and `ز` are each produced by two different keys while `ث` and `ح`
 * are produced by none. No real keyboard layout looks like that. The symbol row
 * (`,` `.` `/`) was evidently copied from the 101 table without adaptation.
 *
 * Do not re-enable until every row has been checked against an authoritative
 * source (Microsoft MSKLC / the Windows "Arabic (102)" layout documentation);
 * `assertLayoutIsSane()` in the test suite enforces this the moment the flag
 * flips back to true.
 */
export const qwertyToArabic102 = {
    'q': 'ف', 'w': 'ك', 'e': 'ج', 'r': 'د', 't': 'ش', 'y': 'غ', 'u': 'س', 'i': 'ا', 'o': 'ي', 'p': 'ب', '[': 'ص', ']': 'ض',
    'a': 'ل', 's': 'م', 'd': 'ن', 'f': 'ت', 'g': 'ة', 'h': 'خ', 'j': 'ه', 'k': 'ع', 'l': 'ق', ';': 'ط', "'": 'و',
    'z': 'ئ', 'x': 'ء', 'c': 'ؤ', 'v': 'ر', 'b': 'لا', 'n': 'ى', 'm': 'ز', ',': 'و', '.': 'ز', '/': '؟',
    '`': 'ذ'
};

/** Offering a suggestion built from an unverified table is worse than offering none. */
export const ENABLE_102 = false;

/* ------------------------------------------------------------------ *
 * Reverse mapping (Arabic → QWERTY)
 * ------------------------------------------------------------------ */

function buildReverseMap(...maps) {
    const reverse = {};
    for (const map of maps) {
        for (const [key, value] of Object.entries(map)) {
            if (!(value in reverse)) reverse[value] = key;
        }
    }
    return reverse;
}

const arabicToQwerty101 = buildReverseMap(qwertyToArabic101, qwertyShiftToArabic101);

/** Longest reverse key in code points — `لا` and its ligatures are 2 long. */
const MAX_REVERSE_KEY = Object.keys(arabicToQwerty101)
    .reduce((longest, key) => Math.max(longest, [...key].length), 1);

/* ------------------------------------------------------------------ *
 * Conversion
 * ------------------------------------------------------------------ */

/**
 * Convert a QWERTY-typed string to Arabic.
 * Characters absent from both layers (digits, spaces, Arabic already present)
 * are passed through untouched.
 * @param {string} text
 * @param {Record<string,string>} [base]
 * @param {Record<string,string>|null} [shift]
 * @returns {string}
 */
export function convertToArabic(text, base = qwertyToArabic101, shift = qwertyShiftToArabic101) {
    let result = '';
    for (const char of text) {
        if (shift && char in shift) result += shift[char];
        else result += base[char.toLowerCase()] ?? char;
    }
    return result;
}

/**
 * Convert Arabic text back to the QWERTY characters that produced it.
 * Matches the longest key first so `لا` maps back to the single key `b`
 * instead of decomposing into `gh`.
 *
 * The ligature is genuinely ambiguous: ل followed by ا is the same two code
 * points whether it came from the `b` key or from `g` then `h`, so no reverse
 * mapping can recover the exact keystrokes. What is guaranteed — and what the
 * user actually sees — is that the text survives a round trip:
 * `convertToArabic(convertToEnglish(arabic)) === arabic`.
 *
 * @param {string} text
 * @returns {string}
 */
export function convertToEnglish(text) {
    const chars = [...text];
    let result = '';
    let i = 0;
    while (i < chars.length) {
        let matched = false;
        for (let len = Math.min(MAX_REVERSE_KEY, chars.length - i); len >= 1; len--) {
            const candidate = chars.slice(i, i + len).join('');
            if (candidate in arabicToQwerty101) {
                result += arabicToQwerty101[candidate];
                i += len;
                matched = true;
                break;
            }
        }
        if (!matched) {
            result += chars[i];
            i += 1;
        }
    }
    return result;
}

/* ------------------------------------------------------------------ *
 * Language plausibility scoring
 * ------------------------------------------------------------------ */

const ARABIC_LETTER = /\p{Script=Arabic}/u;
const LATIN_LETTER = /[a-z]/i;

/**
 * Both layouts map every Latin letter onto *some* Arabic letter, so "how many
 * characters are Arabic" cannot tell a real word from noise — it rated the
 * English phrase "carrot pizza" at 92%. These lists let the score answer the
 * question that actually matters: does the result read like the language?
 */
const ARABIC_WORDS = new Set(`
في من على الى إلى عن مع هذا هذه ذلك تلك التي الذي ما لا لم لن قد كان كانت يكون هو هي هم هن
أن ان إن أو او كل بعض بعد قبل عند حتى ثم هل يا به له لها لهم عليه عليها فيه فيها هناك هنا
كما لكن أي أيضا ولا ولم وقد وفي ومن نحن انا أنا انت أنت لدي عندي شكرا مرحبا السلام عليكم
مشكلة كتابة لوحة مفاتيح نص كلمة جدا اليوم الان الآن سلام خير طيب نعم شكرًا
`.trim().split(/\s+/));

const ARABIC_BIGRAMS = new Set(`
ال لا ان ين من ما ية ات ون لل ها ار ور رة تا اب با سا لم لى ني ري مة نا هم كم ول وم لي عل
في قد تح مع عن ست تم دي اد ام اع اف اق اك اه او اي بي تي جا حا حم دا را سل شا صا طا عا عب
فا قا كا كل لد مت مح مد مر مس مش مص مك نت هذ وا وق يا يد ير يس يق يم يت يع سب سم عد عم فر
كت كن لك لة نة نه هل هي وت ود ور وع وف ون يل يه أن أم إل تب تع تف تق تن جد حد حي خب خر رب
رج رد رس رض رف رق رك سن سي شر شك صا ضا طل ظر عة عق عل غي فض فع فق قل قو كب كر لب لح لع لف
`.trim().split(/\s+/));

const ENGLISH_WORDS = new Set(`
the and is to of in a that it for on with as at be this have from you are was not but all
can will i we he she they my your do does me if or so no yes hello please thanks what when
where how there here has had been would could should about into out up down over just like
`.trim().split(/\s+/));

const ENGLISH_BIGRAMS = new Set(`
th he in er an re on at en nd ti es or te of ed is it al ar st to nt ng se ha as ou io le
ve co me de hi ri ro ic ne ea ra ce li ch ll be ma si om ur ca ta el pe ho we ss us ai ol
ee ph wh ck ay ow ut ad ge im ir ns pr tr ul ry ss ly ni ba bo bu da di do fo fu
`.trim().split(/\s+/));

/**
 * Score how much `text` reads like a real sentence in one language, 0–100.
 * Combines "are these known words?" with "are these plausible letter pairs?".
 * @param {string} text
 * @param {RegExp} letterTest
 * @param {Set<string>} words
 * @param {Set<string>} bigrams
 * @param {(token: string) => boolean} [bonus] extra "looks native" predicate
 * @returns {number}
 */
function languageScore(text, letterTest, words, bigrams, bonus) {
    // Split on anything that is neither a letter nor a combining mark. Keeping
    // marks attached matters: the Shift layer emits harakat, and if those were
    // treated as separators, uppercase noise such as "SELECT" would shatter into
    // tiny high-scoring fragments instead of one implausible word.
    const tokens = text
        .toLowerCase()
        .split(/[^\p{L}\p{M}]+/u)
        .filter(token => token && letterTest.test(token));
    if (tokens.length === 0) return 0;

    let wordHits = 0;
    let bigramHits = 0;
    let bigramTotal = 0;
    for (const token of tokens) {
        if (words.has(token) || (bonus && bonus(token))) wordHits += 1;
        const chars = [...token];
        for (let i = 1; i < chars.length; i++) {
            bigramTotal += 1;
            if (bigrams.has(chars[i - 1] + chars[i])) bigramHits += 1;
        }
    }
    const wordScore = wordHits / tokens.length;
    const bigramScore = bigramTotal > 0 ? bigramHits / bigramTotal : 0;
    return Math.round(100 * (0.45 * wordScore + 0.55 * bigramScore));
}

/** The definite article prefixes a very large share of real Arabic words. */
const hasArabicArticle = token => token.length > 3 && token.startsWith('ال');

/**
 * How much the text reads like real Arabic (0–100).
 * @param {string} text
 * @returns {number}
 */
export function arabicScore(text) {
    return languageScore(text, ARABIC_LETTER, ARABIC_WORDS, ARABIC_BIGRAMS, hasArabicArticle);
}

/**
 * How much the text reads like real English (0–100).
 * @param {string} text
 * @returns {number}
 */
export function englishScore(text) {
    return languageScore(text, LATIN_LETTER, ENGLISH_WORDS, ENGLISH_BIGRAMS);
}

/* ------------------------------------------------------------------ *
 * Detection
 * ------------------------------------------------------------------ */

/** A converted word has to clear this to be believed at all. */
const MIN_SCORE = 28;
/** …and has to beat the original by this much, so real words are left alone. */
const MARGIN = 8;
/** Once half the convertible words agree, the whole line was mistyped. */
const SWEEP_RATIO = 0.5;
/**
 * Converting a single word inside otherwise-fine text is the riskiest call the
 * detector makes, so it carries two extra burdens: enough letters to be real
 * evidence, and a result that beats how well the whole line already reads in
 * the language it is written in. Without these, "SELECT ... WHERE id = 1" gets
 * `id` rewritten to the Arabic pronoun هي at full confidence.
 */
const MIN_PARTIAL_LENGTH = 3;

/**
 * Evaluate one whitespace-delimited token for one direction.
 * @returns {{token: string, converted: string, convertible: boolean, accepted: boolean, score: number}}
 */
function evaluateToken(token, convert, scoreTarget, scoreSource) {
    const converted = convert(token);
    if (converted === token) {
        return { token, converted, convertible: false, accepted: false, score: 0 };
    }
    const target = scoreTarget(converted);
    const source = scoreSource(token);
    return {
        token,
        converted,
        convertible: true,
        accepted: target >= MIN_SCORE && target > source + MARGIN,
        score: target
    };
}

/**
 * Build one suggestion for a direction, or null when nothing is worth changing.
 *
 * Words are judged individually — a paragraph of correct Arabic containing one
 * mistyped word is the common real-world case, and whole-text majority voting
 * used to return nothing at all for it. When most convertible words agree, the
 * whole line is swept so a fully mistyped sentence still converts end to end.
 */
function buildSuggestion(text, typeKey, convert, scoreTarget, scoreSource) {
    const parts = text.split(/(\s+)/);
    const results = parts.map(part =>
        /^\s*$/.test(part)
            ? { token: part, converted: part, convertible: false, accepted: false, score: 0 }
            : evaluateToken(part, convert, scoreTarget, scoreSource));

    const convertible = results.filter(r => r.convertible);
    if (convertible.length === 0) return null;

    const accepted = convertible.filter(r => r.accepted);
    if (accepted.length === 0) return null;

    const sweep = accepted.length / convertible.length >= SWEEP_RATIO;

    let applied;
    if (sweep) {
        applied = convertible;
    } else {
        const documentScore = scoreSource(text);
        applied = accepted.filter(r =>
            [...r.converted].length >= MIN_PARTIAL_LENGTH && r.score > documentScore + MARGIN);
        if (applied.length === 0) return null;
    }
    const appliedSet = new Set(applied);

    const converted = results.map(r => (appliedSet.has(r) ? r.converted : r.token)).join('');
    if (converted === text) return null;

    // Confidence reflects the words we are actually changing, weighted by length,
    // so one lucky short word cannot speak for a long line.
    let weighted = 0;
    let weight = 0;
    for (const r of applied) {
        const w = Math.max(1, [...r.converted].length);
        weighted += r.score * w;
        weight += w;
    }

    const totalWords = results.filter(r => !/^\s*$/.test(r.token)).length;
    return {
        typeKey,
        text: converted,
        confidence: Math.round(weighted / weight),
        changedWords: applied.length,
        totalWords,
        // Descriptive, not a decision: true when some words were deliberately
        // left untouched, which is what the UI tells the user about.
        partial: applied.length < totalWords,
        original: text
    };
}

/**
 * Inspect text and return conversion suggestions sorted by confidence,
 * or null when nothing looks mistyped.
 *
 * @param {string} text
 * @returns {Array<{typeKey: string, text: string, confidence: number, changedWords: number,
 *                  totalWords: number, partial: boolean, original: string}>|null}
 */
export function detectAndFix(text) {
    if (!text || !text.trim()) return null;

    const suggestions = [];

    const toArabic101 = buildSuggestion(
        text, 'arabic101',
        token => convertToArabic(token, qwertyToArabic101, qwertyShiftToArabic101),
        arabicScore, englishScore);
    if (toArabic101) suggestions.push(toArabic101);

    if (ENABLE_102) {
        const toArabic102 = buildSuggestion(
            text, 'arabic102',
            token => convertToArabic(token, qwertyToArabic102, null),
            arabicScore, englishScore);
        if (toArabic102 && (!toArabic101 || toArabic102.text !== toArabic101.text)) {
            suggestions.push(toArabic102);
        }
    }

    const toEnglish = buildSuggestion(
        text, 'english', convertToEnglish, englishScore, arabicScore);
    if (toEnglish) suggestions.push(toEnglish);

    suggestions.sort((a, b) => b.confidence - a.confidence);
    return suggestions.length > 0 ? suggestions : null;
}

/**
 * Which direction the manual ⇄ button should force for this text.
 * Unlike `detectAndFix` this never refuses — it is the user's override.
 * @param {string} text
 * @returns {'toEnglish'|'toArabic'}
 */
export function forcedDirection(text) {
    let arabic = 0;
    let latin = 0;
    for (const char of text) {
        if (ARABIC_LETTER.test(char)) arabic += 1;
        else if (LATIN_LETTER.test(char)) latin += 1;
    }
    return arabic > latin ? 'toEnglish' : 'toArabic';
}
