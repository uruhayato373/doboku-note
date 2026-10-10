/**
 * load-ts.mjs — テストから `src/**` の TypeScript を評価するための最小ローダー。
 *
 * 背景: node:test は TS を直接 import できないため、既存テストは esbuild の `transformSync` で
 *   JS へ変換し `data:text/javascript,` として import していた。ところが **transform は bundle しない**ので、
 *   対象ファイルが `@/config/...` のようなパスエイリアスを import した瞬間に
 *   `ERR_MODULE_NOT_FOUND` で落ちる（2026-08-21 に affiliate-creatives.ts が career-pathways.ts を
 *   import した際、affiliate-arm-routing.test.mjs が 6/6 失敗した）。
 *
 * ここでは `@/` を `src/` へ、相対 import をファイルの位置から解決し、依存を再帰的に data URL へ埋め込む（.mjs は実ファイル）。循環 import は想定しない
 * （config 層は一方向）。**型だけの import は esbuild が落とす**ので追跡不要。
 *
 * 使い方:
 *   const mod = await loadTsModule('src/config/career-pathways.ts');
 */
import { existsSync, readFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { transformSync } from 'esbuild';
import { REPO_ROOT as ROOT } from '../../scripts/lib/repository-paths.mjs';

/** `@/x/y` → `src/x/y.ts`（拡張子は .ts / .tsx を順に試す）。 */
function resolveAlias(spec) {
  if (!spec.startsWith('@/')) return null;
  const base = posix.join('src', spec.slice(2));
  // JSON（config 層）はそのまま default export へ包む（2026-09-11・content-taxonomy.ts が categories.json 等を読む）
  // .mjs（src/config/site-identity.mjs・src/lib/keyword-href.mjs など TS ではない共有モジュール）は実ファイルをそのまま読む
  if (base.endsWith('.json') || /\.m?js$/.test(base)) return existsSync(resolve(ROOT, base)) ? base : null;
  for (const ext of ['.ts', '.tsx', '/index.ts']) {
    const rel = base + ext;
    if (existsSync(resolve(ROOT, rel))) return rel;
  }
  return null;
}

/** TS ファイルを data URL へ変換する（依存も再帰的に埋め込む）。 */
export function toDataUrl(relPath, cache = new Map()) {
  const cached = cache.get(relPath);
  if (cached) return cached;
  if (relPath.endsWith('.json')) {
    const url = 'data:text/javascript,' + encodeURIComponent(`export default ${readFileSync(resolve(ROOT, relPath), 'utf8')};`);
    cache.set(relPath, url);
    return url;
  }
  const ts = readFileSync(resolve(ROOT, relPath), 'utf8');
  let js = transformSync(ts, { loader: relPath.endsWith('.tsx') ? 'tsx' : 'ts', format: 'esm' }).code;
  js = js.replace(/(from\s*|import\s*\(\s*)(["'])(@\/[^"']+)\2/g, (m, head, quote, spec) => {
    const dep = resolveAlias(spec);
    if (!dep) throw new Error(`[load-ts] エイリアスを解決できない: ${spec}（${relPath}）`);
    if (/\.m?js$/.test(dep)) return `${head}${quote}${pathToFileURL(resolve(ROOT, dep)).href}${quote}`;
    return `${head}${quote}${toDataUrl(dep, cache)}${quote}`;
  });
  // 相対 import（2026-10-02・src/lib/qualification-names.ts が registry の JSON と scripts/lib の .mjs を読む）。
  // data URL からは相対パスを解決できないので、.mjs/.js は実ファイルの file URL、JSON と .ts は data URL へ置き換える
  js = js.replace(/(from\s*|import\s*\(\s*)(["'])(\.\.?\/[^"']+)\2/g, (m, head, quote, spec) => {
    const dep = posix.normalize(posix.join(posix.dirname(relPath.split('\\').join('/')), spec));
    if (/\.(m?js)$/.test(dep)) return `${head}${quote}${pathToFileURL(resolve(ROOT, dep)).href}${quote}`;
    const file = [dep, `${dep}.ts`, `${dep}.tsx`].find((f) => /\.(json|tsx?)$/.test(f) && existsSync(resolve(ROOT, f)));
    if (!file) throw new Error(`[load-ts] 相対 import を解決できない: ${spec}（${relPath}）`);
    return `${head}${quote}${toDataUrl(file, cache)}${quote}`;
  });
  const url = 'data:text/javascript,' + encodeURIComponent(js);
  cache.set(relPath, url);
  return url;
}

/** TS モジュールを評価して export を返す。 */
export function loadTsModule(relPath) {
  return import(toDataUrl(relPath));
}
