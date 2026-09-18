/**
 * quality-audit の ops 区分（運用アラート）が Pre-merge ゲート（ci:true）に混ざらないことを固定する。
 *
 * 背景（2026-09-18）: membership-drip（会員記事の配信予定日超過）が ci:true に置かれ、記事が 2 日
 * 遅れるたびに**全 PR が赤**になっていた。30 日で Pre-merge 58 敗のうち 13 敗がこれで、その陰で
 * unit-tests の赤 6 回が読まれなかった。壁時計に依存する検査は PR の diff では直せないので、
 * マージゲートではなく日次アラート（ops-audit.yml → automation-failure Issue channel ops）で出す。
 *
 * 守ること:
 *   1. ops:true は ci:false（実装側も exit 2 で止める）
 *   2. 壁時計・鮮度を示す語を持つ検査が ci:true に居ない（再混入の検知）
 *   3. --ops / --ci / --report-only の対象が排他で、--ops が 0 件実行を PASS と呼ばない
 *   4. ops 区分を日次で読む配線（ops-audit.yml）が実在し、復旧で自動クローズしている
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'scripts/quality-audit.mjs'), 'utf8');

function parseChecks(source) {
  const start = source.indexOf('const CHECKS = [');
  assert.ok(start > 0, 'CHECKS 配列が見つからない（定義の形が変わった＝検査不成立）');
  const end = source.indexOf('\n];', start);
  assert.ok(end > start, 'CHECKS 配列の終端が見つからない');
  const body = source.slice(start, end);
  const heads = [...body.matchAll(/\{\s*\n?\s*id:\s*'([a-z0-9-]+)'/g)];
  return heads.map((h, i) => {
    const block = body.slice(h.index, i + 1 < heads.length ? heads[i + 1].index : body.length);
    const note = /note:\s*'((?:[^'\\]|\\.)*)'/.exec(block)?.[1] ?? '';
    // フラグ判定は note 文字列と行コメントを除いた部分で行う（note に「ci:true」と書いただけで誤判定しない）
    const flags = block.replace(/note:\s*'(?:[^'\\]|\\.)*'/, '').replace(/\/\/.*$/gm, '');
    return {
      id: h[1],
      ci: /\bci:\s*true\b/.test(flags),
      ops: /\bops:\s*true\b/.test(flags),
      npm: /npm:\s*'([^']+)'/.exec(block)?.[1] ?? '',
      note,
    };
  });
}

test('ops:true の検査は ci:false（マージゲートに混ざらない）', () => {
  const checks = parseChecks(SRC);
  const ops = checks.filter((c) => c.ops);
  assert.ok(ops.length >= 1, 'ops:true が 1 件も無い（区分が消えた＝検査不成立）');
  assert.deepEqual(ops.filter((c) => c.ci).map((c) => c.id), [], 'ops:true なのに ci:true の検査がある');
  assert.ok(ops.some((c) => c.id === 'membership-drip'), 'membership-drip が ops に居ない（ci に戻すと全 PR が赤になる）');
});

test('壁時計・鮮度に依存する検査が ci:true に居ない（再混入の検知）', () => {
  // id / npm / note に「予定日を過ぎた」「転記が止まった」を示す語があれば、PR の diff では直せない
  // 検査とみなす。誤検知なら note の書き方を変えるのではなく、本当に diff で決まるかを見直す。
  const WALLCLOCK = /overdue|drip|freshness|予定日|配信予定|転記が止|日超過|GRACE_DAYS/;
  const bad = parseChecks(SRC)
    .filter((c) => c.ci && WALLCLOCK.test(`${c.id} ${c.npm} ${c.note}`))
    .map((c) => c.id);
  assert.deepEqual(bad, [], `壁時計依存の検査が ci:true にある: ${bad.join(', ')} → ops:true, ci:false にする`);
});

test('selectsCheck: --ci / --ops / --report-only の対象が排他', async () => {
  const { selectsCheck } = await import('../scripts/quality-audit.mjs');
  const gate = { id: 'g', ci: true };
  const ops = { id: 'o', ci: false, ops: true };
  const report = { id: 'r', ci: false };
  const info = { id: 'k', ci: false, digest: false };
  assert.deepEqual([gate, ops, report, info].map((c) => selectsCheck(c, { ci: true })), [true, false, false, false]);
  assert.deepEqual([gate, ops, report, info].map((c) => selectsCheck(c, { ops: true })), [false, true, false, false]);
  assert.deepEqual([gate, ops, report, info].map((c) => selectsCheck(c, { reportOnly: true })), [false, false, true, false]);
  assert.deepEqual([gate, ops, report, info].map((c) => selectsCheck(c, {})), [true, true, true, true]);
});

test('--ops のガードが実装されている（排他・検査ゼロ・ops は ci:false）', () => {
  assert.match(SRC, /if\s*\(OPS\s*&&\s*\(CI\s*\|\|\s*REPORT_ONLY\)\)/, '--ops と --ci/--report-only の排他ガードが無い');
  assert.match(SRC, /OPS\s*&&\s*results\.length === 0/, '--ops の検査ゼロ判定が無い');
  assert.match(SRC, /c\.ops\s*&&\s*c\.ci/, 'ops:true かつ ci:true を exit 2 で止める検証が無い');
});

test('ops 区分を日次で読む配線が実在する（ops-audit.yml）', () => {
  const wf = readFileSync(join(ROOT, '.github/workflows/ops-audit.yml'), 'utf8');
  assert.match(wf, /quality-audit\.mjs --ops/, 'ops-audit.yml が --ops を実行していない');
  assert.match(wf, /--channel ops/, 'ops の FAIL を automation-failure Issue へ届けていない');
  assert.match(wf, /--resolve --channel ops/, '復旧時に ops Issue を自動クローズしていない');
  assert.match(wf, /issues:\s*write/, 'ops-audit.yml に issues: write が無い（起票できない）');
  assert.match(wf, /schedule:/, 'ops-audit.yml が cron で回っていない');
  assert.match(wf, /outputs\.rc != '0'/, 'rc=2（検査不成立）を緑にしないガードが無い');
});

test('ops-audit.yml が workflow-health の監視対象に居る', () => {
  const cfg = JSON.parse(readFileSync(join(ROOT, '.claude/config/workflow-health.json'), 'utf8'));
  assert.ok(cfg.workflows.some((w) => w.workflow === 'ops-audit.yml'), 'ops-audit.yml が workflow-health.json に無い（沈黙を拾えない）');
});
