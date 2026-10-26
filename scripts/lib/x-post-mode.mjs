/**
 * x-post-mode.mjs — publish-x の「予約か即時投稿か」を引数から決める（publish-x.ts が使う）。
 *
 * 10 月 27 日、日時を渡さずに 11 月分 22 本を走らせ、予約のつもりが 6 分で 22 本の即時投稿になった
 * （日時が無いと即時投稿に落ちる作りだった）。即時投稿は --immediate を明示したときだけにし、
 * 即時投稿は 1 回 1 本に限る（連投は凍結対策 §11 の禁止事項）。
 */
export function resolvePostMode({ immediate, dates, count }) {
  if (immediate) {
    if (count > 1) {
      throw new Error(`--immediate は 1 回 1 本まで（対象 ${count} 本）。連投は凍結の原因になるので --tweet N で 1 本ずつ`);
    }
    return { mode: 'immediate', dates: [] };
  }
  if (dates.length === 0) {
    throw new Error('予約の日時（YYYY-MM-DDTHH:MM）が無い。予約なら本数ぶんの日時を渡し、即時投稿なら --immediate --tweet N を付ける');
  }
  if (dates.length !== count) {
    throw new Error(`日時の数 (${dates.length}) とツイート数 (${count}) が一致しません`);
  }
  return { mode: 'schedule', dates };
}
