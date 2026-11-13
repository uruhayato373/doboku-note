/**
 * youtube-daily-release.mjs — 在庫の通常動画とショートを毎日の割当の範囲で予約へ進める順番を決める（2026-11-12・運営者の決定）。
 * 判定だけを持ち、書き込みは scripts/youtube-daily-release.mjs が既存の CLI（video-factory・registry・shorts-factory）で行う。
 *
 * 決まり:
 * - 通常動画は 1 日 slot.maxPerDay 本まで上げる。ショートの在庫がある作品を先に出し、残りは年間計画の目標日の順
 * - ショートは親の通常動画が予約・公開に進んだものから。公開は親の公開から notBeforeHours 後以降のショートの枠
 *   （関連動画は親が公開されてから Studio で設定するので、毎晩の実行で設定してから予約できる間を空ける）
 * - 投稿（アップロード）は太平洋時間の 1 日の割当（maxUploadsPerDay）の範囲。通常動画を先に取り、残りをショートに回す
 */
import { parsePubId } from './content-registry.mjs';
import { liveParents } from './shorts-release.mjs';

const VIDEO_ID = /^[\w-]{11}$/;

/** ショートの公開 ID から shorts-factory restore の --pack・--key を出す。ショートでなければ投げる */
export function shortRestoreArgs(pubId) {
  const p = parsePubId(pubId);
  if (!p || p.channel !== 'youtube' || p.format !== 'short' || !p.variant) throw new Error(`${pubId}: YouTube のショートの公開 ID ではない`);
  return { pack: `${p.exam}/${p.work}`, key: p.variant };
}

/** ショートの公開を親の公開から何時間空けるか。毎晩の実行（親の 20:30 の公開の後）で関連動画を設定できる間 */
export const SHORT_AFTER_PARENT_HOURS = 10;

/**
 * 今日の作業の一覧を作る。
 * @param {{ publications: object[], stocked: { pack: string, key: string }[], plan: object, uploadsLeft: number, longformPerDay: number, now?: number }} input
 */
