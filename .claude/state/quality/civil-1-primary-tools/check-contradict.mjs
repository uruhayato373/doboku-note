#!/usr/bin/env node
// Detect text-vs-mark contradictions inside <details> solution blocks.
// Pattern (r06-a No.17): an option line ends with ❌ but its text asserts correctness
// ("正しい"/"規定通り"/"適当である"), or ends with ✅ but its text asserts wrongness
// ("誤り"/"適当でない"/"不適当"/"正しくない"). These indicate a wrong answer-key/mark.
import { readFileSync } from 'node:fs';

const files = process.argv.slice(2);
// words that assert the statement is CORRECT
const correctRe = /(?:^|[^で])正しい|規定どおり|規定通り|適当である|妥当である|誤りではない|誤りでない|正しく行/;
// words that assert the statement is WRONG
const wrongRe = /誤り(?!では)|適当でない|不適当|正しくない|妥当でない|誤って(?!いない)|逆である|は誤っ/;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);
  const blocks = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s*問題\s*No\.?\s*(\S+)/);
    if (m) { cur = { no: m[1], startLine: i + 1, lines: [], nums: [] }; blocks.push(cur); }
    if (cur) cur.lines.push({ n: i + 1, t: lines[i] });
  }
  const name = file.split('/').slice(-2)[0];
  for (const b of blocks) {
    const body = b.lines.map(x => x.t).join('\n');
    if (/ものの数|下記の①|正しいものの数/.test(body)) continue; // count questions: skip
    const di = body.indexOf('<details>');
    if (di < 0) continue;
    for (const { n, t } of b.lines) {
      const inDetails = true; // rough; explanation lines start with digit.
      if (!/^\s*[0-9０-９]+[.．、]/.test(t)) continue;
      const hasCheck = t.includes('✅');
      const hasCross = t.includes('❌');
      if (!hasCheck && !hasCross) continue;
      if (hasCross && correctRe.test(t) && !wrongRe.test(t))
        console.log(`${name} No.${b.no} L${n}: ❌ but text says CORRECT → ${t.trim().slice(0,70)}`);
      if (hasCheck && wrongRe.test(t) && !correctRe.test(t))
        console.log(`${name} No.${b.no} L${n}: ✅ but text says WRONG → ${t.trim().slice(0,70)}`);
    }
  }
}
