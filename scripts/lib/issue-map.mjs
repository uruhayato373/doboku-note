/**
 * issue-map.mjs — 事業イシューマップ（config/issue-map.json）の参照を解決する唯一の実装。
 * 管理画面 /strategy/issues と npm run check-issue-map が同じものを使う。
 * 判定日と進み具合は backlog のカード（[期日:]・[時期:]）、閉じたカードは dispatch-log から引く。マップに日付を写さない。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBacklog, parseWhen, TODO_DIR } from './backlog-lib.mjs';
import { readDataset, readDatasetIf, readLatest } from './dataset-io.mjs';
import { extractWeeklyHandoffItems, parseRouting } from './handoff-extraction.mjs';

/** 週次・月次のレポートの節の名前（review-wiring.json の procedure の sections と同じ） */
export const ISSUE_MAP_SECTION = 'イシューマップ';

/** DN → { id, title, when, due, wip, status: 'open'|'closed', closedAt }。閉じたカードは dispatch-log の outcome=done の行から作る */
export function buildDnIndex(backlogText, dispatchEntries) {
  const index = new Map();
  for (const e of dispatchEntries ?? []) if (e.id && e.outcome === 'done') index.set(e.id, { id: e.id, title: e.task, when: null, due: null, wip: false, status: 'closed', closedAt: e.at ?? null });
  for (const c of parseBacklog(backlogText)) if (c.id) index.set(c.id, { id: c.id, title: c.title, when: c.when, due: c.due, wip: c.wip, status: 'open', closedAt: null });
  return index;
}

export function loadDnIndex(root) {
  return buildDnIndex(readFileSync(join(root, TODO_DIR, 'backlog.md'), 'utf8'), readDatasetIf(root, 'state.dispatch-log')?.entries);
}

/** 時期（YYYY-MM か YYYY-MM..YYYY-MM）の最終日 */
function endOfWhen(raw) {
  const w = parseWhen(raw);
  if (!w) return null;
  const last = new Date(Date.UTC(Number(w.end.slice(0, 4)), Number(w.end.slice(5, 7)), 0)).getUTCDate();
  return `${w.end}-${String(last).padStart(2, '0')}`;
}

/** カード 1 枚の判定の時期。label は画面に出す文字、end は過ぎたかを見る日（時期の無いカードは null） */
export function dnTiming(dn) {
  if (!dn) return { label: 'カードなし', end: null };
  if (dn.status === 'closed') return { label: '完了', end: null };
  if (dn.due) return { label: dn.due, end: dn.due };
  if (dn.when) return { label: dn.when, end: endOfWhen(dn.when) };
  return { label: '時期なし', end: null };
}

/** 判定 1 行の時期。DN があれば各カードから、無ければ window から */
export function judgmentTiming(j, index) {
  if (j.window) return [{ id: null, title: null, status: 'window', label: j.window, end: endOfWhen(j.window) }];
  return (j.dns ?? []).map((id) => {
    const dn = index.get(id) ?? null;
    return { id, title: dn?.title ?? null, status: dn?.status ?? 'missing', closedAt: dn?.closedAt ?? null, ...dnTiming(dn) };
  });
}

/** 判定 1 行が today の時点で更新の番か。カードが閉じたか、時期を過ぎたカードがあれば理由を返す */
export function judgmentDue(j, index, today) {
  const timing = judgmentTiming(j, index);
  const closed = timing.filter((t) => t.status === 'closed' && (t.closedAt ?? '') <= today);
  if (closed.length) return `カードが閉じた（${closed.map((t) => t.id).join('・')}）`;
  const past = timing.filter((t) => t.end && t.end < today);
  if (past.length) return `時期を過ぎた（${past.map((t) => `${t.id ?? '時期'} ${t.label}`).join('・')}）`;
  return null;
}

/** 全マップの更新の番の判定 */
export function dueJudgments(doc, index, today) {
  return doc.maps.flatMap((m) =>
    m.judgments.flatMap((j) => {
      const reason = judgmentDue(j, index, today);
      return reason ? [{ key: `${m.id} ${j.issues.join('・')}`, map: m.id, issues: j.issues, picture: j.picture, reason }] : [];
    }),
  );
}

