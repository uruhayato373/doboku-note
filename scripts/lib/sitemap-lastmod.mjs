/**
 * ビルド成果物の mtime ではなく、表示内容の真実源に基づく静的ページの lastmod を返す。
 * standards の一覧・機関・文書・分冊・章ページは catalog.json から生成されるため、
 * catalog.asOf を共有する。MDX 駆動の /standards/guides/* は呼出側で別途解決する。
 */
export function resolveStaticLastmod(urlPath, standardsAsOf) {
  const isGeneratedStandards =
    urlPath === '/standards' ||
    (urlPath.startsWith('/standards/') && !urlPath.startsWith('/standards/guides/'));
  if (!isGeneratedStandards) return undefined;

  const date = new Date(`${standardsAsOf}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`standards catalog asOf が不正です: ${standardsAsOf}`);
  }
  return date.toISOString();
}

/** lastmod は正確な根拠があるURLにだけ出力する。 */
export function renderSitemapEntry(url) {
  const lastmod = url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : '';
  return `<url><loc>${url.loc}</loc>${lastmod}<changefreq>${url.changefreq}</changefreq><priority>${url.priority}</priority></url>`;
}
