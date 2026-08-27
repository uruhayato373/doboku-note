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

/**
 * bot commit の git 手順の順序を見る（純関数・テストから使う）。
 *
 * 止めたい事故（2026-08-27・asset-inbox.yml run 33034670182）:
 *   `git add <file>` → `git rebase origin/develop` → `git commit` の順に書くと、
 *   rebase 時点で index に staged が残っているため
 *   `error: cannot rebase: Your index contains uncommitted changes` で必ず落ちる。
 *   しかも落ちるのは publish step だけなので、**R2 への upload は成功しているのに
 *   台帳（manifest）だけ commit されない**という中途半端な状態で毎回失敗し続けた。
 *   正しい順序は commit → fetch → rebase → push。
 */
export function auditGitPublishOrder(name, source) {
  const publishes = new RegExp(`git push\\s+(?:origin\\s+)?(?:HEAD:)?${PUBLISH_BRANCH}\\b`).test(source);
  if (!publishes) return { name, applicable: false, ok: true, blocks: [] };

  // `run: |` ブロック単位で見る。ブロックを跨いだ順序は index を共有しないので対象外。
  const blocks = [];
  const lines = source.split(/\r?\n/);
  let cur = null;
  let indent = 0;
  for (const line of lines) {
    if (/^\s*(?:-\s*)?run:\s*[|>]/.test(line)) {
      indent = (line.match(/^\s*/) ?? [''])[0].length;
      cur = [];
      blocks.push(cur);
      continue;
    }
    if (cur === null) continue;
    if (line.trim() !== '' && (line.match(/^\s*/) ?? [''])[0].length <= indent) { cur = null; continue; }
    cur.push(line);
  }

  const bad = [];
  for (const block of blocks) {
    const steps = [];
    block.forEach((l, i) => {
      if (/\bgit\s+add\b/.test(l)) steps.push({ i, verb: 'add' });
      else if (/\bgit\s+commit\b/.test(l)) steps.push({ i, verb: 'commit' });
      else if (/\bgit\s+(?:rebase\b|pull\s+--rebase\b)/.test(l)) steps.push({ i, verb: 'rebase' });
      else if (/\bgit\s+stash\b/.test(l)) steps.push({ i, verb: 'stash' });
    });
    const firstAdd = steps.find((s) => s.verb === 'add');
    if (!firstAdd) continue;
    const rebase = steps.find((s) => s.verb === 'rebase' && s.i > firstAdd.i);
    if (!rebase) continue;
    const commitBefore = steps.some((s) => s.verb === 'commit' && s.i > firstAdd.i && s.i < rebase.i);
    const stashBefore = steps.some((s) => s.verb === 'stash' && s.i > firstAdd.i && s.i < rebase.i);
    if (!commitBefore && !stashBefore) {
      bad.push(block[rebase.i].trim());
    }
  }
  return { name, applicable: true, ok: bad.length === 0, blocks: bad };
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

  // 追加ルール: bot commit の git 手順（add → rebase → commit の順序事故）
  const orders = files.map((f) => auditGitPublishOrder(f, readFileSync(join(WORKFLOW_DIR, f), 'utf8')));
  const orderApplicable = orders.filter((r) => r.applicable);
  const orderBad = orderApplicable.filter((r) => !r.ok);
  say(`[check-workflow-publish-ref] git 手順の順序: ${PUBLISH_BRANCH} へ書込 ${orderApplicable.length} 本を実検査`);
  for (const r of orderBad) {
    console.error(`  ✗ ${r.name}: staged のまま rebase している → ${r.blocks.join(' / ')}`);
  }

  if (bad.length === 0 && orderBad.length === 0) {
    say(`[check-workflow-publish-ref] ✓ 書込 workflow は全て ${PUBLISH_BRANCH} を checkout し、commit → rebase の順序も守っている`);
    process.exit(0);
  }

  if (orderBad.length > 0) {
    console.error(
      `\n[check-workflow-publish-ref] ✗ ${orderBad.length} 本が staged のまま rebase している` +
        '\n`git add` の後に commit せず rebase すると `cannot rebase: Your index contains uncommitted changes` で必ず落ちる。' +
        '\n落ちるのが publish step だけなので、外部への副作用（R2 upload 等）は成功したまま台帳だけ残らない。' +
        '\n修正: commit → fetch → rebase → push の順にする（asset-inbox.yml が見本）。',
    );
  }
  if (bad.length === 0) process.exit(1);

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
