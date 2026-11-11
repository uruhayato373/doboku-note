import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLedgerEntries, judgeCtas, layoutSha, planTiles, selectTargets, summarizeStatus, STALE_DAYS } from '../scripts/site-visual-review.mjs';
import { ConfigSiteVisualReview } from '../scripts/lib/dataset-schemas.mjs';
import { readDataset } from '../scripts/lib/dataset-io.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const measure = (viewport, ctas, skeleton = ['main-01|section.a|16|16|']) => ({ viewport, skeleton, ctas });
const cta = (kind, visible = true, placement = 'p') => ({ kind, visible, placement });

test('planTiles: 短いページは 1 枚、上限を超えるページは最初と最後を残して間引く', () => {
  assert.deepEqual(planTiles(900).tiles, [{ y: 0, height: 900 }]);
  const three = planTiles(4000, { tileHeight: 1600 });
  assert.equal(three.tiles.length, 3);
  assert.equal(three.tiles.at(-1).height, 800);
  assert.equal(three.skipped, 0);
  const long = planTiles(16000, { tileHeight: 1600, maxTiles: 4 });
  assert.equal(long.tiles.length, 4);
  assert.equal(long.tiles[0].y, 0);
  assert.equal(long.tiles.at(-1).y, 14400);
  assert.equal(long.skipped, 6);
});

test('layoutSha: 骨組みか見えている導線が変わると変わり、隠れた導線・導線の並び順では変わらない', () => {
  const base = layoutSha([measure('w375', [cta('note'), cta('affiliate')])]);
  assert.equal(base, layoutSha([measure('w375', [cta('affiliate'), cta('note'), cta('coconala', false)])]));
  assert.notEqual(base, layoutSha([measure('w375', [cta('note')])]));
  assert.notEqual(base, layoutSha([measure('w375', [cta('note'), cta('affiliate')], ['main-01|section.b|16|16|'])]));
});

test('judgeCtas: 必ず出す導線が 1 つの幅で消えていれば不合格、指定の無い導線の出入りは材料にとどめる', () => {
  const measures = [measure('w375', [cta('note', false), cta('affiliate')]), measure('w1280', [cta('note'), cta('affiliate')])];
  const strict = judgeCtas(measures, { note: true, affiliate: true });
  assert.deepEqual(strict.issues.map((i) => `${i.type}:${i.viewport}`), ['cta-missing:w375']);
  const loose = judgeCtas(measures, {});
  assert.equal(loose.issues.length, 0);
  assert.ok(loose.hints.some((h) => h.type === 'cta-vanish' && h.detail.includes('w375')));
  const banned = judgeCtas(measures, { affiliate: false });
  assert.ok(banned.hints.some((h) => h.type === 'cta-unexpected'));
});

test('selectTargets: 未判定 → 不合格 → 判定の古い順。--keys は順番に関係なくその対象だけ', () => {
  const targets = ['a', 'b', 'c', 'd'].map((key) => ({ key }));
  const ledger = { pages: { a: { verdict: 'pass', reviewedAt: '2026-11-01T00:00:00Z' }, b: { verdict: 'fail', reviewedAt: '2026-11-05T00:00:00Z' }, d: { verdict: 'pass', reviewedAt: '2026-10-01T00:00:00Z' } } };
  assert.deepEqual(selectTargets(targets, ledger, { limit: 3 }).map((t) => t.key), ['c', 'b', 'd']);
  assert.deepEqual(selectTargets(targets, ledger, { all: true }).map((t) => t.key), ['c', 'b', 'd', 'a']);
  assert.deepEqual(selectTargets(targets, ledger, { keys: ['a'] }).map((t) => t.key), ['a']);
});

const packet = {
  runId: 'r1',
  pages: [
    { key: 'home', path: '/', layoutSha256: 's1', shots: [{ file: 'w375-01.png' }, { file: 'w1440-01.png' }], deterministicIssues: [] },
    { key: 'guide', path: '/g', layoutSha256: 's2', shots: [{ file: 'w375-01.png' }], deterministicIssues: [{ type: 'edge', viewport: 'w1440', detail: 'x' }] },
  ],
};

