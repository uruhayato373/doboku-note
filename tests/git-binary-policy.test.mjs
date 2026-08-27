/**
 * Git バイナリポリシー（check-git-binary-policy）のテスト。
 *
 * 守りたい事故: 生成物・著作権物が Git 履歴へ流入し続け、HEAD 4.16GiB / remote 11GB まで
 *   膨らんで CI ランナーの空きを超える（2026-08-21 に GSC auto review が実際に落ちた）。
 *   ゲート側の壊れ方で怖いのは「素通し」なので、**違反を検出できることを陽性で固定する**。
 *   allowlist が広すぎて何も検査しなくなる形（＝検査ゼロの緑）も併せて押さえる。
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { allowReason, countByRule, evaluateBlobs, extOf, ratchet } from '../scripts/check-git-binary-policy.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POLICY = JSON.parse(readFileSync(join(ROOT, '.claude/config/git-binary-policy.json'), 'utf-8'));

const MiB = 1048576;

/** 疑似ファイル読み。path → Buffer を持つ Map から先頭バイトを返す。 */
const readerFor = (files) => (path, bytes) => {
  const buf = files[path];
  return buf ? buf.subarray(0, bytes) : null;
};
const NO_FILES = readerFor({});

const rulesHit = (violations) => new Set(violations.map((v) => v.rule));

test('extOf: 日本語パス・多重ドット・拡張子なしを取り違えない', () => {
  assert.equal(extOf('content/note/技術士総監/img/cover.png'), 'png');
  assert.equal(extOf('a/b/archive.tar.gz'), 'gz');
  assert.equal(extOf('scripts/Makefile'), '');
  assert.equal(extOf('a/.gitignore'), ''); // 先頭ドットは拡張子ではない
  assert.equal(extOf('a/COVER.SVG'), 'svg');
});

test('denyRule: 動画・音声の新規追跡を検出する', () => {
  const { violations } = evaluateBlobs({
    policy: POLICY,
    blobs: [{ path: 'content/sns/instagram/x/reels/video.mp4', size: 20 * MiB }],
    readHead: NO_FILES,
    countBudgets: false,
  });
  assert.ok(rulesHit(violations).has('video-audio'), '動画が video-audio で検出されること');
  const v = violations.find((x) => x.rule === 'video-audio');
  assert.ok(v.correctPlace, '正しい置き場が提示されること（理由だけでは直せない）');
});

test('denyRule: 教材ページ画像は著作権物として検出する（拡張子だけでなくパス前提）', () => {
  const { violations } = evaluateBlobs({
    policy: POLICY,
    blobs: [
      { path: 'content/sources/textbook/技術士（総監）/pages/p001.jpg', size: 900 * 1024 },
      { path: 'content/site/civil-construction-1/guide-x/img/fig.jpg', size: 900 * 1024 },
    ],
    readHead: NO_FILES,
    countBudgets: false,
  });
  const hits = violations.filter((v) => v.rule === 'textbook-source-asset');
  assert.equal(hits.length, 1, 'textbook 配下だけが対象で、サイト記事の画像は巻き込まない');
  assert.match(hits[0].path, /textbook/);
});

test('denyRule: 書籍文字起こし本文の新規追跡を検出するが README.md は除外する', () => {
  const { violations } = evaluateBlobs({
    policy: POLICY,
    blobs: [
      { path: 'content/sources/textbook/技術士（総監）/テキスト/安全管理.md', size: 10 * 1024 },
      { path: 'content/sources/textbook/技術士（総監）/README.md', size: 2 * 1024 },
      { path: 'content/site/civil-construction-1/guide-x/article.mdx', size: 10 * 1024 },
    ],
    readHead: NO_FILES,
    countBudgets: false,
  });
  const hits = violations.filter((v) => v.rule === 'textbook-transcription-text');
  assert.equal(hits.length, 1, 'textbook 配下の本文 .md だけが対象で、README.md とサイト記事は巻き込まない');
  assert.match(hits[0].path, /安全管理\.md$/);
});

