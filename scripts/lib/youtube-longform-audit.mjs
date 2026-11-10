/**
 * 年間の枠と実体の照合。計画にない動画・枠の超過・週の上限超えを見つける。
 * 判定は純粋関数に集め、関門（video-factory）と check-youtube-plan が同じ結果を使う。
 */
import { jstDayOf, todayJst } from './jst-date.mjs';

const DAY_MS = 86_400_000;
const INACTIVE = new Set(['stopped', 'failed', 'qa_blocked']);
const PUBLIC_STATES = new Set(['scheduled', 'approved', 'published']);
const utcMs = (day) => Date.parse(`${day}T00:00:00Z`);
const dayAfter = (day, n) => new Date(utcMs(day) + n * DAY_MS).toISOString().slice(0, 10);

/** その日が属する週の月曜（JST の暦日で計算する） */
export function mondayOf(day) {
  const weekday = (new Date(utcMs(day)).getUTCDay() + 6) % 7;
  return dayAfter(day, -weekday);
}

const inWindow = (month, w) => month >= w.from && month <= w.to;

/** 月曜で表す週の公開上限。山場は月曜の月で判定する */
export function weekLimit(cycle, monday) {
  return cycle.peaks.some((p) => inWindow(monday.slice(0, 7), p.window)) ? cycle.peakWeeklyMax : cycle.weeklyMax;
}

/** 期の中の週ごとの上限の合計。枠の本数が物理的に収まるかを見る */
export function cycleCapacity(cycle) {
  let total = 0;
  for (let m = mondayOf(cycle.enforceFrom); m.slice(0, 7) <= cycle.window.to; m = dayAfter(m, 7)) total += weekLimit(cycle, m);
  return total;
}

function actualDay(p) {
  if (!p) return null;
  if (p.status === 'published') return p.platform?.publishedAt || p.publishAt ? jstDayOf(p.platform?.publishedAt ?? p.publishAt) : null;
  return PUBLIC_STATES.has(p.status) && p.publishAt ? jstDayOf(p.publishAt) : null;
}

/** 通常動画 1 本の棚卸しの状態。実体が消えた停止行を公開に数えない（DN-1003） */
export function inventoryState(p) {
  if (p.status === 'published') return 'published';
  // 承認だけでは予約していない。YouTube に予約が入った行だけを予約済みに数える（DN-1066）
  if (p.status === 'scheduled') return 'scheduled';
  if (INACTIVE.has(p.status)) return 'stopped';
  return p.media?.video ? 'stock' : 'unbuilt';
}

/** 資格×型（動画パックの intent）×状態の表。枠に入った未制作の企画は「企画のみ」で数える */
export function summarizeInventory(publications, entries = []) {
  const table = new Map();
  const add = (exam, type, state) => {
    const key = `${exam}\t${type}`;
    const row = table.get(key) ?? { exam, type, published: 0, scheduled: 0, stock: 0, unbuilt: 0, stopped: 0 };
    row[state] += 1;
    table.set(key, row);
  };
  for (const p of publications) add(p.exam, p.intent ?? '未分類', inventoryState(p));
  for (const e of entries) if (!e.publicationId && e.action === 'new') add(e.exam, '企画のみ', 'unbuilt');
  return [...table.values()].sort((a, b) => a.exam.localeCompare(b.exam) || a.type.localeCompare(b.type));
}

/** 計画の入力から 1 本の公開が枠に入っているかを返す。関門とチェッカーの共通の判定 */
export function slotProblems(plan, pub, day = null) {
  const entry = plan.entries.find((e) => e.publicationId === (pub.revisionOf ?? pub.id) && e.action !== 'reuse');
  if (!entry) return { entry: null, slot: null, problems: [`計画にない動画: ${pub.id}`] };
  if (pub.revisionOf) return { entry, slot: null, problems: [] };
  const when = day ?? entry.target;
  const slot = plan.slots.find((s) => s.id === entry.slot);
  if (!slot && when < plan.cycle.enforceFrom) return { entry, slot: null, problems: [] };
  if (!slot) return { entry, slot: null, problems: [`枠に入っていない: ${entry.id}`] };
  const problems = inWindow(when.slice(0, 7), slot.window) ? [] : [`枠の時期の外: ${entry.id} ${when}（${slot.id} ${slot.window.from}〜${slot.window.to}）`];
  return { entry, slot, problems };
}

