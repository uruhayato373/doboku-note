import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// 1級と2級で令和6年度以降の解答欄の割り振りが逆（検討項目が1級は(1)側・2級は(2)側）。
// 2026-08-31、ココナラ C8 予想模試（1級）が2級式で販売されており、購入者に
// 「文字数がオーバーする」と指摘されて発覚した。1級の解答欄は1区画 8行×25字＝
// 約200字なので、(2) に 検討＋対応処置＋評価 を乗せると物理的に入らない。
// 判定は助詞で切り分ける必要がある——「検討した項目**への**対応処置」は正しい形で、
// 素朴な「検討」一致だと 45 件の偽陽性が出た。

function run() {
  try {
    const stdout = execFileSync(
      process.execPath,
      ['scripts/check-keiken-answer-split.mjs', '--json'],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    );
    return { code: 0, report: JSON.parse(stdout) };
  } catch (e) {
    return { code: e.status, report: JSON.parse(e.stdout || '{}') };
  }
}

test('解答欄の割り振りに級の取り違えが無い', () => {
  const { code, report } = run();
  assert.deepEqual(
    report.violations,
    [],
    report.violations?.map((v) => `${v.file}: ${v.label}`).join('\n'),
  );
  assert.equal(code, 0);
});

test('実検査 0 件を PASS と呼ばない（対象の置き場が変わったら気づける）', () => {
  const { report } = run();
  assert.ok(report.labelsScanned > 0, '解答欄ラベルを 1 件も読めていない＝検査不成立');
  assert.ok(report.filesScanned > 0, '対象ファイルが 0 件');
});

test('退避される模試の生成原稿も走査対象に入っている（note 配下だけ見ない）', () => {
  const { report } = run();
  const moshi = report.perScan.find((s) => s.dir.includes('moshi-src'));
  assert.ok(moshi, '模試の生成原稿が走査対象に含まれていない');
  // 手元に無い端末では未検査になる。その場合もスクリプトが明示するので、
  // ここでは「対象として宣言されていること」だけを固定する。
  assert.equal(typeof moshi.exists, 'boolean');
});

test('「検討した項目への対応処置」は正しい形なので違反にしない（偽陽性の回帰）', () => {
  const { report } = run();
  const wrong = (report.violations || []).filter((v) => /検討した項目への対応処置/.test(v.label));
  assert.deepEqual(wrong, [], '参照形（への）を並列形と誤判定している');
});
