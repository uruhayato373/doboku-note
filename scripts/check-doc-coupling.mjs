#!/usr/bin/env node
// スキル / エージェントの一覧（skills-guide.md・agents-registry.md の生成区間）が、原本の frontmatter と一致するかを検証する。
//
// 背景: 2026-11-11 までは、スキル・エージェントの追加・削除・description 変更のたびに、手書きの台帳 3 本
// （skills-guide.md / skills-registry.md / agents-registry.md）を同一コミットで直すことを求めていた。台帳は 14 日で計 50 回変更され、
// コードを触るコミットの半分が文書も直す原因になっていた。一覧は `npm run build-capability-index` が frontmatter から生成する形に変え、
// このゲートは「生成物が原本と一致するか」だけを見る。変更の経緯は git の履歴が持つ（skills-registry.md は廃止）。
//
// 検査:
//   --staged（pre-commit）: スキル・エージェント・生成先の文書のどれかを stage したときだけ検査する。
//                            生成先の文書に stage していない変更が残っていても止める（再生成したのに add し忘れた）。
//   引数なし（CI）         : 常に検査する。
//
// 使い方:
//   node scripts/check-doc-coupling.mjs --staged
//   npm run check-doc-coupling
// exit: 0 一致・対象外 / 1 ずれ / 2 検査不成立（原本が読めない・生成区間のマーカーが無い）
// 緊急回避: 環境変数 SKIP_DOC_COUPLING=1

import { execFileSync } from 'node:child_process';
import { planIndex, TARGETS } from './build-capability-index.mjs';
import { runBody, isCliEntry, runAsCli } from './lib/cli-run.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

/** stage した変更が、一覧の原本（スキル・エージェント）か生成先の文書に当たるか。純関数 */
export function touchesCapabilityIndex(stagedPaths, targets = TARGETS.map((t) => t.file)) {
  return stagedPaths.some((p) => (p.startsWith('.claude/skills/') && p.endsWith('/SKILL.md')) || (p.startsWith('.claude/agents/') && p.endsWith('.md')) || targets.includes(p));
}

// in-process でも呼べるよう run() に包んである（DN-0688・pre-commit-dispatch が import して呼ぶ）。
export async function run({ argv = process.argv.slice(2) } = {}) {
  return runBody(argv, import.meta.url, async ({ argv: __argv, exit: __exit }) => {
    if (process.env.SKIP_DOC_COUPLING === '1') {
      console.log('[check-doc-coupling] スキップ（SKIP_DOC_COUPLING=1）');
      __exit(0);
    }
    const staged = __argv.includes('--staged');
    // 日本語パスは既定でエスケープされるので quotepath を切る。大規模な移行コミットで ENOBUFS にならないよう広く取る
    const git = (args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).split('\n').map((l) => l.trim()).filter(Boolean);

    if (staged && !touchesCapabilityIndex(git(['diff', '--cached', '--no-renames', '--name-only']))) {
      console.log('[check-doc-coupling] 対象外（スキル・エージェント・一覧の文書を stage していない）');
      __exit(0);
    }

    const plan = planIndex(ROOT);
    console.log(`[check-doc-coupling] スキル ${plan.skills} 本 / エージェント ${plan.agents} 体の frontmatter と、文書 ${plan.docs.length} 本の生成区間を照合`);
    if (plan.problems.length) {
      for (const p of plan.problems) console.error(`  ✗ 検査不成立: ${p}`);
      __exit(2);
    }
    const stale = plan.docs.filter((d) => d.stale).map((d) => d.file);
    const unstaged = staged ? git(['diff', '--name-only', '--', ...TARGETS.map((t) => t.file)]) : [];
    if (stale.length || unstaged.length) {
      for (const f of stale) console.error(`  ✗ ${f} の一覧が frontmatter とずれている`);
      for (const f of unstaged.filter((x) => !stale.includes(x))) console.error(`  ✗ ${f} に stage していない変更がある（再生成した文書を git add する）`);
      console.error('\n対処: npm run build-capability-index を回し、書き換わった文書を同じ commit に含める（一覧は手で直さない）。');
      console.error('      正当に不要なら SKIP_DOC_COUPLING=1 で回避。');
      __exit(1);
    }
    console.log('[check-doc-coupling] ✓ スキル・エージェントの一覧は frontmatter と一致');
  });
}

if (isCliEntry(import.meta.url)) runAsCli(run);
