#!/usr/bin/env node
/**
 * SEO meta 閾値チェック
 *
 * `.claude/state/metrics/seo-meta/` の最新スナップショット（または --file 指定）を読み、
 * Severity 別に違反を Markdown 表形式で表示する。CI / agent surface 用。
 *
 * Usage:
 *   npm run check-seo-meta:check                              # 最新スナップショット
 *   npm run check-seo-meta:check -- --file <path.json>        # 任意ファイル
 *   npm run check-seo-meta:check -- --output report.md        # Markdown ファイル出力
 *   npm run check-seo-meta:check -- --severity HIGH           # HIGH のみ表示
 *   npm run check-seo-meta:check -- --exit-on-violation       # 違反があれば exit 1
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const STATE_DIR = ".claude/state/metrics/seo-meta";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { file: null, output: null, severity: null, exitOnViolation: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--file": opts.file = args[++i]; break;
      case "--output": opts.output = args[++i]; break;
      case "--severity": opts.severity = args[++i]; break;
      case "--exit-on-violation": opts.exitOnViolation = true; break;
    }
  }
  return opts;
}

function findLatest() {
  try {
    const files = readdirSync(STATE_DIR).filter((f) => f.startsWith("seo-meta-") && f.endsWith(".json"));
    if (files.length === 0) return null;
    const withMtime = files.map((f) => ({ f, mtime: statSync(join(STATE_DIR, f)).mtimeMs }));
    withMtime.sort((a, b) => b.mtime - a.mtime);
    return join(STATE_DIR, withMtime[0].f);
  } catch (_) {
    return null;
  }
}

function severityRank(sev) {
  return ({ HIGH: 0, MEDIUM: 1, LOW: 2 })[sev] ?? 99;
}

function render(snapshot, opts) {
  const lines = [];
  lines.push(`# SEO meta 監査結果`);
  lines.push("");
  lines.push(`- 生成: ${snapshot.generated_at}`);
  lines.push(`- base_url: ${snapshot.base_url}`);
  lines.push(`- 巡回 URL: ${snapshot.summary.urls_checked}`);
  lines.push(`- 違反あり: ${snapshot.summary.urls_with_violations} URL`);
  lines.push(`- Severity 内訳: HIGH=${snapshot.summary.by_severity.HIGH} / MEDIUM=${snapshot.summary.by_severity.MEDIUM} / LOW=${snapshot.summary.by_severity.LOW}`);
  lines.push(`- 所要時間: ${snapshot.summary.duration_ms} ms`);
  lines.push("");

  // Group violations by url
  const byUrl = new Map();
  for (const r of snapshot.results || []) {
    if (!r.violations || r.violations.length === 0) continue;
    const filtered = opts.severity ? r.violations.filter((v) => v.severity === opts.severity) : r.violations;
    if (filtered.length === 0) continue;
    byUrl.set(r.url, filtered);
  }

  if (byUrl.size === 0) {
    lines.push("✅ 違反なし");
    return { text: lines.join("\n"), violationCount: 0 };
  }

  // Sort URLs by max severity
  const sorted = Array.from(byUrl.entries()).sort((a, b) => {
    const aMax = Math.min(...a[1].map((v) => severityRank(v.severity)));
    const bMax = Math.min(...b[1].map((v) => severityRank(v.severity)));
    return aMax - bMax;
  });

  lines.push("## 違反一覧");
  lines.push("");
  lines.push("| Severity | URL | 種別 | 詳細 |");
  lines.push("|---|---|---|---|");

  let count = 0;
  for (const [url, violations] of sorted) {
    for (const v of violations.sort((a, b) => severityRank(a.severity) - severityRank(b.severity))) {
      const detailParts = [v.message];
      if (v.length !== undefined) detailParts.push(`length=${v.length}`);
      if (v.count !== undefined) detailParts.push(`count=${v.count}`);
      if (v.key) detailParts.push(`key=${v.key}`);
      lines.push(`| ${v.severity} | \`${url}\` | ${v.type} | ${detailParts.join(" / ")} |`);
      count++;
    }
  }

  lines.push("");
  lines.push(`合計違反: ${count} 件`);
  return { text: lines.join("\n"), violationCount: count };
}

function main() {
  const opts = parseArgs();
  const path = opts.file || findLatest();
  if (!path) {
    console.error("スナップショットが見つかりません。先に `npm run check-seo-meta` を実行してください。");
    process.exit(2);
  }
  const snapshot = JSON.parse(readFileSync(path, "utf-8"));
  const { text, violationCount } = render(snapshot, opts);

  if (opts.output) {
    writeFileSync(opts.output, text + "\n");
    console.log(`出力: ${opts.output}`);
  } else {
    console.log(text);
  }

  if (opts.exitOnViolation && violationCount > 0) {
    process.exit(1);
  }
}

main();
