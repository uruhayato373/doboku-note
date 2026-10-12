// youtube-unschedule.mjs — YouTube の公開予約を外す判定（純関数）。2026-10-13 に運営者が YouTube の投稿を一旦止めた。
// 実際の API 呼び出しは scripts/youtube-unschedule.mjs。台帳は npm run registry -- unschedule で合わせる。

/** 台帳の公開の行から、外す対象（YouTube・scheduled・未来の publishAt・外部 ID あり）を選ぶ。 */
export function selectScheduled(publications, now = Date.now()) {
  return publications
    .filter((p) => p.channel === 'youtube' && p.status === 'scheduled' && p.publishAt && p.platform?.id)
    .filter((p) => Date.parse(p.publishAt) > now)
    .sort((a, b) => Date.parse(a.publishAt) - Date.parse(b.publishAt));
}

/**
 * videos.update（part=status）に渡す status。part=status は status 全体を置き換えるので、今の値を書き戻せる欄だけ残し、
 * publishAt を外して private のままにする（読み取り専用の uploadStatus・madeForKids などは送らない）。
 */
export function unscheduledStatus(actual) {
  const s = actual ?? {};
  const out = {
    privacyStatus: 'private',
    selfDeclaredMadeForKids: s.selfDeclaredMadeForKids ?? false,
    embeddable: s.embeddable ?? true,
    license: s.license ?? 'youtube',
    publicStatsViewable: s.publicStatsViewable ?? true,
  };
  if (typeof s.containsSyntheticMedia === 'boolean') out.containsSyntheticMedia = s.containsSyntheticMedia;
  return out;
}

/** API で見た今の状態から、やること を決める。 */
export function decide(video, channelId) {
  if (!video) return { action: 'error', reason: 'videos.list で取れない（削除・別チャンネル）' };
  if (video.snippet?.channelId !== channelId) return { action: 'error', reason: `チャンネルが違う（${video.snippet?.channelId}）` };
  const st = video.status ?? {};
  if (st.privacyStatus !== 'private') return { action: 'error', reason: `既に ${st.privacyStatus}（公開済みは外せない）` };
  if (!st.publishAt) return { action: 'already', reason: '予約は既に無い' };
  return { action: 'unschedule', reason: `予約 ${st.publishAt} を外す` };
}

/** 外したあとの実体が「private で予約なし」か。 */
export function isUnscheduled(video) {
  return video?.status?.privacyStatus === 'private' && !video?.status?.publishAt;
}