/**
 * レポートの「## イシューマップ」節の検査。更新の番の判定は、マップを更新して消すか、節に行き先を書いて残す。
 * 実測が無ければ状態を変えられないので、残すこと自体は認める（行き先の無い放置だけを止める）。
 * @returns {{ hasSection: boolean, due: object[], unrouted: object[] }}
 */
export function issueMapRouting(doc, index, asOf, report) {
  const due = dueJudgments(doc, index, asOf);
  const { hasSection, items } = extractWeeklyHandoffItems(report ?? '', new RegExp(`^##\\s+${ISSUE_MAP_SECTION}\\s*$`));
  const routed = (text) => {
    const r = parseRouting(text);
    return Boolean(r && (r.routine || r.dnIds.length || r.expIds.length));
  };
  return { hasSection, due, unrouted: due.filter((d) => !items.some((it) => it.text.includes(d.key) && routed(it.text))) };
}

/** ファイルをまたぐ整合。problems（直す）と checked（実検査数）を返す */
export function issueMapProblems(root) {
  const doc = readDataset(root, 'config.issue-map');
  const direction = readDataset(root, 'config.business-direction');
  const competitors = readDataset(root, 'config.competitors');
  const index = loadDnIndex(root);
  const metrics = new Map(direction.metrics.map((m) => [m.id, m]));
  const scopes = new Set(['all', ...direction.qualifications.map((q) => q.id)]);
  const problems = [];
  const checked = { maps: doc.maps.length, leaves: 0, metrics: 0, dns: 0, competitors: 0 };

  const checkMetric = (where, ref) => {
    checked.metrics += 1;
    const m = metrics.get(ref.id);
    const q = ref.qualification ?? 'all';
    if (!m) problems.push(`${where}: 指標 ${ref.id} が business-direction.json に無い（足りないなら proposedMetrics へ）`);
    else if (!scopes.has(q)) problems.push(`${where}: ${q} は重点資格でないので指標の値が無い`);
    else if (m.appliesTo && !m.appliesTo.includes(q)) problems.push(`${where}: 指標 ${ref.id} は ${q} に適用されない`);
  };
  const checkDn = (where, id) => {
    checked.dns += 1;
    if (!index.has(id)) problems.push(`${where}: ${id} が backlog にも dispatch-log の完了にも無い`);
  };

  for (const p of doc.proposedMetrics) {
    if (metrics.has(p.id)) problems.push(`proposedMetrics: ${p.id} は business-direction.json に入った。metrics へ移してここから消す`);
    checkDn(`proposedMetrics ${p.id}`, p.dn);
  }
  for (const m of doc.maps) {
    for (const leaf of m.branches.flatMap((b) => b.leaves)) {
      const where = `${m.id} ${leaf.id}`;
      checked.leaves += 1;
      if (leaf.state !== 'decided' && !leaf.metrics?.length && !leaf.proposedMetrics?.length) problems.push(`${where}: 指標が結ばれていない`);
      for (const r of leaf.metrics ?? []) checkMetric(where, r);
      for (const id of leaf.dns ?? []) checkDn(where, id);
      for (const ref of leaf.competitors ?? []) {
        checked.competitors += 1;
        const [slot, handle] = ref.split(':');
        if (!competitors[slot]?.competitors.some((c) => c.handle === handle)) problems.push(`${where}: 競合 ${ref} が competitors.json に無い`);
      }
    }
    m.judgments.forEach((j, i) => {
      const where = `${m.id} judgments[${i}]`;
      for (const id of j.dns ?? []) checkDn(where, id);
      for (const r of j.metrics ?? []) checkMetric(where, r);
    });
    for (const stage of m.storyline) for (const f of stage.facts ?? []) if (f.metric) checkMetric(`${m.id} storyline`, { id: f.metric });
    for (const r of m.calendar?.rows ?? []) r.cells.forEach((c) => (c.dns ?? []).forEach((id) => checkDn(`${m.id} calendar ${r.id}`, id)));
  }
  const observed = readLatest(root, 'courses.competitors')?.data;
  const observedHandles = new Set((observed?.competitors ?? []).map((c) => c.handle));
  for (const c of competitors.courses.competitors) {
    checked.competitors += 1;
    if (!observedHandles.has(c.handle)) problems.push(`courses ${c.handle}: 最新の観測（courses.competitors）に無い`);
  }
  return { doc, index, problems, checked };
}
