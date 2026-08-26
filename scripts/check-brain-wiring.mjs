#!/usr/bin/env node
/**
 * check-brain-wiring.mjs — Brain 商品の SoT 整合を機械検知する（pre-commit / 手動）
 * ---------------------------------------------------------------------------
 * check-coconala-wiring.mjs と同思想。検査:
 *   1. submitted/listed は articleId・productUrl 必須（https://brain-market.com/a/{articleId} 形式一致）
 *   2. catalog↔listings が全商品で一致（listings だけに在る孤児エントリも検出）
 *   3. imagePath が実在（content/brain/assets 配下）
 *   4. distFile が content/brain/dist に実在
 *   5. 本文の配布URL basename が distFile と一致し、paidMarker より後（無料流出防止）
 *   6. 本文に ¥価格の直書きが無い（価格の真実源はカタログ＝Brain 販売設定）
 *   7. priceYen が Brain の制約（100〜100,000）内
 *   8. 旧配置（.claude/config/brain-listings.json・.claude/config/brain/{assets,dist}）が
 *      存在したら FAIL（DN-0103 Phase 03 で content/brain へ移行済み・二重 SSOT を許さない）
 *
 * 使い方: node scripts/check-brain-wiring.mjs [--staged]
 *   --staged: git staged に brain 系ファイルが無ければ即 exit 0（pre-commit 用）
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { BRAIN_LISTINGS_PATH, BRAIN_DIST_ROOT } from './lib/repository-paths.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG_PATH = join(ROOT, 'src/lib/brain-products.ts');
const LEGACY_LISTINGS_PATH = join(ROOT, '.claude/config/brain-listings.json');
const LEGACY_BRAIN_DIR = join(ROOT, '.claude/config/brain');
const DIST_BASE = 'https://storage.doboku-note.com/brain/dist/';

const staged = process.argv.includes('--staged');
if (staged) {
  let names = '';
  try { names = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 }); } catch { /* noop */ }
  const hit = names.split('\n').some((p) =>
    /src\/lib\/brain-products\.ts|content\/brain\/|\.claude\/config\/brain-listings\.json|\.claude\/config\/brain\//.test(p.replace(/\\/g, '/')));
  if (!hit) process.exit(0);
}

if (!existsSync(CATALOG_PATH)) { console.error('[check-brain-wiring] ✗ カタログなし: src/lib/brain-products.ts'); process.exit(1); }

const violations = [];

// 8. 旧配置が残っていたら即 FAIL（二重 SSOT を作らない）
if (existsSync(LEGACY_LISTINGS_PATH)) violations.push(`旧配置が残存: ${LEGACY_LISTINGS_PATH.replace(ROOT + '/', '')}（content/brain/listings.json へ移行済みのはず）`);
if (existsSync(LEGACY_BRAIN_DIR)) violations.push(`旧配置が残存: ${LEGACY_BRAIN_DIR.replace(ROOT + '/', '')}（content/brain/{assets,dist} へ移行済みのはず）`);

// カタログ抽出（id→status→articleId→productUrl の記述順規約）
const src = readFileSync(CATALOG_PATH, 'utf-8');
const products = [];
const re = /id:\s*'([^']+)',\s*status:\s*'([^']+)',\s*articleId:\s*'([^']*)',\s*productUrl:\s*'([^']*)'/g;
let m;
while ((m = re.exec(src))) {
  const slice = src.slice(m.index, m.index + 2500);
  products.push({
    id: m[1], status: m[2], articleId: m[3], productUrl: m[4],
    priceYen: parseInt(slice.match(/priceYen:\s*(\d+)/)?.[1] ?? '0', 10),
    distFile: slice.match(/distFile:\s*'([^']*)'/)?.[1] ?? '',
  });
}

if (products.length === 0) violations.push('カタログから1件も抽出できない（記述順 id→status→articleId→productUrl を確認）');

let listings = {};
try { listings = JSON.parse(readFileSync(BRAIN_LISTINGS_PATH, 'utf-8')).listings || {}; }
catch (e) { violations.push(`content/brain/listings.json 読取不可: ${e.message}`); }

// 2. catalog↔listings 全商品一致（listings 側の孤児も検出）
const catalogIds = new Set(products.map((p) => p.id));
for (const listingId of Object.keys(listings)) {
  if (!catalogIds.has(listingId)) violations.push(`[${listingId}] listings にあるがカタログに無い（孤児エントリ）`);
}

for (const p of products) {
  // 1. submitted/listed の必須
  if (p.status === 'submitted' || p.status === 'listed') {
    if (!p.articleId) violations.push(`[${p.id}] ${p.status} なのに articleId が空`);
    if (p.productUrl !== `https://brain-market.com/a/${p.articleId}`)
      violations.push(`[${p.id}] productUrl が articleId と不一致`);
  }
  // 7. 価格制約
  if (p.priceYen < 100 || p.priceYen > 100000) violations.push(`[${p.id}] priceYen ${p.priceYen} は Brain 制約(100〜100,000)外`);
  // 2. listings（カタログ側の孤児＝listings が無い）
  const l = listings[p.id];
  if (!l) { violations.push(`[${p.id}] listings エントリなし（brain-publish が失敗する）`); continue; }
  if (!l.bodyText) violations.push(`[${p.id}] listings.bodyText が空`);
  // 3. imagePath 実在
  if (!l.imagePath || !existsSync(join(ROOT, l.imagePath))) violations.push(`[${p.id}] imagePath 不在: ${l.imagePath}`);
  // 4. dist 実在
  if (!p.distFile) violations.push(`[${p.id}] distFile が空`);
  else if (!existsSync(join(BRAIN_DIST_ROOT, p.distFile))) violations.push(`[${p.id}] 配布ZIP不在: content/brain/dist/${p.distFile}`);
  // 5. 配布URL位置・basename 一致
  if (l.bodyText && p.distFile) {
    const url = DIST_BASE + p.distFile;
    const marker = l.paidMarker || 'ここから先（有料エリア）';
    const iu = l.bodyText.indexOf(url);
    const im = l.bodyText.indexOf(marker);
    const foundUrlMatch = l.bodyText.match(/storage\.doboku-note\.com\/brain\/dist\/([^\s)"'）]+)/);
    if (iu === -1) {
      if (foundUrlMatch && basename(foundUrlMatch[1]) !== p.distFile) {
        violations.push(`[${p.id}] 本文の配布URL basename(${basename(foundUrlMatch[1])}) が distFile(${p.distFile}) と不一致`);
      } else {
        violations.push(`[${p.id}] 本文に配布URLなし（商品実体なし公開の防止）: ${url}`);
      }
    } else if (im === -1) {
      violations.push(`[${p.id}] 本文に paidMarker "${marker}" なし`);
    } else if (iu < im) {
      violations.push(`[${p.id}] 配布URLが有料ラインより前（無料流出）`);
    }
  }
  // 6. 価格直書き禁止
  if (l.bodyText && /[¥￥]\s?\d{1,3},\d{3}/.test(l.bodyText)) violations.push(`[${p.id}] 本文に¥価格の直書き（真実源はカタログ/Brain販売設定）`);
}

if (violations.length) {
  console.error(`[check-brain-wiring] ✗ ${violations.length} 件:`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}
const counts = products.reduce((a, p) => { a[p.status] = (a[p.status] || 0) + 1; return a; }, {});
console.log(`[check-brain-wiring] ✓ 商品 ${products.length} 件（${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' / ')}）は SoT 整合`);
