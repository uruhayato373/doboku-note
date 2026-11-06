/**
 * 資格ごとの競合の立ち位置（台帳 config.competitor-positions）を実データと照合する。
 * 件数・金額は台帳に写さず、最新の取得物から読む。市場の検索で強い相手が台帳に無ければ止める。
 * 純粋関数はこのファイル、読み込みは末尾の loadCompetitorPositionsAudit だけが担う。
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { latestFileDate } from './datasets.mjs';
import { readDataset, readDatasetIf, readLatest } from './dataset-io.mjs';

/** 台帳の文章に書かない観測値。数字は取得物から読む */
const OBSERVED_NUMBER = /\d[\d,.]*\s*(万|億|円|人|本|件|回|再生|登録者|販売|日前|日更新)|[¥￥]\s*\d/;

export const SNAPSHOT_DATASETS = {
  youtube: 'youtube.competitors',
  note: 'note.competitors',
  coconala: 'coconala.competitors',
  x: 'x.competitors',
  instagram: 'instagram.competitors',
  courses: 'courses.competitors',
};

const normalized = (title) => String(title ?? '').normalize('NFKC');

/** 分析に必ず入れる相手の条件。資格（または立ち位置）ごとに、チャネルの上位だけを必須にする */
const PROMINENT = { youtubeItems: 3, notePaid: 3, top: 6 };

/** 検索語の結果のうち、その資格の題名に当たるものだけを返す */
export function marketItems(examId, channel, market, scan) {
  const query = scan.queries?.[examId];
  if (!query) return [];
  const exam = query.titleMatch ? new RegExp(query.titleMatch) : null;
  const seen = new Set();
  const rows = [];
  for (const keyword of [...(query.keywords ?? []), ...(query.probeKeywords ?? [])]) {
    for (const item of market?.[channel]?.[keyword]?.items ?? []) {
      const id = item.videoId ?? item.key ?? `${keyword}:${item.title}`;
      if (seen.has(id) || (exam && !exam.test(normalized(item.title)))) continue;
      seen.add(id);
      rows.push({ ...item, keyword });
    }
  }
  return rows;
}

/** 市場の検索で目立つ相手。追跡リストの外も含む */
export function prominentRivals(examIds, market, scan, self) {
  const strong = scan.density?.youtube?.strongViews ?? 10000;
  const groups = new Map();
  const add = (key, base, update) => {
    const row = groups.get(key) ?? { ...base, items: 0, paid: 0, maxViews: 0, maxPrice: 0, sample: null };
    update(row);
    groups.set(key, row);
  };
  for (const exam of examIds) {
    for (const v of marketItems(exam, 'youtube', market, scan)) {
      if (!v.channelId || self.youtube?.includes(v.channelId)) continue;
      add(`youtube:${v.channelId}`, { channel: 'youtube', handle: v.channelId, label: v.channel }, (r) => {
        r.items += 1;
        if ((v.views ?? 0) > r.maxViews) { r.maxViews = v.views ?? 0; r.sample = v.title; }
      });
    }
    for (const n of marketItems(exam, 'note', market, scan)) {
      if (!n.creator || self.note?.includes(n.creator)) continue;
      add(`note:${n.creator}`, { channel: 'note', handle: n.creator, label: n.creator }, (r) => {
        r.items += 1;
        if ((n.price ?? 0) > 0) r.paid += 1;
        if ((n.price ?? 0) > r.maxPrice) { r.maxPrice = n.price; r.sample = n.title; }
      });
    }
  }
  const rows = [...groups.values()];
  const youtube = rows
    .filter((r) => r.channel === 'youtube' && (r.maxViews >= strong || r.items >= PROMINENT.youtubeItems))
    .sort((a, b) => b.maxViews - a.maxViews)
    .slice(0, PROMINENT.top);
  const note = rows
    .filter((r) => r.channel === 'note' && r.paid >= PROMINENT.notePaid)
    .sort((a, b) => b.paid - a.paid || b.maxPrice - a.maxPrice)
    .slice(0, PROMINENT.top);
  return [...youtube, ...note];
}

const ABSENCE_WORDS = /空き|空いて|薄い|いない|無い|見当たらない|確認できない|少ない/;

/** 主張を市場の検索で確かめる。検査 0 件は成立しない主張として返す */
export function runProbe(probe, market, scan, self = {}) {
  const own = self[probe.channel] ?? [];
  const items = marketItems(probe.exam, probe.channel, market, scan).filter((i) => !own.includes(i.channelId ?? i.creator));
  const match = new RegExp(normalized(probe.match));
  const hits = items.filter((i) => match.test(normalized(i.title)) && (!probe.paidOnly || (i.price ?? 0) > 0));
  return { checked: items.length, hits: hits.length, samples: hits.slice(0, 3).map((h) => h.title), ok: items.length > 0 && hits.length <= probe.max };
}

