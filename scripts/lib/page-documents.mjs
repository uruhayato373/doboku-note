// page-documents.mjs — 画面のパス → その画面の根拠の文書を引く判定（依存なし・純関数）。
// 正本は config/domains.json の pageDocuments。管理画面のブラウザ側（components/PageDocLinks.tsx）と
// scripts/lib/domains.mjs の両方がこれを使う（同じ判定を 2 か所に書かない）。

/**
 * @param {Record<string, string[]>} map pageDocuments（画面のパス → 文書）
 * @param {string} pathname 画面のパス（クエリは無視）
 * @returns {string[]} 段の区切りで長い一致が優先。一致しなければ空
 */
export function matchPageDocuments(map, pathname) {
  const p = String(pathname).split('?')[0].replace(/\/+$/, '') || '/';
  let best = null;
  for (const [key, docs] of Object.entries(map ?? {})) {
    const hit = key === '/' ? p === '/' : p === key || p.startsWith(`${key}/`);
    if (hit && (!best || key.length > best.key.length)) best = { key, docs };
  }
  return best?.docs ?? [];
}

/** 文書のパス（docs/ 始まり）→ 管理画面の文書ビューアの URL と短い名前（番号の接頭辞と拡張子を外す） */
export function documentLink(path) {
  const slug = path.replace(/^docs\//, '').replace(/\.md$/, '');
  const parts = slug.split('/');
  const base = parts.at(-1);
  const label = base === 'README' ? `${parts.at(-2) ?? 'docs'} の索引` : base.replace(/^\d+[a-z]?_/, '');
  return { href: `/docs/${slug}`, label };
}
