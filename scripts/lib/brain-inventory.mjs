/**
 * brain-inventory.mjs — Brain 商品の SoT を集約・検証する pure module（DN-0103 Phase 04）。
 *
 * `check-brain-wiring.mjs`（CLI・exit code で判定）と admin `/content/brain`
 * （表示専用）の両方がこの1実装を通す。判定ロジックを2箇所に複製しない。
 *
 * 副作用は fs の read-only アクセスのみ。ネットワーク・外部 API・書き込みは一切しない。
 * `.claude/config/brain-account.json` 等の秘密設定は読まない。
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, basename } from 'node:path';
import {
  REPO_ROOT, BRAIN_LISTINGS_PATH, BRAIN_DIST_ROOT,
} from './repository-paths.mjs';

export const CATALOG_PATH = join(REPO_ROOT, 'src/lib/brain-products.ts');
export const LEGACY_LISTINGS_PATH = join(REPO_ROOT, '.claude/config/brain-listings.json');
export const LEGACY_BRAIN_DIR = join(REPO_ROOT, '.claude/config/brain');
export const DIST_BASE_URL = 'https://storage.doboku-note.com/brain/dist/';

/** カタログ抽出（id→status→articleId→productUrl の記述順規約）。表示用フィールドも合わせて拾う。 */
export function parseCatalog(src) {
  const products = [];
  const re = /id:\s*'([^']+)',\s*status:\s*'([^']+)',\s*articleId:\s*'([^']*)',\s*productUrl:\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(src))) {
    const slice = src.slice(m.index, m.index + 2500);
    products.push({
      id: m[1],
      status: m[2],
      articleId: m[3],
      productUrl: m[4],
      title: slice.match(/title:\s*'([^']*)'/)?.[1] ?? '',
      shortTitle: slice.match(/shortTitle:\s*'([^']*)'/)?.[1] ?? '',
      description: slice.match(/description:\s*\n?\s*'([^']*)'/)?.[1] ?? '',
      price: slice.match(/price:\s*'([^']*)'/)?.[1] ?? '',
      priceYen: parseInt(slice.match(/priceYen:\s*(\d+)/)?.[1] ?? '0', 10),
      distFile: slice.match(/distFile:\s*'([^']*)'/)?.[1] ?? '',
      listedAt: slice.match(/listedAt:\s*'([^']*)'/)?.[1] ?? null,
      submittedAt: slice.match(/submittedAt:\s*'([^']*)'/)?.[1] ?? null,
    });
  }
  return products;
}

/** PNG の幅・高さをヘッダから読む（IHDR チャンクは常にファイル先頭・sharp 等の重い依存を避ける）。 */
function pngDimensions(absPath) {
  try {
    const fd = readFileSync(absPath);
    if (fd.length < 24) return null;
    const isPng = fd[0] === 0x89 && fd[1] === 0x50 && fd[2] === 0x4e && fd[3] === 0x47;
    if (!isPng) return null;
    return { width: fd.readUInt32BE(16), height: fd.readUInt32BE(20) };
  } catch {
    return null;
  }
}

function sha256Of(absPath) {
  try {
    return createHash('sha256').update(readFileSync(absPath)).digest('hex');
  } catch {
    return null;
  }
}

/**
 * 全 SoT を読み取るだけの pure ロード（判定はしない）。
 * bodyText はここでは保持するが、admin 表示層は excerpt だけを使う（全量を一覧へ展開しない）。
 */
export function loadBrainInventory() {
  const catalogExists = existsSync(CATALOG_PATH);
  const catalogSrc = catalogExists ? readFileSync(CATALOG_PATH, 'utf-8') : '';
  const products = catalogExists ? parseCatalog(catalogSrc) : [];

  let listings = {};
  let listingsError = null;
  try {
    listings = JSON.parse(readFileSync(BRAIN_LISTINGS_PATH, 'utf-8')).listings || {};
  } catch (e) {
    listingsError = e.message;
  }

  const items = products.map((p) => {
    const listing = listings[p.id] ?? null;
    const imageAbs = listing?.imagePath ? join(REPO_ROOT, listing.imagePath) : null;
    const imageExists = Boolean(imageAbs && existsSync(imageAbs));
    const distAbs = p.distFile ? join(BRAIN_DIST_ROOT, p.distFile) : null;
    const distExists = Boolean(distAbs && existsSync(distAbs));
    const bodyText = listing?.bodyText ?? '';

    return {
      ...p,
      listing: listing
        ? {
            imagePath: listing.imagePath ?? null,
            paidMarker: listing.paidMarker ?? null,
            bodyText,
            bodyTextLength: bodyText.length,
            bodyTextExcerpt: bodyText.slice(0, 200),
          }
        : null,
      image: imageExists
        ? { exists: true, bytes: statSync(imageAbs).size, dimensions: pngDimensions(imageAbs), mtimeMs: statSync(imageAbs).mtimeMs }
        : { exists: false, bytes: 0, dimensions: null, mtimeMs: null },
      dist: distExists
        ? { exists: true, bytes: statSync(distAbs).size, sha256: sha256Of(distAbs), basename: basename(distAbs), mtimeMs: statSync(distAbs).mtimeMs }
        : { exists: false, bytes: 0, sha256: null, basename: p.distFile || null, mtimeMs: null },
    };
  });

  const orphanListingIds = Object.keys(listings).filter((id) => !products.some((p) => p.id === id));

  return {
    catalogExists,
    items,
    orphanListingIds,
    listingsError,
    legacyListingsPresent: existsSync(LEGACY_LISTINGS_PATH),
    legacyBrainDirPresent: existsSync(LEGACY_BRAIN_DIR),
  };
}

