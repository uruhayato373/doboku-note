#!/usr/bin/env node
/**
 * quality-snapshot.mjs — コンテンツ品質ラチェットの違反総数スナップショットを記録する。
 *
 * `.claude/state/quality/lint-baseline.json`（現時点の grandfather 済み違反）を読み、
 * 資格別・重大度別の総数を1行の JSON として `.claude/state/quality/history.jsonl` に追記する。
 * これを定期的に叩くと、リライトで違反が減っていく「バーンダウン」が admin 品質タブに出る。
 *
 * 使い方:
 *   node scripts/quality-snapshot.mjs            # 今日の日付でスナップショット追記
 *   node scripts/quality-snapshot.mjs 2026-07-01 # 日付を明示（種まき・補填用）
 *
 * 週次運用では baseline 更新（リライト後の刈り込み）の後にこれを叩くと履歴が育つ。
 * 進捗は「自己申告」ではなく baseline の実データから導出する（陳腐化しない）。
 */
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { todayJst } from './lib/jst-date.mjs';

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), ".."));
const BASELINE = join(ROOT, ".claude", "state", "quality", "lint-baseline.json");
const HISTORY = join(ROOT, ".claude", "state", "quality", "history.jsonl");
const RULES = join(ROOT, ".claude", "config", "content-rules.json");

function readJson(p, fallback) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return fallback; }
}

function isoDate(arg) {
  if (arg && /^\d{4}-\d{2}-\d{2}$/.test(arg)) return arg;
  // Date は通常スクリプトでは利用可（Workflow 制約は本スクリプトに無関係）
  return todayJst();
}

function main() {
  const baseline = readJson(BASELINE, null);
  if (!baseline || !baseline.counts) {
    console.error("baseline が見つかりません。先に npm run update-content-quality-baseline を実行してください。");
    process.exit(1);
  }
  const sev = (readJson(RULES, { defaults: {} }).defaults) || {};

  const totals = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const byExam = {};
  let files = 0;
  let violations = 0;

  for (const [rp, ruleCounts] of Object.entries(baseline.counts)) {
    files++;
    const exam = rp.split(/[\\/]/)[3] || "other";
    byExam[exam] ||= 0;
    for (const [rule, n] of Object.entries(ruleCounts)) {
      violations += n;
      byExam[exam] += n;
      const s = sev[rule] || "MEDIUM";
      totals[s] = (totals[s] || 0) + n;
    }
  }

  const record = { date: isoDate(process.argv[2]), files, violations, totals, byExam };

  mkdirSync(dirname(HISTORY), { recursive: true });
  // 同日の重複追記は許容（最新が優先されるよう UI 側で日付集約）。運用上は1日1回想定。
  appendFileSync(HISTORY, JSON.stringify(record) + "\n");

  const label = existsSync(HISTORY) ? "追記" : "作成";
  console.log(`[quality-snapshot] ${label}: ${record.date}  違反 ${violations}（HIGH ${totals.HIGH} / MEDIUM ${totals.MEDIUM} / LOW ${totals.LOW}・${files} 記事）`);
}

main();
