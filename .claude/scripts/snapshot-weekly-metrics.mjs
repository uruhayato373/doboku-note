#!/usr/bin/env node
/**
 * Weekly Metrics Snapshot
 *
 * metrics-reader から週次 NSM メトリクスを取得して
 * data/business/weekly/YYYY-Www.json に保存する。
 *
 * 窓は「確定した直近の月〜日」（事業レビュー・成長パックと同じ。GSC が確定してから取る）で、
 * week_id はその窓の ISO 週。実行日の ISO 週ではない（2026-10 まで実行日の前日までの 7 日を実行日の週で呼んでいて、
 * 同じ W37 でも事業レビューと自然検索の人数が合わなかった）。窓は metrics-reader の completedWeekRanges。
 *
 * 参照: .claude/skills/management/nsm-experiment/references/definition.md
 *       .claude/scripts/lib/metrics-reader.mjs
 *       .claude/skills/management/weekly-plan/SKILL.md (Phase 0)
 *
 * Usage:
 *   node .claude/scripts/snapshot-weekly-metrics.mjs              # 確定した直近の週
 *   node .claude/scripts/snapshot-weekly-metrics.mjs --force      # 既存を上書き
 *   node .claude/scripts/snapshot-weekly-metrics.mjs --dry-run    # 書き込まず表示
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { completedWeekRanges, fetchWeeklyNsmMetrics, formatNsmSection } from '#lib/metrics-reader.mjs';
import { datasetDir } from '../../scripts/lib/datasets.mjs';

const OUT_DIR = datasetDir('business.weekly');

// ── 引数パース ─────────────────────────────────────────────────

function parseArgs() {
  const args = { force: false, dryRun: false };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

// ── メイン ──────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const { weekId, year, week, ranges } = completedWeekRanges();
  const outPath = join(OUT_DIR, `${weekId}.json`);

  console.log(`[snapshot] 週次メトリクス取得中: ${weekId}（${ranges.ga4.this.start} 〜 ${ranges.ga4.this.end}）`);

  if (existsSync(outPath) && !args.force) {
    console.log(`[snapshot] ⚠ ${outPath} は既に存在します。上書きするには --force`);
  }

  const metrics = await fetchWeeklyNsmMetrics(ranges);

  if (args.dryRun) {
    console.log('[DRY-RUN] 取得結果:');
    console.log(formatNsmSection(metrics));
    console.log(`\n[DRY-RUN] 保存先 (書き込まず): ${outPath}`);
    return;
  }

  // weekId を metrics に埋め込んで保存
  const snapshot = {
    week_id: weekId,
    year,
    week,
    ...metrics,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');
  console.log(`[snapshot] ✓ ${outPath} に保存`);

  // 簡易サマリ表示
  if (metrics.ga4?.organic) {
    const o = metrics.ga4.organic;
    console.log(`\n  Organic users:        ${o.thisUsers} (前週 ${o.prevUsers}, delta ${o.userDelta > 0 ? '+' : ''}${o.userDelta})`);
  }
  if (metrics.ga4_jp?.organic) {
    const o = metrics.ga4_jp.organic;
    console.log(`  Organic users (JP):   ${o.thisUsers} (前週 ${o.prevUsers}, delta ${o.userDelta > 0 ? '+' : ''}${o.userDelta})`);
  }
  if (metrics.gsc?.total) {
    const t = metrics.gsc.total;
    console.log(`  GSC clicks:           ${t.thisClicks} (前週 ${t.prevClicks}, delta ${t.clickDelta > 0 ? '+' : ''}${t.clickDelta})`);
  }
}

main().catch((e) => {
  console.error('[snapshot] Error:', e.message);
  process.exit(1);
});
