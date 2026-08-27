// markAmbiguousClaims（verify-ig-status の逆方向衝突検査）のテスト。
//
// 守りたい事故（2026-08-27 未遂）: verify-ig-status の matched はパック→ライブの片方向しか
// 見ないため、1 本のライブ投稿に複数パックがマッチしても各パックは matched=1 のまま
// published_UNrecorded に入る。これを「ライブ投稿と一意対応」と読んで posted.json へ
// backfill しようとした。実測では civil の 10 パックがわずか 3 本の投稿を共有し
// （Dbe0u3tDDnw が 5 パック）、うち 4 件は status.json の scheduled_at が未来日＝未投稿だった。
// 未投稿のパックに「投稿済み」の記録が付けば、後で「投稿済みだから作らない」という判断ミスを招く。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markAmbiguousClaims } from '../scripts/lib/ig-ambiguity.mjs';

/** cats の最小形。published_UNrecorded に [rel, [shortcode...]] を並べる。 */
function cats({ pub = [], draft = [], anomaly = [] } = {}) {
  return {
    published_UNrecorded: pub.map(([rel, matched]) => ({ rel, matched })),
    draft_misrecorded: draft.map(([rel, matched]) => ({ rel, matched })),
    anomaly: anomaly.map(([rel, matched]) => ({ rel, matched, reason: '既存の理由' })),
  };
}

test('衝突なし: 各パックが別々のライブ投稿に対応していれば ambiguous は立たない', () => {
  const c = cats({ pub: [['cem/a', ['SC1']], ['cem/b', ['SC2']]] });
  const r = markAmbiguousClaims(c);
  assert.deepEqual(r, { collisions: 0, affected: 0 });
  assert.equal(c.published_UNrecorded.every((p) => p.ambiguous === undefined), true);
  assert.equal(c.anomaly.length, 0);
});

test('2 パックが同じ shortcode を主張したら両方 ambiguous になり anomaly へ載る', () => {
  const c = cats({ pub: [['civil-1/x', ['SC1']], ['civil-2/x', ['SC1']]] });
  const r = markAmbiguousClaims(c);
  assert.deepEqual(r, { collisions: 1, affected: 2 });
  assert.equal(c.published_UNrecorded.every((p) => p.ambiguous === true), true);
  assert.deepEqual(c.published_UNrecorded[0].ambiguousWith, ['civil-2/x']);
  assert.deepEqual(c.published_UNrecorded[1].ambiguousWith, ['civil-1/x']);
  assert.equal(c.anomaly.length, 2);
  assert.match(c.anomaly[0].reason, /SC1 を 2 パックが主張/);
});

test('回帰: 実データ形状（Dbe0u3tDDnw を 5 パックが共有）で 5 件すべてが ambiguous', () => {
  // 2026-08-27 実測の civil 10 件。matched=1 なのに 3 本の投稿を共有していた。
  const c = cats({
    pub: [
      ['civil-1/theme-packs/hoki-vibration/pack-01', ['Dbe0u3tDDnw']],
      ['civil-1/theme-packs/hoki-vibration/pack-02', ['Dbe0u3tDDnw']],
      ['civil-1/theme-packs/hoki-vibration/pack-03', ['Dbe0u3tDDnw']],
      ['civil-2/theme-packs/hoki-vibration/pack-01', ['Dbe0u3tDDnw']],
      ['civil-2/theme-packs/hoki-vibration/pack-02', ['Dbe0u3tDDnw']],
      ['civil-1/theme-packs/sekokeikaku-machine/pack-01', ['DbcP7OOkcNk']],
      ['civil-1/theme-packs/sekokeikaku-machine/pack-02', ['DbcP7OOkcNk']],
      ['civil-2/theme-packs/sekokeikaku-machine/pack-01', ['DbcP7OOkcNk']],
      ['civil-1/theme-packs/kankyo-recycle/pack-01', ['DbUhifcGoKH']],
      ['civil-2/theme-packs/kankyo-recycle/pack-01', ['DbUhifcGoKH']],
      // cem 側は shortcode 一意（衝突しない）
      ['cem/keyword-packs/iso-14000', ['DaNLWTtDI4u']],
      ['cem/keyword-packs/swot-analysis', ['DakWff8DF30']],
    ],
  });
  const r = markAmbiguousClaims(c);
  assert.deepEqual(r, { collisions: 3, affected: 10 });

  const ambiguous = c.published_UNrecorded.filter((p) => p.ambiguous);
  assert.equal(ambiguous.length, 10);
  assert.equal(ambiguous.every((p) => p.rel.startsWith('civil-')), true, 'civil 10 件だけが衝突');

  const safe = c.published_UNrecorded.filter((p) => !p.ambiguous);
  assert.deepEqual(safe.map((p) => p.rel), ['cem/keyword-packs/iso-14000', 'cem/keyword-packs/swot-analysis']);

  // 5 パック共有のものは「他 4 パック」と記録される
  const five = c.published_UNrecorded.find((p) => p.rel === 'civil-1/theme-packs/hoki-vibration/pack-01');
  assert.equal(five.ambiguousWith.length, 4);
});

test('draft_misrecorded も衝突検査の対象（published と横断して数える）', () => {
  const c = cats({ pub: [['a', ['SC1']]], draft: [['b', ['SC1']]] });
  const r = markAmbiguousClaims(c);
  assert.deepEqual(r, { collisions: 1, affected: 2 });
  assert.equal(c.published_UNrecorded[0].ambiguous, true);
  assert.equal(c.draft_misrecorded[0].ambiguous, true);
  assert.equal(c.anomaly.length, 2);
});

test('既に anomaly に載っているパックは二重に積まない（フラグだけ立てる）', () => {
  const c = cats({
    pub: [['a', ['SC1']], ['b', ['SC1']]],
    anomaly: [['a', ['SC1', 'SC9']]], // matchedCarousel>=2 で既出
  });
  markAmbiguousClaims(c);
  assert.equal(c.anomaly.filter((p) => p.rel === 'a').length, 1, 'a は 1 件のまま');
  assert.equal(c.anomaly.filter((p) => p.rel === 'b').length, 1);
  assert.equal(c.published_UNrecorded.find((p) => p.rel === 'a').ambiguous, true);
});

test('published_UNrecorded からは取り除かない（既存の集計・exit code を変えない）', () => {
  const c = cats({ pub: [['a', ['SC1']], ['b', ['SC1']]] });
  markAmbiguousClaims(c);
  assert.equal(c.published_UNrecorded.length, 2, 'カテゴリの件数は不変');
});

test('matched が空・未定義でも例外にしない', () => {
  const c = cats({ pub: [['a', []], ['b', undefined]] });
  const r = markAmbiguousClaims(c);
  assert.deepEqual(r, { collisions: 0, affected: 0 });
});

test('同一パックが同じ shortcode を 2 回持っていても自己衝突にしない', () => {
  // matched の重複は上流の取りこぼしでありうる。1 パックしか主張していないので衝突ではない。
  const c = cats({ pub: [['a', ['SC1', 'SC1']]] });
  const r = markAmbiguousClaims(c);
  assert.equal(c.published_UNrecorded[0].ambiguous, undefined, '自分だけなら ambiguous にしない');
  assert.equal(r.collisions, 0);
});
