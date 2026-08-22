#!/usr/bin/env node
/**
 * normalize-google-console-csv.mjs — GSC UI CSV をロケール非依存の共通 JSON へ正規化
 * ---------------------------------------------------------------------------
 * fetch-gsc-ui-csv.mjs が保存した run ディレクトリの manifest.json を読み、各ユニットの
 * raw CSV を共通 JSON（scripts/lib/google-console-csv.mjs）へ変換する。
 *
 * CLI:
 *   node scripts/normalize-google-console-csv.mjs --latest
 *   node scripts/normalize-google-console-csv.mjs --run 2026-07-24T12-00-00Z
 *   node scripts/normalize-google-console-csv.mjs --run .claude/state/metrics/gsc-ui/<run>
 *   node scripts/normalize-google-console-csv.mjs --file path/to.csv --issue crawledNotIndexed --scope allSubmittedPages --ui-total 346
 *
 * 出力（raw CSV・manifest は上書きしない）:
 *   <runDir>/normalized/<issueKey>--<scope>.json          （run ローカル・gitignore）
 *   <runDir>/normalized/<issueKey>--<scope>.rejects.json   （reject があるときのみ）
 *   .claude/state/metrics/gsc-ui/ssot/urls/<issueKey>--<scope>.json  （**追跡 SSOT**）
 *   .claude/state/metrics/gsc-ui/ssot/history.json                    （**追跡** run 別件数履歴）
 *   .claude/state/metrics/gsc-ui/ssot/diff/<runId>.json               （**追跡** URL 増減）
 *
 * SSOT を書く理由: raw CSV は再取得しかできない（再生成不可）のに run ディレクトリは gitignore で、
 * worktree を捨てると URL レベルの情報が消えていた（2026-07-23 の 1,952 行が実際に消失）。
 * 詳細 → scripts/lib/google-console-ssot.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, basename, isAbsolute } from "node:path";
import { loadConfig } from "./lib/google-console-browser.mjs";
import { normalizePageIndexingCsv } from "./lib/google-console-csv.mjs";
import { writeUnitSsot, writeRunDiff, appendHistory, ssotDir } from "./lib/google-console-ssot.mjs";

const STATE_DIR = ".claude/state/metrics/gsc-ui";
const CHANNEL = "gsc-ui";

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { run: null, latest: false, file: null, issue: null, scope: null, uiTotal: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--latest") o.latest = true;
    else if (a[i] === "--run") o.run = a[++i];
    else if (a[i] === "--file") o.file = a[++i];
    else if (a[i] === "--issue") o.issue = a[++i];
    else if (a[i] === "--scope") o.scope = a[++i];
    else if (a[i] === "--ui-total") o.uiTotal = parseInt(a[++i], 10);
  }
  return o;
}

/**
 * run ディレクトリを決める。**--run も --file も無ければ --latest とみなす**。
 *
 * なぜ既定を latest にしたか（2026-07-30）: `npm run search-growth:audit` は
 * `gsc-ui:fetch && google-console:normalize && search-growth:report` という連鎖だが、
 * 途中の normalize は **引数なしで呼ばれていたため常に「run ディレクトリが見つかりません」で
 * exit 2** し、report まで到達できなかった（＝合成コマンドが一度も通っていなかった）。
 * 取得直後に正規化したいのが唯一の意図なので、既定を最新 run にする。
 */
function resolveRunDir(o) {
  if (o.run) return isAbsolute(o.run) || o.run.includes("/") ? o.run : join(STATE_DIR, o.run);
  if (!existsSync(STATE_DIR)) return null;
  const runs = readdirSync(STATE_DIR)
    .filter((f) => existsSync(join(STATE_DIR, f, "manifest.json")))
    .sort();
  return runs.length ? join(STATE_DIR, runs[runs.length - 1]) : null;
}

function normalizeOne(csvText, meta, outDir, cfg) {
  const norm = normalizePageIndexingCsv(csvText, {
    schemaVersion: 1,
    source: "gsc-ui-page-indexing",
    runId: meta.runId,
    property: meta.property || cfg.gsc.property,
    issue: meta.issue,
    scope: meta.scope,
    uiTotal: meta.uiTotal,
    sampleUrlCap: cfg.gsc.sampleUrlCap || 1000,
  });
  mkdirSync(outDir, { recursive: true });
  const stem = `${meta.issue}--${meta.scope}`;
  const outPath = join(outDir, `${stem}.json`);
  writeFileSync(outPath, JSON.stringify(norm, null, 2), "utf-8");
  if (norm.rejects.length) {
    writeFileSync(join(outDir, `${stem}.rejects.json`), JSON.stringify(norm.rejects, null, 2), "utf-8");
  }
  console.log(
    `  ${stem}: rows=${norm.exportedRows} rejects=${norm.rejects.length}` +
      `${norm.truncated ? " (truncated)" : ""} uiTotal=${norm.uiTotal ?? "?"} → ${outPath}`,
  );
  return norm;
}