/**
 * 枠の材料を読む形にまとめる。正本は 3 つに分かれている:
 * 動画の割り当ては entries、送り先は primaryCta、それ以外の材料は materials。写しを持たず、ここで束ねる。
 */
export function slotMaterials(slot, plan) {
  const planned = (plan.entries ?? []).filter((e) => e.slot === slot.id);
  return {
    status: slot.materials.status,
    planned: planned.map((e) => ({ id: e.id, title: e.title ?? null, pack: e.publicationId?.split('/').slice(0, 2).join('/') ?? null, action: e.action })),
    candidates: slot.materials.packs,
    targets: slot.primaryCta.targets,
    products: slot.materials.products,
    make: slot.materials.make,
    angles: slot.materials.angles ?? [],
  };
}

/** 枠の理由に空きを断定で書かない。空きは立ち位置の台帳で確かめる */
const GAP_CLAIM = /競合の空白|競合なし|競合がいない/;

const rivalKey = (r) => `${r.channel}:${r.handle}`;

/** その資格の検索に出た件数。チャンネル全体の数字と混ぜないために別に返す */
export function examPresence(rival, examIds, market, scan) {
  if (rival.channel !== 'youtube' && rival.channel !== 'note') return null;
  const key = rival.channel === 'youtube' ? 'channelId' : 'creator';
  const items = new Map();
  for (const exam of examIds) {
    for (const item of marketItems(exam, rival.channel, market, scan)) {
      if (item[key] === rival.handle) items.set(item.videoId ?? item.key, item);
    }
  }
  const rows = [...items.values()];
  if (rival.channel === 'youtube') {
    const top = Math.max(0, ...rows.map((v) => v.views ?? 0));
    return `この資格の検索 ${rows.length} 本${rows.length ? `・最大 ${top.toLocaleString('ja-JP')} 再生` : ''}`;
  }
  return `この資格の検索 ${rows.length} 件（有料 ${rows.filter((n) => (n.price ?? 0) > 0).length}）`;
}

/** 最新の取得物から競合 1 件の数字を読む。無いものは未取得と書き、0 にしない */
export function rivalFacts(rival, snapshots) {
  const snap = snapshots[rival.channel];
  if (!snap) return { date: null, state: 'missing', text: '未取得' };
  const row = snap.data?.competitors?.find((c) => c.handle === rival.handle);
  const date = snap.date;
  if (!row) return { date, state: 'missing', text: '未取得' };
  if (row.error || row.profile === null) return { date, state: 'failed', text: '取得失敗' };
  const n = (v) => (typeof v === 'number' ? v.toLocaleString('ja-JP') : '?');
  const parts = [];
  if (rival.channel === 'youtube') {
    parts.push(`登録者 ${n(row.profile?.subscriberCount)}`, `再生中央値 ${n(row.counts?.medianViews)}`);
    const best = [...(row.platformExtra?.lengthBuckets ?? [])].filter((b) => b.videos >= 3).sort((a, b) => (b.medianViews ?? 0) - (a.medianViews ?? 0))[0];
    if (best) parts.push(`最も伸びる尺 ${best.key}（中央値 ${n(best.medianViews)}）`);
  } else if (rival.channel === 'note') {
    parts.push(`有料マガジン ${n(row.counts?.magazinesPaid)}`, `価格中央値 ¥${n(row.price?.median)}`, `最終投稿 ${n(row.cadence?.latestDaysAgo)} 日前`);
  } else if (rival.channel === 'coconala') {
    parts.push(`販売 ${n(row.platformExtra?.totalSales)}`, `価格中央値 ¥${n(row.price?.median)}`);
  } else if (rival.channel === 'x' || rival.channel === 'instagram') {
    parts.push(`フォロワー ${n(row.profile?.followers ?? row.profile?.followerCount)}`);
  }
  return { date, state: 'measured', text: `全体: ${parts.join('・')}` };
}

function textFields(position) {
  const rows = [];
  const add = (where, text) => rows.push({ where, text });
  add('summary', position.summary);
  for (const r of position.rivals) add(`rivals ${r.handle}`, r.holds);
  for (const d of position.dismissed) add(`dismissed ${d.handle}`, d.why);
  for (const a of position.avoid) { add(`avoid ${a.id}`, a.text); add(`avoid ${a.id}`, a.why); }
  for (const a of position.stances) { add(`stance ${a.id}`, a.text); add(`stance ${a.id}`, a.why); }
  return rows;
}

/**
 * 台帳を実データと照合する。
 * @param {object} input
 * @returns {{errors: string[], warnings: string[], pending: string[], probes: object[], positions: number}}
 */
