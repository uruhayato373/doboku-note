/**
 * internal-inbound.mjs — 記事 MDX の本文リンクから「そのページへの内部リンク元の記事数」を数える（純関数＋ローダ）。
 * ---------------------------------------------------------------------------
 * 旧実装は keyword-relations.json の文字列を数えていたため、キーワード以外のページはリンクがあっても 0 になった。
 * ここでは `[text](/path)` と `href="/path"` を本文から直接拾い、リンク元の記事ファイル数（同じ記事内の重複は 1）を返す。
 * `/docs/<slug>` で書かれたリンクは描画時に正規 URL へ書き換わるので、legacyRoutes（/docs/<slug> → 正規パス）で両方に数える。
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { toJoinKey } from "./url-normalization.mjs";

const HREF_RE = /(?:\]\(\s*|href\s*=\s*["'{]+\s*|\bto\s*=\s*["']\s*)(\/[^\s)"'}>]*)/g;

/** MDX 本文から内部リンク（先頭 /）の join key 集合を取り出す。 */
export function extractInternalLinkKeys(text) {
  const keys = new Set();
  for (const m of String(text ?? "").matchAll(HREF_RE)) {
    const key = toJoinKey(m[1]);
    if (key && key !== "/") keys.add(key);
  }
  return keys;
}

/**
 * @param {Array<{path:string,text:string}>} files
 * @param {Map<string,string>} [legacyRoutes] `/docs/<slug>` → 正規パス（parseLegacyRedirects の結果）
 * @returns {Map<string,number>} join key → リンク元ファイル数
 */
export function countInternalInbound(files, legacyRoutes = new Map()) {
  const counts = new Map();
  for (const f of files) {
    const own = new Set();
    for (const key of extractInternalLinkKeys(f.text)) {
      own.add(key);
      const canonical = legacyRoutes.get(key);
      if (canonical) own.add(toJoinKey(canonical));
    }
    for (const key of own) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function walkMdx(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkMdx(p, out);
    else if (e.isFile() && e.name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

/** content/site の全 MDX を読んで数える。MDX が 1 本も読めなければ null（0 件と区別する）。 */
export function loadInternalInbound(root, legacyRoutes) {
  const paths = walkMdx(join(root, "content/site"));
  if (paths.length === 0) return null;
  return countInternalInbound(paths.map((path) => ({ path, text: readFileSync(path, "utf8") })), legacyRoutes);
}
