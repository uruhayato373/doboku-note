#!/usr/bin/env node
/**
 * check-exam-question-data-fresh.mjs — 1級・2級土木の演習データ（src/config/civil-{1,2}-exam-questions.json）が
 * 過去問 MDX から作り直した結果と index で一致しているか。pre-commit-ci-gates の generated-indexes（過去問 MDX 用）が呼ぶ。
 *
 * 背景（DN-0998・2026-11-24）: 過去問 MDX を直した commit が refresh-indexes を回さず、CI の generated-indexes が
 * 3 回赤くなり develop が約 245 分赤かった。全量（refresh-indexes 約 12 秒）は CI に残し、ここでは演習データの
 * 2 本のパーサ（各 0.2 秒）だけを回す。パーサは作業ツリーへ書くので、index との差が残れば「作り直した結果が stage されていない」。
 * 直し方: npm run build-exam-question-data（または refresh-indexes）→ 差分のファイルを git add。
 * 対象数: 出力 2 ファイルを実際に比べた件数を出す（0 件で緑にしない）。
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../lib/repository-paths.mjs';

const PARSERS = ['scripts/sns/parse-civil-1-questions.mjs', 'scripts/sns/parse-civil-2-questions.mjs'];
const OUTPUTS = ['src/config/civil-1-exam-questions.json', 'src/config/civil-2-exam-questions.json'];

for (const p of PARSERS) {
  const r = spawnSync('node', [p], { cwd: REPO_ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(`[check-exam-question-data-fresh] 検査不成立: ${p} が失敗した\n${(r.stderr || r.stdout || '').split('\n').slice(-8).join('\n')}`);
    process.exit(2);
  }
}
const stale = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--name-only', '--', ...OUTPUTS], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).split('\n').filter(Boolean);
console.log(`[check-exam-question-data-fresh] ${OUTPUTS.length} 本を作り直して index と比較 / 一致しない ${stale.length} 件`);
if (stale.length) {
  console.error('  ✗ 演習データが過去問 MDX と一致しない（作り直した結果を git add する。npm run build-exam-question-data）:');
  for (const f of stale) console.error(`    ${f}`);
  process.exit(1);
}
