/**
 * load-ts.mjs — テストから `src/**` の TypeScript を評価するための最小ローダー。
 *
 * 背景: node:test は TS を直接 import できないため、既存テストは esbuild の `transformSync` で
 *   JS へ変換し `data:text/javascript,` として import していた。ところが **transform は bundle しない**ので、
 *   対象ファイルが `@/config/...` のようなパスエイリアスを import した瞬間に
 *   `ERR_MODULE_NOT_FOUND` で落ちる（2026-08-21 に affiliate-creatives.ts が career-pathways.ts を
 *   import した際、affiliate-arm-routing.test.mjs が 6/6 失敗した）。
 *
 * ここでは `@/` を `src/` へ解決し、依存を再帰的に data URL へ埋め込む。循環 import は想定しない
 * （config 層は一方向）。**型だけの import は esbuild が落とす**ので追跡不要。
 *
 * 使い方:
 *   const mod = await loadTsModule('src/config/career-pathways.ts');
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** `@/x/y` → `src/x/y.ts`（拡張子は .ts / .tsx を順に試す）。 */
function resolveAlias(spec) {
  if (!spec.startsWith('@/')) return null;
  const base = posix.join('src', spec.slice(2));
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
  const ts = readFileSync(resolve(ROOT, relPath), 'utf8');
  let js = transformSync(ts, { loader: relPath.endsWith('.tsx') ? 'tsx' : 'ts', format: 'esm' }).code;
  js = js.replace(/(from\s*|import\s*\(\s*)(["'])(@\/[^"']+)\2/g, (m, head, quote, spec) => {
    const dep = resolveAlias(spec);
    if (!dep) throw new Error(`[load-ts] エイリアスを解決できない: ${spec}（${relPath}）`);
    return `${head}${quote}${toDataUrl(dep, cache)}${quote}`;
  });
  const url = 'data:text/javascript,' + encodeURIComponent(js);
  cache.set(relPath, url);
  return url;
}

/** TS モジュールを評価して export を返す。 */
export function loadTsModule(relPath) {
  return import(toDataUrl(relPath));
}
