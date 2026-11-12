/**
 * ページ別の写真（site-photo.webp・1200×630）の所在と版。OGP の背景（ogp-create の photo-scrim）と
 * OGP の srcHash（写真を作り直したら OGP も古いと検出する）が使う。正本は config/site-thumbnails.json。
 * 版はサイト内サムネイルと同じ `version`（同じ Codex の出力から 2 枚を切るので、両方を指す）。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { datasetPath } from './datasets.mjs';
import { REPO_ROOT } from './repository-paths.mjs';
import { loadManifest } from './asset-storage.mjs';

let cache = null;
const config = () => (cache ??= JSON.parse(readFileSync(join(REPO_ROOT, datasetPath('config.site-thumbnails')), 'utf8')));

/** category（資格の slug）と記事のディレクトリ名から、写真の版を返す。写真がまだ無いページは null */
export function pagePhotoVersion(category, localSlug) {
  return config().pages?.[category]?.[localSlug]?.version ?? null;
}

/** 写真のリポジトリ相対パス（手元に無いことがある。R2 の site-photos 群から asset-hydrate で取り戻す） */
export function pagePhotoPath(category, localSlug) {
  return `content/site/${category}/${localSlug}/${config().photoFile}`;
}

let manifest = null;
/**
 * OGP の背景に使える写真の版。版が台帳にあり、実体が手元か R2（退避台帳 manifest.json）にあるときだけ返す。
 * ogp-create（photo-scrim か mono-tag かの選択）と update-ogp-srchash（srcHash の入力）が同じ判定を使う。
 */
export function availablePhotoVersion(category, localSlug) {
  const version = pagePhotoVersion(category, localSlug);
  if (!version) return null;
  const rel = pagePhotoPath(category, localSlug);
  if (existsSync(join(REPO_ROOT, rel))) return version;
  manifest ??= loadManifest();
  return manifest.entries?.[rel] ? version : null;
}
