/**
 * Arabic (102) — UNVERIFIED, not loaded by the app.
 *
 * This is the table the app used to ship. It is provably wrong: `و` and `ز`
 * are each produced by two different keys while `ث` and `ح` are produced by
 * none, and the symbol row (`,` `.` `/`) was evidently copied from the 101
 * table. It is kept only as a starting point for a verified rebuild against
 * Microsoft's "Arabic (102)" layout data.
 *
 * To bring 102 back: fix this table, move it into `js/converter.js`, add a
 * `buildSuggestion` call for it in `detectAndFix`, and add it to the
 * layout-integrity tests in `tests/converter.test.js`.
 */
export const qwertyToArabic102 = {
    'q': 'ف', 'w': 'ك', 'e': 'ج', 'r': 'د', 't': 'ش', 'y': 'غ', 'u': 'س', 'i': 'ا', 'o': 'ي', 'p': 'ب', '[': 'ص', ']': 'ض',
    'a': 'ل', 's': 'م', 'd': 'ن', 'f': 'ت', 'g': 'ة', 'h': 'خ', 'j': 'ه', 'k': 'ع', 'l': 'ق', ';': 'ط', "'": 'و',
    'z': 'ئ', 'x': 'ء', 'c': 'ؤ', 'v': 'ر', 'b': 'لا', 'n': 'ى', 'm': 'ز', ',': 'و', '.': 'ز', '/': '؟',
    '`': 'ذ'
};
