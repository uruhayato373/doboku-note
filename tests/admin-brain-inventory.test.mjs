import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * DN-0103 Phase 04: scripts/lib/brain-inventory.mjs（check-brain-wiring と admin
 * `/content/brain` が共有する唯一の判定ロジック）の契約を固定する。
 *
 * `validateBrainInventory` は fs を読まない純関数なので、fixture の inventory
 * オブジェクトを直接構築してテストする（loadBrainInventory 自体は実リポジトリの
 * SoT を読む統合テストとして別途固定する）。
 */

function tsx(code) {
  const cli = join(ROOT, 'node_modules/tsx/dist/cli.mjs');
  return execFileSync(process.execPath, [cli, '-e', code], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

const BASE_ITEM = {
  id: 'brain-test-kit',
  status: 'listed',
  articleId: 'abc123',
  productUrl: 'https://brain-market.com/a/abc123',
  title: 'テスト商品',
  shortTitle: 'テスト',
  description: '',
  price: '¥5,000（テスト）',
  priceYen: 5000,
  distFile: 'test-kit-token.zip',
  listedAt: '2026-01-01',
  submittedAt: '2026-01-01',
  listing: {
    imagePath: 'content/brain/assets/test.png',
    paidMarker: 'ここから先（有料エリア）',
    bodyText: '無料部分\n\nここから先（有料エリア）\n\nhttps://storage.doboku-note.com/brain/dist/test-kit-token.zip',
    bodyTextLength: 80,
    bodyTextExcerpt: '無料部分',
  },
  image: { exists: true, bytes: 12345, dimensions: { width: 1200, height: 630 } },
  dist: { exists: true, bytes: 999, sha256: 'deadbeef', basename: 'test-kit-token.zip' },
};

function baseInventory(overrides = {}, itemOverrides = {}) {
  return {
    catalogExists: true,
    items: [{ ...BASE_ITEM, ...itemOverrides }],
    orphanListingIds: [],
    listingsError: null,
    legacyListingsPresent: false,
    legacyBrainDirPresent: false,
    ...overrides,
  };
}

function runValidate(inventory) {
  const out = tsx(`
    import { validateBrainInventory } from './scripts/lib/brain-inventory.mjs';
    const inventory = ${JSON.stringify(inventory)};
    process.stdout.write(JSON.stringify(validateBrainInventory(inventory)));
  `);
  return JSON.parse(out);
}

test('完全に整合した1件は ok:true・violations 0', () => {
  const r = runValidate(baseInventory());
  assert.equal(r.ok, true);
  assert.deepEqual(r.violations, []);
  assert.equal(r.items[0].wiringStatus, 'ok');
});

test('listings が無ければ違反（listing:null）', () => {
  const r = runValidate(baseInventory({}, { listing: null }));
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.includes('listings エントリなし')));
});

test('画像が無ければ違反', () => {
  const r = runValidate(baseInventory({}, { image: { exists: false, bytes: 0, dimensions: null } }));
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.includes('imagePath 不在')));
});

test('配布ZIPが無ければ違反', () => {
  const r = runValidate(baseInventory({}, { dist: { exists: false, bytes: 0, sha256: null, basename: null } }));
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.includes('配布ZIP不在')));
});

test('priceYen が Brain 制約(100〜100,000)外なら違反', () => {
  const r = runValidate(baseInventory({}, { priceYen: 50 }));
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.includes('Brain 制約')));
});

test('listed なのに productUrl が articleId と不一致なら違反', () => {
  const r = runValidate(baseInventory({}, { productUrl: 'https://brain-market.com/a/wrong' }));
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.includes('productUrl が articleId と不一致')));
});

test('本文に配布URLが無ければ違反（商品実体なし公開の防止）', () => {
  const r = runValidate(baseInventory({}, {
    listing: { ...BASE_ITEM.listing, bodyText: '無料部分\n\nここから先（有料エリア）\n\n本文のみ' },
  }));
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.includes('本文に配布URLなし')));
});

test('配布URLが有料ラインより前にあれば違反（無料流出）', () => {
  const r = runValidate(baseInventory({}, {
    listing: {
      ...BASE_ITEM.listing,
      bodyText: 'https://storage.doboku-note.com/brain/dist/test-kit-token.zip\n\nここから先（有料エリア）\n\n本文',
    },
  }));
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.includes('配布URLが有料ラインより前')));
});

test('本文に¥価格の直書きがあれば違反', () => {
  const r = runValidate(baseInventory({}, {
    listing: { ...BASE_ITEM.listing, bodyText: BASE_ITEM.listing.bodyText + '\n価格は¥5,000です' },
  }));
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.includes('¥価格の直書き')));
});

test('listings の孤児エントリ（カタログに無い id）を検出する', () => {
  const r = runValidate(baseInventory({ orphanListingIds: ['brain-ghost'] }));
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.includes('brain-ghost') && v.includes('孤児エントリ')));
});

test('旧配置（.claude/config/brain-listings.json 等）が残っていれば FAIL', () => {
  const r1 = runValidate(baseInventory({ legacyListingsPresent: true }));
  assert.equal(r1.ok, false);
  assert.ok(r1.violations.some((v) => v.includes('旧配置が残存') && v.includes('brain-listings.json')));

  const r2 = runValidate(baseInventory({ legacyBrainDirPresent: true }));
  assert.equal(r2.ok, false);
  assert.ok(r2.violations.some((v) => v.includes('旧配置が残存') && v.includes('.claude/config/brain')));
});

test('検査対象0件（カタログ抽出0件）を PASS にしない', () => {
  const r = runValidate(baseInventory({ items: [] }));
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.includes('1件も抽出できない')));
});

test('現行リポジトリの実データ（loadBrainInventory）は ok:true（統合テスト・現行2商品の整合固定）', () => {
  const out = tsx(`
    import { loadBrainInventory, validateBrainInventory } from './scripts/lib/brain-inventory.mjs';
    const inv = loadBrainInventory();
    const result = validateBrainInventory(inv);
    process.stdout.write(JSON.stringify({
      itemCount: inv.items.length,
      ok: result.ok,
      violations: result.violations,
      hasSecretKeys: JSON.stringify(inv).includes('sellerName') || JSON.stringify(inv).includes('agreedGuidelineAt'),
    }));
  `);
  const r = JSON.parse(out);
  assert.equal(r.itemCount, 2, `現行カタログは2商品のはず: ${r.itemCount}`);
  assert.equal(r.ok, true, `違反あり: ${JSON.stringify(r.violations)}`);
  assert.equal(r.hasSecretKeys, false, 'brain-account.json 由来の秘密キーが inventory に混入している');
});