function main() {
  const o = parseArgs();
  const cfg = loadConfig();

  // 単発ファイルモード
  if (o.file) {
    if (!o.issue || !o.scope) {
      console.error("--file には --issue と --scope が必須です。");
      process.exit(2);
    }
    const csvText = readFileSync(o.file, "utf-8");
    const outDir = join(process.cwd(), ".claude/state/metrics/gsc-ui/_adhoc");
    normalizeOne(csvText, { runId: "adhoc", issue: o.issue, scope: o.scope, uiTotal: o.uiTotal, property: cfg.gsc.property }, outDir, cfg);
    return;
  }

  const runDir = resolveRunDir(o);
  if (!runDir || !existsSync(join(runDir, "manifest.json"))) {
    console.error("run ディレクトリが見つかりません。--run <id|path> または --latest を指定してください。");
    process.exit(2);
  }
  const manifest = JSON.parse(readFileSync(join(runDir, "manifest.json"), "utf-8"));
  const outDir = join(runDir, "normalized");
  console.log(`正規化: ${runDir}（run ${manifest.runId}）`);

  const allUnits = manifest.units || [];
  const units = allUnits.filter((u) => u.rawFile && u.status === "downloaded");
  // §9: 「対象 0 件で何もしなかった」を成功として返さない。manifest はあるのに downloaded が
  // 1 件も無い＝取得が全滅している run なので、正規化は不成立として exit 1 にする。
  if (!units.length) {
    console.error(
      `[normalize] ✗ 正規化不成立: manifest のユニット ${allUnits.length} 件中、downloaded は 0 件` +
        `（run=${manifest.runId} status=${manifest.status ?? "?"}）。先に取得をやり直してください。`,
    );
    process.exit(1);
  }

  let skipped = 0;
  const ssotResults = [];
  for (const u of units) {
    const csvPath = join(runDir, u.rawFile);
    if (!existsSync(csvPath)) {
      console.warn(`  [skip] raw CSV 不在: ${u.rawFile}`);
      skipped += 1;
      continue;
    }
    // manifest のユニットは issueKey を持つ（normalizeOne は meta.issue を使う）ため写像する。
    const issue = u.issue ?? u.issueKey;
    const norm = normalizeOne(
      readFileSync(csvPath, "utf-8"),
      { ...u, issue, runId: manifest.runId, property: manifest.property },
      outDir,
      cfg,
    );
    // 追跡 SSOT へ反映（run ディレクトリが消えても URL 情報が残る）
    const res = writeUnitSsot(CHANNEL, {
      issue,
      scope: u.scope,
      norm,
      collectedAt: manifest.collectedAt,
    });
    ssotResults.push(res);
    console.log(
      `    → ssot/urls/${res.key}.json (rows=${res.rows}` +
        `${res.previousRows != null ? ` / 前回 ${res.previousRows}・+${res.added.length}/-${res.removed.length}` : " / 初回"})`,
    );
  }

  const normalized = ssotResults.length;
  if (normalized === 0) {
    console.error(`[normalize] ✗ 正規化不成立: downloaded ${units.length} 件すべてで raw CSV が不在（skip ${skipped}）。`);
    process.exit(1);
  }

  writeRunDiff(CHANNEL, { runId: manifest.runId, collectedAt: manifest.collectedAt, units: ssotResults });
  appendHistory(CHANNEL, {
    runId: manifest.runId,
    collectedAt: manifest.collectedAt,
    property: manifest.property,
    status: manifest.status ?? null,
    complete: manifest.completeness?.complete ?? null,
    manifestUnits: allUnits.length,
    downloadedUnits: units.length,
    normalizedUnits: normalized,
    skippedUnits: skipped,
    totalRows: ssotResults.reduce((n, r) => n + r.rows, 0),
    units: ssotResults.map((r) => ({ unit: r.key, rows: r.rows, added: r.added.length, removed: r.removed.length })),
  });

  console.log(
    `\n完了: manifest ${allUnits.length} ユニット中 downloaded ${units.length} → 正規化 ${normalized}・skip ${skipped}` +
      `（合計 ${ssotResults.reduce((n, r) => n + r.rows, 0)} 行）。SSOT: ${ssotDir(CHANNEL)}（raw/manifest は不変）`,
  );
  // 一部でも skip があれば不完全として非 0（呼出側の && 連鎖を止める）
  process.exit(skipped > 0 ? 2 : 0);
}

main();
