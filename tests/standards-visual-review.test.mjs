import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLedgerEntries,
  listCandidates,
  parseMdElements,
  parsePages,
  pickEvenly,
  selectTargets,
  summarizeStatus,
  STALE_DAYS,
} from '../scripts/standards-visual-review.mjs';
import { inspectInPage } from '../scripts/lib/rendered-page-inspect.mjs';

test('parsePages: 単一・範囲・列挙', () => {
  assert.deepEqual(parsePages('502'), [502]);
  assert.deepEqual(parsePages('241-243'), [241, 242, 243]);
  assert.deepEqual(parsePages('10,12'), [10, 12]);
  assert.deepEqual(parsePages(''), []);
});

test('parseMdElements: 表と図を出てくる順に並べ、直後の SourceRef の原本ページを結ぶ', () => {
  const md = [
    '本文',
    '',
    '| a | b |',
    '| --- | --- |',
    '| 1 | 2 |',
    '',
    '<SourceRef pages="502" kind="table" />',
    '',
    '<ArticleImage src="/x.webp" alt="図" />',
    '',
    '<SourceRef pages="503-504" kind="figure" />',
    '',
    // escape された表（DN-0916 の形）は画面で表にならないので数えない
    '\\| 項目 \\| 記入欄 \\|',
    '',
    '| c |',
    '| --- |',
  ].join('\n');
  assert.deepEqual(parseMdElements(md), [
    { kind: 'table', pages: [502] },
    { kind: 'figure', pages: [503, 504] },
    { kind: 'table', pages: null },
  ]);
});

test('pickEvenly: 上限以下は全部・超えたら最初と最後を含めて等間隔', () => {
  assert.deepEqual(pickEvenly(3, 10), [0, 1, 2]);
  assert.deepEqual(pickEvenly(71, 3), [0, 35, 70]);
  assert.equal(pickEvenly(71, 10).length, 10);
});

const chapter = (key, sha, extra = {}) => ({ key, outputSha256: sha, indexable: false, elements: 0, ...extra });

test('selectTargets: 不合格後の変更 → 合格後の変更 → 未判定、判定済みで中身が同じ章は選ばない', () => {
  const candidates = [
    chapter('a/x/1-1', 'new'),
    chapter('a/x/1-2', 'new'),
    chapter('a/x/1-3', 'same'),
    chapter('a/x/1-4', 'n', { indexable: true, elements: 3 }),
    chapter('a/x/1-5', 'n', { elements: 9 }),
  ];
  const ledger = {
    chapters: {
      'a/x/1-1': { outputSha256: 'old', verdict: 'pass' },
      'a/x/1-2': { outputSha256: 'old', verdict: 'fail' },
      'a/x/1-3': { outputSha256: 'same', verdict: 'fail' },
    },
  };
  assert.deepEqual(selectTargets(candidates, ledger, { limit: 10 }).map((c) => c.key), ['a/x/1-2', 'a/x/1-1', 'a/x/1-4', 'a/x/1-5']);
  assert.deepEqual(selectTargets(candidates, ledger, { limit: 1 }).map((c) => c.key), ['a/x/1-2']);
  assert.deepEqual(selectTargets(candidates, ledger, { only: 'b' }), []);
  // --keys は判定済みでも選ぶ（直したあとの確認）
  assert.deepEqual(selectTargets(candidates, ledger, { keys: ['a/x/1-3'] }).map((c) => c.key), ['a/x/1-3']);
});

const packet = {
  runId: 'r1',
  chapters: [
    { key: 'a/x/1-1', outputSha256: 's1', urls: ['u1'], shots: [{ file: 'table-01.png' }], deterministicIssues: [] },
    { key: 'a/x/1-2', outputSha256: 's2', urls: ['u2'], shots: [], deterministicIssues: [{ type: 'markup', detail: '|---|' }] },
  ],
};
const major = { severity: 'major', type: 'markup', detail: '記法の文字が出ている' };

test('buildLedgerEntries: 正しい判定は記録できる', () => {
  const { entries, errors } = buildLedgerEntries(packet, [
    { key: 'a/x/1-1', outputSha256: 's1', verdict: 'pass', checkedShots: ['table-01.png'], findings: [{ severity: 'minor', type: 'table', detail: '列幅の偏り' }] },
    { key: 'a/x/1-2', outputSha256: 's2', verdict: 'fail', checkedShots: [], findings: [major] },
  ], { now: '2026-11-09T00:00:00.000Z' });
  assert.deepEqual(errors, []);
  assert.equal(entries['a/x/1-1'].verdict, 'pass');
  assert.equal(entries['a/x/1-2'].verdict, 'fail');
  assert.equal(entries['a/x/1-2'].ticket, null);
});