export function auditPositions({ ledger, tracked, market, scan, snapshots, plan, exists }) {
  const errors = [];
  const warnings = [];
  const pending = [];
  const probes = [];
  const isTracked = (r) => tracked[r.channel]?.competitors?.some((c) => c.handle === r.handle) ?? false;
  const stanceIds = new Set();
  const seenIds = new Set();
  const planExams = new Set([...plan.slots, ...plan.channels.x.slots, ...plan.channels.instagram.slots].map((s) => s.exam));
  const covered = new Set(ledger.positions.flatMap((p) => p.exams));
  for (const exam of planExams) if (!covered.has(exam)) errors.push(`年間の枠に ${exam} があるのに、立ち位置の台帳に無い`);

  for (const p of ledger.positions) {
    const where = `立ち位置 ${p.id}`;
    for (const f of p.read) if (!exists(f.split(':')[0])) errors.push(`${where}: read の文書が無い ${f}`);
    for (const { where: w, text } of textFields(p)) {
      if (OBSERVED_NUMBER.test(text)) errors.push(`${where} ${w}: 観測値を文章に書いている「${text}」。数字は取得物から読む`);
    }
    for (const r of [...p.rivals, ...p.avoid.flatMap((a) => a.rivals)]) {
      if (!isTracked(r)) errors.push(`${where}: ${r.channel} ${r.handle} が追跡リストに無い`);
      else if (!tracked[r.channel].competitors.find((c) => c.handle === r.handle).exams?.some((e) => p.exams.includes(e))) {
        errors.push(`${where}: ${r.channel} ${r.handle} の追跡リストの exams に、この資格が無い`);
      }
    }
    const named = new Set([...p.rivals, ...p.dismissed].map(rivalKey));
    for (const r of prominentRivals(p.exams, market, scan, ledger.self)) {
      if (!named.has(rivalKey(r))) {
        errors.push(`${where}: 市場の検索で目立つ ${r.channel} ${r.label}（${r.handle}）を分析していない。rivals か dismissed に入れる`);
      }
    }
    const untouched = Object.entries(tracked)
      .filter(([, slot]) => Array.isArray(slot?.competitors))
      .flatMap(([channel, slot]) => slot.competitors.filter((c) => c.exams?.some((e) => p.exams.includes(e)) && !named.has(`${channel}:${c.handle}`)).map((c) => `${channel} ${c.label}`));
    if (untouched.length) pending.push(`${where}: 追跡中で分析に入っていない相手 ${untouched.length} 件（${untouched.slice(0, 5).join('・')}${untouched.length > 5 ? ' ほか' : ''}）`);
    for (const r of p.rivals) {
      const facts = rivalFacts(r, snapshots);
      if (facts.state !== 'measured') warnings.push(`${where}: ${r.channel} ${r.handle} は ${facts.text}。数字で比べていない`);
      else if (p.reviewedOn < facts.date) pending.push(`${where}: ${r.channel} の取得が ${facts.date} に更新された。読み直して reviewedOn を更新する`);
    }
    for (const a of p.stances) {
      if (seenIds.has(a.id)) errors.push(`${where}: stance の id が重複 ${a.id}`);
      seenIds.add(a.id);
      stanceIds.add(a.id);
      for (const f of a.evidence) if (!exists(f.split(':')[0])) errors.push(`${where} ${a.id}: 根拠の文書が無い ${f}`);
      if (a.state !== 'untested' && a.evidence.length + a.probes.length === 0) errors.push(`${where} ${a.id}: 根拠が無いのに ${a.state}。無ければ untested にする`);
      if (a.state !== 'untested' && ABSENCE_WORDS.test(`${a.text}${a.why}`) && a.probes.length === 0) {
        errors.push(`${where} ${a.id}: 空き・不在の主張に検索の確認（probes）が無い`);
      }
      for (const probe of a.probes) {
        const result = runProbe(probe, market, scan, ledger.self);
        probes.push({ stance: a.id, ...probe, ...result });
        if (result.checked === 0) errors.push(`${where} ${a.id}: 確認の検索が 0 件で成立しない（${probe.exam} ${probe.channel}）`);
        else if (!result.ok) errors.push(`${where} ${a.id}: 主張が崩れた。${probe.claim}（${probe.channel} ${result.checked} 件中 ${result.hits} 件が該当・上限 ${probe.max}）`);
      }
    }
  }
  return { errors, warnings, pending, probes, positions: ledger.positions.length, stanceIds };
}

