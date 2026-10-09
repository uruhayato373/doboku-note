import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildQueue, emptyLedger, fileSha, needsFromVerdict, referencedExt, servedExt, signalsOf,
  syncImageDims, validateVerdict,
} from '../scripts/lib/figure-review.mjs';

const fig = (figKey, extra = {}) => ({ figKey, sha: 'aaaa', live: true, needs: null, violations: [], ...extra });
const edgeCut = (side, edgeFrac) => ({ rule: 'EDGE_CUT', side, edgeFrac, detail: `${side}縁` });

test('兆候: OCR の needs と画素の EDGE_CUT/STRAY_* だけを拾い、正当な縁接触（EDGE_LINE 等）は拾わない', () => {
  const s = signalsOf({
    needs: 'recrop',
    violations: [edgeCut('top', 0.4), { rule: 'EDGE_LINE', side: 'left' }, { rule: 'THIN_MARGIN', side: 'right' }],
  });
  assert.deepEqual(s.map((x) => x.signal), ['recrop', 'EDGE_CUT']);
  assert.deepEqual(signalsOf({ needs: 'ok', violations: [{ rule: 'EDGE_TIGHT', side: 'top' }] }), []);
});

test('写真（濃淡のエントロピーが高い）は画素の兆候を使わず、OCR の兆候だけで選ぶ', () => {
  // 2026-10-06: 空や地面が縁まで続く機材写真を EDGE_CUT が拾い、縁の線が長いので判定待ちの先頭に並んだ
  assert.deepEqual(signalsOf({ entropy: 7.0, violations: [edgeCut('left', 0.9)] }), []);
  assert.deepEqual(signalsOf({ entropy: 7.0, needs: 'recrop-review', violations: [edgeCut('left', 0.9)] }).map((x) => x.signal), ['recrop-review']);
  assert.deepEqual(signalsOf({ entropy: 5.1, violations: [edgeCut('top', 0.5)] }).map((x) => x.signal), ['EDGE_CUT']); // 網点を含むスキャン図
});

test('判定待ち: 兆候のある公開図だけを、優先度 → 縁の線の長さ順に並べる', () => {
  const { review, counts } = buildQueue({
    figures: [
      fig('a/x/img/clean'),
      fig('a/x/img/draft', { live: false, violations: [edgeCut('top', 0.9)] }),
      fig('a/x/img/short-edge', { violations: [edgeCut('top', 0.1)] }),
      fig('a/x/img/long-edge', { violations: [edgeCut('left', 0.6)] }),
      fig('a/x/img/legend', { needs: 'recrop-review' }),
      fig('a/x/img/leak', { needs: 'recrop-urgent' }),
    ],
    ledger: emptyLedger(),
  });
  assert.deepEqual(review.map((r) => r.figKey), ['a/x/img/leak', 'a/x/img/long-edge', 'a/x/img/short-edge', 'a/x/img/legend']);
  assert.equal(counts.live, 5);
  assert.equal(counts.flagged, 4);
  assert.equal(counts.pendingReview, 4);
});

test('判定台帳: 今の画像のハッシュと一致する記録だけが効き、差し替えると判定待ちへ戻る（収束と再審査）', () => {
  const ledger = emptyLedger();
  ledger.figures['a/x/img/f1'] = { sha: 'aaaa', verdict: 'ok' };
  ledger.figures['a/x/img/f2'] = { sha: 'old!', verdict: 'ok' };
  ledger.figures['a/x/img/f3'] = { sha: 'aaaa', verdict: 'needs-source', reason: '上端で図が切れている' };
  ledger.figures['a/x/img/f4'] = { sha: 'aaaa', verdict: 'source-unavailable' };
  const flagged = { violations: [edgeCut('top', 0.5)] };
  const { review, reextract, counts } = buildQueue({
    figures: ['f1', 'f2', 'f3', 'f4'].map((n) => fig(`a/x/img/${n}`, flagged)),
    ledger,
  });
  assert.deepEqual(review.map((r) => r.figKey), ['a/x/img/f2']); // 画像が変わった f2 だけ再審査
  assert.deepEqual(reextract.map((r) => r.figKey), ['a/x/img/f3']);
  assert.equal(counts.ok, 1);
  assert.equal(counts.stale, 1);
  assert.equal(counts.sourceUnavailable, 1);
  assert.equal(counts.flagged, 4); // 兆候の数は判定の有無と独立に数える
});

test('手動判定（manual_needs）は台帳に記録が無い図だけに効き、rescan-need-source は原典なしに数える', () => {
  const flagged = { violations: [edgeCut('top', 0.5)] };
  const { review, counts } = buildQueue({
    figures: [fig('a/x/img/m1', flagged), fig('a/x/img/m2', flagged), fig('a/x/img/m3', flagged)],
    ledger: emptyLedger(),
    trusted: new Map([['a/x/img/m1', 'ok'], ['a/x/img/m2', 'rescan-need-source']]),
  });
  assert.deepEqual(review.map((r) => r.figKey), ['a/x/img/m3']);
  assert.equal(counts.trusted, 1);
  assert.equal(counts.sourceUnavailable, 1);
});

