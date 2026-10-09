// tests/video-content-check.test.mjs
//
// check-video-content（DN-0110 Phase 0）の偽 PASS 防止テスト。
// fixture のミニリポジトリに対してライブラリを走らせ、
// 「チェッカー自体が壊れて 0 件検査のまま緑」を npm test（quality-audit ci:true）で止める。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  checkAll,
  checkUtmUrls,
  hasVerbatimOverlap,
  loadConfig,
} from '../scripts/lib/video-content-check.mjs';
import { assembleCompilation } from '../scripts/lib/video-compilation.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(REPO_ROOT, 'tests', 'fixtures', 'video-content');
const config = loadConfig(REPO_ROOT);

/** fixture が持つ動画パックの派生物（台帳から作る形）。台帳の代わりに checkAll へ渡す */
const stateOf = (root) => JSON.parse(readFileSync(join(root, '.claude', 'state', 'video-content-status.json'), 'utf8'));

const codesOf = (result) =>
  new Set(result.issues.filter((i) => i.severity === 'FAIL').map((i) => i.code));

test('実リポジトリの config が parse でき、契約キーを持つ', () => {
  assert.equal(config.manifest.schemaVersion, 1);
  assert.ok(config.manifest.intentEnum.includes('career'));
  assert.ok(config.state.statusEnum.includes('published'));
  assert.ok(config.utm.contentEnum.includes('longform'));
  assert.equal(config.paths.packsRoot, 'content/sns/video-packs');
});

test('valid fixture: FAIL 0 件・検査対象数が実検査数と一致', () => {
  const r = checkAll(join(FIXTURES, 'valid'), { config, state: stateOf(join(FIXTURES, 'valid')) });
  assert.equal(r.notStarted, false);
  assert.equal(r.packCount, 1);
  assert.equal(r.checkedCount, 1);
  assert.equal(r.stateExists, true);
  const fails = r.issues.filter((i) => i.severity === 'FAIL');
  assert.deepEqual(fails, [], JSON.stringify(fails, null, 2));
});

test('invalid fixture: 各違反コードが検出される', () => {
  const r = checkAll(join(FIXTURES, 'invalid'), { config, state: stateOf(join(FIXTURES, 'invalid')) });
  assert.equal(r.packCount, 4);
  // broken-json は parse 不能なので checked は 3
  assert.equal(r.checkedCount, 3);
  const codes = codesOf(r);
  const expected = [
    'M01', // manifest parse 失敗
    'M02', // schemaVersion 不一致
    'M03', // 必須フィールド欠落（audience）
    'M05', // intent enum 外
    'M08', // pain が配列
    'M09', // exam とディレクトリ不一致
    'M10', // outputs 未知キー
    'S03', // sourceRef 実在しない
    'S04', // published:false の漏洩参照
    'S05', // note 参照の access 未明示
    'S06', // external が http
    'C02', // primaryCta が配列
    'C03', // targetId がカタログに解決不能
    'C04', // site-article targetPath 不在
    'C05', // campaign ≠ packId
    'P02', // 逐語転用
    'P03', // 出典一覧なし
    'U02', // utm_source=instagram 混入
    'B00', // qa_passed 以降なのに storyboard 無し
    'B03', // sceneId 重複
    'B04', // scene 時間の不連続
    'B05', // 総尺が範囲外
    'B06', // caption 長すぎ
    'B08', // narration 定型反復
    'B09', // format enum 外
    'T02', // status/派生キー enum 外
    'T03', // status の孤児
    'T05', // videoId 重複
    'T06', // 公開済み Short に relatedVideoId 無し
    'T07', // approved 以降なのに approvedBy 無し
    'T08', // pack 一括 status
    'T09', // measured なのに measuredAt 無し
    'R01', // README index が無い
  ];
  for (const c of expected) {
    assert.ok(codes.has(c), `期待コード ${c} が検出されていない。検出済み: ${[...codes].join(',')}`);
  }
});