/** 年間の枠が立ち位置を指しているか確かめる。勝負しないと決めた型の枠も止める */
export function auditPlanStances(plan, ledger, { required = false, exists = null, products = null } = {}) {
  const entries = plan.entries ?? [];
  const errors = [];
  const pending = [];
  const stances = new Map(ledger.positions.flatMap((p) => p.stances.map((a) => [a.id, { stance: a, position: p }])));
  const check = (channel, slot) => {
    const where = `${channel} ${slot.id}`;
    const position = ledger.positions.find((p) => p.exams.includes(slot.exam));
    const formats = slot.formats ?? [slot.format];
    const planned = entries.filter((e) => e.slot === slot.id);
    const plannedPacks = planned.map((e) => e.publicationId?.split('/').slice(0, 2).join('/')).filter(Boolean);
    for (const pack of slot.materials?.packs ?? []) {
      if (exists && !exists(`content/sns/video-packs/${pack}/video-pack.json`)) errors.push(`${where}: 動画パックが無い ${pack}`);
      if (plannedPacks.includes(pack)) errors.push(`${where}: ${pack} は entries にある。materials に写さない`);
    }
    for (const product of slot.materials?.products ?? []) {
      if (products && !products.has(product)) errors.push(`${where}: 商品が無い ${product}`);
      if (slot.primaryCta?.targets?.includes(product)) errors.push(`${where}: ${product} は primaryCta にある。materials に写さない`);
    }
    if (slot.materials && planned.length === 0 && slot.materials.packs.length === 0 && !slot.materials.make) errors.push(`${where}: 材料が空`);
    if (GAP_CLAIM.test(slot.reason?.demand ?? '')) errors.push(`${where}: 空きの主張を枠に書いている。立ち位置の台帳で確かめて参照する`);
    for (const avoid of position?.avoid ?? []) {
      const hit = formats.find((f) => avoid.formats.includes(f));
      if (hit) errors.push(`${where}: 型 ${hit} は「${avoid.text}」で勝負しないと決めた所`);
    }
    if (!slot.stance) {
      (required ? errors : pending).push(`${where}: 取る立ち位置（stance）が無い`);
      return;
    }
    const found = stances.get(slot.stance);
    if (!found) errors.push(`${where}: stance ${slot.stance} が台帳に無い`);
    else if (!found.position.exams.includes(slot.exam)) errors.push(`${where}: stance ${slot.stance} は ${slot.exam} の立ち位置ではない`);
    else if (!found.stance.channels.includes(channel)) errors.push(`${where}: stance ${slot.stance} は ${channel} を対象にしていない`);
  };
  for (const s of plan.slots) check('youtube', s);
  for (const s of plan.channels.x.slots) check('x', s);
  for (const s of plan.channels.instagram.slots) check('instagram', s);
  return { errors, pending };
}

function fileDate(file) {
  return /(\d{4}-\d{2}-\d{2})/.exec(file)?.[1] ?? null;
}

/** 立ち位置の表示名。資格名の正本は qualification-registry */
export function positionLabel(position, registry) {
  const label = (id) => registry.qualifications.find((q) => q.id === id)?.label ?? id;
  return position.exams.map(label).join('・');
}

/** 取得物の最新を読む。読めないものは入れない（未取得として扱う） */
export function loadSnapshots(root) {
  const out = {};
  for (const [channel, id] of Object.entries(SNAPSHOT_DATASETS)) {
    const latest = readLatest(root, id);
    if (latest) out[channel] = { date: fileDate(latest.file), file: latest.file, data: latest.data };
  }
  return out;
}

export function loadCompetitorPositions(root) {
  return {
    ledger: readDataset(root, 'config.competitor-positions'),
    tracked: readDataset(root, 'config.competitors'),
    market: readLatest(root, 'analysis.qualification-market')?.data ?? null,
    scan: readDataset(root, 'config.market-scan'),
    snapshots: loadSnapshots(root),
    plan: readDataset(root, 'config.channel-annual-plan'),
    registry: readDataset(root, 'config.qualification-registry'),
  };
}

export function loadCompetitorPositionsAudit(root) {
  const input = loadCompetitorPositions(root);
  const exists = (rel) => existsSync(join(root, rel));
  const audit = auditPositions({ ...input, exists });
  const catalog = readDataset(root, 'config.products');
  const products = new Set((catalog.products ?? catalog).map((p) => p.id));
  const planAudit = auditPlanStances(input.plan, input.ledger, { required: true, exists, products });
  return { ...input, audit, planAudit };
}

/** 立ち位置の読み直しが要るか。競合の取得の期限の表示（check-competitor-scan-due）が読む */
export function positionsReviewDue(root) {
  const ledger = readDatasetIf(root, 'config.competitor-positions');
  if (!ledger) return { due: true, reviewedOn: null, newest: null };
  const reviewedOn = ledger.positions.map((p) => p.reviewedOn).sort()[0] ?? null;
  const newest = Object.values(SNAPSHOT_DATASETS).map((id) => latestFileDate(root, id)).filter(Boolean).sort().pop() ?? null;
  return { due: !reviewedOn || (newest !== null && reviewedOn < newest), reviewedOn, newest };
}
