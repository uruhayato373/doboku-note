import { loadBrainInventory, validateBrainInventory } from '../../../../scripts/lib/brain-inventory.mjs';
import { loadProjectEntries } from './project';

/**
 * brain.ts — `/content/brain`（read-only）の表示モデル。
 *
 * 判定ロジックは `scripts/lib/brain-inventory.mjs`（check-brain-wiring と共有）を
 * そのまま使う。ここでは表示用に整形するだけで、独自の配線判定を重複実装しない。
 * アカウント設定・token・秘密値は読まない（brain-inventory.mjs 自体が読まないため、
 * ここでも読み込みようがない）。
 */

export interface BrainImageInfo {
  exists: boolean;
  bytes: number;
  dimensions: { width: number; height: number } | null;
  mtimeMs: number | null;
}

export interface BrainDistInfo {
  exists: boolean;
  bytes: number;
  sha256: string | null;
  basename: string | null;
  mtimeMs: number | null;
}

export interface BrainProductView {
  id: string;
  shortTitle: string;
  title: string;
  status: string;
  price: string;
  priceYen: number;
  productUrl: string;
  articleId: string;
  distFile: string | null;
  listedAt: string | null;
  submittedAt: string | null;
  description: string;
  bodyTextExcerpt: string;
  bodyTextLength: number;
  paidMarker: string | null;
  imagePath: string | null;
  image: BrainImageInfo;
  dist: BrainDistInfo;
  wiringStatus: 'ok' | 'error';
  violations: readonly string[];
}

export interface BrainRelatedDoc {
  file: string;
  title: string;
  href: string;
}

export interface BrainView {
  products: BrainProductView[];
  summary: {
    total: number;
    byStatus: Record<string, number>;
    wiringOk: number;
    wiringError: number;
  };
  /** 商品に紐付かない全体違反（旧配置残存・カタログ不在等）。0 件を緑と決め打たない。 */
  overallOk: boolean;
  overallViolations: readonly string[];
  relatedDocs: BrainRelatedDoc[];
  /** 実ファイル(image/dist) mtime の範囲。「最終更新」を騙らず、実体の更新時刻だけを示す。 */
  fileMtimeRange: { earliest: string; latest: string } | null;
}

export function loadBrainView(): BrainView {
  const inventory = loadBrainInventory();
  const result = validateBrainInventory(inventory);
  const byId = new Map(result.items.map((i: { id: string }) => [i.id, i]));

  const products: BrainProductView[] = inventory.items.map((p: (typeof inventory.items)[number]) => {
    const v = byId.get(p.id) as { wiringStatus: 'ok' | 'error'; violations: string[] } | undefined;
    return {
      id: p.id,
      shortTitle: p.shortTitle,
      title: p.title,
      status: p.status,
      price: p.price,
      priceYen: p.priceYen,
      productUrl: p.productUrl,
      articleId: p.articleId,
      distFile: p.distFile || null,
      listedAt: p.listedAt,
      submittedAt: p.submittedAt,
      description: p.description,
      bodyTextExcerpt: p.listing?.bodyTextExcerpt ?? '',
      bodyTextLength: p.listing?.bodyTextLength ?? 0,
      paidMarker: p.listing?.paidMarker ?? null,
      imagePath: p.listing?.imagePath ?? null,
      image: p.image,
      dist: p.dist,
      wiringStatus: v?.wiringStatus ?? 'error',
      violations: v?.violations ?? [],
    };
  });

  const byStatus: Record<string, number> = {};
  for (const p of products) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;

  // 商品 id に紐付かない全体違反（旧配置残存・カタログ不在・孤児 listings 等）。
  const overallViolations = result.violations.filter(
    (v: string) => !products.some((p) => v.startsWith(`[${p.id}]`)),
  );

  const relatedDocs: BrainRelatedDoc[] = loadProjectEntries()
    .filter((e) => e.channel.includes('brain'))
    .map((e) => ({ file: e.file, title: e.title, href: `/docs/${e.slug}` }));

  const mtimes: number[] = products
    .flatMap((p) => [p.image.mtimeMs, p.dist.mtimeMs])
    .filter((n): n is number => n !== null);
  const fileMtimeRange = mtimes.length
    ? { earliest: new Date(Math.min(...mtimes)).toISOString(), latest: new Date(Math.max(...mtimes)).toISOString() }
    : null;

  return {
    products,
    summary: {
      total: products.length,
      byStatus,
      wiringOk: products.filter((p) => p.wiringStatus === 'ok').length,
      wiringError: products.filter((p) => p.wiringStatus === 'error').length,
    },
    overallOk: result.ok,
    overallViolations,
    relatedDocs,
    fileMtimeRange,
  };
}
