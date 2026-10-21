/**
 * report 区分（quality-audit の ci:false）に「誰がいつ読むか」があることを機械で強制する。
 *
 * 背景（CLAUDE.md §9「赤いのに誰も見ていない検査は、無いのと同じ」）:
 *   ci:false は落ちても Pre-merge check が緑のまま通る。レポート（audit-latest.md）は --ci では
 *   書かれず gitignore 済みなので、FAIL は「人がローカルでフル監査を叩いた端末」にしか存在せず、
 *   読む自動経路がゼロだった（DN-0087）。実例＝note-meta-lint は Node 20 で起動即クラッシュしていたが
 *   report 扱いのため 3 週間 1 件も検査せずに放置された。
 *
 *   §9 は「新規検査を report で追加するときは誰がいつ読むかを決める」と規範で書いていたが、
 *   機械で強制していなかったため読み手ゼロの report が積み上がった。ここで強制する。
 *
 * 合格の形は 2 つだけ:
 *   1. digest に入る（weekly-review-guard が --report-only で週次実行し FAIL を Issue へ集約）
 *   2. digest: false ＋ note に読み手を明記（常に非ゼロで判定に使えない情報出力）
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';
import { CHECKS } from '../scripts/quality-audit.mjs';

const SRC = readFileSync(join(ROOT, 'scripts/quality-audit.mjs'), 'utf8');

/**
 * quality-audit.mjs が export する CHECKS をそのまま読む（DN-0788）。
 * 以前は本文を正規表現で切り出していたため、複数行の定義の行コメント「（ci:true）」を ci:true と誤読し、
 * env-inventory を report 区分から外して読み手の検査を素通りさせていた。
 */
function parseChecks() {
  return CHECKS.map((c) => ({
    id: c.id,
    ci: c.ci === true,
    digestFalse: c.digest === false,
    note: c.note ?? '',
    expectedFail: c.expectedFail ?? null,
  }));
}

test('expectedFail がある場合は ci:false に限り、理由に期限/Phase が書かれている', () => {
  // 「今は失敗が正常」を ci:true に認めると Pre-merge の判定が空文になる（実装側も exit 2 で止める）。
  // 理由に期限が無いと、いつ外すべきか誰にも分からず居座る。
  const checks = parseChecks();
  const flagged = checks.filter((c) => c.expectedFail != null);
  assert.deepEqual(flagged.filter((c) => c.ci).map((c) => c.id), [], 'ci:true に expectedFail が付いている');
  const vague = flagged.filter((c) => !/Phase|まで|20\d\d-\d\d/.test(c.expectedFail)).map((c) => c.id);
  assert.deepEqual(vague, [], `expectedFail の理由に期限/Phase が無い: ${vague.join(', ')}`);
});

test('partitionReportOnly: expected は exit に効かず、unexpectedPass は失敗扱い（昇格ラチェット）', async () => {
  const { partitionReportOnly } = await import('../scripts/quality-audit.mjs');
  const results = [
    { id: 'a', status: 'fail', expectedFail: 'Phase 03 まで' },
    { id: 'b', status: 'fail', expectedFail: null },
    { id: 'c', status: 'pass', expectedFail: 'Phase 03 まで' },
    { id: 'd', status: 'pass', expectedFail: null },
    { id: 'e', status: 'timeout', expectedFail: null },
  ];
  const part = partitionReportOnly(results);
  assert.deepEqual(part.expected.map((r) => r.id), ['a']);
  assert.deepEqual(part.unexpected.map((r) => r.id), ['b', 'e']);
  assert.deepEqual(part.unexpectedPass.map((r) => r.id), ['c']);
});

test('CHECKS を解析できている（対象 0 件を PASS と呼ばない）', () => {
  const checks = parseChecks();
  assert.ok(checks.length >= 50, `CHECKS が ${checks.length} 件しか取れていない（解析の破損を疑う）`);
  assert.ok(checks.some((c) => c.ci), 'ci:true が 1 件も取れていない');
  assert.ok(checks.some((c) => !c.ci), 'ci:false が 1 件も取れていない');
});

test('すべての report 検査（ci:false）が note に読み手を書いている', () => {
  // §9「新規検査を report で追加するときは誰がいつ読むかを決める」を規範から機械ゲートへ。
  // digest に入っていても、note に書かれていなければ半年後に誰も辿れない。
  // digest:false（常に非ゼロの情報出力）は特に、書かないと落ちても誰も気づかない検査になる。
  const reports = parseChecks().filter((c) => !c.ci);
  assert.ok(reports.length >= 8, `report 区分が ${reports.length} 件しか取れていない（解析の破損を疑う）`);

  const missing = reports
    .filter((c) => !/読み手|weekly|週次|digest/.test(c.note))
    .map((c) => c.id);
  assert.deepEqual(
    missing, [],
    `note に読み手が書かれていない report: ${missing.join(', ')}\n`
    + '  「読み手＝…」を note に書く。読む人を決められないなら ci:true にするか、検査ごと消す',
  );
});

test('--report-only と --ci が排他であることが実装されている', () => {
  // 両方を渡せてしまうと、対象が空のまま「FAIL なし」で緑になる（検査ゼロの偽 PASS）。
  assert.match(SRC, /if\s*\(CI\s*&&\s*REPORT_ONLY\)/, '--ci と --report-only の排他ガードが無い');
  assert.match(SRC, /REPORT_ONLY\s*&&\s*results\.length === 0/, '--report-only の検査ゼロ判定が無い');
});

test('weekly-review-guard が report 区分を週次で読んでいる（配線の実在）', () => {
  // この配線が消えると report 区分は再び「誰も読まない」状態に戻る。
  const wf = readFileSync(join(ROOT, '.github/workflows/weekly-review-guard.yml'), 'utf8');
  assert.match(wf, /--report-only/, 'weekly-review-guard が --report-only を実行していない');
  assert.match(wf, /--channel report-checks/, 'report 区分の FAIL を Issue へ集約していない');
});

test('CI が赤いことを届ける経路が実在する（ci.yml の失敗通知）', () => {
  // 2026-08-19 から 24 連続赤でも 2 日気づかれなかった原因は、この step が無かったこと。
  const ci = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8');
  // 2026-09-30 に audit / build を別ジョブへ分け、失敗通知は report ジョブが needs の結果で判定する。
  assert.match(ci, /if:\s*failure\(\)|needs\.\w+\.result == 'failure'/, 'ci.yml に失敗ハンドラが無い');
  assert.match(ci, /report-automation-failure/, 'ci.yml が automation-failure Issue を起票していない');
  assert.match(ci, /issues:\s*write/, 'ci.yml に issues: write が無い（起票できない）');
});

test('GitHub annotation exposes failure details without allowing injected workflow commands', async () => {
  const { githubFailureAnnotation } = await import('../scripts/quality-audit.mjs');
  const line = githubFailureAnnotation({ id: 'eslint', status: 'fail', exitCode: 1, excerpt: '50%\r\n::notice::injected' });
  assert.match(line, /^::error::eslint: fail/);
  assert.ok(line.includes('50%25%0D%0A::notice::injected'));
  assert.ok(!line.includes('\n') && !line.includes('\r'));
  assert.ok(githubFailureAnnotation({ id: 'test', status: 'timeout', exitCode: null, excerpt: 'x'.repeat(10000) }).length < 4100);
});
