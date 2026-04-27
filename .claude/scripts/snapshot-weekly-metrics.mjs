#!/usr/bin/env node
/**
 * Weekly Metrics Snapshot
 *
 * metrics-reader から週次 NSM メトリクスを取得して
 * .claude/state/weekly-metrics/YYYY-Www.json に保存する。
 * index.json を追記して時系列トラッキング可能にする。
 *
 * 参照: .claude/skills/management/nsm-experiment/references/definition.md
 *       .claude/scripts/lib/metrics-reader.mjs
 *       .claude/skills/management/weekly-plan/SKILL.md (Phase 0)
 *
 * Usage:
 *   node scripts/snapshot-weekly-metrics.mjs              # 現在の週
 *   node scripts/snapshot-weekly-metrics.mjs --force      # 既存を上書き
 *   node scripts/snapshot-weekly-metrics.mjs --dry-run    # 書き込まず表示
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fetchWeeklyNsmMetrics, formatNsmSection } from '#lib/metrics-reader.mjs';

const OUT_DIR = '.claude/state/weekly-metrics';
const INDEX_PATH = join(OUT_DIR, 'index.json');

// ── ISO 8601 週番号計算 ────────────────────────────────────────

function getIsoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNum };
}

function formatWeekId({ year, week }) {
  return `${year}-W${String(week).padStart(2, '0')}`;
}

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

// ── index.json の更新 ──────────────────────────────────────────

function updateIndex(weekId, snapshotPath) {
  let index = { version: 1, generated_at: null, weeks: [] };
  if (existsSync(INDEX_PATH)) {
    try {
      index = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));
    } catch {
      // 壊れていたら再生成
    }
  }
  // 既存を探して上書き、なければ追加
  const existingIdx = index.weeks.findIndex((w) => w.week_id === weekId);
  const entry = {
    week_id: weekId,
    path: snapshotPath.replace(/\\/g, '/'),
    generated_at: new Date().toISOString(),
  };
  if (existingIdx >= 0) index.weeks[existingIdx] = entry;
  else index.weeks.push(entry);
  index.weeks.sort((a, b) => a.week_id.localeCompare(b.week_id));
  index.generated_at = new Date().toISOString();
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n', 'utf-8');
  return index;
}

// ── メイン ──────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const isoWeek = getIsoWeek();
  const weekId = formatWeekId(isoWeek);
  const outPath = join(OUT_DIR, `${weekId}.json`);

  console.log(`[snapshot] 週次メトリクス取得中: ${weekId}`);

  if (existsSync(outPath) && !args.force) {
    console.log(`[snapshot] ⚠ ${outPath} は既に存在します。上書きするには --force`);
  }

  const metrics = await fetchWeeklyNsmMetrics();

  if (args.dryRun) {
    console.log('[DRY-RUN] 取得結果:');
    console.log(formatNsmSection(metrics));
    console.log(`\n[DRY-RUN] 保存先 (書き込まず): ${outPath}`);
    return;
  }

  // weekId を metrics に埋め込んで保存
  const snapshot = {
    week_id: weekId,
    year: isoWeek.year,
    week: isoWeek.week,
    ...metrics,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');
  console.log(`[snapshot] ✓ ${outPath} に保存`);

  const index = updateIndex(weekId, outPath);
  console.log(`[snapshot] ✓ index.json 更新 (total ${index.weeks.length} 週分)`);

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
