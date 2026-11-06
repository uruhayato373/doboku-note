/**
 * X・Instagram の年間の枠と実体の照合。計画にない投稿・枠の超過・販売の超過・週の上限超えを見つける。
 * 判定は純粋関数に集め、check-channel-plan・x-schedule-guard・Instagram の予約の関門が同じ結果を使う。
 */
import { jstDayOf } from './jst-date.mjs';
import { cycleCapacity, mondayOf, weekLimit } from './youtube-longform-audit.mjs';

const SALES_FUNNELS = new Set(['note', 'coconala']);
const inWindow = (month, w) => month >= w.from && month <= w.to;

/** 枠そのものの検査。YouTube の枠と同じ観点で見る */
function auditSlots(channel, { cycle, youtubeSlots, calendar, exists, hasTarget }, errors, pending) {
  const formatOf = new Map(channel.formats.map((f) => [f.id, f]));
  const parents = new Map(youtubeSlots.map((s) => [s.id, s]));
  for (const s of channel.slots) {
    const formats = s.formats.map((id) => formatOf.get(id));
    s.formats.forEach((id, i) => {
      const format = formats[i];
      if (!format) errors.push(`枠 ${s.id}: 型が無い ${id}`);
      else if (format.status === 'rejected') errors.push(`枠 ${s.id}: やらないと決めた型 ${id}`);
      else if (format.status === 'proposed' || format.status === 'paused') pending.push(`枠 ${s.id}: 型 ${id} は ${format.status}。運営者の採否待ち（${format.decision ?? '判断カード未起票'}）`);
    });
    if (formats.every(Boolean) && !formats.some((f) => f.ctaKinds.includes(s.primaryCta.kind))) errors.push(`枠 ${s.id}: どの型も取らない主 CTA ${s.primaryCta.kind}`);
    if (s.role === 'sell' && !formats.some((f) => f?.role === 'sell')) errors.push(`枠 ${s.id}: 販売の枠に販売の型が無い`);
    if (s.window.from < cycle.window.from || s.window.to > cycle.window.to) errors.push(`枠 ${s.id}: 期の外の月`);
    const exam = calendar.exams[s.exam];
    if (!exam) errors.push(`枠 ${s.id}: 試験日程が無い ${s.exam}`);
    for (const a of s.anchors) if (exam && !exam.events?.[a] && !exam.periods?.[a]) errors.push(`枠 ${s.id}: 試験日程に無い行事 ${a}`);
    for (const t of s.primaryCta.targets) if (!hasTarget(s.primaryCta.kind, t)) errors.push(`枠 ${s.id}: 主 CTA の宛先が無い ${t}`);
    for (const ref of s.reason.evidence) if (!exists(ref.replace(/:\d+$/, ''))) errors.push(`枠 ${s.id}: 根拠の文書が無い ${ref}`);
    for (const id of s.parents) {
      const parent = parents.get(id);
      if (!parent) errors.push(`枠 ${s.id}: YouTube の枠が無い ${id}`);
      else if (parent.exam !== s.exam) errors.push(`枠 ${s.id}: YouTube の枠と資格が違う ${id}`);
    }
  }
  for (const f of channel.formats) for (const ref of f.evidence) if (!exists(ref.replace(/:\d+$/, ''))) errors.push(`型 ${f.id}: 根拠の文書が無い ${ref}`);
}

/** 枠の合計が期の週の上限の合計に収まるか */
function auditCapacity(channel, cycle, errors) {
  const pacing = { ...channel, window: cycle.window };
  const capacity = cycleCapacity(pacing);
  const planned = channel.slots.reduce((sum, s) => sum + s.count, 0);
  if (planned > capacity) errors.push(`枠の合計 ${planned} 本が週の上限の合計 ${capacity} 本を超える`);
  return { planned, capacity };
}

function countPosts(channel, posts, errors, examMatches) {
  const slotById = new Map(channel.slots.map((s) => [s.id, s]));
  const fill = new Map(channel.slots.map((s) => [s.id, 0]));
  const sales = new Map(channel.slots.map((s) => [s.id, 0]));
  const weeks = new Map();
  let checked = 0;
  for (const post of posts) {
    const slot = slotById.get(post.slot);
    if (!post.slot) { errors.push(`枠に入っていない: ${post.label}`); continue; }
    if (!slot) { errors.push(`枠が無い: ${post.label}（${post.slot}）`); continue; }
    checked += 1;
    if (!examMatches(post.exam, slot.exam)) errors.push(`枠と資格が違う: ${post.label}（${slot.id}）`);
    if (!inWindow(post.day.slice(0, 7), slot.window)) errors.push(`枠の時期の外: ${post.label} ${post.day}（${slot.id} ${slot.window.from}〜${slot.window.to}）`);
    const allowed = slot.formats.map((id) => channel.formats.find((f) => f.id === id)).filter(Boolean);
    if (!allowed.some(post.fits)) errors.push(`枠の型に無い: ${post.label}（${post.type}）`);
    fill.set(slot.id, fill.get(slot.id) + 1);
    if (post.sale) sales.set(slot.id, sales.get(slot.id) + 1);
    const monday = mondayOf(post.day);
    weeks.set(monday, (weeks.get(monday) ?? 0) + 1);
  }
  for (const s of channel.slots) {
    if (fill.get(s.id) > s.count) errors.push(`枠の超過: ${s.id} ${fill.get(s.id)} 本 / 上限 ${s.count} 本`);
    if (sales.get(s.id) > s.salesMax) errors.push(`販売の超過: ${s.id} ${sales.get(s.id)} 本 / 上限 ${s.salesMax} 本`);
  }
  for (const [monday, n] of [...weeks].sort()) {
    const limit = weekLimit(channel, monday);
    if (n > limit) errors.push(`週の上限の超過: ${monday} の週 ${n} 本 / 上限 ${limit} 本`);
  }
  return { checked, fill: Object.fromEntries(fill), sales: Object.fromEntries(sales) };
}