export function releaseQueue({ publications, stocked, plan, uploadsLeft, longformPerDay, now = Date.now(), today = null, hold = [] }) {
  // 保留（config.video-auto-publish の hold）の作品は、通常動画もショートも付け直しも出さない
  const held = new Set(hold.map((h) => h.pack));
  const frontLoadActive = Boolean(plan.cycle?.frontLoad && today && today <= plan.cycle.frontLoad.to);
  const yt = publications.filter((p) => p.channel === 'youtube');
  const byId = new Map(yt.map((p) => [p.id, p]));
  const targetOf = new Map(plan.entries.filter((e) => e.publicationId && e.action !== 'reuse').map((e) => [e.publicationId, e.target]));
  const shortRow = (pack, key) => byId.get(`${pack}/youtube.short.${key}`);
  // 投稿まで進んだ行。準備・承認の途中（qa_passed・approved・rendered で未投稿）は続きから進める
  const released = (row) => Boolean(row && (row.platform?.id || !['draft', 'qa_passed', 'approved', 'rendered'].includes(row.status)));

  // 予約を待つ在庫のショートを、親の作品ごとに数える
  const waitingShorts = new Map();
  for (const s of stocked) if (!released(shortRow(s.pack, s.key))) waitingShorts.set(s.pack, (waitingShorts.get(s.pack) ?? 0) + 1);

  // 日時だけ付いて承認の前で止まった行（wire の後に関門で落ちた）も続きから進める
  const longformStock = yt.filter((p) => p.format === 'longform' && !p.revisionOf && !held.has(`${p.exam}/${p.work}`) && p.status === 'qa_passed' && p.media?.video && !(Date.parse(p.publishAt) <= now))
    .map((p) => ({ pack: `${p.exam}/${p.work}`, pub: p.id, shorts: waitingShorts.get(`${p.exam}/${p.work}`) ?? 0, target: targetOf.get(p.id) ?? '9999-12-31' }))
    .sort((a, b) => (b.shorts > 0) - (a.shorts > 0) || a.target.localeCompare(b.target) || a.pack.localeCompare(b.pack));

  // 親が予約・公開に進んだ在庫のショート（台帳の行がまだ下書きのもの）
  const shortCandidates = [];
  for (const s of stocked) {
    const row = shortRow(s.pack, s.key);
    if (released(row) || held.has(s.pack)) continue;
    const [exam, work] = s.pack.split('/');
    const parents = liveParents(yt, exam, work);
    if (parents.length !== 1) continue;
    const parentAt = parents[0].publishAt ?? parents[0].platform?.publishedAt;
    shortCandidates.push({ pack: s.pack, key: s.key, pub: `${s.pack}/youtube.short.${s.key}`, status: row?.status ?? null, publishAt: row?.publishAt ?? null, parent: parents[0].id, notBefore: new Date(Date.parse(parentAt) + SHORT_AFTER_PARENT_HOURS * 3_600_000).toISOString() });
  }
  shortCandidates.sort((a, b) => a.notBefore.localeCompare(b.notBefore) || a.pub.localeCompare(b.pub));
  // 準備（公開日時と方針の承認）まで済んだショートは日時が決まっているので、通常動画より先に割当を取る（後回しにすると日時を過ぎる）
  const prepared = shortCandidates.filter((s) => ['approved', 'rendered'].includes(s.status));
  const longforms = longformStock.slice(0, Math.max(0, Math.min(longformPerDay, uploadsLeft - prepared.length)));
  const rest = Math.max(0, uploadsLeft - longforms.length - prepared.length);
  const shorts = [...prepared, ...shortCandidates.filter((s) => !prepared.includes(s)).slice(0, rest)].slice(0, Math.max(0, uploadsLeft - longforms.length));

  // 投稿済みのショートで、親が公開されていて関連動画が未記録のもの（ブラウザで Studio に設定する）
  const parentPublic = (p) => {
    const parent = byId.get(p.relatedTo);
    const at = Date.parse(parent?.platform?.publishedAt ?? parent?.publishAt ?? '');
    return VIDEO_ID.test(parent?.platform?.id ?? '') && (parent.status === 'published' || at <= now);
  };
  const uploaded = yt.filter((p) => p.format === 'short' && p.status === 'uploaded_private' && VIDEO_ID.test(p.platform?.id ?? ''));
  const needRelated = uploaded.filter((p) => !p.platform.relatedVideoId && parentPublic(p))
    .map((p) => ({ pub: p.id, videoId: p.platform.id, parentPub: p.relatedTo, parentVideoId: byId.get(p.relatedTo).platform.id, parentTitle: byId.get(p.relatedTo).title ?? null, publishAt: p.publishAt }));
  const toSchedule = uploaded.filter((p) => p.platform.relatedVideoId && Date.parse(p.publishAt) > now + 10 * 60_000).map((p) => p.id);
  // 関連動画を設定できないまま公開日時を過ぎたショート（日時を付け直す）
  const expired = uploaded.filter((p) => Date.parse(p.publishAt) <= now + 10 * 60_000).map((p) => p.id);

  // 前倒しより前に承認して、まだ投稿していない通常動画。承認を外して空き枠から日時を付け直す（承認は予約の前に関門でもう一度書く）
  const toReplace = frontLoadActive ? yt.filter((p) => p.format === 'longform' && !p.revisionOf && p.status === 'approved' && !p.delivery && !p.platform?.id && !held.has(`${p.exam}/${p.work}`)).map((p) => `${p.exam}/${p.work}`) : [];

  return { uploadsLeft, held: [...held], toReplace, longforms, shorts, needRelated, toSchedule, expired, remaining: { longforms: longformStock.length, shorts: shortCandidates.length } };
}