/**
 * ショートを親の通常動画の枠へ割り当てる。親の枠が無い台本と、枠の上限を超える台本を見つける。
 * @param designs [{ pack, key, stocked }]。stocked は枠の導入より前に在庫へ入ったもので、警告に留める
 */
export function shortsSlotFill(plan, designs) {
  const fill = new Map(plan.slots.filter((s) => s.shorts).map((s) => [s.id, 0]));
  const errors = [], warnings = [];
  for (const { pack, key, stocked } of designs) {
    const entry = plan.entries.find((e) => e.publicationId === `${pack}/youtube.longform` && e.action !== 'reuse');
    const slot = plan.slots.find((s) => s.id === entry?.slot);
    if (!slot?.shorts) {
      (stocked ? warnings : errors).push(`親の枠にショートの割り当てが無い: ${pack}/${key}`);
      continue;
    }
    fill.set(slot.id, fill.get(slot.id) + 1);
  }
  for (const [id, n] of fill) {
    const { count } = plan.slots.find((s) => s.id === id).shorts;
    if (n > count) errors.push(`ショートの枠の超過: ${id} ${n} 本 / 上限 ${count} 本`);
  }
  return { fill: Object.fromEntries(fill), errors, warnings };
}

/**
 * 全件の照合。
 * @param input plan・publications（改訂を除く）・revisions・formats・calendar・exists・hasTarget・shortDesigns
 *   hasTarget(kind, id) は CTA の宛先が実在するか、exists(path) はファイルの実在
 */
