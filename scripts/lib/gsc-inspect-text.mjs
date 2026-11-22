// GSC の URL 検査の画面の文字を読む小さな判定（gsc-request-indexing が使う）。

/**
 * 画面の文字に対象の URL がそのまま出ているか。直前の URL の結果を対象の結果と取り違えないための確認。
 * `…/r08-road-ii-2` と `…/r08-road-ii-2-1` のような前方一致を一致にしないよう、続く文字も見る。
 */
export function showsTargetUrl(text, target) {
  let from = 0;
  for (;;) {
    const i = text.indexOf(target, from);
    if (i < 0) return false;
    const next = text[i + target.length];
    if (next === undefined || !/[\w/.-]/.test(next)) return true;
    from = i + 1;
  }
}
