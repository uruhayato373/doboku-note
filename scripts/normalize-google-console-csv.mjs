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
 *   <runDir>/normalized/<issueKey>--<scope>.json
 *   <runDir>/normalized/<issueKey>--<scope>.rejects.json   （reject があるときのみ）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, basename, isAbsolute } from "node:path";
import { loadConfig } from "./lib/google-console-browser.mjs";
import { normalizePageIndexingCsv } from "./lib/google-console-csv.mjs";

const STATE_DIR = ".claude/state/metrics/gsc-ui";

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

function resolveRunDir(o) {
  if (o.run) return isAbsolute(o.run) || o.run.includes("/") ? o.run : join(STATE_DIR, o.run);
  if (o.latest) {
    if (!existsSync(STATE_DIR)) return null;
    const runs = readdirSync(STATE_DIR)
      .filter((f) => existsSync(join(STATE_DIR, f, "manifest.json")))
      .sort();
    return runs.length ? join(STATE_DIR, runs[runs.length - 1]) : null;
  }
  return null;
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

  const units = (manifest.units || []).filter((u) => u.rawFile && u.status === "downloaded");
  if (!units.length) {
    console.warn("正規化対象（downloaded な rawFile 付きユニット）がありません。");
    return;
  }
  for (const u of units) {
    const csvPath = join(runDir, u.rawFile);
    if (!existsSync(csvPath)) {
      console.warn(`  [skip] raw CSV 不在: ${u.rawFile}`);
      continue;
    }
    // manifest のユニットは issueKey を持つ（normalizeOne は meta.issue を使う）ため写像する。
    normalizeOne(
      readFileSync(csvPath, "utf-8"),
      { ...u, issue: u.issue ?? u.issueKey, runId: manifest.runId, property: manifest.property },
      outDir,
      cfg,
    );
  }
  console.log(`\n完了: ${units.length} ユニットを ${outDir} へ正規化しました（raw/manifest は不変）。`);
}

main();