export function auditLongformPlan({ plan, publications, revisions = [], formats, calendar, exists, hasTarget, shortDesigns = [] }, today = todayJst()) {
  const shorts = shortsSlotFill(plan, shortDesigns);
  const errors = [...shorts.errors], warnings = [...shorts.warnings], pending = [];
  const { cycle } = plan;
  const cycleStart = cycle.enforceFrom;
  const byId = new Map(publications.map((p) => [p.id, p]));
  const revisionOf = new Map();
  for (const r of revisions) if (PUBLIC_STATES.has(r.status)) revisionOf.set(r.revisionOf, r);
  const formatOf = new Map(formats.map((f) => [f.id, f]));
  const slotById = new Map(plan.slots.map((s) => [s.id, s]));

  // 枠そのものの検査
  for (const s of plan.slots) {
    const format = formatOf.get(s.format);
    if (!format) errors.push(`枠 ${s.id}: 型が無い ${s.format}`);
    else if (format.status === 'rejected') errors.push(`枠 ${s.id}: やらないと決めた型 ${s.format}`);
    else if (format.status === 'proposed' || format.status === 'paused') pending.push(`枠 ${s.id}: 型 ${s.format} は ${format.status}。運営者の採否待ち（${format.decision ?? '判断カード未起票'}）`);
    if (format?.ctaKinds.length && !format.ctaKinds.includes(s.primaryCta.kind)) errors.push(`枠 ${s.id}: 型 ${s.format} が取らない主 CTA ${s.primaryCta.kind}`);
    if (s.window.from < cycle.window.from || s.window.to > cycle.window.to) errors.push(`枠 ${s.id}: 期の外の月`);
    const exam = calendar.exams[s.exam];
    if (!exam) errors.push(`枠 ${s.id}: 試験日程が無い ${s.exam}`);
    for (const a of s.anchors) if (exam && !exam.events?.[a] && !exam.periods?.[a]) errors.push(`枠 ${s.id}: 試験日程に無い行事 ${a}`);
    for (const t of s.primaryCta.targets) if (!hasTarget(s.primaryCta.kind, t)) errors.push(`枠 ${s.id}: 主 CTA の宛先が無い ${t}`);
    for (const ref of s.reason.evidence) if (!exists(ref.replace(/:\d+$/, ''))) errors.push(`枠 ${s.id}: 根拠の文書が無い ${ref}`);
  }
  const planned = plan.slots.reduce((sum, s) => sum + s.count, 0);
  const capacity = cycleCapacity(cycle);
  if (planned > capacity) errors.push(`枠の合計 ${planned} 本が週の上限の合計 ${capacity} 本を超える`);

  // 計画の行と枠の照合
  const fill = new Map(plan.slots.map((s) => [s.id, 0]));
  const weeks = new Map();
  const countWeek = (day, label) => {
    if (day < cycle.enforceFrom) return;
    const monday = mondayOf(day);
    const list = weeks.get(monday) ?? [];
    list.push(label);
    weeks.set(monday, list);
  };
  const covered = new Set();
  let checked = 0, targets = 0;
  for (const e of plan.entries) {
    const p = e.publicationId ? byId.get(e.publicationId) : null;
    if (e.action === 'reuse') {
      if (e.publicationId && p?.status !== 'published') errors.push(`再案内の元が未公開: ${e.id}`);
      continue;
    }
    if (p) covered.add(p.id);
    if (p && INACTIVE.has(p.status)) continue;
    const revision = revisionOf.get(e.publicationId);
    const actual = actualDay(revision) ?? actualDay(p);
    const day = actual ?? e.target;
    if (!e.slot && day < cycleStart) continue; // 上限を数え始める前の公開・予約
    targets += 1;
    const slot = slotById.get(e.slot);
    if (!slot) { errors.push(`枠に入っていない: ${e.id}`); continue; }
    checked += 1;
    if (slot.exam !== e.exam) errors.push(`枠と資格が違う: ${e.id}（${slot.id}）`);
    if (!inWindow(day.slice(0, 7), slot.window)) errors.push(`枠の時期の外: ${e.id} ${day}（${slot.id} ${slot.window.from}〜${slot.window.to}）`);
    if (!actual && p?.status !== 'published' && e.ready < today) warnings.push(`確認期限の超過: ${e.id} ${e.ready}`);
    fill.set(slot.id, fill.get(slot.id) + 1);
    countWeek(day, e.id);
    if (p?.primaryCta && (p.primaryCta.kind !== slot.primaryCta.kind || (slot.primaryCta.targets.length && !slot.primaryCta.targets.includes(p.primaryCta.targetId)))) {
      warnings.push(`主 CTA を枠に合わせる: ${e.id}（${p.primaryCta.kind}${p.primaryCta.targetId ? `/${p.primaryCta.targetId}` : ''}）`);
    }
  }

  // 台帳にあって計画に無い動画
  for (const p of publications) {
    if (covered.has(p.id) || INACTIVE.has(p.status)) continue;
    const day = actualDay(p);
    if (p.status === 'published' && day && day < cycleStart) continue;
    targets += 1;
    errors.push(`計画にない動画: ${p.id}（${p.status}${day ? ` ${day}` : ''}）`);
  }
  // 改訂版は同じ動画の差し替え。枠は数えないが、元の行は計画に要り、週の上限には数える
  for (const r of revisions) {
    const day = actualDay(r);
    if (!day) continue;
    if (!plan.entries.some((e) => e.publicationId === r.revisionOf && e.action !== 'reuse')) errors.push(`計画にない改訂版: ${r.id}`);
    if (!plan.entries.some((e) => e.publicationId === r.revisionOf && e.slot)) countWeek(day, r.id);
  }

  for (const [id, n] of fill) {
    const slot = slotById.get(id);
    if (n > slot.count) errors.push(`枠の超過: ${id} ${n} 本 / 上限 ${slot.count} 本`);
  }
  for (const [monday, list] of [...weeks].sort()) {
    const limit = weekLimit(cycle, monday);
    if (list.length > limit) errors.push(`週の上限の超過: ${monday} の週 ${list.length} 本 / 上限 ${limit} 本（${list.join(', ')}）`);
  }
  for (const p of [...publications, ...revisions]) {
    const day = p.status === 'scheduled' ? actualDay(p) : null;
    const events = Object.values(calendar.exams[p.exam]?.events ?? {});
    if (day && events.some((v) => v.kind === 'exam' && v.date === day)) errors.push(`試験日の公開: ${p.id} ${day}`);
  }
  if (today > cycle.reviewAt) warnings.push(`見直し日 ${cycle.reviewAt} を過ぎている。枠と目標を見直す`);
  return { targets, checked, slots: plan.slots.length, planned, capacity, fill: Object.fromEntries(fill), shortsFill: shorts.fill, errors, warnings, pending };
}
