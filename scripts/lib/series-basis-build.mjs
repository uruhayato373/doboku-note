// 書籍の網羅の判定（Drive の coverage/candidates.json・verdict.json）から、書籍の全項目の割り当て
// （config/content-series-basis.json の books[id]）を作る。シリーズの章へ結ぶのは人の判断なので、ここでは作らない。
//
// 割り当ての決め方（1 項目ずつ）:
//   - 判定で out-of-scope        → { excluded: 理由 }。目次・索引・重複・過去問など記事にしないものは理由だけ、
//                                    「当時のサイトの範囲の外」としたものは revisit: true（シリーズを作るときに判定し直す）
//   - 判定で covered / partial    → where の記事（無ければ展開計画で追記した記事、それも無ければ近い記事）
//   - 判定で gap                  → 展開計画でこの項目を追記した記事
//   - 判定なし（機械が covered）   → 候補表のいちばん近い記事
// 記事は content/site の実在する本文に限る（resolveArticle が null を返したら割り当てられない＝呼び手が止める）。

/** 記事にしないと決まっている項目（本の構造・重複・試験の設問と答案）。これに当たらない out-of-scope は判定し直す候補 */
const NOT_CONTENT = /目次|索引|前付け|奥付|まえがき|あとがき|はじめに|参考文献|章扉|章の導入|導入文|本の中で重複|重複|過去問|設問|答案|模範|小論文の模範|キャプション|コラム|用語定義の導入|年度ごとの日程|本書独自/;

export function isNotContentReason(reason) {
  return NOT_CONTENT.test(String(reason ?? ''));
}

/** where（'civil-practice/x#節' や 'pe-comprehensive-management/y'）から記事の識別子（'<区分>/<名前>'）を取り出す */
export function articleKey(where) {
  const m = /^([a-z0-9-]+\/[a-z0-9-]+)/.exec(String(where ?? '').trim());
  return m ? m[1] : null;
}

/**
 * @param {{ units: { id: string, page?: string, bestArticles?: { article: string }[] }[] }} candidates
 * @param {{ units: { id: string, verdict: string, where?: string|null, reason?: string|null }[], plan?: { article: string, additions?: { unitIds?: string[] }[] }[] }} verdict
 * @param {(key: string) => string|null} resolveArticle '<区分>/<名前>' → 'content/site/…' の実在パス（無ければ null）
 * @returns {{ units: Record<string, unknown>, pages: Record<string, string[]>, unresolved: string[], counts: Record<string, number> }}
 */
export function buildBookBasis(candidates, verdict, resolveArticle) {
  const judged = new Map((verdict?.units ?? []).map((u) => [u.id, u]));
  const plannedIn = new Map();
  for (const p of verdict?.plan ?? []) for (const a of p.additions ?? []) for (const id of a.unitIds ?? []) if (!plannedIn.has(id)) plannedIn.set(id, articleKey(p.article));
  const units = {}, pages = {}, unresolved = [];
  const counts = { article: 0, excluded: 0, revisit: 0 };
  for (const u of candidates.units) {
    if (u.page) pages[u.id] = [u.page];
    const v = judged.get(u.id);
    if (v?.verdict === 'out-of-scope') {
      const reason = (v.reason ?? '').trim() || '範囲外（理由の記載なし）';
      units[u.id] = isNotContentReason(reason) ? { excluded: reason } : { excluded: reason, revisit: true };
      counts.excluded += 1;
      if (!isNotContentReason(reason)) counts.revisit += 1;
      continue;
    }
    const keys = v?.verdict === 'gap'
      ? [plannedIn.get(u.id)]
      : [articleKey(v?.where), plannedIn.get(u.id), articleKey(u.bestArticles?.[0]?.article)];
    const path = keys.filter(Boolean).map(resolveArticle).find(Boolean) ?? null;
    if (!path) { unresolved.push(u.id); continue; }
    units[u.id] = { article: path };
    counts.article += 1;
  }
  return { units, pages, unresolved, counts };
}
