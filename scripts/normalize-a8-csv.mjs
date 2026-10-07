#!/usr/bin/env node
/**
 * normalize-a8-csv.mjs — A8 レポート CSV を正規化して SSOT へ upsert（決定的・ネットワーク不要）
 * ---------------------------------------------------------------------------
 * fetch-a8-ui-csv.mjs が保存した run（raw CSV + manifest.json）を読み、
 *   1. <runDir>/normalized/<reportKey>.json（+ .rejects.json）を書く
 *   2. data/a8/report-log.json へ upsert（committed SSOT）。programPeriod は doboku 分（program あり）と当期の行だけ残す
 * 月次の成果（月×案件）は report-log の単月の期間から読み手が導く（resultsFromReportLog）。以前は results.json へ写していた。
 * raw CSV と manifest.json は書き換えない（append-only・監査可能性のため）。
 *
 * A8 は承認確定で過去月の数値が遡及変化するため、追記でなく **upsert**（最新 fetch が正）。
 *
 * CLI:
 *   node scripts/normalize-a8-csv.mjs --latest
 *   node scripts/normalize-a8-csv.mjs --run 2026-07-27T01-23-45-678Z
 *   node scripts/normalize-a8-csv.mjs --latest --dry-run   # SSOT を書かずに差分だけ表示
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { datasetDir, datasetPath } from "./lib/datasets.mjs";

import {
  decodeCsvBuffer,
  normalizeA8Csv,
  upsertBy,
  KEY,
  toResultsRecords,
  crossCheckAgainstSite,
  sumSiteRows,
  suggestMissingPrograms,
  keepProgramRows,
  resultsFromReportLog,
  REPORT_LOG_NOTES,
  normalizeA8ResultCsv,
} from "./lib/a8-report-csv.mjs";

const STATE_DIR = datasetDir("a8.ui-raw");
const REPORT_LOG = datasetPath("a8.report-log");
const CONFIG_PATH = datasetPath("config.a8-report-automation");

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
    else {
      // 知らない引数（--help の打ち間違い等）で黙って取り込みを走らせない（2026-09-26: --help で
      // 古い手元 run を取り込み、SSOT を書き換えた）
      console.error(`未知の引数: ${a[i]}\n使い方: node scripts/normalize-a8-csv.mjs [--latest | --run <dir>] [--dry-run]`);
      process.exit(a[i] === "--help" || a[i] === "-h" ? 0 : 2);
    }
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
    schemaVersion: 3,
    ...REPORT_LOG_NOTES,
    site,
    updatedAt: null,
    lastRun: null,
    period: null,
    siteSummary: [],
    monthly: [],
    daily: [],
    programPeriod: [],
    conversions: [],
    crossCheck: null,
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

  // 1 本も取れていない run を取り込むと、期間が null になり当期外の行が消えた SSOT で上書きしてしまう
  // （2026-10-07 実測・DN-0566）。何も書かずに止める。
  if (!(manifest.units || []).some((u) => u.status === "downloaded")) {
    console.error(`取得できたレポートが 0 本（${(manifest.units || []).map((u) => `${u.reportKey}=${u.status}`).join(", ") || "units なし"}）。SSOT は書き換えません。`);
    process.exit(1);
  }

  const outDir = join(runDir, "normalized");
  mkdirSync(outDir, { recursive: true });

  const log = readJson(REPORT_LOG, emptyReportLog(cfg.a8.targetSite));
  // 形を変えた旧版の欄を持ち越さない（schemaVersion 3: unmapped は missingProgramCandidates と同値なので廃止）
  log.schemaVersion = 3;
  Object.assign(log, REPORT_LOG_NOTES);
  delete log.unmapped;
  const perReport = [];
  let totalRejects = 0;

  for (const unit of manifest.units || []) {
    if (unit.status !== "downloaded") {
      console.log(`  skip ${unit.reportKey}（status=${unit.status}）`);
      continue;
    }
    // 成果別（1 成果 1 行・ページ付き）は形が違うので専用の正規化で conversions へ upsert する
    if (unit.reportKey === "result-detail") {
      // 成果の無い期間は CSV が無い（unit.noData・0 件の取得）
      const resR = unit.noData
        ? { rows: [], rejects: [], headers: [], fatal: null }
        : normalizeA8ResultCsv(decodeCsvBuffer(readFileSync(unit.rawFile), cfg.a8.csvEncoding).text, { cfg, fetchedAt: manifest.collectedAt });
      writeFileSync(join(outDir, "result-detail.json"), JSON.stringify({ reportKey: unit.reportKey, headers: resR.headers, rows: resR.rows }, null, 2), "utf-8");
      totalRejects += resR.rejects.length;
      if (resR.fatal) {
        console.error(`  result-detail: FATAL ${resR.fatal}（列名が変わった・SSOT へは入れない）`);
        perReport.push({ reportKey: unit.reportKey, rows: 0, rejects: resR.rejects.length, fatal: resR.fatal });
        continue;
      }
      log.conversions = upsertBy(log.conversions ?? [], resR.rows, KEY.conversions);
      perReport.push({ reportKey: unit.reportKey, rows: resR.rows.length, rejects: resR.rejects.length, fatal: null });
      console.log(`  result-detail: 成果 ${resR.rows.length} 件 upsert（このサイト分・reject ${resR.rejects.length}）`);
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
    const rejPath = join(outDir, `${unit.reportKey}.rejects.json`);
    if (res.rejects.length > 0) {
      writeFileSync(rejPath, JSON.stringify(res.rejects, null, 2), "utf-8");
    } else if (existsSync(rejPath)) {
      // 前回実行の reject が残ると次の監査で「まだ失敗している」と誤検知される（実走監査で指摘）
      rmSync(rejPath, { force: true });
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

  // 期間: 月次 rollup の根拠は **program-detail の期間**（unit 順に依存させない）。
  // 無ければ site-summary → 任意の順で拾う。
  const unitPeriod = (key) => (manifest.units || []).find((u) => u.reportKey === key)?.period ?? null;
  // 成果別（result-detail）は日単位の期間で、集計レポートの期間とは別物なので period の根拠にしない
  const aggregateUnits = (manifest.units || []).filter((u) => u.reportKey !== "result-detail");
  const period = unitPeriod("program-detail") || unitPeriod("site-summary") || aggregateUnits.map((u) => u.period).find(Boolean) || null;
  // 成果別だけの run（集計レポートを取っていない）は、期間・突合を前回のまま残して conversions だけを書く
  if (!aggregateUnits.some((u) => u.status === "downloaded")) {
    log.updatedAt = new Date().toISOString();
    log.lastRun = manifest.runId;
    if (!opts.dryRun) writeFileSync(REPORT_LOG, JSON.stringify(log, null, 2) + "\n", "utf-8");
    console.log(`\nSSOT: ${REPORT_LOG}（成果別だけを更新・conversions=${(log.conversions ?? []).length}）${opts.dryRun ? " [dry-run・書き込まない]" : ""}`);
    return;
  }
  log.period = period;

  // ★ 期間を揃える。SSOT は累計 run と単月 run の行が **併存**するため（upsert のキーに期間が入る）、
  //   期間で絞らずに合算すると別期間の値が混ざる。実測: 累計 137 + 単月 61 = 198 を
  //   サイト別 137 と比べて「混入の疑い」を誤報し、さらに累計行が当月の実績として
  //   月次の成果へ写された（2026-07-28・単月取得の初回実走で発覚）。
  const currentPeriod = period?.raw ?? null;
  const inCurrentPeriod = (r) => r.period === currentPeriod;
  // 口座横断のプログラム別は、doboku 分（program あり）と当期の行だけ残す（他サイト分の過去期間は読み手がいない）
  log.programPeriod = keepProgramRows(log.programPeriod, currentPeriod);

  // ★ 検算: 口座横断から抽出した doboku 分と、サイト別（真実源）の doboku-note 行を突合。
  //   期間が特定できない run（DL 失敗・対象データ 0 件で CSV ボタンが出ない等）では
  //   比較しない。ここで全期間を合算すると別期間の値が混ざって「混入の疑い」を誤報する
  //   （2026-01/02 のバックフィル時に実測）。
  const siteRow =
    currentPeriod == null
      ? null
      : sumSiteRows(
          (log.siteSummary || []).filter(inCurrentPeriod),
          // 口座横断のプログラム別は doboku のサイトと note の両方を含むので、その合計と比べる
          [cfg.a8.targetSite, ...(cfg.a8.relatedSites ?? [])],
        );
  if (currentPeriod == null) {
    log.crossCheck = { comparable: false, reason: "この run では期間を特定できない（有効な CSV が無い）" };
  } else {
    const allowlisted = (log.programPeriod || []).filter(inCurrentPeriod).filter((r) => r.program);
    log.crossCheck = crossCheckAgainstSite(siteRow, allowlisted);
    if (log.crossCheck) log.crossCheck.period = currentPeriod;
  }
  const allProgramRows = (log.programPeriod || []).filter(inCurrentPeriod);

  // ★ 取りこぼし検知: 口座横断レポートには stats47 のプログラムも並ぶので「未写像 = 取りこぼし」ではない。
  //   客観シグナルは **crossCheck の不足分**（サイト別 doboku-note 行を allowlist で説明しきれていない）。
  //   不足があるときだけ、未写像行から既知 stats47 を除いた候補を出す。
  const knownOtherSiteIds = Object.keys(cfg.a8._stats47Programs ?? {}).filter((k) => !k.startsWith("_"));
  log.missingProgramCandidates = log.crossCheck?.hasShortfall
    ? suggestMissingPrograms(allProgramRows, { knownOtherSiteIds })
    : [];

  // program-detail を月次の成果（月×案件）に写せるかを数える。**絞り込み前の全行を渡す**
  // （絞ってから渡すと unmapped 判定が構造上発火しない＝実走監査で発覚）。月次の行そのものは持たない（読み手が導く）。
  const { unmapped, notAttributable } = toResultsRecords(allProgramRows, {
    singleMonth: period?.singleMonth ?? null,
  });
  // 未写像の生リスト自体は stats47 込みでノイズが大きいので件数だけ持ち、判断材料は candidates に寄せる
  log.unmappedCount = unmapped.length;
  log.notAttributable = notAttributable;
  log.updatedAt = new Date().toISOString();
  log.lastRun = manifest.runId;

  if (opts.dryRun) {
    console.log("\n[dry-run] SSOT は書き込みません。");
  } else {
    writeFileSync(REPORT_LOG, JSON.stringify(log, null, 2) + "\n", "utf-8");
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
  console.log(`  月次の成果（単月の期間から導く月×案件）: ${resultsFromReportLog(log).length} 行`);
  if (notAttributable.length > 0) {
    console.warn(
      `\n[注意] 対象期間が単月でないため ${notAttributable.length} 件を月次の成果へ写せません。` +
        `\n  現在の期間: ${period?.raw ?? "不明"}。月次内訳には期間フォーム対応が必要（backlog 参照）。`,
    );
  }
  if (log.crossCheck?.hasShortfall) {
    const sf = log.crossCheck.shortfall;
    console.warn(
      `\n[要対応] サイト別の ${cfg.a8.targetSite} を allowlist で説明しきれていません` +
        `（不足 click ${sf.clicks ?? "-"} / 確定額 ${sf.revenueYen ?? "-"}）＝未登録プログラムの疑い。候補:`,
    );
    for (const c of log.missingProgramCandidates) {
      console.warn(`  - ${c.programId} "${c.programRaw.slice(0, 40)}" click=${c.clicks} 発生額=${c.grossRevenueYen}`);
    }
    console.warn(`  → 自社のものなら ${CONFIG_PATH} の a8.programIdMap に追記して再実行してください。`);
  } else {
    console.log(
      `  取りこぼし: なし（サイト別を allowlist で説明できている。口座横断の未写像 ${unmapped.length} 件は他サイト分）`,
    );
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
