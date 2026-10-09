#!/usr/bin/env node
/**
 * check-content-registry.mjs — コンテンツ台帳（content/registry）の検査 R01〜R10（content-registry.md「検査」）。
 * 実装は scripts/lib/content-registry-check.mjs。型（zod）は check-datasets が見る。
 *
 *   npm run check-content-registry [-- --base <git ref>] [--json] [--verbose]
 *
 * exit: 0 合格（WARN・INFO はあってよい）/ 1 FAIL あり（台帳が 0 件も FAIL＝検査不成立を合格と呼ばない）
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { checkRegistry } from './lib/content-registry-check.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { values: args } = parseArgs({ options: { base: { type: 'string' }, json: { type: 'boolean' }, verbose: { type: 'boolean' } } });
const { issues, counts } = checkRegistry(ROOT, { base: args.base ?? null });
const by = (sev) => issues.filter((i) => i.severity === sev);
if (args.json) {
  process.stdout.write(JSON.stringify({ counts, issues }, null, 2) + '\n');
} else {
  const ch = Object.entries(counts.byChannel).map(([k, v]) => `${k} ${v}`).join('・') || 'なし';
  console.log(`check-content-registry: 作品 ${counts.works}・公開 ${counts.publications}（${ch}）・素材 ${counts.media} を実検査 / 今の台帳との照合（R09）${counts.checkedR09} 件 / 動画パック ${counts.videoPacks} 本のうち台帳に無い ${counts.videoPacksWithoutWork} 本`);
  for (const i of [...by('FAIL'), ...by('WARN'), ...(args.verbose ? by('INFO') : [])]) console.log(`  [${i.severity}] ${i.code} ${i.id ?? '-'}: ${i.message}`);
  console.log(`結果: ${by('FAIL').length ? 'FAIL' : 'PASS'}（FAIL ${by('FAIL').length} / WARN ${by('WARN').length} / INFO ${by('INFO').length}${args.verbose ? '' : '・INFO の内訳は --verbose'}）`);
}
process.exitCode = by('FAIL').length ? 1 : 0;
