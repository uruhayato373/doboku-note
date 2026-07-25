import { expect, type Page } from '@playwright/test';

export const representativePages = [
  { path: '/', heading: '対応する資格・試験' },
  { path: '/category/civil-construction-1', heading: '1級土木施工管理技士' },
  { path: '/category/civil-construction-2', heading: '2級土木施工管理技士' },
  { path: '/category/pe-comprehensive-management', heading: '技術士（総合技術監理部門）' },
  {
    path: '/docs/pe-comprehensive-management-keyword-2026',
    heading: '総合技術監理',
  },
] as const;

export const categoryJourneys = [
  {
    categoryPath: '/category/civil-construction-1',
    categoryName: '1級土木施工管理技士',
  },
  {
    categoryPath: '/category/civil-construction-2',
    categoryName: '2級土木施工管理技士',
  },
  {
    categoryPath: '/category/pe-comprehensive-management',
    categoryName: '技術士（総合技術監理部門）',
  },
] as const;

export const ctaPages = [
  '/docs/civil-construction-1-guide-strategy',
  '/docs/civil-construction-2-guide-overview',
  '/docs/pe-comprehensive-management-economic-management-pillar',
] as const;

const allowedConsoleErrors = [
  // 外部計測・広告はE2Eの検査対象外。URLを限定し、製品コードの例外を広げない。
  /googletagmanager\.com/,
  /google-analytics\.com/,
  /doubleclick\.net/,
  /adsbygoogle/,
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