test('packs root はあるのに 0 件 → 検査不成立として扱える（packCount=0 を PASS にしない）', () => {
  const root = mkdtempSync(join(tmpdir(), 'vc-empty-'));
  try {
    mkdirSync(join(root, 'content', 'sns', 'video-packs'), { recursive: true });
    const r = checkAll(root, { config });
    assert.equal(r.rootExists, true);
    assert.equal(r.packCount, 0);
    assert.equal(r.notStarted, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('packs root も state も無い → notStarted（Phase 1 未着手を明示）', () => {
  const root = mkdtempSync(join(tmpdir(), 'vc-notstarted-'));
  try {
    const r = checkAll(root, { config });
    assert.equal(r.notStarted, true);
    assert.equal(r.packCount, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('state の schemaVersion 違いは FAIL（T01）', () => {
  const state = { ...stateOf(join(FIXTURES, 'valid')), schemaVersion: 99 };
  const r = checkAll(join(FIXTURES, 'valid'), { config, state });
  assert.ok(codesOf(r).has('T01'));
});

test('総まとめ: 再組み立てと一致すれば K 系なし、ずれは K02、未承認の元パックは K01', () => {
  const root = mkdtempSync(join(tmpdir(), 'vc-compilation-'));
  try {
    cpSync(join(FIXTURES, 'valid'), root, { recursive: true });
    const examDir = join(root, 'content', 'sns', 'video-packs', 'civil-construction-1');
    const state = stateOf(root);
    state.packs['demo-keiken-overview'].derivatives.longform = { status: 'approved', approvedBy: 'user', approvedAt: '2026-10-08T00:00:00.000Z' };
    const dir = join(examDir, 'demo-matome');
    mkdirSync(dir);
    const manifest = JSON.parse(readFileSync(join(examDir, 'demo-keiken-overview', 'video-pack.json'), 'utf8'));
    writeFileSync(join(dir, 'video-pack.json'), JSON.stringify({ ...manifest, packId: 'demo-matome', primaryCta: { ...manifest.primaryCta, campaign: 'demo-matome' } }));
    const spec = {
      schemaVersion: 1,
      opening: { narration: '総まとめです。', caption: '総まとめ', visual: { kind: 'cover', heading: '総まとめ' } },
      parts: [{ label: '第二次検定', chapters: [{ packId: 'demo-keiken-overview', title: '工事概要' }] }],
      closing: { narration: '以上です。', caption: '以上', visual: { kind: 'cover', heading: '以上' } },
    };
    writeFileSync(join(dir, 'compilation.json'), JSON.stringify(spec));
    const readSource = (id) => ({ storyboard: JSON.parse(readFileSync(join(examDir, id, 'storyboard.json'), 'utf8')), longform: state.packs[id]?.derivatives?.longform });
    const built = JSON.stringify(assembleCompilation(spec, readSource).storyboard, null, 2) + '\n';
    writeFileSync(join(dir, 'storyboard.json'), built);
    const kCodes = () => [...codesOf(checkAll(root, { config, state }))].filter((c) => c.startsWith('K'));
    assert.deepEqual(kCodes(), []);
    writeFileSync(join(dir, 'storyboard.json'), built.replace('総まとめです。', '総まとめだよ。'));
    assert.deepEqual(kCodes(), ['K02']);
    writeFileSync(join(dir, 'storyboard.json'), built);
    state.packs['demo-keiken-overview'].derivatives.longform = { status: 'draft' };
    assert.deepEqual(kCodes(), ['K01']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('パック内の mp4 混入 → F04（fixture には binary を置かず temp で検査）', () => {
  const root = mkdtempSync(join(tmpdir(), 'vc-binary-'));
  try {
    const packDir = join(root, 'content', 'sns', 'video-packs', 'civil-construction-1', 'temp-pack');
    mkdirSync(packDir, { recursive: true });
    writeFileSync(join(packDir, 'video-pack.json'), JSON.stringify({
      schemaVersion: 1,
      packId: 'temp-pack',
      exam: 'civil-construction-1',
      title: 't',
      audience: 'a',
      pain: 'p',
      promise: 'p',
      intent: 'howto',
      sourceRefs: [{ type: 'external', url: 'https://example.com/x', title: 'ref' }],
      primaryCta: { kind: 'links-hub', campaign: 'temp-pack' },
      outputs: { longform: true },
    }));
    writeFileSync(join(packDir, 'render.mp4'), '');
    writeFileSync(
      join(root, 'content', 'sns', 'video-packs', 'README.md'),
      '| packId |\n|---|\n| `temp-pack` |\n',
    );
    const r = checkAll(root, { config });
    const codes = codesOf(r);
    assert.ok(codes.has('F04'));
    assert.deepEqual([...codes], ['F04'], '想定外の FAIL が混ざっている');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('README index の鮮度: 未掲載パック→R02・孤児行→R03', () => {
  const root = mkdtempSync(join(tmpdir(), 'vc-index-'));
  try {
    cpSync(join(FIXTURES, 'valid'), root, { recursive: true });
    const readmePath = join(root, 'content', 'sns', 'video-packs', 'README.md');
    // 孤児行を足し、実在パックの行を消す
    writeFileSync(readmePath, '| packId |\n|---|\n| `ghost-listed-pack` |\n');
    const r = checkAll(root, { config, state: stateOf(root) });
    const codes = codesOf(r);
    assert.ok(codes.has('R02'), 'R02（未掲載）が出ていない');
    assert.ok(codes.has('R03'), 'R03（孤児行）が出ていない');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('hasVerbatimOverlap: 空白差を無視して連続一致を検出', () => {
  const src = 'あ'.repeat(50) + 'い'.repeat(50);
  const script = `冒頭の文。${'あ'.repeat(40)}\n${'あ'.repeat(10)}${'い'.repeat(40)}。締めの文。`;
  assert.equal(hasVerbatimOverlap(script, src, 80), true);
  assert.equal(hasVerbatimOverlap('全く別の本文です。'.repeat(20), src, 80), false);
});

test('checkUtmUrls: 自サイト URL の UTM 欠落・誤値を検出', () => {
  const noUtm = checkUtmUrls('https://doboku-note.com/docs/x', 'p1', config, 't');
  assert.equal(noUtm[0]?.code, 'U01');
  const ok = checkUtmUrls(
    'https://doboku-note.com/docs/x?utm_source=youtube&utm_medium=video&utm_campaign=p1&utm_content=shorts',
    'p1', config, 't',
  );
  assert.deepEqual(ok, []);
  const external = checkUtmUrls('https://www.mlit.go.jp/hakusyo', 'p1', config, 't');
  assert.deepEqual(external, [], '外部サイトは UTM 対象外');
});
