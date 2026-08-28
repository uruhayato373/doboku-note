/**
 * ig-ambiguity.mjs — 「複数パックが同一のライブ投稿を主張している」衝突を検出する。
 *
 * 背景（2026-08-27 の事故未遂）: verify-ig-status の matched は**パック→ライブの片方向**しか
 *   見ない。そのため 1 本のライブ投稿に複数パックがマッチしても、各パックは matched=1 のまま
 *   published_UNrecorded に入る。これを「ライブ投稿と一意対応」と読んで posted.json へ
 *   backfill しようとして事故りかけた:
 *     - civil の 10 パックがわずか 3 本の投稿を共有していた（`Dbe0u3tDDnw` だけで 5 パック）
 *     - うち 4 件は status.json の scheduled_at が未来日（8/28〜9/2）＝そもそも未投稿
 *     - 年度違いの別内容（令和7-4 / 令和3-平成30 / 平成29-26）なのにテーマ名が同一で誤ヒット
 *   未投稿のパックに「投稿済み」の記録が付くと、後で「投稿済みだから作らない」という
 *   判断ミスを誘発する。matched=1 は一意対応の証明にならない。
 *
 * 切り出した理由: verify-ig-status.mjs はトップレベルで playwright を import し main を走らせる
 *   ので、テストから reconcile を直接呼べない（check-outbound-links → lib/note-refs.mjs と同型）。
 */

/** anomaly に載せる衝突の理由文を作る。 */
function collisionReason(shortcode, claimCount) {
  return `同一のライブ投稿 ${shortcode} を ${claimCount} パックが主張（逆方向の衝突・要人手判断）`;
}

/**
 * cats を破壊的に更新し、逆方向の衝突を検出したパックへ `ambiguous` を立てて anomaly へ載せる。
 *
 * published_UNrecorded / draft_misrecorded からは**取り除かない**（既存の anomaly が
 * 「カテゴリではなく併記フラグ」として設計されているため。matchedCarousel>=2 のパックも
 * 両方に入る）。読む側は `ambiguous !== true` を backfill 可否の条件にする。
 *
 * @param {{published_UNrecorded:any[], draft_misrecorded:any[], anomaly:any[]}} cats
 * @returns {{collisions:number, affected:number}} 衝突した shortcode 数・影響パック数
 */
export function markAmbiguousClaims(cats) {
  const targets = [...(cats.published_UNrecorded || []), ...(cats.draft_misrecorded || [])];

  // shortcode -> 主張しているパック（rel）
  const claimants = new Map();
  for (const p of targets) {
    // matched 内の重複は 1 パックの主張であって衝突ではない（Set で潰してから数える）
    for (const sc of new Set(p.matched || [])) {
      if (!claimants.has(sc)) claimants.set(sc, []);
      claimants.get(sc).push(p.rel);
    }
  }

  // 衝突した shortcode ごとに、関与するパックへ理由を割り当てる
  const reasonsByRel = new Map(); // rel -> {withRels:Set, reasons:string[]}
  let collisions = 0;
  for (const [sc, rels] of claimants) {
    if (rels.length < 2) continue;
    collisions += 1;
    for (const rel of rels) {
      if (!reasonsByRel.has(rel)) reasonsByRel.set(rel, { withRels: new Set(), reasons: [] });
      const e = reasonsByRel.get(rel);
      for (const other of rels) if (other !== rel) e.withRels.add(other);
      e.reasons.push(collisionReason(sc, rels.length));
    }
  }
  if (!collisions) return { collisions: 0, affected: 0 };

  const alreadyAnomalous = new Set((cats.anomaly || []).map((p) => p.rel));
  for (const p of targets) {
    const e = reasonsByRel.get(p.rel);
    if (!e) continue;
    p.ambiguous = true;
    p.ambiguousWith = [...e.withRels].sort();
    // 既に anomaly（同一テーマが複数カルーセルに一致）で載っているパックは二重に積まない
    if (alreadyAnomalous.has(p.rel)) continue;
    cats.anomaly.push({ ...p, reason: e.reasons.join(' / ') });
    alreadyAnomalous.add(p.rel);
  }
  return { collisions, affected: reasonsByRel.size };
}

/**
 * 誤ヒットの解消: matched の shortcode が**すべて他パックの posted.json に割り当て済み**なら、
 * そのパックは「投稿済みなのに未記録」ではなく「テーマ名が同じせいで誤ヒットしただけの未投稿」。
 *
 * 背景（2026-08-28・DN-0149）: 衝突した shortcode を人間が判定して正のパックへ backfill しても、
 * 残りの候補パックは matched を持ったまま published_UNrecorded に残り、verify-ig-status を回すたび
 * 同じ顔ぶれが再浮上していた。カード側は「wontfix マーカーの実装」を検討事項に挙げていたが、
 * **判定の証拠は posted.json という形で既にリポジトリにある**ので、手で維持する除外リストは要らない。
 * この関数は「自分の matched が全部よそのものになった」ことを根拠に unpublished へ移す。
 * 後からそのパック自身が投稿されれば新しい shortcode で matched に入り、正しく再浮上する。
 *
 * @param {{published_UNrecorded:any[], anomaly:any[], unpublished:any[]}} cats
 * @param {Map<string,string>|Record<string,string>} claimedBy shortcode → その shortcode を
 *        posted.json に記録しているパックの rel
 * @returns {{resolved:number}} 誤ヒットとして published_UNrecorded から外した件数
 */
export function dropResolvedFalseMatches(cats, claimedBy) {
  const owner = claimedBy instanceof Map ? claimedBy : new Map(Object.entries(claimedBy || {}));
  const pub = cats.published_UNrecorded || [];
  const keep = [];
  const dropped = new Set();

  for (const p of pub) {
    const scs = [...new Set(p.matched || [])];
    // 自分自身が owner の shortcode は「割当済み」に数えない（自分の記録なら未記録ではない）
    const takenByOthers = scs.filter((sc) => owner.has(sc) && owner.get(sc) !== p.rel);
    if (scs.length > 0 && takenByOthers.length === scs.length) {
      dropped.add(p.rel);
      (cats.unpublished ||= []).push({
        ...p,
        falseMatchResolved: true,
        note: `誤ヒット確定（matched ${scs.join(',')} は全て他パックへ記録済み）＝未投稿`,
      });
      continue;
    }
    keep.push(p);
  }

  cats.published_UNrecorded = keep;
  // anomaly 側にも同じパックが載っているので取り除く（再浮上の見た目を残さない）
  if (dropped.size && Array.isArray(cats.anomaly)) {
    cats.anomaly = cats.anomaly.filter((p) => !dropped.has(p.rel));
  }
  return { resolved: dropped.size };
}