/** 月次キャンペーン計画の投稿を、照合の共通の形にする。枠の検査を始める前の投稿は除く */
export function xPostsOf(channel, campaigns) {
  return campaigns.flatMap((c) => (c.posts ?? [])
    .filter((p) => p.date >= channel.enforceFrom)
    .map((p) => ({
      label: `${c.file ?? c.month} ${p.date} ${p.time ?? ''}`.trim(), day: p.date, slot: p.slot, exam: p.exam, type: p.type,
      sale: SALES_FUNNELS.has(p.funnel), fits: (f) => f.types?.includes(p.type) ?? false,
    })));
}

/** 投稿の予定に結んだ公開行を、照合の共通の形にする。固定投稿は枠の外 */
export function igPostsOf(channel, publications) {
  return publications
    .filter((p) => !p.legacyKey?.startsWith('profile-pinned/') && p.publishAt && !['stopped', 'failed'].includes(p.status) && jstDayOf(p.publishAt) >= channel.enforceFrom)
    .map((p) => ({ label: p.id, day: jstDayOf(p.publishAt), slot: p.planSlot, exam: p.exam, type: p.format, sale: false, fits: (f) => f.publicationFormat === p.format }));
}

export function auditChannel(channel, posts, context, examMatches) {
  const errors = [], warnings = [], pending = [];
  auditSlots(channel, context, errors, pending);
  const { planned, capacity } = auditCapacity(channel, context.cycle, errors);
  const { checked, fill, sales } = countPosts(channel, posts, errors, examMatches);
  if (channel.operation.status === 'hold') pending.push(`運用は保留（${channel.operation.since} から）: ${channel.operation.note}`);
  if (context.today > context.cycle.reviewAt) warnings.push(`見直し日 ${context.cycle.reviewAt} を過ぎている。枠と目標を見直す`);
  return { slots: channel.slots.length, planned, capacity, targets: posts.length, checked, fill, sales, errors, warnings, pending };
}

/**
 * X の予約のうち、枠の検査の対象なのに枠のある計画の行に結ばれていないものを返す。
 * @param tweets [{ draft, n, scheduled_at, status }]。n は status.json の投稿番号
 */
export function tweetsOutsidePlan(channel, campaigns, tweets) {
  const planned = new Set(campaigns.flatMap((c) => (c.posts ?? []).filter((p) => p.slot).map((p) => `${p.draft}#${p.tweet}`)));
  return tweets
    .filter((t) => ['scheduled', 'queued'].includes(t.status) && t.scheduled_at && jstDayOf(t.scheduled_at) >= channel.enforceFrom)
    .filter((t) => !planned.has(`${t.draft}#${t.n}`))
    .map((t) => `${t.draft}#${t.n}（${t.scheduled_at.slice(0, 16)}）`);
}

/** Instagram の 1 本の予約の関門。枠の検査の対象なら、枠・型・時期を確かめる */
export function igSlotProblems(channel, publication, publishAt) {
  if (publication.legacyKey?.startsWith('profile-pinned/')) return [];
  const day = jstDayOf(publishAt);
  if (day < channel.enforceFrom) return [];
  const slot = channel.slots.find((s) => s.id === publication.planSlot);
  if (!publication.planSlot) return [`枠に入っていない: ${publication.id}（import-instagram --slot で結ぶ）`];
  if (!slot) return [`枠が無い: ${publication.id}（${publication.planSlot}）`];
  const problems = [];
  if (slot.exam !== publication.exam) problems.push(`枠と資格が違う: ${publication.id}（${slot.id}）`);
  if (!inWindow(day.slice(0, 7), slot.window)) problems.push(`枠の時期の外: ${publication.id} ${day}（${slot.id} ${slot.window.from}〜${slot.window.to}）`);
  const allowed = slot.formats.map((id) => channel.formats.find((f) => f.id === id));
  if (!allowed.some((f) => f?.publicationFormat === publication.format)) problems.push(`枠の型に無い: ${publication.id}（${publication.format}）`);
  return problems;
}
