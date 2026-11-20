#!/usr/bin/env node
/**
 * check-a8-ui-run.mjs — A8 の収集済み CSV・正規化結果の品質とサイト帰属の検査（旧 a8-csv-auditor の判定を移した・DN-1242）
 * ---------------------------------------------------------------------------
 * 2 層で見る。
 *   台帳層（data/a8/report-log.json・コミット済み・どの端末でも読める）
 *     帰属   siteSummary に targetSite の行が無い → FAIL。monthly / daily の accountWide が消えている → FAIL
 *     crossCheck  hasShortfall（自社の未登録案件が漏れている疑い）→ 収益のある取りこぼし候補があれば FAIL・無ければ WARN。
 *                 exceeded は構造的に起きる（A8 に口座切替が無い）ので classifyCrossCheck（超過がサイト別の 50% 超だけ異常）で FAIL / INFO を分ける
 *     時系列 siteSummary / monthly / daily / programPeriod の重複キー → FAIL
 *   run 層（data/a8/ui/<run>/・gitignore・取得した Mac だけ。既定は台帳の lastRun の run だけを見る。手元に無ければ台帳層だけで判定）
 *     帰属   manifest.mediaId が config の a8.mediaId と違う → FAIL
 *     取得   manifest.status=error・unit の status が downloaded でない・csvRows>0 でない・sha256 / rawFile が無い・不一致 → FAIL。
 *            期待 4 レポート（site-summary / program-detail / period-monthly / period-daily）の欠落 → WARN（site-summary は FAIL）。
 *            encoding が config の csvEncoding と違う・period が無い → WARN
 *     正規化 normalized の行数が csvRows の半分未満（列マッピング崩れ）→ WARN。rejects 件数 → WARN
 *     前回差分 site-summary のクリックが前回 run の 10 倍以上（混入の典型）→ WARN。承認件数・確定報酬が前回より減る（遡及で増えるのが正常）→ WARN
 *
 * 使い方: node scripts/checks/check-a8-ui-run.mjs [--run <runId>] [--root <repo>] [--json]
 * exit: 0=OK / 1=FAIL / 2=検査不成立（台帳も run も読めず実検査 0 件）
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, isAbsolute, join } from 'node:path';
import { parseCliArgs } from '../lib/cli-args.mjs';
import { datasetDir, datasetPath } from '../lib/datasets.mjs';
import { KEY } from '../lib/a8-report-csv.mjs';
import { classifyCrossCheck } from '../lib/report-honesty.mjs';
import { REPO_ROOT } from '../lib/repository-paths.mjs';
import { createFindings, exitCodeOf, listRunIds, readJsonOrNull, renderLines, sha256Of } from '../lib/run-audit.mjs';
import { isCliEntry } from '../lib/cli-run.mjs';

const TAG = '[check-a8-ui-run]';
export const EXPECTED_REPORTS = ['site-summary', 'program-detail', 'period-monthly', 'period-daily'];
export const CLICK_JUMP_RATIO = 10;
export const SHRINK_RATIO = 0.5;
const BUCKETS = [
  ['siteSummary', KEY.siteSummary],
  ['monthly', KEY.monthly],
  ['daily', KEY.daily],
  ['programPeriod', KEY.programPeriod],
];

function auditLedger(log, cfg, f) {
  let checked = 0;
  if (!log) { f.add('warn', 'A8 の成果台帳（a8.report-log）が読めない（台帳層を検査できない）'); return checked; }
  const target = cfg?.a8?.targetSite ?? 'doboku-note';
  checked += 1;
  if (!(log.siteSummary ?? []).some((r) => r.site === target)) f.add('fail', `siteSummary に ${target} の行が無い（分離された実績が取れていない）`);
  for (const [field, keyOf] of BUCKETS) {
    const rows = log[field];
    if (!Array.isArray(rows)) { f.add('fail', `${field} が配列でない`); continue; }
    checked += 1;
    const seen = new Set();
    const dup = new Set();
    for (const r of rows) { const k = keyOf(r); if (seen.has(k)) dup.add(k); seen.add(k); }
    if (dup.size > 0) f.add('fail', `${field} に重複キー ${dup.size} 件（例: ${[...dup][0]}）`);
  }
  for (const field of ['monthly', 'daily']) {
    const lost = (log[field] ?? []).filter((r) => r.accountWide !== true).length;
    if (lost > 0) f.add('fail', `${field} の ${lost} 行で accountWide が消えている（口座横断の事実が落ち、自サイト単独の実績と読まれる）`);
  }
  checked += 1;
  const cc = log.crossCheck;
  if (!cc || cc.comparable === false) f.add('warn', `crossCheck が比較不能（${cc?.reason ?? '記録なし'}）`);
  else {
    const c = classifyCrossCheck(cc);
    if (c.shortfall) {
      const rich = (log.missingProgramCandidates ?? []).filter((x) => (x.revenueYen ?? 0) > 0 || (x.grossRevenueYen ?? 0) > 0);
      if (rich.length > 0) f.add('fail', `crossCheck に不足（自社の未登録案件の疑い）・収益のある取りこぼし候補 ${rich.length} 件`);
      else f.add('warn', `crossCheck に不足（allowlist が自社の行に届いていない）・候補 ${(log.missingProgramCandidates ?? []).length} 件`);
    }
    if (c.abnormal) f.add('fail', `crossCheck の超過が想定外（超過 ${c.excessClicks} クリック＝サイト別 ${c.siteClicks} の ${Math.round(100 * c.excessRatio)}%・上限 ${c.limit * 100}%）。他サイト混入か写像ミス`);
    else if (c.exceeded) f.add('info', `crossCheck の超過は想定内（口座横断が構造的に上回る・比 ${c.excessRatio == null ? '-' : Math.round(100 * c.excessRatio)}%）`);
  }
  if ((log.notAttributable ?? []).length > 0) f.add('info', `notAttributable ${(log.notAttributable).length} 件（対象期間が単月でなく月次へ写せない・異常ではない）`);
  return checked;
}

function resolveRaw(dir, root, rawFile) {
  if (!rawFile) return null;
  for (const p of [isAbsolute(rawFile) ? rawFile : null, join(dir, basename(rawFile)), join(root, rawFile)]) if (p && existsSync(p)) return p;
  return null;
}

function auditRun({ root, base, id, runs, cfg, f }) {
  const dir = join(base, id);
  const manifest = readJsonOrNull(join(dir, 'manifest.json'));
  let checked = 0;
  if (!manifest) { f.add('fail', `${id}: manifest.json が読めない`); return checked; }
  checked += 1;
  if (cfg?.a8?.mediaId && manifest.mediaId !== cfg.a8.mediaId) f.add('fail', `${id}: manifest.mediaId（${manifest.mediaId}）が config の口座（${cfg.a8.mediaId}）と違う`);
  if (manifest.status === 'error') f.add('fail', `${id}: manifest.status=error（${String(manifest.error ?? '').slice(0, 100)}）`);
  else if (manifest.status && manifest.status !== 'ok') f.add('warn', `${id}: manifest.status=${manifest.status}`);

  const units = Array.isArray(manifest.units) ? manifest.units : [];
  const prevId = runs.filter((r) => r < id).at(-1) ?? null;
  for (const key of EXPECTED_REPORTS) {
    const u = units.find((x) => x.reportKey === key);
    if (!u) f.add(key === 'site-summary' ? 'fail' : 'warn', `${id}: ${key} が manifest に無い${key === 'site-summary' ? '（分離された実績が取れていない）' : ''}`);
  }
  for (const u of units) {
    const k = u.reportKey;
    checked += 1;
    if (u.status !== 'downloaded') { f.add(k === 'site-summary' ? 'fail' : 'warn', `${k}: status=${u.status}${u.error ? `（${String(u.error).slice(0, 80)}）` : ''}`); continue; }
    if (!(u.csvRows > 0)) f.add('warn', `${k}: csvRows=${u.csvRows}`);
    const raw = resolveRaw(dir, root, u.rawFile);
    if (!raw) f.add('fail', `${k}: rawFile が実在しない（${u.rawFile ?? 'null'}）`);
    else if (!u.sha256) f.add('fail', `${k}: manifest に sha256 が無い`);
    else if (sha256Of(readFileSync(raw)) !== u.sha256) f.add('fail', `${k}: sha256 が不一致（改竄または再取得）`);
    if (!u.period) f.add('warn', `${k}: period が記録されていない`);
    const norm = readJsonOrNull(join(dir, 'normalized', `${k}.json`));
    if (!norm) { f.add('fail', `${k}: normalized/${k}.json が無い（正規化もれ）`); continue; }
    if (cfg?.a8?.csvEncoding && norm.encoding && norm.encoding.toLowerCase().replace(/[-_]/g, '') !== cfg.a8.csvEncoding.toLowerCase().replace(/[-_]/g, '')) {
      f.add('warn', `${k}: encoding ${norm.encoding} が config（${cfg.a8.csvEncoding}）と違う（自動切替・config 更新候補）`);
    }
    if (u.csvRows > 0 && (norm.rows?.length ?? 0) < u.csvRows * SHRINK_RATIO) f.add('warn', `${k}: 正規化 ${norm.rows?.length ?? 0} 行 / csvRows ${u.csvRows}（列マッピング崩れの疑い）`);
    const rej = readJsonOrNull(join(dir, 'normalized', `${k}.rejects.json`));
    if (Array.isArray(rej) && rej.length > 0) f.add('warn', `${k}: reject ${rej.length} 件`);
    if (prevId && (k === 'site-summary')) compareWithPrev({ base, prevId, k, norm, f });
  }
  return checked;
}

function compareWithPrev({ base, prevId, k, norm, f }) {
  const prev = readJsonOrNull(join(base, prevId, 'normalized', `${k}.json`));
  if (!prev?.rows) return;
  const prevBy = new Map(prev.rows.map((r) => [KEY.siteSummary(r), r]));
  for (const r of norm.rows ?? []) {
    const p = prevBy.get(KEY.siteSummary(r));
    if (!p) continue;
    if (p.clicks > 0 && r.clicks >= p.clicks * CLICK_JUMP_RATIO) f.add('warn', `${k}: ${r.site} のクリックが前回 ${p.clicks} → ${r.clicks}（${CLICK_JUMP_RATIO} 倍以上＝混入の典型）`);
    for (const field of ['approved', 'revenueYen']) {
      if (typeof p[field] === 'number' && typeof r[field] === 'number' && r[field] < p[field]) f.add('warn', `${k}: ${r.site} の ${field} が前回 ${p[field]} → ${r[field]} に減少（確定処理の遡及は増えるのが正常）`);
    }
  }
}

export function auditA8({ root, runId = null }) {
  const f = createFindings();
  const cfg = readJsonOrNull(join(root, datasetPath('config.a8-report-automation')));
  const log = readJsonOrNull(join(root, datasetPath('a8.report-log')));
  let checked = auditLedger(log, cfg, f);
  const base = join(root, datasetDir('a8.ui-raw'));
  const runs = listRunIds(base);
  // 既定は台帳の元になった取得（report-log の lastRun）だけを見る。手元に残った古い run を毎週見ると、
  // 台帳が別の取得で進んでいても古い失敗で段が赤くなる（2026-11-18・手元の最新 run は 09-07、台帳の lastRun は 11-14）
  const id = runId ?? (log?.lastRun && runs.includes(log.lastRun) ? log.lastRun : null);
  if (id) checked += auditRun({ root, base, id, runs, cfg, f });
  else if (runs.length === 0) f.add('info', 'raw の run が無い（gitignore・取得した Mac にだけある）。台帳層だけで判定');
  else f.add('info', `台帳の元の run（lastRun ${log?.lastRun ?? '記録なし'}）が手元に無い。手元の古い run（最新 ${runs.at(-1)}）は見ず、台帳層だけで判定（見るなら --run）`);
  return { check: 'a8-ui-run', runId: id, checked, fail: f.fail, warn: f.warn, info: f.info };
}

const isMain = isCliEntry(import.meta.url);
if (isMain) {
  const args = parseCliArgs({ run: { type: 'string' }, root: { type: 'string' }, json: { type: 'boolean' } });
  const r = auditA8({ root: args.root ?? REPO_ROOT, runId: args.run });
  const code = exitCodeOf(r);
  if (args.json) console.log(JSON.stringify({ ...r, exit: code }, null, 2));
  else {
    for (const l of renderLines(TAG, r)) console.log(l);
    console.log(`${TAG} run=${r.runId ?? 'なし'} 実検査 ${r.checked} / FAIL ${r.fail.length} / WARN ${r.warn.length}`);
    if (code === 2) console.error(`${TAG} 検査不成立: 実検査 0 件`);
  }
  process.exit(code);
}
