#!/usr/bin/env node
// Audit each <details> solution block in a primary article.mdx:
// - count ✅ and ❌ marks
// - flag blocks whose mark count != 4 (incomplete bug1)
// - flag internal contradictions: the 正答 option index should carry the "odd one out"
//   For 適当でないもの: exactly one ❌ expected (the 正答). For 適当なもの: exactly one ✅.
// - flag placeholder text (穴埋め): "誤りを含む記述" / "穴埋め問題である"
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const src = readFileSync(file, 'utf8');
const lines = src.split(/\r?\n/);

// Split into question blocks by "## 問題 No."
const blocks = [];
let cur = null;
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^##\s*問題\s*No\.?\s*(\S+)/);
  if (m) { cur = { no: m[1], startLine: i + 1, text: [] }; blocks.push(cur); }
  if (cur) cur.text.push(lines[i]);
}

let problems = 0;
for (const b of blocks) {
  const body = b.text.join('\n');
  // find details section
  const dm = body.match(/<details>[\s\S]*?<\/details>/);
  const polarity = /適当でないもの|誤っているもの|不適当なもの/.test(body) ? 'not'
                 : /適当なものの数|適当なもの|正しいもの/.test(body) ? 'ok' : '?';
  if (!dm) { console.log(`  No.${b.no}: NO <details>`); problems++; continue; }
  const det = dm[0];
  const check = (det.match(/✅/g) || []).length;
  const cross = (det.match(/❌/g) || []).length;
  const total = check + cross;
  const placeholder = /誤りを含む記述|穴埋め問題である|プレースホルダ/.test(det);
  const key = (det.match(/正答[：:]\s*([0-9０-９]+)/) || [])[1] || '?';
  const flags = [];
  if (total !== 4) flags.push(`MARKS=${total}(✅${check}/❌${cross})`);
  if (placeholder) flags.push('PLACEHOLDER');
  // contradiction heuristic for standard MCQ (skip 個数 questions)
  if (!/ものの数|正しいものの数|下記の①/.test(body)) {
    if (polarity === 'not' && cross !== 1 && total === 4) flags.push(`polarity=not but ❌=${cross}`);
    if (polarity === 'ok' && check !== 1 && total === 4 && !/組合せ/.test(body)) flags.push(`polarity=ok but ✅=${check}`);
  }
  if (flags.length) { console.log(`  No.${b.no} (L${b.startLine}, key=${key}, ${polarity}): ${flags.join(' | ')}`); problems++; }
}
console.log(`${file.split('/').slice(-2)[0]}: ${blocks.length} questions, ${problems} flagged`);
