#!/usr/bin/env node
/**
 * normalize-a8-csv.mjs — A8 レポート CSV を正規化して SSOT へ upsert（決定的・ネットワーク不要）
 * ---------------------------------------------------------------------------
 * fetch-a8-ui-csv.mjs が保存した run（raw CSV + manifest.json）を読み、
 *   1. <runDir>/normalized/<reportKey>.json（+ .rejects.json）を書く
 *   2. .claude/state/metrics/affiliate/a8-report-log.json へ upsert（committed SSOT）
 *   3. .claude/state/metrics/affiliate/a8-results.json の records へ rollup（既存スキーマ維持）
 * raw CSV と manifest.json は書き換えない（append-only・監査可能性のため）。
 *
 * A8 は承認確定で過去月の数値が遡及変化するため、追記でなく **upsert**（最新 fetch が正）。
 *
 * CLI:
 *   node scripts/normalize-a8-csv.mjs --latest
 *   node scripts/normalize-a8-csv.mjs --run 2026-07-27T01-23-45-678Z
 *   node scripts/normalize-a8-csv.mjs --latest --dry-run   # SSOT を書かずに差分だけ表示
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  decodeCsvBuffer,
  normalizeA8Csv,
  upsertBy,
  KEY,
  toResultsRecords,
  crossCheckAgainstSite,
} from "./lib/a8-report-csv.mjs";

const STATE_DIR = ".claude/state/metrics/affiliate/a8-ui";
const AFF_DIR = ".claude/state/metrics/affiliate";
const REPORT_LOG = join(AFF_DIR, "a8-report-log.json");
const RESULTS = join(AFF_DIR, "a8-results.json");
const CONFIG_PATH = ".claude/config/a8-report-automation.json";

/** reportKey → a8-report-log.json 内の配列名とキー関数。 */
const BUCKET = {
  "site-summary": { field: "siteSummary", key: KEY.siteSummary },
  "period-monthly": { field: "monthly", key: KEY.monthly },
  "period-daily": { field: "daily", key: KEY.daily },
  "program-detail": { field: "programPeriod", key: KEY.programPeriod },
};

function parseArgs() {
  const a = process.argv.slice(2);
  const opts = { latest: false, run: null, dryRun: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--latest") opts.latest = true;
    else if (a[i] === "--dry-run") opts.dryRun = true;
    else if (a[i] === "--run") opts.run = a[++i];
  }
  if (!opts.latest && !opts.run) opts.latest = true;
  return opts;
}

function resolveRunDir(opts) {
  if (opts.run) {
    const direct = existsSync(opts.run) ? opts.run : join(STATE_DIR, opts.run);
    if (!existsSync(direct)) throw new Error(`run が見つかりません: ${opts.run}`);
    return direct;
  }
  if (!existsSync(STATE_DIR)) throw new Error(`run ディレクトリがありません: ${STATE_DIR}（先に a8-ui:fetch を実行）`);
  const dirs = readdirSync(STATE_DIR)
    .map((n) => join(STATE_DIR, n))
    .filter((p) => statSync(p).isDirectory() && existsSync(join(p, "manifest.json")))
    .sort();
  if (dirs.length === 0) throw new Error(`manifest を持つ run がありません: ${STATE_DIR}`);
  return dirs[dirs.length - 1];
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return fallback;
  }
}

function emptyReportLog(site) {
  return {
    schemaVersion: 2,
    _comment:
      "A8 レポート CSV（fetch-a8-ui-csv.mjs）の正規化 SSOT。A8 は確定処理で過去分が遡及変化するため upsert 運用（最新 fetch が正）。手で編集しない。",
    _siteScopeNote:
      "siteSummary のみ doboku-note に完全分離された実績（真実源）。monthly / daily / programPeriod は **口座横断**（stats47 込み）で、programPeriod は programIdMap の allowlist で doboku 分だけを抽出したもの。crossCheck が siteSummary との突合結果。",
    site,
    updatedAt: null,
    lastRun: null,
    period: null,
    siteSummary: [],
    monthly: [],
    daily: [],
    programPeriod: [],
    crossCheck: null,
    unmapped: [],
    notAttributable: [],
  };
}

