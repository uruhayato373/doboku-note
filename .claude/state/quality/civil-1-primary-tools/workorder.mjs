import { readFileSync } from 'node:fs';
const official = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const rec = process.argv[3];
const base = '/Users/minamidaisuke/doboku-note/.claude/worktrees/nifty-feynman-3f7694/.local/r2/posts/civil-construction-1';
const src = readFileSync(`${base}/primary-${rec}/article.mdx`, 'utf8');
const lines = src.split(/\r?\n/);

// blocks
const blocks = [];
let cur = null;
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^##\s*問題\s*No\.?\s*([0-9]+)/);
  if (m) { cur = { no: +m[1], startLine: i + 1, lines: [] }; blocks.push(cur); }
  if (cur) cur.lines.push(lines[i]);
}
const off = official[rec];
const cur2 = {};
for (const b of blocks) {
  const body = b.lines.join('\n');
  const k = body.match(/正答[：:]\s*([0-9]+)/);
  b.key = k ? +k[1] : null;
  b.body = body;
  b.stem = (b.lines[2] || b.lines[1] || '').trim();
  const det = (body.match(/<details>[\s\S]*?<\/details>/) || [''])[0];
  b.marks = ((det.match(/✅/g)||[]).length) + ((det.match(/❌/g)||[]).length);
  b.placeholder = /記述は適当である|正しい記述\s*❌|誤りを含む記述|穴埋め問題である|プレースホルダ/.test(det);
  b.anaume = /当てはまる語句の組合せ|語句の組合せ/.test(body);
  b.kosuu = /ものの数|下記の①/.test(body);
}
console.log(`\n########## WORK ORDER: primary-${rec} (${blocks.length} questions) ##########`);
console.log(`\n--- OFFICIAL KEYS (No=answer) ---`);
console.log(off.map((a,i)=>`${i+1}=${a}`).join(' '));
console.log(`\n--- KEY MISMATCHES (article 正答 ≠ official) — FIX THESE ---`);
let n=0;
for (const b of blocks) {
  if (b.key !== off[b.no-1]) {
    const pol = /適当でないもの|誤っているもの|不適当なもの|該当しないもの/.test(b.stem) ? '適当でない系'
              : /適当なもの|正しいもの|該当するもの/.test(b.stem) ? '適当な系' : '?';
    console.log(`  L${b.startLine} No.${b.no}: article正答=${b.key} → OFFICIAL=${off[b.no-1]}  [stem極性=${pol}] ${b.kosuu?'(個数問題)':''}${b.anaume?'(穴埋め)':''}`);
    n++;
  }
}
console.log(`  (${n} mismatches)`);
console.log(`\n--- PROSE/STRUCTURE ISSUES (key already correct, but fix prose) ---`);
for (const b of blocks) {
  const flags=[];
  if (b.key === off[b.no-1]) {
    if (b.placeholder) flags.push('PLACEHOLDER-prose');
    if (b.marks !== 4 && !b.kosuu) flags.push(`marks=${b.marks}(!=4)`);
    if (b.anaume && b.placeholder) flags.push('穴埋め-stub');
  }
  if (flags.length) console.log(`  L${b.startLine} No.${b.no}: ${flags.join(', ')} ${b.anaume?'(穴埋め)':''}${b.kosuu?'(個数)':''}`);
}
