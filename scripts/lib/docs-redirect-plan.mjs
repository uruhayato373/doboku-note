/**
 * docs-redirect-plan.mjs — 旧 /docs/<slug> の 301 を、動的ルール（splat）と静的ルールに振り分ける（純関数・DN-0675）。
 * ---------------------------------------------------------------------------
 * 公開 URL は slug から規則で組み立てられる（/docs/civil-construction-1-textbook-x → /exam/civil-construction-1/textbook/x）。
 * 規則どおりの slug は `/docs/<接頭辞>* <正規パス接頭辞>:splat 301` の 1 本にまとめ、規則に合わないもの
 * （統合・改名・group が slug に出ないもの）だけ静的ルールに残す。301 の行き先は 1 本も変えない。
 *
 * Cloudflare Pages の制約（https://developers.cloudflare.com/pages/configuration/redirects/ で確認・2026-10-12）:
 *   - 静的 2,000 件 / 動的 100 件。splat（*）は 1 行に 1 つで、残りの文字列を貪欲に取り、:splat で行き先に入れる
 *   - 同じ入力に複数ルールが当たるときは**ファイルの上にあるものが勝つ**。静的ルールは動的ルールより前に置く
 *   → 統合・改名の静的ルールは動的ルールより必ず前なので、splat に先食いされない。
 *   動的ルール同士は接頭辞の長い順に並べ、短い接頭辞（例 pe-comprehensive-management-）が長い接頭辞を先食いしない。
 */

/** @param {{legacySlug:string,path:string}} route @returns {{prefix:string,dest:string}|null} */
export function candidateRule(route) {
  const { legacySlug: slug, path } = route;
  // 行き先の最後の区間（localSlug）が slug の末尾と一致するときだけ、規則に載せられる。
  const local = path.slice(path.lastIndexOf("/") + 1);
  if (!local || !slug.endsWith(local) || slug.length === local.length) return null;
  return { prefix: slug.slice(0, slug.length - local.length), dest: path.slice(0, path.length - local.length) };
}

/** 動的ルール列（接頭辞の長い順）で slug を解決する。最初に接頭辞が一致したルールが勝つ。 */
export function resolveByRules(rules, slug) {
  for (const rule of rules) {
    if (slug.startsWith(rule.prefix)) return `${rule.dest}${slug.slice(rule.prefix.length)}`;
  }
  return null;
}

/**
 * @param {Array<{legacySlug:string,path:string}>} routes
 * @param {{minSavings?:number}} [opts] 1 ルールが静的ルールを何本以上減らせば採用するか
 * @returns {{dynamicRules:Array<{prefix:string,dest:string,from:string,to:string,covers:number}>, staticRoutes:Array, coveredRoutes:Array}}
 */
export function planDocRedirects(routes, { minSavings = 4 } = {}) {
  // 候補（接頭辞, 行き先接頭辞）ごとに、その規則で自分の行き先に届く記事数を数える。
  const byKey = new Map();
  for (const r of routes) {
    const c = candidateRule(r);
    if (!c) continue;
    const key = `${c.prefix}\u0000${c.dest}`;
    byKey.set(key, { ...c, own: (byKey.get(key)?.own ?? 0) + 1 });
  }
  // 同じ接頭辞で行き先が複数あるとき（例: pe-comprehensive-management- が keywords / guide / past-exams に分かれる）は、
  // 記事数が最大の 1 つだけを動的ルールにする。残りは静的ルールに残る（動的ルールは接頭辞ごとに 1 本しか効かない）。
  const best = new Map();
  for (const c of byKey.values()) {
    const cur = best.get(c.prefix);
    if (!cur || c.own > cur.own || (c.own === cur.own && c.dest < cur.dest)) best.set(c.prefix, c);
  }
  const order = (a, b) => b.prefix.length - a.prefix.length || a.prefix.localeCompare(b.prefix);
  const covered = (rules, r) => resolveByRules(rules, r.legacySlug) === r.path;
  const chosen = [...best.values()].filter((c) => c.own >= minSavings).sort(order);
  const coveredRoutes = routes.filter((r) => covered(chosen, r));
  const staticRoutes = routes.filter((r) => !covered(chosen, r));
  const dynamicRules = chosen
    .map((c) => ({
      ...c,
      from: `/docs/${c.prefix}*`,
      to: `${c.dest}:splat`,
      covers: coveredRoutes.filter((r) => resolveByRules(chosen, r.legacySlug) === r.path && r.legacySlug.startsWith(c.prefix) && chosen.find((x) => r.legacySlug.startsWith(x.prefix)) === c).length,
    }))
    .filter((rule) => rule.covers > 0);
  return { dynamicRules, staticRoutes, coveredRoutes };
}

/** この生成が出す動的ルールの形（`/docs/<接頭辞>* /exam|practice|standards/...:splat 301`）か。再生成のとき入力から除く。 */
export function isGeneratedDocRule(line) {
  return /^\/docs\/[a-z0-9-]+\*\s+\/(?:exam|practice|standards)\/\S*:splat\s+301$/.test(String(line).trim());
}