function main() {
  const opts = parseArgs();
  const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  const runDir = resolveRunDir(opts);
  const manifest = readJson(join(runDir, "manifest.json"), null);
  if (!manifest) throw new Error(`manifest.json を読めません: ${runDir}`);

  console.log(`run: ${runDir}（collectedAt=${manifest.collectedAt} site=${manifest.site}）`);

  if (manifest.site !== cfg.a8.targetSite) {
    console.error(`manifest の site (${manifest.site}) が config の targetSite (${cfg.a8.targetSite}) と不一致。取り込みを中止します。`);
    process.exit(5);
  }

  const outDir = join(runDir, "normalized");
  mkdirSync(outDir, { recursive: true });

  const log = readJson(REPORT_LOG, emptyReportLog(cfg.a8.targetSite));
  const perReport = [];
  let totalRejects = 0;

  for (const unit of manifest.units || []) {
    if (unit.status !== "downloaded") {
      console.log(`  skip ${unit.reportKey}（status=${unit.status}）`);
      continue;
    }
    const bucket = BUCKET[unit.reportKey];
    if (!bucket) {
      console.warn(`  [warn] 未知の reportKey: ${unit.reportKey}（バケット未定義・スキップ）`);
      continue;
    }
    const decoded = decodeCsvBuffer(readFileSync(unit.rawFile), cfg.a8.csvEncoding);
    const res = normalizeA8Csv(decoded.text, {
      reportKey: unit.reportKey,
      cfg,
      fetchedAt: manifest.collectedAt,
    });
    // 期間は URL で制御できず CSV ファイル名にしか出ないので、行に焼き込んで upsert キーに使う
    const periodRaw = unit.period?.raw ?? null;
    for (const row of res.rows) row.period = periodRaw;

    writeFileSync(join(outDir, `${unit.reportKey}.json`), JSON.stringify({ reportKey: unit.reportKey, encoding: decoded.encoding, headers: res.headers, rows: res.rows }, null, 2), "utf-8");
    if (res.rejects.length > 0) {
      writeFileSync(join(outDir, `${unit.reportKey}.rejects.json`), JSON.stringify(res.rejects, null, 2), "utf-8");
    }
    totalRejects += res.rejects.length;

    if (res.fatal) {
      console.error(`  ${unit.reportKey}: FATAL ${res.fatal}（列マッピング要調整・SSOT へは入れない）`);
      perReport.push({ reportKey: unit.reportKey, rows: 0, rejects: res.rejects.length, fatal: res.fatal });
      continue;
    }

    log[bucket.field] = upsertBy(log[bucket.field], res.rows, bucket.key);
    perReport.push({ reportKey: unit.reportKey, rows: res.rows.length, rejects: res.rejects.length, fatal: null });
    console.log(`  ${unit.reportKey}: ${res.rows.length} 行 upsert（reject ${res.rejects.length}）`);
  }

  // 期間（この run が実際に取れた期間。A8 の既定は年初〜当月の累計）
  const period = (manifest.units || []).map((u) => u.period).find(Boolean) || null;
  log.period = period;

  // ★ 検算: 口座横断から抽出した doboku 分が、サイト別（真実源）の doboku-note 行を超えていないか
  const siteRow = (log.siteSummary || []).find((r) => String(r.site || "").includes(cfg.a8.targetSite));
  const allowlisted = (log.programPeriod || []).filter((r) => r.program);
  log.crossCheck = crossCheckAgainstSite(siteRow, allowlisted);

  // program-detail から a8-results.json（既存スキーマ＝月次）へ rollup。
  // A8 の既定期間は複数月にまたがるため、単月 run のときだけ月次へ写す。
  const { records, unmapped, notAttributable } = toResultsRecords(allowlisted, {
    singleMonth: period?.singleMonth ?? null,
  });
  log.unmapped = unmapped;
  log.notAttributable = notAttributable;
  log.updatedAt = new Date().toISOString();
  log.lastRun = manifest.runId;

  const results = readJson(RESULTS, { records: [] });
  const beforeCount = (results.records || []).length;
  results.records = upsertBy(results.records || [], records, KEY.results);
  results.updatedAt = log.updatedAt;
  results.source = "fetch-a8-ui-csv.mjs → normalize-a8-csv.mjs（自動取込。手入力は不要）";

  if (opts.dryRun) {
    console.log("\n[dry-run] SSOT は書き込みません。");
  } else {
    writeFileSync(REPORT_LOG, JSON.stringify(log, null, 2) + "\n", "utf-8");
    writeFileSync(RESULTS, JSON.stringify(results, null, 2) + "\n", "utf-8");
  }

  console.log(`\nSSOT: ${REPORT_LOG}（期間 ${period?.raw ?? "不明"}）`);
  console.log(
    `  siteSummary=${log.siteSummary.length} monthly=${log.monthly.length} daily=${log.daily.length} programPeriod=${log.programPeriod.length}`,
  );
  if (siteRow) {
    console.log(
      `  ${cfg.a8.targetSite}: click=${siteRow.clicks} 発生=${siteRow.conversions} 発生額=${siteRow.grossRevenueYen} 確定=${siteRow.approved} 確定額=${siteRow.revenueYen} キャンセル=${siteRow.cancelledCount}`,
    );
  } else {
    console.warn(`  [警告] サイト別レポートに ${cfg.a8.targetSite} 行が無い＝分離された実績を取れていない`);
  }
  if (log.crossCheck?.comparable) {
    const d = log.crossCheck.deltas;
    console.log(
      `  検算（allowlist 抽出 vs サイト別）: click ${d.clicks.picked}/${d.clicks.site} · 確定額 ${d.revenueYen.picked}/${d.revenueYen.site}` +
        (log.crossCheck.exceeded ? "  ← ★超過＝他サイト混入の疑い" : "  ← 範囲内"),
    );
  }
  console.log(`SSOT: ${RESULTS} records ${beforeCount} → ${results.records.length}`);
  if (notAttributable.length > 0) {
    console.warn(
      `\n[注意] 対象期間が単月でないため ${notAttributable.length} 件を a8-results.json（月次）へ写していません。` +
        `\n  現在の期間: ${period?.raw ?? "不明"}。月次内訳には期間フォーム対応が必要（backlog 参照）。`,
    );
  }
  if (unmapped.length > 0) {
    console.warn(`\n[要対応] programIdMap に無いプログラムが ${unmapped.length} 件あります（a8-results.json へ未反映）:`);
    for (const u of unmapped.slice(0, 10)) console.warn(`  - ${u.programId ?? "-"} "${u.programRaw}"`);
    console.warn(`  → ${CONFIG_PATH} の a8.programIdMap に追記して再実行してください。`);
  }
  if (totalRejects > 0) console.warn(`[要確認] reject 行 ${totalRejects} 件（normalized/*.rejects.json）`);
  if (perReport.some((r) => r.fatal)) process.exitCode = 4;
}

try {
  main();
} catch (e) {
  console.error("Fatal:", e?.message || e);
  process.exit(1);
}