test('buildLedgerEntries: 判定を骨組みのハッシュに結んで台帳の行にする', () => {
  const { entries, errors } = buildLedgerEntries(packet, [
    { key: 'home', layoutSha256: 's1', verdict: 'pass', checkedShots: ['w375-01.png', 'w1440-01.png'], findings: [{ severity: 'minor', type: 'typography', viewport: 'w375', detail: '題名が 1 文字だけ折り返す' }] },
    { key: 'guide', layoutSha256: 's2', verdict: 'fail', checkedShots: ['w375-01.png'], findings: [] },
  ]);
  assert.deepEqual(errors, []);
  assert.equal(entries.home.verdict, 'pass');
  assert.equal(entries.home.findings[0].viewport, 'w375');
  assert.equal(entries.guide.verdict, 'fail');
  assert.equal(entries.guide.deterministic[0].type, 'edge');
});

test('buildLedgerEntries: 見ていない撮影・機械で決まる崩れがあるのに pass・語彙に無い type は記録しない', () => {
  const cases = [
    [{ key: 'home', layoutSha256: 's1', verdict: 'pass', checkedShots: ['w375-01.png'], findings: [] }, '見ていない撮影'],
    [{ key: 'guide', layoutSha256: 's2', verdict: 'pass', checkedShots: ['w375-01.png'], findings: [] }, '決定的な崩れ'],
    [{ key: 'home', layoutSha256: 'old', verdict: 'pass', checkedShots: ['w375-01.png', 'w1440-01.png'], findings: [] }, 'layoutSha256'],
    [{ key: 'home', layoutSha256: 's1', verdict: 'pass', checkedShots: ['w375-01.png', 'w1440-01.png'], findings: [{ severity: 'major', type: 'table', detail: 'x' }] }, '指摘の形'],
  ];
  for (const [verdict, expected] of cases) {
    const { errors } = buildLedgerEntries(packet, [verdict]);
    assert.ok(errors.some((e) => e.includes(expected)), `${expected}: ${errors.join(' / ')}`);
  }
});

test('summarizeStatus: 未判定があるのに回していない・未起票の不合格・長く回していない、を問題にする', () => {
  const targets = [{ key: 'home' }, { key: 'guide' }];
  const now = new Date('2026-11-30T00:00:00Z');
  const fresh = '2026-11-29T00:00:00Z';
  assert.ok(summarizeStatus({ runs: [], pages: {} }, targets, { now }).problems[0].includes('未判定'));
  const partial = { runs: [{ at: fresh }], pages: { home: { layoutSha256: 's', verdict: 'pass' } } };
  assert.deepEqual(summarizeStatus(partial, targets, { now }).problems, [], `直近に回していれば未判定が残っていても待つ（${STALE_DAYS} 日）`);
  const failOpen = { runs: [{ at: fresh }], pages: { home: { layoutSha256: 's', verdict: 'fail', ticket: null }, guide: { layoutSha256: 's', verdict: 'fail', ticket: 'DN-9999' } } };
  const s = summarizeStatus(failOpen, targets, { now });
  assert.deepEqual(s.failsOpen, ['home']);
  assert.deepEqual(s.failsTicketed, ['guide']);
  assert.ok(s.problems[0].includes('起票されていない'));
  const old = { runs: [{ at: '2026-10-01T00:00:00Z' }], pages: { home: { layoutSha256: 's', verdict: 'pass' }, guide: { layoutSha256: 's', verdict: 'pass' } } };
  assert.ok(summarizeStatus(old, targets, { now }).problems[0].includes('日前'));
});

test('設定: 型を通り、Tailwind の区切り（640・768・1024・1280）とスマホ幅・コンテナの最大幅を超える幅を全部撮る', () => {
  const config = readDataset(REPO_ROOT, 'config.site-visual-review');
  assert.equal(ConfigSiteVisualReview.safeParse(config).success, true);
  const widths = config.viewports.map((v) => v.width);
  for (const w of [640, 768, 1024, 1280]) assert.ok(widths.includes(w), `${w}px が無い`);
  assert.ok(Math.min(...widths) <= 390, 'スマホ幅が無い');
  assert.ok(Math.max(...widths) > 1280, 'コンテナの最大幅（1280px）を超える幅が無い');
});
