/**
 * content-index.mjs — 公開パス → 原稿パス（index）と、旧 URL → 正規 URL（legacy）の対応（唯一の実装）。
 * 旧 /docs/<slug> の 301 先を公開パスとし、slug は content/site の相対パスから導く（generate-sitemap と同じ規則）。
 * 読み手: 成長ダイジェスト（build-growth-digest）・実験の自動計測（measure-experiments）・検索改善（search-opportunities・search-improvement）。
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { listFiles } from './fs-walk.mjs';
import { LEGACY_PREFIX, parseLegacyRedirects } from './legacy-routes.mjs';
import { REPO_ROOT, SITE_CONTENT_ROOT } from './repository-paths.mjs';

/** 同じプロセス（管理画面の dev サーバーなど）で作り直さない。公開パスは public/_redirects から決まるので、その更新日時が鍵 */
const memo = new Map();

export function buildContentIndex(root = REPO_ROOT) {
  const file = join(root, 'public/_redirects');
  const key = `${root}:${existsSync(file) ? statSync(file).mtimeMs : 0}`;
  if (!memo.has(key)) memo.set(key, build(root, file));
  return memo.get(key);
}

function build(root, file) {
  const redirects = new Map();
  if (existsSync(file)) {
    // 静的 301 と、動的ルールがまとめる slug の表（# route）の両方から引く。
    for (const [from, to] of parseLegacyRedirects(readFileSync(file, 'utf8'))) {
      redirects.set(from.slice(LEGACY_PREFIX.length), to.replace(/\/+$/, ''));
    }
  }
  const index = new Map();
  const siteRoot = join(root, relative(REPO_ROOT, SITE_CONTENT_ROOT));
  for (const full of listFiles(siteRoot, { ext: '.mdx', allowMissing: true })) {
    const segs = relative(siteRoot, full).split(sep);
    const base = segs.pop().replace(/\.mdx$/, '');
    const slug = (base === 'article' ? segs : [...segs, base]).join('-');
    const path = redirects.get(slug);
    if (path) index.set(path, relative(root, full).split(sep).join('/'));
  }
  const legacy = new Map([...redirects].map(([slug, to]) => [`${LEGACY_PREFIX}${slug}`, to]));
  return { index, legacy };
}
