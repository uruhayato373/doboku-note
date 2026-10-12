import { escapeRegExp } from './regexp-escape.mjs';

/** Cloudflare Pages `_redirects` の単純な `*` ルールをpathへ適用する。 */
export function matchWildcardRedirect(pathWithQuery, wildcards = []) {
  const path = String(pathWithQuery || "").split("?")[0];
  for (const rule of wildcards) {
    if (!rule?.from?.includes("*")) continue;
    const parts = rule.from.split("*");
    const pattern = `^${parts.map(escapeRegExp).join("(.*)")}$`;
    const match = path.match(new RegExp(pattern));
    if (!match) continue;
    let capture = 1;
    const target = String(rule.to).replace(/:splat/g, () => match[capture++] || "");
    return { to: target, code: rule.code || 301, matchedRule: rule.from };
  }
  return null;
}

/**
 * `_redirects` のテキストに対し、パスがどのルールで何に転送されるかを Cloudflare Pages と同じ規則で解く。
 * ファイルの上にあるルールが勝つ。完全一致（静的）と `*`（splat）に対応する。:placeholder は使っていないので扱わない。
 * 何にも当たらなければ null。
 */
export function resolveRedirect(text, path) {
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [from, to, code] = line.split(/\s+/);
    if (!from || !to) continue;
    if (!from.includes("*")) {
      if (from === path) return { to, code: Number(code) || 302, rule: from };
      continue;
    }
    const hit = matchWildcardRedirect(path, [{ from, to, code: Number(code) || 302 }]);
    if (hit) return { to: hit.to, code: hit.code, rule: from };
  }
  return null;
}
