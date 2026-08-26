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
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'scripts/quality-audit.mjs'), 'utf8');

/**
 * CHECKS のエントリを 1 件ずつ切り出す。
 * `{ id: '...' ... }` の塊を、次の `{ id:` までで区切る（複数行定義にも当たる）。
 */
function parseChecks(source) {
  const start = source.indexOf('const CHECKS = [');
  assert.ok(start > 0, 'CHECKS 配列が見つからない（定義の形が変わった＝検査不成立）');
  const body = source.slice(start);
  const out = [];
  const re = /\{\s*\n?\s*id:\s*'([a-z0-9-]+)'/g;
  const heads = [...body.matchAll(re)];
  for (let i = 0; i < heads.length; i += 1) {
    const from = heads[i].index;
    const to = i + 1 < heads.length ? heads[i + 1].index : body.length;
    const block = body.slice(from, to);
    out.push({
      id: heads[i][1],
      ci: /\bci:\s*true\b/.test(block),
      digestFalse: /\bdigest:\s*false\b/.test(block),
      note: /note:\s*'((?:[^'\\]|\\.)*)'/.exec(block)?.[1] ?? '',
    });
  }
  return out;
}

test('CHECKS を解析できている（対象 0 件を PASS と呼ばない）', () => {
  const checks = parseChecks(SRC);
  assert.ok(checks.length >= 50, `CHECKS が ${checks.length} 件しか取れていない（解析の破損を疑う）`);
  assert.ok(checks.some((c) => c.ci), 'ci:true が 1 件も取れていない');
  assert.ok(checks.some((c) => !c.ci), 'ci:false が 1 件も取れていない');
});

test('すべての report 検査（ci:false）が note に読み手を書いている', () => {
  // §9「新規検査を report で追加するときは誰がいつ読むかを決める」を規範から機械ゲートへ。
  // digest に入っていても、note に書かれていなければ半年後に誰も辿れない。
  // digest:false（常に非ゼロの情報出力）は特に、書かないと落ちても誰も気づかない検査になる。
  const reports = parseChecks(SRC).filter((c) => !c.ci);
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
  assert.match(ci, /if:\s*failure\(\)/, 'ci.yml に失敗ハンドラが無い');
  assert.match(ci, /report-automation-failure/, 'ci.yml が automation-failure Issue を起票していない');
  assert.match(ci, /issues:\s*write/, 'ci.yml に issues: write が無い（起票できない）');
});
