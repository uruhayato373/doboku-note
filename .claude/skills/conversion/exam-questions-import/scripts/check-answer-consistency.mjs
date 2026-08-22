#!/usr/bin/env node
/**
 * check-answer-consistency.mjs — 過去問 MDX の「正答 ⇔ ✅/❌ 整合」検出
 *
 * 各設問の `**正答：N**` と、解説内の番号付き選択肢に付いた ✅/❌ バッジが
 * 整合しているか（適切型は ✅ が正答番号に、不適切型は ❌ が正答番号に付くか）を
 * 機械チェックする。正答番号の機械突合だけでは品質保証にならない（問題文・選択肢の
 * 捏造は別途 SKILL.md Step 5.7 の原典視覚突合で検出）が、本検査は ✅/❌ の付け間違い・
 * 正答欠落・ExamPoint 内へのバッジ混入を確実に拾う。
 *
 * 使い方:
 *   node .../scripts/check-answer-consistency.mjs <article.mdx> [<article.mdx> ...]
 *   「整合」と出れば OK。設問ごとに不整合理由を列挙する。
 *
 * 注意: 出題不備で正答行を意図的に欠く設問（救済等）は「正答 行なし」と出るが、
 *       意図的なら無視してよい（人手で判断）。
 */
import { readFileSync } from 'node:fs';

const files = process.argv.slice(2);
let totalIssues = 0;
for (const f of files) {
  const raw = readFileSync(f, 'utf-8');
  let qCount = 0;
  const issues = [];
  for (const p of raw.split(/\n(?=## )/)) {
    const h = p.match(/^## (.+)/);
    if (!h) continue;
    const head = h[1].trim();
    if (!/^[ⅠⅡⅢ]/.test(head)) continue;
    qCount++;
    const ans = p.match(/正答[：:]\s*([0-9０-９]+)/);
    if (!ans) { issues.push(`${head}: 正答 行なし`); continue; }
    const ansNum = ans[1].replace(/[０-９]/g, d => '０１２３４５６７８９'.indexOf(d));
    const optLines = [...p.matchAll(/^([0-9])\.\s.*$/gm)].map(m => m[0]);
    const okLines = optLines.filter(l => l.includes('✅'));
    const ngLines = optLines.filter(l => l.includes('❌'));
    if (okLines.length === 0 && ngLines.length === 0) continue; // item-level marks only
    const okNum = okLines.length === 1 ? okLines[0].match(/^([0-9])\./)[1] : null;
    const ngNum = ngLines.length === 1 ? ngLines[0].match(/^([0-9])\./)[1] : null;
    const consistent = (okNum === ansNum) || (ngNum === ansNum);
    if (!consistent) {
      const okSet = okLines.map(l => l.match(/^([0-9])\./)[1]).join(',');
      const ngSet = ngLines.map(l => l.match(/^([0-9])\./)[1]).join(',');
      issues.push(`${head}: 正答=${ansNum} だが ✅[${okSet}] / ❌[${ngSet}] ← どちらも正答に一致せず`);
    }
    const ep = p.match(/<ExamPoint[\s\S]*?\/>/);
    if (ep && /[❌✅]/.test(ep[0])) issues.push(`${head}: ExamPoint 内に ❌/✅`);
  }
  const tag = f.split('/').slice(-2)[0];
  if (issues.length) {
    totalIssues += issues.length;
    console.log(`\n### ${tag} (${qCount}問) — ${issues.length} 件`);
    issues.forEach(i => console.log('  - ' + i));
  } else {
    console.log(`OK ${tag} (${qCount}問) — 整合`);
  }
}
console.log(`\n=== total issues: ${totalIssues} ===`);
process.exit(totalIssues ? 1 : 0);
