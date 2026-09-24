// growth-triage（純粋ロジック）— 週次レビューが機会ダイジェストの全件を処分するときの検証と台帳への書き込み内容。
// I/O（ファイル読み書き・git 履歴・スキーマ検査）は scripts/growth-triage.mjs。
//
// 処分（action）:
//   backlog    … DN カードを起票（単発実装。CTA 配置・文言、title/description、計測の修理など）
//   experiment … 実験を proposed で起票（measure 仕様を付ければ CI が自動計測）
//   watchword  … seo-watchwords に improve で登録（日次 seo-rank-watch が 1 件ずつ自動改善・効果判定）
//   verdict    … 期限の来た実験を裁定して close（result / learnings）
//   bundle     … 既存の DN / EXP / 同じバッチの OPP にまとめる
//   reject     … 却下（理由必須。suppressWeeks.reject 週は再表示しない）
//   defer      … 保留（until まで再表示しない・理由必須）
// id が null の backlog は「来週への申し送り」など OPP 以外の起票（ID の付かない申し送りを残さないため）。
import { CANONICAL_CATEGORIES, KINDS } from './backlog-lib.mjs';

export const ACTIONS = ['backlog', 'experiment', 'watchword', 'verdict', 'bundle', 'reject', 'defer'];
export const TIER_HEADINGS = { high: '## 🔴', mid: '## 🟡', low: '## 🟢', hold: '## 🟣' };
export const RESULTS = ['success', 'partial', 'no-effect', 'negative'];

const text = (v, min = 1) => typeof v === 'string' && v.trim().length >= min;

/** 判断ファイルの検査。items＝この週の表示対象（digest.surfaced）。 */
export function validateDecisions(decisions, { items, backlogIds, experimentIds }) {
  const errors = [];
  const byId = new Map(items.map((i) => [i.id, i]));
  const seen = new Set();
  const batchTargets = new Set(decisions.filter((d) => ['backlog', 'experiment', 'watchword'].includes(d.action) && d.id).map((d) => d.id));
  decisions.forEach((d, n) => {
    const at = `decisions[${n}]${d.id ? `(${d.id})` : ''}`;
    if (!ACTIONS.includes(d.action)) { errors.push(`${at}: action が不正（${ACTIONS.join(' / ')}）`); return; }
    if (d.id == null) {
      if (d.action !== 'backlog') errors.push(`${at}: id の無い判断は backlog（申し送りの起票）だけ`);
    } else {
      if (!byId.has(d.id)) errors.push(`${at}: この週のダイジェストに無い ID`);
      if (seen.has(d.id)) errors.push(`${at}: 同じ ID を 2 回処分している`);
      seen.add(d.id);
    }
    if (d.action === 'backlog') {
      if (!text(d.title, 5)) errors.push(`${at}: title（5 字以上）が必要`);
      if (!Object.hasOwn(TIER_HEADINGS, d.tier)) errors.push(`${at}: tier は high / mid / low / hold`);
      if (!CANONICAL_CATEGORIES.includes(d.category)) errors.push(`${at}: category は ${CANONICAL_CATEGORIES.join(' / ')}`);
      if (!KINDS.includes(d.kind)) errors.push(`${at}: kind は ${KINDS.join(' / ')}`);
      if (!text(d.doing, 10) || !text(d.done, 10)) errors.push(`${at}: doing（やること）と done（完了条件）を 10 字以上で`);
    }
    if (d.action === 'experiment') {
      for (const k of ['title', 'hypothesis', 'targetMetric', 'targetDelta']) if (!text(d[k], 5)) errors.push(`${at}: ${k}（5 字以上）が必要`);
    }
    if (d.action === 'watchword' && !d.watch) errors.push(`${at}: watch（audience / need / rationale / nextStep / priority / id）が必要`);
    if (d.action === 'watchword' && d.id && !byId.get(d.id)?.watchwordDraft) errors.push(`${at}: この機会には watchword 下書きが無い（受験意図・原稿を確認できない語は backlog にする）`);
    if (d.action === 'verdict') {
      if (byId.get(d.id)?.category !== 'experiment') errors.push(`${at}: verdict は実験の機会だけ`);
      if (!RESULTS.includes(d.result)) errors.push(`${at}: result は ${RESULTS.join(' / ')}`);
      if (!text(d.learnings, 10)) errors.push(`${at}: learnings（10 字以上）が必要`);
    }
    if (d.action === 'bundle') {
      const into = String(d.into ?? '');
      const ok = backlogIds.has(into) || experimentIds.has(into) || batchTargets.has(into);
      if (!ok) errors.push(`${at}: into は既存の DN / EXP か、同じバッチで起票する OPP`);
    }
    if (d.action === 'reject' && !text(d.reason, 10)) errors.push(`${at}: reason（10 字以上）が必要`);
    if (d.action === 'defer') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.until ?? '')) errors.push(`${at}: until（YYYY-MM-DD）が必要`);
      if (!text(d.reason, 5)) errors.push(`${at}: reason が必要`);
    }
  });
  return errors;
}

