function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Cloudflare Pages `_redirects` の単純な `*` ルールをpathへ適用する。 */
export function matchWildcardRedirect(pathWithQuery, wildcards = []) {
  const path = String(pathWithQuery || "").split("?")[0];
  for (const rule of wildcards) {
    if (!rule?.from?.includes("*")) continue;
    const parts = rule.from.split("*");
    const pattern = `^${parts.map(escapeRegex).join("(.*)")}$`;
    const match = path.match(new RegExp(pattern));
    if (!match) continue;
    let capture = 1;
    const target = String(rule.to).replace(/:splat/g, () => match[capture++] || "");
    return { to: target, code: rule.code || 301, matchedRule: rule.from };
  }
  return null;
}
