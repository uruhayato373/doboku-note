#!/usr/bin/env node
/**
 * check-workflow-publish-ref.mjs — schedule workflow の checkout ref を固定するゲート。
 *
 * 止めたい事故（2026-08 に **3 回**起きた同じ欠陥）:
 *   GitHub Actions の `schedule` は**デフォルトブランチ（main）の定義**で走り、
 *   `actions/checkout` に `ref:` を書かないと main を checkout する。
 *   そこで `npm ci` が **main の** pre-commit フックを入れ、publish step で
 *   `git checkout develop` してから commit すると、フックの drift guard が
 *   「導入済みフックが古い」と bot commit を拒否して落ちる。
 *
 *   実発生:
 *     - fetch-metrics.yml   … GA4 by-label スナップショットが 2026-08-13 で停止
 *     - psi-audit.yml       … 2026-08-20 に `[pre-commit] 導入済みフックが古い` で失敗
 *     - index-coverage.yml  … 月次のため未発火だったが同じ欠陥を保持していた
 *
 *   `npm run pre-commit:install` を publish step に足す回避策も試したが、
 *   **その回避策自体が develop にしか無い**ため main から走る schedule には効かなかった。
 *   根治は「最初から develop を checkout して順序依存を無くす」こと。
 *
 * 検査: `schedule:` を持ち かつ develop へ push する workflow は、
 *       `actions/checkout` に `ref: develop` を持たなければならない。
 *
 * Usage:
 *   node scripts/check-workflow-publish-ref.mjs
 *   node scripts/check-workflow-publish-ref.mjs --json
 *
 * exit: 0 合格 / 1 違反あり / 2 検査不成立（走査が壊れている）
 *
 * 真実源: .claude/knowledge/reference/measurement-incidents.md（計測 CI の停止事故）
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW_DIR = join(ROOT, '.github/workflows');

/** publish 先ブランチ。ここ以外へ push する workflow は本検査の対象外。 */
const PUBLISH_BRANCH = 'develop';

/**
 * 1 ファイルを判定する（純関数・テストから使う）。
 * YAML パーサを持ち込まず行ベースで見る。`ref:` の値さえ取れればよく、
 * パーサ依存を増やすほうがこの検査には不利（CI で壊れる面が増える）。
 */
export function auditWorkflow(name, source) {
  const hasSchedule = /^\s*schedule:\s*$/m.test(source);
  const publishes = new RegExp(`git push\\s+(?:origin\\s+)?(?:HEAD:)?${PUBLISH_BRANCH}\\b`).test(source);
  if (!hasSchedule || !publishes) {
    return { name, hasSchedule, publishes, applicable: false, ref: null, ok: true };
  }
  // checkout ステップ直後の with: ref: を探す（複数 checkout があれば最初の 1 つ）。
  const checkoutIdx = source.search(/uses:\s*actions\/checkout@/);
  const after = checkoutIdx >= 0 ? source.slice(checkoutIdx, checkoutIdx + 400) : '';
  const m = /^\s*ref:\s*(\S+)\s*$/m.exec(after);
  const ref = m ? m[1] : null;
  return {
    name,
    hasSchedule,
    publishes,
    applicable: true,
    ref,
    ok: ref === PUBLISH_BRANCH,
  };
}

function main() {
  const jsonOut = process.argv.includes('--json');
  const say = jsonOut ? console.error : console.log;

  let files;
  try {
    files = readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  } catch {
    console.error(`✗ 検査不成立: ${WORKFLOW_DIR} を読めない`);
    process.exit(2);
  }

  const rows = files.map((f) => auditWorkflow(f, readFileSync(join(WORKFLOW_DIR, f), 'utf8')));
  const scheduled = rows.filter((r) => r.hasSchedule);
  const applicable = rows.filter((r) => r.applicable);
  const bad = applicable.filter((r) => !r.ok);

  // 検査ゼロを PASS と呼ばない（CLAUDE.md §9）。
  // schedule workflow が 1 本も取れないのは「健全」ではなく走査の破損。
  if (files.length === 0 || scheduled.length === 0) {
    console.error(
      `✗ 検査不成立: workflow ${files.length} 本 / schedule 持ち ${scheduled.length} 本。` +
        '走査が壊れている可能性がある（「違反 0」ではない）',
    );
    process.exit(2);
  }

  say(
    `[check-workflow-publish-ref] workflow ${files.length} 本 / schedule ${scheduled.length} 本 / ` +
      `${PUBLISH_BRANCH} へ書込 ${applicable.length} 本を実検査`,
  );
  for (const r of applicable) {
    say(`  ${r.ok ? '✓' : '✗'} ref: ${r.ref ?? '（なし＝デフォルトブランチ）'}  ${r.name}`);
  }

  if (jsonOut) {
    process.stdout.write(`${JSON.stringify({ files: files.length, scheduled: scheduled.length, applicable: applicable.length, violations: bad }, null, 2)}\n`);
  }

  if (bad.length === 0) {
    say(`[check-workflow-publish-ref] ✓ 書込 workflow は全て ${PUBLISH_BRANCH} を checkout している`);
    process.exit(0);
  }

  console.error(`\n[check-workflow-publish-ref] ✗ ${bad.length} 本が ${PUBLISH_BRANCH} を checkout していない`);
  for (const r of bad) console.error(`  ${r.name}  ref=${r.ref ?? '（なし）'}`);
  console.error(
    `\nschedule はデフォルトブランチの定義で走る。ref を書かないと main を checkout し、` +
      `\nnpm ci が main のフックを入れたまま ${PUBLISH_BRANCH} へ commit して drift guard に弾かれる。` +
      '\n修正: actions/checkout に `with: { ref: develop }` を足す（fetch-metrics.yml が見本）。',
  );
  process.exit(1);
}

if (process.argv[1] && process.argv[1].split('\\').join('/').endsWith('check-workflow-publish-ref.mjs')) main();
