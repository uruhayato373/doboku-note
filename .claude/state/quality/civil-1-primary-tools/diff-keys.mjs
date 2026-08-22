import { readFileSync } from 'node:fs';
const official = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const base = '/Users/minamidaisuke/doboku-note/.claude/worktrees/nifty-feynman-3f7694/content/site/civil-construction-1';

function currentKeys(rec) {
  const lines = readFileSync(`${base}/primary-${rec}/article.mdx`, 'utf8').split(/\r?\n/);
  const keys = {}; let no = null;
  for (const l of lines) {
    const m = l.match(/^##\s*問題\s*No\.?\s*([0-9]+)/);
    if (m) { no = +m[1]; continue; }
    const k = l.match(/正答[：:]\s*([0-9]+)/);
    if (k && no != null) { keys[no] = +k[1]; no = null; }
  }
  return keys;
}

let totalMismatch = 0;
for (const rec of Object.keys(official)) {
  const off = official[rec];       // index 0 = No.1
  const cur = currentKeys(rec);
  const mism = [];
  for (let i = 0; i < off.length; i++) {
    const no = i + 1;
    if (cur[no] === undefined) { mism.push(`No.${no}: MISSING in article`); continue; }
    if (cur[no] !== off[i]) mism.push(`No.${no}: article=${cur[no]} OFFICIAL=${off[i]}`);
  }
  const curCount = Object.keys(cur).length;
  console.log(`\n=== ${rec} (official ${off.length}q, article ${curCount}q) — ${mism.length} mismatches ===`);
  mism.forEach(m => console.log('  ' + m));
  totalMismatch += mism.length;
}
console.log(`\nTOTAL MISMATCHES: ${totalMismatch}`);
