#!/usr/bin/env node
/**
 * build-weekly-review-draft.mjs — 週次レビュー（/weekly-review）のうち、機械で決まる節を先に集めて下書きにする。
 *
 * なぜ: 2026-W40 の週次レビューが 1 週抜けた。原因は (1) 土曜に対話セッションを開かないと何も始まらない、
 * (2) fetch-metrics の書き戻しが 10/7 から止まっていたのにレビューを開くまで誰も気づかなかった、の 2 つ。
 * 金曜の fetch-metrics の後に CI でこれを回し、材料の欠けをその日のうちに赤（automation-failure Issue）にする。
 * 土曜のセッション（人か Mac の launchd）は判断の節（トリアージ・関門・申し送り）だけを書けばよくなる。
 *
 * 集めるもの（すべてオフライン。GitHub の Issue だけ gh を使う）: 計測ダイジェスト（W−1）・資格別 KPI（W−1 窓と前週）・
 * ダイジェストの未処分・実験の期限・点検と Issue・バックログの関門と健全性・検索の改善候補・PSI と実ユーザー計測・
 * note 同期・X 予約キュー・ココナラ取引・売上台帳の当月行。
 *
 * Usage:
 *   node scripts/build-weekly-review-draft.mjs                # 今週（JST の今日を含む ISO 週）の下書きを書く
 *   node scripts/build-weekly-review-draft.mjs --week 2026-W42
 *   node scripts/build-weekly-review-draft.mjs --print        # 書かずに Markdown を stdout へ
 *   node scripts/build-weekly-review-draft.mjs --check        # 書かずに材料の有無だけ確かめる（CI の完走確認）
 *
 * 書き先: 台帳の state.weekly-review-draft（最新 1 本を上書き。履歴は git）
 * exit: 0 必須の材料がそろった / 1 必須の材料が欠けた（下書きは欠けを明記して書く）/ 2 検査不成立（引数・週の不正）
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { REPO_ROOT } from './lib/repository-paths.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { isoWeekKey, weekPeriod } from './lib/business-direction.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { qualificationShortLabel } from './lib/qualification-names.mjs';
import { loadRegistry } from './lib/qualification-registry.mjs';

const TAG = '[weekly-review-draft]';
const args = parseCliArgs({ week: { type: 'string' }, print: { type: 'boolean' }, check: { type: 'boolean' } });

const week = args.week ?? isoWeekKey(todayJst());
let period;
try { period = weekPeriod(week); } catch { period = null; }
if (!period) { console.error(`${TAG} 検査不成立: 週の指定が不正（${week}）`); process.exit(2); }
const addDays = (d, n) => { const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const windowPeriod = { startDate: addDays(period.startDate, -7), endDate: addDays(period.startDate, -1) };
const prevWindow = { startDate: addDays(windowPeriod.startDate, -7), endDate: addDays(windowPeriod.startDate, -1) };
const windowWeek = isoWeekKey(windowPeriod.startDate);

/** 1 本のコマンドを回す。失敗しても止めず、rc と出力を残す（欠けは下書きに「未取得」と書く） */
function run(id, cmd, cmdArgs, { json = false, timeoutMs = 180_000 } = {}) {
  const r = spawnSync(cmd, cmdArgs, { cwd: REPO_ROOT, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
  // 結果を stderr に出すコマンド（review-checks・backlog-gate など）があるので、stdout が空なら stderr を本文にする
  const out = ((r.stdout ?? '').trim() || (json ? '' : (r.stderr ?? '').trim()));
  let data = null;
  if (json) { try { data = JSON.parse(out); } catch { data = null; } }
  return { id, command: [cmd, ...cmdArgs].join(' '), rc: r.status ?? (r.error ? -1 : null), out, err: (r.stderr ?? '').trim(), data };
}
const node = (id, script, a = [], o) => run(id, 'node', [script, ...a], o);

const R = {
  digest: node('digest', 'scripts/build-growth-digest.mjs', ['--print']),
  business: node('business', 'scripts/business-review.mjs', ['report', '--start', windowPeriod.startDate, '--end', windowPeriod.endDate, '--json'], { json: true }),
  businessPrev: node('businessPrev', 'scripts/business-review.mjs', ['report', '--start', prevWindow.startDate, '--end', prevWindow.endDate, '--json'], { json: true }),
  triage: node('triage', 'scripts/growth-triage.mjs', ['list', '--json'], { json: true }),
  experiments: node('experiments', 'scripts/check-experiment-due.mjs', ['--json'], { json: true }),
  checks: node('checks', 'scripts/review-checks.mjs', ['--cadence', 'weekly', '--run', week]),
  gate: node('gate', 'scripts/backlog-gate.mjs', ['--weekly']),
  backlogHealth: node('backlogHealth', 'scripts/check-backlog-health.mjs'),
  search: node('search', 'scripts/report-search-opportunities.mjs', ['--json'], { json: true }),
  psi: run('psi', 'npm', ['run', '-s', 'psi-audit:check']),
  webVitals: run('webVitals', 'npm', ['run', '-s', 'report-web-vitals']),
  noteSync: run('noteSync', 'npm', ['run', '-s', 'note-sync-plan']),
  xQueue: run('xQueue', 'npm', ['run', '-s', 'x-queue-surfacer']),
  coconala: run('coconala', 'npm', ['run', '-s', 'check-coconala-orders', '--', '--json'], { json: true }),
  sales: run('sales', 'npm', ['run', '-s', 'sales-summary']),
};

// ---- 必須の材料（欠けたら exit 1。0 と読まない）
const missing = [];
const digestMarker = /<!-- growth-digest:(\d{4}-W\d{2}) -->/.exec(R.digest.out)?.[1];
if (digestMarker !== windowWeek) missing.push(`計測ダイジェスト ${windowWeek}（最新は ${digestMarker ?? 'なし'}。fetch-metrics の publish を確認）`);
const cells = R.business.data?.cells ?? [];
const kpi = (rows, metric, q) => rows.find((c) => c.metric === metric && c.qualification === q);
if (!cells.length) missing.push('資格別 KPI（business-review report）');
else if (kpi(cells, 'organicUsers', 'all')?.value == null) missing.push(`自然検索人数 ${windowPeriod.startDate}〜${windowPeriod.endDate}（fetch-business-metrics の取得・書き戻しを確認）`);
if (!R.triage.data) missing.push('ダイジェストの未処分一覧（growth-triage list）');
if (!R.experiments.data) missing.push('実験の期限（check-experiment-due）');

// ---- 描画
const fmt = (c) => (c == null || c.value == null ? '—' : `${Number(c.value).toLocaleString('ja-JP')}${c.coverage === 'partial' ? '（部分）' : ''}`);
const REGISTRY = loadRegistry(REPO_ROOT);
const QUALS = [...new Set(cells.filter((c) => c.qualification !== 'all').map((c) => c.qualification))];
const METRICS = [['organicUsers', '自然検索'], ['gscClicks', 'Google クリック'], ['noteCtaClicks', 'note CTA'], ['noteSales', 'note 販売（件）'], ['noteRevenue', 'note 売上（円）'], ['coconalaOrders', 'ココナラ（件）'], ['quizStarts', '演習開始']];
const prevCells = R.businessPrev.data?.cells ?? [];
const pct = (a, b) => (a?.value == null || b?.value == null || !b.value ? '—' : `${a.value >= b.value ? '+' : ''}${(((a.value - b.value) / b.value) * 100).toFixed(1)}%`);
const failed = (r) => r.rc !== 0;
const block = (r, max = 40) => (r.out ? `\`\`\`\n${r.out.split('\n').slice(0, max).join('\n')}\n\`\`\`` : `（出力なし・rc=${r.rc}）`);
const note = (r) => (failed(r) ? `\n\n> rc=${r.rc}${r.err ? `: ${r.err.split('\n').slice(-2).join(' / ').slice(0, 200)}` : ''}` : '');

const md = [];
md.push(`<!-- weekly-review:draft ${week} -->`);
md.push(`# 週次レビュー ${week}（下書き）`, '');
md.push(`作成日: ${todayJst()}（build-weekly-review-draft・機械で決まる節だけ）`);
md.push(`対象期間: ${period.startDate} 〜 ${period.endDate}（事業レビューと計測ダイジェストは前の完了週 ${windowPeriod.startDate}〜${windowPeriod.endDate}＝${windowWeek} 窓）`, '');
md.push('> [!note] この下書きの使い方', '> `/weekly-review` はここから機械の節を写し、判断の節（計画 vs 実績・トリアージ・課題・学び・バックログの関門・申し送り）を書いて `docs/reviews/weekly/<週>-review.md` に保存する。数字は転記し直さない。', '');
if (missing.length) md.push('## 材料の欠け（先に直す）', '', ...missing.map((m) => `- ${m}`), '');

md.push(`## 資格別 KPI（${windowWeek} 窓・前週比）`, '');
md.push(`| 指標 | 全体 | 前週比 | ${QUALS.map((q) => qualificationShortLabel(REGISTRY, q) ?? q).join(' | ')} |`, `|---|--:|--:|${QUALS.map(() => '--:').join('|')}|`);
for (const [m, label] of METRICS) {
  if (!cells.some((c) => c.metric === m)) continue;
  md.push(`| ${label} | ${fmt(kpi(cells, m, 'all'))} | ${pct(kpi(cells, m, 'all'), kpi(prevCells, m, 'all'))} | ${QUALS.map((q) => fmt(kpi(cells, m, q))).join(' | ')} |`);
}
md.push('', '欠測（—）は 0 ではない。資格間で合算しない。', '');

md.push('## 計測ダイジェスト', '', R.digest.out || `（未取得・rc=${R.digest.rc}）`, '');

const pending = R.triage.data?.pending ?? [];
md.push(`## 計測→改善トリアージ（未処分 ${pending.length} 件）`, '');
md.push(pending.length ? pending.map((p) => `- ${p.id}［${p.category}］${p.title}（推奨: ${p.suggest.join(' / ')}）`).join('\n') : '- なし', '');
md.push('> 起票の前に、各ページの直近コミットと `.claude/todo/weekly.md` を見て対応済みでないことを確かめる。', '');

const exp = R.experiments.data;
md.push(`## 実験の期限（due ${exp?.dueCount ?? '—'} 件）`, '');
md.push(exp?.due?.length ? exp.due.map((d) => `- ${d.id} ${d.title.slice(0, 50)}: ${d.reasons.map((x) => `${x.kind} ${x.detail}`).join(' / ').slice(0, 200)}`).join('\n') : '- なし', '');

md.push('## 点検と Issue', '', block(R.checks, 60) + note(R.checks), '');
md.push('## バックログの関門', '', block(R.gate, 50) + note(R.gate), '');
md.push('## バックログの健全性', '', block(R.backlogHealth, 20) + note(R.backlogHealth), '');

const cand = [];
for (const c of R.search.data?.clusters ?? []) for (const x of c.candidates ?? []) if (!x.watched && !x.card && !x.legacyUrl) cand.push({ cluster: c.id, ...x });
cand.sort((a, b) => b.impressions - a.impressions);
md.push(`## 検索の改善候補（未起票 ${cand.length} 件・上位 3 件を起票する）`, '');
md.push(cand.length ? cand.slice(0, 5).map((x) => `- [${x.cluster}] ${x.page}「${x.queries?.[0]?.query ?? ''}」表示 ${x.impressions}・最高 ${x.bestPosition} 位`).join('\n') : (R.search.data ? '- なし' : `- （未取得・rc=${R.search.rc}）`), '');

const pick = (r, re, n = 8) => r.out.split('\n').filter((l) => re.test(l)).slice(0, n).join('\n');
md.push('## PSI と実ユーザー計測', '', '```', pick(R.psi, /coverage|CI ゲート違反|\*\*(TBT|CLS|LCP|SEO)/), pick(R.webVitals, /^実ユーザー|不良|要改善/), '```' + note(R.psi), '');
md.push('## note 同期', '', block(R.noteSync, 10) + note(R.noteSync), '');
md.push('## X 予約キュー', '', block(R.xQueue, 15) + note(R.xQueue), '');
const co = R.coconala.data;
md.push('## ココナラ取引', '', co ? `- 要対応 ${co.actionCount}・注意 ${co.warningCount}${co.inconclusive ? `・**検査不成立**（${co.reason}）` : ''}\n${(co.actions ?? []).map((a) => `- ${typeof a === 'string' ? a : JSON.stringify(a).slice(0, 160)}`).join('\n')}` : `（未取得・rc=${R.coconala.rc}）`, '');
const months = R.sales.out.split('\n').filter((l) => /^【\d{4}-\d{2}】/.test(l));
md.push('## 売上台帳', '', '```', pick(R.sales, /^最終更新/, 1), ...months.slice(-2), '```', '');

const markdown = md.join('\n').replace(/\n{3,}/g, '\n\n');

console.error(`${TAG} ${week}（窓 ${windowWeek}）: 材料 ${Object.keys(R).length} 本を実行 / 失敗 ${Object.values(R).filter(failed).length}（${Object.values(R).filter(failed).map((r) => r.id).join(', ') || 'なし'}）/ 必須の欠け ${missing.length}`);
for (const m of missing) console.error(`${TAG} ✗ 欠け: ${m}`);

if (args.print) process.stdout.write(markdown + '\n');
else if (!args.check) {
  const out = datasetPath('state.weekly-review-draft');
  const abs = join(REPO_ROOT, out);
  mkdirSync(dirname(abs), { recursive: true });
  const doc = {
    schemaVersion: 1,
    week,
    period,
    window: { week: windowWeek, ...windowPeriod },
    generatedAt: new Date().toISOString(),
    missing,
    inputs: Object.values(R).map((r) => ({ id: r.id, command: r.command, rc: r.rc })),
    markdown,
  };
  writeFileSync(abs, JSON.stringify(doc, null, 2) + '\n');
  console.error(`${TAG} → ${out}（読む: node scripts/build-weekly-review-draft.mjs --print か、このファイルの markdown）`);
}
process.exitCode = missing.length ? 1 : 0;
