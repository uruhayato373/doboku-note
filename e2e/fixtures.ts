import { expect, type Page } from '@playwright/test';

/**
 * ここで使う URL は **正規 URL**（/exam/... /practice/... /standards/...）に限る。
 *
 * 旧 `/category/{slug}` と `/docs/{slug}` は public/_redirects の 301 でしか存在しない。
 * `_redirects` は Cloudflare Pages が処理するもので next.config に redirects() は無いため、
 * `npm run dev`（= このスイートの webServer）では旧 URL は必ず 404 になる。旧 URL を
 * フィクスチャに置くと **製品ではなくリダイレクト設定を試したつもりで、実際には何も
 * 検査できていない赤**が出続ける（URL 移行時に取り残されていた）。
 * リダイレクト自体の検査は Cloudflare の責務なので E2E では扱わない。
 */
export const representativePages = [
  { path: '/', heading: '対応する資格・試験' },
  { path: '/exam/civil-construction-1', heading: '1級土木施工管理技士' },
  { path: '/exam/civil-construction-2', heading: '2級土木施工管理技士' },
  { path: '/exam/pe-comprehensive-management', heading: '技術士（総合技術監理部門）' },
  {
    path: '/exam/pe-comprehensive-management/guide/keyword-2026',
    heading: '総合技術監理',
  },
] as const;

export const categoryJourneys = [
  {
    categoryPath: '/exam/civil-construction-1',
    categoryName: '1級土木施工管理技士',
  },
  {
    categoryPath: '/exam/civil-construction-2',
    categoryName: '2級土木施工管理技士',
  },
  {
    categoryPath: '/exam/pe-comprehensive-management',
    categoryName: '技術士（総合技術監理部門）',
  },
] as const;

export const ctaPages = [
  '/exam/civil-construction-1/guide/strategy',
  '/exam/civil-construction-2/guide/overview',
  '/exam/pe-comprehensive-management/pillar/economic-management-pillar',
] as const;

/** globalSetup が事前に踏むページ。dev のオンデマンドコンパイルを assertion の外へ出す。 */
export const warmupPaths = [
  ...representativePages.map((page) => page.path),
  ...categoryJourneys.map((journey) => journey.categoryPath),
  ...ctaPages,
  '/standards',
  '/standards/chubu',
  '/standards/chubu/common',
  '/standards/chubu/common/part-01',
  '/standards/chubu/common/part-03',
  '/standards/chubu/common/chapters/1-3',
  '/standards/chubu/common/chapters/2-1',
  '/standards/kinki/common',
  '/standards/kinki/hikkei/part-08',
  '/topics/safety-laws',
  '/practice/oshms-pdca-site-operation',
  '/__e2e_not_found__',
] as const;

const allowedConsoleErrors = [
  // 外部計測はE2Eの検査対象外。URLを限定し、製品コードの例外を広げない。
  /googletagmanager\.com/,
  /google-analytics\.com/,
];

export function observeRuntimeErrors(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (!allowedConsoleErrors.some((pattern) => pattern.test(text))) consoleErrors.push(text);
  });

  return () => {
    expect(pageErrors, `pageerror:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `console.error:\n${consoleErrors.join('\n')}`).toEqual([]);
  };
}