test('buildLedgerEntries: 欠け・矛盾は記録しない', () => {
  const cases = [
    [[{ key: 'a/x/1-1', outputSha256: 's1', verdict: 'pass', checkedShots: [], findings: [] }], '見ていない撮影'],
    [[{ key: 'a/x/1-1', outputSha256: 's1', verdict: 'pass', checkedShots: ['table-01.png'], findings: [major] }], 'major の指摘があるのに pass'],
    [[{ key: 'a/x/1-2', outputSha256: 's2', verdict: 'pass', checkedShots: [], findings: [] }], '決定的な崩れ'],
    [[{ key: 'a/x/1-1', outputSha256: 'old', verdict: 'pass', checkedShots: ['table-01.png'], findings: [] }], 'outputSha256'],
    [[{ key: 'a/x/1-1', outputSha256: 's1', verdict: 'fail', checkedShots: ['table-01.png'], findings: [{ severity: 'minor', type: 'table', detail: 'x' }] }], 'minor だけなら pass'],
    [[{ key: 'a/x/1-1', outputSha256: 's1', verdict: 'pass', checkedShots: ['table-01.png'], findings: [{ severity: 'major', type: 'nope', detail: 'x' }] }], '指摘の形'],
    [[{ key: 'z/z/9-9', outputSha256: 's', verdict: 'pass', checkedShots: [], findings: [] }], '作業票に無い章'],
  ];
  for (const [verdicts, expected] of cases) {
    const { errors } = buildLedgerEntries(packet, verdicts);
    assert.ok(errors.some((e) => e.includes(expected)), `${expected}: ${errors.join(' / ')}`);
    // 判定の無い章もエラーになる
    assert.ok(errors.some((e) => e.includes('判定が無い')));
  }
});

test('summarizeStatus: 未起票の不合格と、回していない判定待ちを問題にする', () => {
  const candidates = [chapter('a/x/1-1', 's1'), chapter('a/x/1-2', 's2'), chapter('a/x/1-3', 's3')];
  const now = new Date('2026-11-30T00:00:00Z');
  const recent = { runs: [{ at: '2026-11-25T00:00:00Z' }], chapters: { 'a/x/1-1': { outputSha256: 's1', verdict: 'pass' }, 'a/x/1-2': { outputSha256: 's2', verdict: 'fail', ticket: 'DN-0001' }, 'a/x/1-3': { outputSha256: 'old', verdict: 'pass' } } };
  const s = summarizeStatus(recent, candidates, { now });
  assert.deepEqual([s.current, s.changed, s.never, s.failsTicketed.length, s.problems.length], [2, 1, 0, 1, 0]);

  const stale = { ...recent, runs: [{ at: new Date(now.getTime() - STALE_DAYS * 86_400_000).toISOString() }] };
  assert.equal(summarizeStatus(stale, candidates, { now }).problems.length, 1);

  const unticketed = { ...recent, chapters: { ...recent.chapters, 'a/x/1-2': { outputSha256: 's2', verdict: 'fail', ticket: null } } };
  assert.ok(summarizeStatus(unticketed, candidates, { now }).problems[0].includes('起票されていない'));

  assert.ok(summarizeStatus({ runs: [], chapters: {} }, candidates, { now }).problems[0].includes('無い'));
});

test('listCandidates: 中身が異なる章だけを、manifest のハッシュつきで返す', () => {
  const list = listCandidates();
  assert.ok(list.length > 100, `章 ${list.length}`);
  assert.ok(list.every((c) => /^[a-f0-9]{64}$/.test(c.outputSha256)));
  assert.ok(list.some((c) => c.key === 'kinki/common/3-2'));
  // 近畿と同じ中身の他機関の共通仕様書（北陸など）は対象にしない
  assert.ok(!list.some((c) => c.key === 'hokuriku/common/1-2'));
});

test('inspectInPage: 段落につながった表の区切り行（DN-0916 の形）を記法の残りとして拾う', () => {
  const text = '工事名など | 項目 | 記入欄 ||---|---|| 工事名 |';
  const doc = {
    documentElement: { clientWidth: 375, scrollWidth: 375 },
    body: { querySelectorAll: () => [] },
    querySelectorAll: () => [],
    querySelector: (sel) => (sel === 'main' ? { cloneNode: () => ({ querySelectorAll: () => [], textContent: `${'本文'.repeat(100)}${text}` }) } : null),
  };
  globalThis.document = doc;
  try {
    const issues = inspectInPage();
    assert.ok(issues.some((i) => i.type === 'markup' && i.detail.startsWith('表記法')), JSON.stringify(issues));
  } finally {
    delete globalThis.document;
  }
});
