#!/usr/bin/env node
/**
 * report-psi-regression.mjs — PSI 計測履歴から、重大度の付与と回帰（直近 5 バッチの中央値）を決める（旧 performance-auditor の判定を移した・DN-1242）
 * ---------------------------------------------------------------------------
 * しきい値違反そのもの（field の実害・lab の改善余地・取得失敗率）は .claude/scripts/psi-threshold-check.mjs（npm run psi-audit:check）が持つ。
 * こちらは履歴を読み、次を機械で決める。改善案の文章化（何を直すか）は出力の JSON を親が読んで行う。
 *
 * 重大度（原則: field で実害を判定し lab で原因を診断する。真実源 measurement-incidents.md「2026-07-27: lab と field の判定原則」）
 *   Critical … field の LCP / INP / CLS のどれかが AVERAGE / SLOW。唯一の根拠は field。lab の単発値では立てない
 *   High     … field が無い（判定材料なし）のに lab の違反か回帰がある。「実害なし」と読ませない
 *   Medium   … field が FAST のときの lab の違反と回帰（改善余地であって障害ではない）
 * 回帰: その URL×strategy の値が存在するバッチだけを集め、直近 5 件の中央値を、その前（最大 5 件）の中央値と比べる。
 *   Performance が 10 以上低下 / LCP が 500ms 以上増加 / CLS が 0.05 以上増加。
 *   直近が 3 件未満・前が 2 件未満なら「判定不能」と数える（「劣化なし」と書かない）。
 * 欠測: バッチごとの計測数が config/psi-urls.txt の URL 数に満たない・error の行を数える（欠測率の把握）。
 * LCP 要素: lcp_element.snippet から打ち手の分岐（lazy な画像 / eager な画像 / テキスト / 不明）を付ける。
 *
 * 使い方: node scripts/report-psi-regression.mjs [--root <repo>] [--json]
 * exit: 0=Critical なし / 1=Critical あり / 2=検査不成立（判定できた計測が 0 件）
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseCliArgs } from './lib/cli-args.mjs';
import { datasetDir, datasetPath } from './lib/datasets.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { exitCodeOf, readJsonOrNull } from './lib/run-audit.mjs';

const TAG = '[report-psi-regression]';
export const REGRESSION = { window: 5, minRecent: 3, minBaseline: 2, performanceDrop: 10, lcpRiseMs: 500, clsRise: 0.05 };
const BAD_FIELD = new Set(['AVERAGE', 'SLOW']);

export function median(values) {
  const v = values.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** LCP 要素から打ち手の分岐を返す（pure）。 */
