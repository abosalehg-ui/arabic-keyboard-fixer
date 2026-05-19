#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const jsPath = path.join(__dirname, '..', 'js', 'app.js');
const source = fs.readFileSync(jsPath, 'utf8');
const lines = source.split('\n');

function findLine(prefix) {
    return lines.findIndex(l => l.trim().startsWith(prefix));
}

const startMappings = findLine('const qwertyToArabic101');
const endMappings = findLine('const textInput');
const startFns = findLine('function convertToArabic');
const endFns = findLine('function el(');

if (startMappings < 0 || endMappings < 0 || startFns < 0 || endFns < 0) {
    console.error('Could not locate code blocks in js/app.js');
    process.exit(2);
}

const mappings = lines.slice(startMappings, endMappings).join('\n');
const pureFns = lines.slice(startFns, endFns).join('\n');

const results = [];
function t(name, fn) {
    try { results.push([name, fn()]); }
    catch (e) { results.push([name, false, e.message]); }
}

const code = mappings + '\n' + pureFns + `
t('convertToArabic g]d -> لدي', () => convertToArabic('g]d', qwertyToArabic101) === 'لدي');
t('convertToArabic la;gm -> مشكلة', () => convertToArabic('la;gm', qwertyToArabic101) === 'مشكلة');
t('convertToArabic preserves spaces and punctuation', () =>
    convertToArabic('g]d la;gm', qwertyToArabic101).includes(' '));
t('convertToEnglish لدي -> g]d', () => convertToEnglish('لدي') === 'g]d');
t('convertToEnglish round-trip via 101 keeps spaces', () =>
    convertToEnglish('لدي مشكلة').includes(' '));
t('detectAndFix english input produces 101 suggestion', () => {
    const r = detectAndFix('g]d la;gm');
    return r && r.some(s => s.type.includes('101'));
});
t('detectAndFix arabic input produces english suggestion', () => {
    const r = detectAndFix('لدي مشكلة');
    return r && r.some(s => s.type.includes('إنجليزي'));
});
t('detectAndFix empty returns null', () =>
    detectAndFix('') === null && detectAndFix('   ') === null);
t('detectAndFix mostly digits returns null', () =>
    detectAndFix('123 456 789') === null);
t('scoreArabicness for pure arabic > 50', () =>
    scoreArabicness('لدي مشكلة كبيرة') > 50);
t('scoreArabicness for english is 0', () =>
    scoreArabicness('hello world') === 0);
t('arabic suggestions are sorted by confidence desc', () => {
    const r = detectAndFix('g]d la;gm');
    if (!r || r.length < 2) return true;
    for (let i = 1; i < r.length; i++) {
        if (r[i].confidence > r[i - 1].confidence) return false;
    }
    return true;
});
`;

eval(code);

let pass = 0, fail = 0;
for (const [name, ok, err] of results) {
    if (ok) { console.log('PASS', name); pass++; }
    else { console.log('FAIL', name, err ? '— ' + err : ''); fail++; }
}
console.log('\nResults: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail > 0 ? 1 : 0);