test('判定 → provenance の needs', () => {
  assert.equal(needsFromVerdict('ok'), 'ok');
  assert.equal(needsFromVerdict('needs-source'), 'reextract');
  assert.equal(needsFromVerdict('source-unavailable'), 'rescan-need-source');
  assert.equal(needsFromVerdict('bogus'), null);
});

test('配信している画像: 本文が参照する拡張子を優先し、svg を参照していれば raster は配信していない', () => {
  const body = '<img src="/posts/a/x/img/fig-1.webp" width={10} height={20} />\n<ArticleImage src="/posts/a/x/img/fig-2.svg" />';
  assert.equal(referencedExt(body, 'fig-1'), 'webp');
  assert.equal(referencedExt(body, 'fig-2'), 'svg');
  assert.equal(referencedExt(body, 'fig'), null); // 前方一致で別の図に当てない
  const has = (set) => (p) => set.has(p);
  assert.equal(servedExt('/b/fig-1', 'webp', has(new Set(['/b/fig-1.png', '/b/fig-1.webp']))), 'webp');
  assert.equal(servedExt('/b/fig-1', 'png', has(new Set(['/b/fig-1.webp']))), 'webp');
  assert.equal(servedExt('/b/fig-1', null, has(new Set())), null);
});

test('MDX の寸法: 該当の図のタグだけを {N} と "N" の両形式で書き換える', () => {
  const raw = [
    '<img src="/posts/a/x/img/fig-1.webp" alt="図" width={519} height={188} />',
    '<ArticleImage',
    '  src="/posts/a/x/img/fig-1.webp"',
    '  width="519"',
    '  height="188"',
    '/>',
    '<img src="/posts/a/x/img/fig-10.webp" width={1} height={2} />',
  ].join('\n');
  const r = syncImageDims(raw, 'fig-1', 600, 400);
  assert.equal(r.changed, 2);
  assert.match(r.raw, /fig-1\.webp" alt="図" width=\{600\} height=\{400\}/);
  assert.match(r.raw, /width="600"\n {2}height="400"/);
  assert.match(r.raw, /fig-10\.webp" width=\{1\} height=\{2\}/); // fig-10 は触らない
  assert.equal(syncImageDims(r.raw, 'fig-1', 600, 400).changed, 0);
});

test('判定の検査: 切り出し直しは出典（PDF とページ）を必須にし、直していない needs-source に action を付けさせない', () => {
  const ok = { figKey: 'a/x/img/f', verdict: 'ok', action: 'recrop', reason: '上端の本文を除去' };
  assert.deepEqual(validateVerdict(ok), []);
  assert.equal(validateVerdict({ ...ok, verdict: 'great' }).length, 1);
  assert.equal(validateVerdict({ ...ok, reason: '' }).length, 1);
  assert.equal(validateVerdict({ ...ok, action: 'reextract' }).length, 1);
  assert.deepEqual(validateVerdict({ ...ok, action: 'reextract', source: { pdf: 'x.pdf', page: 5 } }), []);
  assert.equal(validateVerdict({ figKey: 'a/x/img/f', verdict: 'needs-source', action: 'recrop', reason: '上端で図が切れている' }).length, 1);
});

test('画像のハッシュ: 中身が変われば変わる', () => {
  const dir = mkdtempSync(join(tmpdir(), 'figure-review-'));
  const p = join(dir, 'a.png');
  writeFileSync(p, 'one');
  const a = fileSha(p);
  writeFileSync(p, 'two');
  assert.notEqual(fileSha(p), a);
  assert.equal(a.length, 16);
});

test('LOW_RES: 画素数を見ていない古い ok（台帳・manual_needs）は低解像度なら判定し直す', () => {
  const small = { figKey: 'c/a/img/small', sha: 's1', live: true, imgSize: [298, 200], violations: [] };
  const big = { figKey: 'c/a/img/big', sha: 's2', live: true, imgSize: [900, 600], violations: [] };
  const manual = { figKey: 'c/a/img/manual', sha: 's3', live: true, imgSize: [374, 279], violations: [] };
  const ledger = { figures: {
    'c/a/img/small': { sha: 's1', verdict: 'ok' },
    'c/a/img/big': { sha: 's2', verdict: 'ok' },
  } };
  const q = buildQueue({ figures: [small, big, manual], ledger, trusted: new Map([['c/a/img/manual', 'ok']]), minLongSide: 500 });
  assert.deepEqual(q.review.map((f) => f.figKey).sort(), ['c/a/img/manual', 'c/a/img/small']);
  ledger.figures['c/a/img/small'].px = [298, 200]; // LOW_RES を見たうえでの ok
  const q2 = buildQueue({ figures: [small], ledger, minLongSide: 500 });
  assert.equal(q2.review.length, 0);
});
