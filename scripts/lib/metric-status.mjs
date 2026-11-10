/**
 * 指標が今計測できているかを、実データから判定する（手で書かない・2026-11-06）。
 * 取得元は config/business-direction.json の metrics[].dataSource が正本。年間計画は指標の id だけを持つ。
 * state: measured 計測できている / no-rows 取得はできているが該当の行が無い（0 とは読まない）/
 *        stale 取得が止まっている / missing 取得元にデータが無い / unmeasured 取得元が決まっていない
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readDataset } from './dataset-io.mjs';
import { latestFile } from './datasets.mjs';
import { readJson } from './json-io.mjs';
import { jstDayOfStamp, latestReport } from './metric-reports.mjs';
import { todayJst } from './jst-date.mjs';

export const FRESH_DAYS = 14;
const DAY_MS = 86_400_000;
const ageDays = (day, today) => Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / DAY_MS);

/** 証拠から状態を決める純粋関数。evidence は { day, rows, value }。取得元が読めなければ null */
export function judgeMetric(metric, evidence, today) {
  const base = { id: metric.id, label: metric.label, definition: metric.definition };
  if (!metric.dataSource) return { ...base, state: 'unmeasured', day: null, rows: 0, value: null };
  if (!evidence) return { ...base, state: 'missing', day: null, rows: 0, value: null };
  const { day, rows, value } = evidence;
  const state = ageDays(day, today) > FRESH_DAYS ? 'stale' : rows === 0 ? 'no-rows' : 'measured';
  return { ...base, state, day, rows, value };
}

const sum = (rows, field) => rows.reduce((n, r) => n + (Number(r[field]) || 0), 0);

/** 動画は utm_campaign が動画パックの id、X は投稿の宛先の utm_campaign */
function campaignNames(root, kind) {
  if (kind === 'video-packs') {
    const base = join(root, 'content/sns/video-packs');
    if (!existsSync(base)) return new Set();
    return new Set(readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).flatMap((d) => readdirSync(join(base, d.name))));
  }
  const dir = 'content/sns/x/campaigns';
  const names = new Set();
  for (const file of existsSync(join(root, dir)) ? readdirSync(join(root, dir)) : []) {
    if (!file.endsWith('.json')) continue;
    for (const post of readJson(root, `${dir}/${file}`).posts ?? []) {
      if (!post.target) continue;
      const name = new URL(post.target).searchParams.get('utm_campaign');
      if (name) names.add(name);
    }
  }
  return names;
}

/**
 * 取得元（dataSource）の最新の値。{ day, rows, value, period, ref }。period は取得元の集計窓、ref は読んだファイル（レポートは「file#枠」）。
 * 事業レポートのセル（business-direction.mjs の sourceFacts）も同じ読み方で載せる（集計を 2 か所に書かない）
 */
export function evidenceOf(root, source) {
  if (source.report) {
    const report = latestReport(root, source.report);
    if (!report) return null;
    const campaigns = source.campaigns ? campaignNames(root, source.campaigns) : null;
    const rows = (report.data.rows ?? []).filter((r) => (!source.match || r[source.match.key] === source.match.value) && (!campaigns || campaigns.has(r.campaign)));
    return { day: jstDayOfStamp(report.stamp), rows: rows.length, value: sum(rows, source.field), period: { startDate: report.data.meta?.startDate, endDate: report.data.meta?.endDate }, ref: report.ref };
  }
  const file = latestFile(root, source.dataset);
  if (!file) return null;
  const data = readJson(root, file);
  const rows = (data[source.rows] ?? []).filter((r) => r[source.field] != null);
  return { day: file.match(/(\d{4}-\d{2}-\d{2})\.json$/)[1], rows: rows.length, value: rows.length ? sum(rows, source.field) / rows.length : null, period: data.period, ref: file };
}

/** 全指標の状態（id → 判定）。取得元を持つ指標だけを読む */
export function loadMetricStatuses(root, today = todayJst()) {
  const { metrics } = readDataset(root, 'config.business-direction');
  return new Map(metrics.map((m) => [m.id, judgeMetric(m, m.dataSource ? evidenceOf(root, m.dataSource) : null, today)]));
}

/** 年間計画の成功指標の照合。id が定義に無ければ違反、計測できていなければ判断や対応へ回す */
export function auditPlanMetrics(ids, statuses, label) {
  const errors = [], warnings = [], pending = [];
  for (const id of ids) {
    const s = statuses.get(id);
    if (!s) errors.push(`${label}: 成功指標 ${id} が事業方針の指標に無い`);
    else if (s.state === 'missing') errors.push(`${label}: ${s.label} の取得元にデータが無い`);
    else if (s.state === 'stale') warnings.push(`${label}: ${s.label} の取得が ${s.day} で止まっている`);
    else if (s.state === 'unmeasured') pending.push(`${label}: ${s.label} は取得元が決まっていない`);
    else if (s.state === 'no-rows') pending.push(`${label}: ${s.label} は ${s.day} の取得に該当の行が無い（0 とは読まない）`);
  }
  return { errors, warnings, pending };
}

const STATE_LABEL = { measured: '計測中', 'no-rows': '該当の行なし', stale: '取得が停止', missing: 'データなし', unmeasured: '未計測' };
export const metricStateLabel = (state) => STATE_LABEL[state];