/** backlog カード（v3-unified）。起点に OPP と digest を残し、機会がどこから来たか辿れるようにする。 */
export function renderCard({ dnId, d, item, digestFile, today }) {
  const origin = item
    ? `週次トリアージ（${digestFile}）の ${item.id}: ${item.title}${item.expectedWeeklyGain ? `（期待効果 ${item.expectedWeeklyGain.value} ${item.expectedWeeklyGain.unit}/週）` : ''}${item.contentPath ? `。原稿: \`${item.contentPath}\`` : ''}`
    : `週次レビューの申し送り（${digestFile ?? '計測ダイジェスト外'}）`;
  const tags = [`[${d.category}]`, `[種類:${d.kind}]`, ...(d.verify ? [`[検証:${d.verify}]`] : []), `[起票:${today}]`];
  return [
    `### [${dnId}] ${d.title}`,
    `タグ: ${tags.join(' ')}`,
    '',
    `**起点**: ${origin}`,
    '',
    `**やること**: ${d.doing}`,
    '',
    `**完了条件**: ${d.done}`,
    '',
  ].join('\n');
}

/** tier の見出しセクション末尾（次の `## ` の直前）にカードを差し込む。 */
export function insertCard(backlogText, tier, card) {
  const eol = backlogText.includes('\r\n') ? '\r\n' : '\n';
  const lines = backlogText.split(eol);
  const start = lines.findIndex((l) => l.startsWith(TIER_HEADINGS[tier]));
  if (start < 0) throw new Error(`backlog に ${TIER_HEADINGS[tier]} の見出しが無い`);
  let end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  if (end < 0) end = lines.length;
  while (end > start + 1 && lines[end - 1].trim() === '') end--;
  lines.splice(end, 0, '', ...card.replace(/\n+$/, '').split('\n'));
  return lines.join(eol);
}

/** 次の EXP-###（台帳に一度も使われていない番号）。 */
export function nextExperimentId(experiments) {
  const max = experiments.reduce((a, e) => Math.max(a, Number(/^EXP-(\d+)$/.exec(e.id ?? '')?.[1] ?? 0)), 0);
  return `EXP-${String(max + 1).padStart(3, '0')}`;
}

export function newExperiment({ expId, d, item, digestFile, nowIso }) {
  return {
    id: expId,
    title: d.title,
    hypothesis: d.hypothesis,
    target_metric: d.targetMetric,
    target_delta: d.targetDelta,
    baseline: d.baseline ?? { measured_at: nowIso.slice(0, 10), source: digestFile, opportunity: item ? { id: item.id, metrics: item.metrics } : null },
    ...(d.measure ? { measure: d.measure } : {}),
    status: 'proposed',
    created_at: nowIso,
    history: [{ date: nowIso, action: 'proposed', summary: `週次トリアージ${item ? `（${item.id}）` : ''}で起票` }],
  };
}

/** 実験の裁定（/nsm-experiment close と同じ項目を埋める）。 */
export function closeExperiment(exp, d, nowIso) {
  exp.status = 'done';
  exp.result = d.result;
  exp.learnings = d.learnings;
  exp.closed_at = nowIso;
  (exp.history ??= []).push({ date: nowIso, action: 'closed', summary: `週次トリアージで裁定（${d.result}）` });
}

/** digest の watchwordDraft と判断の watch を合わせて seo-watchwords の 1 行にする。 */
export function buildWatch(item, watch) {
  const draft = item?.watchwordDraft ?? {};
  return {
    country: 'jpn', device: null, enabled: true, mode: 'improve',
    keyword: draft.keyword, targetPath: draft.targetPath, contentPath: draft.contentPath,
    qualification: draft.qualification, intent: draft.intent, evidence: draft.evidence,
    ...watch,
  };
}

/** この週でまだ処分されていない表示対象。 */
export function pendingItems(digest, log) {
  const done = new Set((log?.entries ?? []).filter((e) => e.week === digest.week).map((e) => e.id));
  return digest.surfaced.filter((i) => !done.has(i.id));
}