/**
 * `check-brain-wiring.mjs` と admin `/content/brain` が共有する唯一の判定ロジック。
 * 検査対象0件をPASSにしない・未検査を緑にしない（CLAUDE.md §9）。
 */
export function validateBrainInventory(inventory) {
  const violations = [];
  // Windows では join() が `\` 区切りを返すため、表示は常に `/` 区切りの repo 相対へ正規化する
  const relToRoot = (absPath) => absPath.slice(REPO_ROOT.length + 1).replace(/\\/g, '/');

  if (inventory.legacyListingsPresent) violations.push(`旧配置が残存: ${relToRoot(LEGACY_LISTINGS_PATH)}（content/brain/listings.json へ移行済みのはず）`);
  if (inventory.legacyBrainDirPresent) violations.push(`旧配置が残存: ${relToRoot(LEGACY_BRAIN_DIR)}（content/brain/{assets,dist} へ移行済みのはず）`);
  if (!inventory.catalogExists) violations.push('カタログなし: src/lib/brain-products.ts');
  if (inventory.listingsError) violations.push(`content/brain/listings.json 読取不可: ${inventory.listingsError}`);
  if (inventory.items.length === 0) violations.push('カタログから1件も抽出できない（記述順 id→status→articleId→productUrl を確認）');
  for (const id of inventory.orphanListingIds) violations.push(`[${id}] listings にあるがカタログに無い（孤児エントリ）`);

  const items = inventory.items.map((p) => {
    const itemViolations = [];
    const checks = {
      urlOk: true,
      priceInRange: p.priceYen >= 100 && p.priceYen <= 100000,
      hasListing: Boolean(p.listing),
      hasBodyText: Boolean(p.listing && p.listing.bodyTextLength > 0),
      imageExists: p.image.exists,
      distExists: p.dist.exists,
      distUrlPresent: null,
      distUrlAfterPaidMarker: null,
      noPriceInBody: null,
    };

    if (p.status === 'submitted' || p.status === 'listed') {
      if (!p.articleId) { checks.urlOk = false; itemViolations.push(`${p.status} なのに articleId が空`); }
      if (p.productUrl !== `https://brain-market.com/a/${p.articleId}`) { checks.urlOk = false; itemViolations.push('productUrl が articleId と不一致'); }
    }
    if (!checks.priceInRange) itemViolations.push(`priceYen ${p.priceYen} は Brain 制約(100〜100,000)外`);
    if (!checks.hasListing) { itemViolations.push('listings エントリなし（brain-publish が失敗する）'); }
    else {
      if (!checks.hasBodyText) itemViolations.push('listings.bodyText が空');
      if (!checks.imageExists) itemViolations.push(`imagePath 不在: ${p.listing.imagePath ?? '(未設定)'}`);
      if (!p.distFile) itemViolations.push('distFile が空');
      else if (!checks.distExists) itemViolations.push(`配布ZIP不在: content/brain/dist/${p.distFile}`);

      if (checks.hasBodyText && p.distFile) {
        const url = DIST_BASE_URL + p.distFile;
        const marker = p.listing.paidMarker || 'ここから先（有料エリア）';
        const bodyText = p.listing.bodyText;
        const iu = bodyText.indexOf(url);
        const im = bodyText.indexOf(marker);
        const foundUrlMatch = bodyText.match(/storage\.doboku-note\.com\/brain\/dist\/([^\s)"'）]+)/);
        checks.distUrlPresent = iu !== -1;
        if (iu === -1) {
          if (foundUrlMatch && basename(foundUrlMatch[1]) !== p.distFile) {
            itemViolations.push(`本文の配布URL basename(${basename(foundUrlMatch[1])}) が distFile(${p.distFile}) と不一致`);
          } else {
            itemViolations.push(`本文に配布URLなし（商品実体なし公開の防止）: ${url}`);
          }
          checks.distUrlAfterPaidMarker = false;
        } else if (im === -1) {
          itemViolations.push(`本文に paidMarker "${marker}" なし`);
          checks.distUrlAfterPaidMarker = false;
        } else {
          checks.distUrlAfterPaidMarker = iu >= im;
          if (iu < im) itemViolations.push('配布URLが有料ラインより前（無料流出）');
        }
        checks.noPriceInBody = !/[¥￥]\s?\d{1,3},\d{3}/.test(bodyText);
        if (!checks.noPriceInBody) itemViolations.push('本文に¥価格の直書き（真実源はカタログ/Brain販売設定）');
      }
    }

    const wiringStatus = itemViolations.length === 0 ? 'ok' : 'error';
    return { id: p.id, checks, violations: itemViolations, wiringStatus };
  });

  for (const r of items) for (const v of r.violations) violations.push(`[${r.id}] ${v}`);

  return { violations, ok: violations.length === 0, items };
}