test('base64-raster-svg: raster 埋込 SVG だけを落とし、真正ベクターは通す', () => {
  const embedded = Buffer.from('<svg><image href="data:image/png;base64,AAAA"/></svg>'.padEnd(200000, ' '));
  const genuine = Buffer.from('<svg><path d="M0 0 L10 10"/></svg>'.padEnd(200000, ' '));
  const files = { 'a/embedded.svg': embedded, 'a/genuine.svg': genuine };
  const { violations } = evaluateBlobs({
    policy: POLICY,
    blobs: [
      { path: 'a/embedded.svg', size: embedded.length },
      { path: 'a/genuine.svg', size: genuine.length },
    ],
    readHead: readerFor(files),
    countBudgets: false,
  });
  const hits = violations.filter((v) => v.rule === 'base64-raster-svg');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].path, 'a/embedded.svg');
});

test('base64-raster-svg: minBytesToScan 未満の小さな SVG は content 走査しない', () => {
  const tiny = Buffer.from('<svg><image href="data:image/png;base64,AAAA"/></svg>');
  const { violations, inspected } = evaluateBlobs({
    policy: POLICY,
    blobs: [{ path: 'a/tiny.svg', size: tiny.length }],
    readHead: readerFor({ 'a/tiny.svg': tiny }),
    countBudgets: false,
  });
  assert.equal(inspected.contentScanned, 0);
  assert.ok(!rulesHit(violations).has('base64-raster-svg'));
});

test('derivedPair: raster 埋込 SVG と同名 PNG の同居だけを二重生成と見なす', () => {
  const embedded = Buffer.from('<svg><image href="data:image/png;base64,AAAA"/></svg>'.padEnd(200000, ' '));
  const genuine = Buffer.from('<svg><path d="M0 0"/></svg>'.padEnd(200000, ' '));
  const png = Buffer.from('89504e470d0a1a0a', 'hex');
  const files = { 'n/img/cover.svg': embedded, 'n/img/cover.png': png, 'm/img/fig.svg': genuine, 'm/img/fig.png': png };
  const { violations } = evaluateBlobs({
    policy: POLICY,
    blobs: [
      { path: 'n/img/cover.svg', size: embedded.length },
      { path: 'n/img/cover.png', size: png.length },
      { path: 'm/img/fig.svg', size: genuine.length },
      { path: 'm/img/fig.png', size: png.length },
    ],
    readHead: readerFor(files),
    countBudgets: false,
  });
  const hits = violations.filter((v) => v.rule === 'svg-png-twin');
  assert.equal(hits.length, 1, '真正ベクター + PNG の同居は正当なので巻き込まない');
  assert.equal(hits[0].path, 'n/img/cover.svg');
});

test('magic-mismatch: .png の中身が JPEG なら検出する（KDP を壊した拡張子偽装と同型）', () => {
  const jpeg = Buffer.from('ffd8ffe000104a464946', 'hex');
  const png = Buffer.from('89504e470d0a1a0a', 'hex');
  const { violations } = evaluateBlobs({
    policy: POLICY,
    blobs: [
      { path: 'a/fake.png', size: jpeg.length },
      { path: 'a/real.png', size: png.length },
    ],
    readHead: readerFor({ 'a/fake.png': jpeg, 'a/real.png': png }),
    countBudgets: false,
  });
  const hits = violations.filter((v) => v.rule === 'magic-mismatch');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].path, 'a/fake.png');
});

test('sizeLimit: 拡張子別の上限で判定する', () => {
  const { violations } = evaluateBlobs({
    policy: POLICY,
    blobs: [
      { path: 'content/site/a/img/big.png', size: 3 * MiB },
      { path: 'content/site/a/img/small.png', size: 200 * 1024 },
    ],
    readHead: NO_FILES,
    countBudgets: false,
  });
  const hits = violations.filter((v) => v.rule === 'size-limit');
  assert.equal(hits.length, 1);
  assert.match(hits[0].path, /big\.png$/);
});