export function lcpPattern(lcpElement) {
  const snippet = lcpElement?.snippet;
  if (!snippet) return { kind: 'unknown', hint: 'LCP 要素 不明。Playwright の PerformanceObserver での実測を提案' };
  if (/<img/i.test(snippet)) {
    return /loading=["']?lazy/i.test(snippet)
      ? { kind: 'img-lazy', hint: 'フォールド内画像の遅延読込。npm run check-lcp-image-hints -- --fix' }
      : { kind: 'img-eager', hint: '画像の重量・R2 配信・width/height・不要な preload の帯域競合' };
  }
  return { kind: 'text', hint: '画像施策は無効。render-blocking CSS/JS・フォント・Critical CSS' };
}

/** field（LCP/INP/CLS）の最悪カテゴリ。1 つも無ければ null。 */
export function fieldVerdict(fieldData) {
  const cats = ['LCP', 'INP', 'CLS'].map((k) => fieldData?.[k]?.category).filter(Boolean);
  if (cats.length === 0) return { state: 'unknown', bad: [] };
  const bad = ['LCP', 'INP', 'CLS'].filter((k) => BAD_FIELD.has(fieldData?.[k]?.category));
  return { state: bad.length ? 'bad' : 'fast', bad };
}

const metricOf = {
  performance: (r) => r.scores?.performance,
  LCP: (r) => r.lab_data?.LCP_ms,
  CLS: (r) => r.lab_data?.CLS,
};

/** 1 系列（古い順の result 配列）の回帰を判定する（pure）。 */
export function judgeRegression(series) {
  const w = REGRESSION.window;
  const recent = series.slice(-w);
  const baseline = series.slice(Math.max(0, series.length - 2 * w), series.length - recent.length);
  if (recent.length < REGRESSION.minRecent || baseline.length < REGRESSION.minBaseline) {
    return { judgeable: false, reason: `母数不足（直近 ${recent.length}・前 ${baseline.length}）`, regressions: [] };
  }
  const med = (rows, k) => median(rows.map(metricOf[k]));
  const reg = [];
  const dp = med(baseline, 'performance') - med(recent, 'performance');
  if (dp >= REGRESSION.performanceDrop) reg.push({ metric: 'Performance', before: med(baseline, 'performance'), after: med(recent, 'performance') });
  const dl = med(recent, 'LCP') - med(baseline, 'LCP');
  if (dl >= REGRESSION.lcpRiseMs) reg.push({ metric: 'LCP', before: Math.round(med(baseline, 'LCP')), after: Math.round(med(recent, 'LCP')) });
  const dc = med(recent, 'CLS') - med(baseline, 'CLS');
  if (dc >= REGRESSION.clsRise) reg.push({ metric: 'CLS', before: med(baseline, 'CLS'), after: med(recent, 'CLS') });
  return { judgeable: true, reason: '', regressions: reg };
}

/**
 * pure。batches = [{ file, results }] を古い順で渡す。
 * @returns {{ items, counts, missing, judged, unjudgeable }}
 */
export function buildPsiReport({ batches, thresholds, expectedUrls = 0 }) {
  const series = new Map();
  const missing = [];
  for (const b of batches) {
    const byStrategy = new Map();
    for (const r of b.results ?? []) {
      const s = r.strategy ?? '?';
      byStrategy.set(s, (byStrategy.get(s) ?? 0) + (r.error ? 0 : 1));
      if (r.error) continue;
      const k = `${r.url}|${s}`;
      if (!series.has(k)) series.set(k, []);
      series.get(k).push(r);
    }
    if (expectedUrls > 0) for (const [s, n] of byStrategy) if (n < expectedUrls) missing.push({ file: b.file, strategy: s, measured: n, expected: expectedUrls });
  }
  const items = [];
  let unjudgeable = 0;
  for (const [k, rows] of series) {
    const latest = rows.at(-1);
    const [url, strategy] = k.split('|');
    const field = fieldVerdict(latest.field_data);
    const reg = judgeRegression(rows);
    if (!reg.judgeable) unjudgeable += 1;
    const labIssues = [];
    const lab = latest.lab_data ?? {};
    if (thresholds) {
      if (latest.scores?.performance != null && latest.scores.performance < thresholds.performance_score_min) labIssues.push(`Performance ${latest.scores.performance} < ${thresholds.performance_score_min}`);
      if (lab.LCP_ms != null && lab.LCP_ms > thresholds.LCP_ms_max) labIssues.push(`LCP ${Math.round(lab.LCP_ms)}ms > ${thresholds.LCP_ms_max}`);
      if (lab.CLS != null && lab.CLS > thresholds.CLS_max) labIssues.push(`CLS ${lab.CLS} > ${thresholds.CLS_max}`);
    }
    let severity = null;
    if (field.state === 'bad') severity = 'Critical';
    else if (labIssues.length || reg.regressions.length) severity = field.state === 'unknown' ? 'High' : 'Medium';
    if (!severity) continue;
    items.push({ url, strategy, severity, fieldState: field.state, fieldBad: field.bad, labIssues, regressions: reg.regressions, lcp: lcpPattern(latest.lcp_element) });
  }
  const counts = { Critical: 0, High: 0, Medium: 0 };
  for (const i of items) counts[i.severity] += 1;
  const order = { Critical: 0, High: 1, Medium: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);
  return { items, counts, missing, judged: series.size, unjudgeable };
}

export function readPsiBatches(root) {
  const dir = join(root, datasetDir('psi.batch'));
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/.test(f)).sort()
    .map((file) => ({ file, results: readJsonOrNull(join(dir, file))?.results ?? [] }));
}

export function countExpectedUrls(root) {
  const p = join(root, datasetPath('config.psi-urls'));
  if (!existsSync(p)) return 0;
  return readFileSync(p, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).length;
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  const args = parseCliArgs({ root: { type: 'string' }, json: { type: 'boolean' } });
  const root = args.root ?? REPO_ROOT;
  const cfg = readJsonOrNull(join(root, datasetPath('config.psi-config')));
  const batches = readPsiBatches(root);
  const r = buildPsiReport({ batches, thresholds: cfg?.thresholds, expectedUrls: countExpectedUrls(root) });
  const code = exitCodeOf({ checked: r.judged, fail: r.counts.Critical > 0 ? ['critical'] : [] });
  if (args.json) console.log(JSON.stringify({ check: 'psi-regression', batches: batches.length, ...r, exit: code }, null, 2));
  else {
    for (const i of r.items) {
      const parts = [...i.fieldBad.map((m) => `field ${m} が不良`), ...i.labIssues, ...i.regressions.map((g) => `回帰 ${g.metric} ${g.before}→${g.after}`)];
      console.log(`${TAG} ${i.severity} ${i.url} (${i.strategy}) field=${i.fieldState}: ${parts.join(' / ')}｜LCP要素=${i.lcp.kind}`);
    }
    if (r.missing.length) console.log(`${TAG} 欠測 ${r.missing.length} バッチ×strategy（例 ${r.missing[0].file} ${r.missing[0].strategy}: ${r.missing[0].measured}/${r.missing[0].expected}）`);
    console.log(`${TAG} バッチ ${batches.length} 本・系列 ${r.judged}（回帰判定不能 ${r.unjudgeable}）・Critical ${r.counts.Critical} / High ${r.counts.High} / Medium ${r.counts.Medium}`);
    if (code === 2) console.error(`${TAG} 検査不成立: 判定できた計測が 0 件`);
  }
  process.exit(code);
}