test('budgets: countBudgets=false のとき総量を判定も観測もしない（未検査を緑と呼ばない）', () => {
  const blobs = [{ path: 'content/note/x/img/a.png', size: 5000 * MiB }];
  const off = evaluateBlobs({ policy: POLICY, blobs, readHead: NO_FILES, countBudgets: false });
  assert.equal(off.budgetRows.length, 0);
  assert.ok(!rulesHit(off.violations).has('budget'));

  const on = evaluateBlobs({ policy: POLICY, blobs, readHead: NO_FILES, countBudgets: true });
  assert.ok(on.budgetRows.length > 0);
  assert.ok(rulesHit(on.violations).has('budget'), '上限超過は budget 違反になる');
});

test('allowlist: appliesTo で免除範囲を絞る（全免除にしない）', () => {
  const fontPath = '.claude/skills/conversion/ogp-create/assets/fonts/NotoSansJP-Bold.ttf';
  assert.ok(allowReason(POLICY, fontPath, 'size'), 'フォントはサイズ検査を免除される');
  assert.equal(allowReason(POLICY, fontPath, 'video-audio'), null, '免除は指定した検査だけに効く');
  assert.equal(allowReason(POLICY, 'content/note/x/img/cover.svg', 'size'), null);
});

test('allowlist: すべてのエントリに理由が書かれている（理由なし免除を作らない）', () => {
  for (const a of POLICY.allowlist || []) {
    assert.ok(a.reason && a.reason.trim().length > 10, a.path + ' に理由が要る');
    assert.ok(Array.isArray(a.appliesTo) && a.appliesTo.length, a.path + ' に appliesTo が要る');
  }
});

test('denyRule: すべてに理由と正しい置き場が書かれている', () => {
  for (const r of POLICY.denyRules || []) {
    assert.ok(r.reason, r.id + ' に reason が要る');
    assert.ok(r.correctPlace, r.id + ' に correctPlace が要る（直し方の無いゲートは無視される）');
  }
});

test('ratchet: 増加は FAIL、減少は返済として区別する', () => {
  const { increased, repaid } = ratchet({ a: 5, b: 1 }, { a: 3, b: 4 });
  assert.deepEqual(increased, [{ rule: 'a', now: 5, was: 3 }]);
  assert.deepEqual(repaid, [{ rule: 'b', now: 1, was: 4 }]);
  assert.deepEqual(ratchet({ a: 3 }, { a: 3 }), { increased: [], repaid: [] });
});

test('ratchet: baseline に無い新カテゴリの出現は増加として扱う', () => {
  const { increased } = ratchet({ 'video-audio': 1 }, {});
  assert.deepEqual(increased, [{ rule: 'video-audio', now: 1, was: 0 }]);
});

test('countByRule: ルール別に数える', () => {
  assert.deepEqual(countByRule([{ rule: 'x' }, { rule: 'x' }, { rule: 'y' }]), { x: 2, y: 1 });
});

test('baseline は現在のポリシーで説明できる形になっている', () => {
  const baseline = JSON.parse(readFileSync(join(ROOT, '.claude/state/quality/git-binary-baseline.json'), 'utf-8'));
  assert.ok(baseline.inspectedBlobs > 1000, '検査 blob 数が記録されていること（検査ゼロの baseline を作らない）');
  const known = new Set([
    ...(POLICY.denyRules || []).map((r) => r.id),
    ...(POLICY.derivedPairRules || []).map((r) => r.id),
    'size-limit', 'budget', 'magic-mismatch',
  ]);
  for (const rule of Object.keys(baseline.counts || {})) {
    assert.ok(known.has(rule), 'baseline の ' + rule + ' はポリシー側に定義が要る（消えたルールの猶予が残らないように）');
  }
});
