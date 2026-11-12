#!/usr/bin/env node
// npm run check-youtube-own-freshness — 自社 YouTube の動画別の再生数（台帳 youtube.own-videos・月次）の最新の日付が、台帳の freshness.warnDays（35 日）を超えていないか。取得は youtube-own-metrics.yml（毎月 1 日 JST）。quality-audit の ops（日次の ops-audit）が読む。記録が 1 件も無いのも失敗（検査ゼロを緑にしない）
import { fileURLToPath } from 'node:url';
import { freshnessDays, latestFileDate } from './lib/datasets.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const DAY_MS = 86_400_000;

/** 純関数。latest は最新の記録の日付（YYYY-MM-DD）か null。{ ok, ageDays, reason } */
export function assessOwnFreshness(latest, today, maxAgeDays) {
  if (!latest) return { ok: false, ageDays: null, reason: '自社 YouTube の月次の記録が 1 件も無い（未取得）' };
  const ageDays = Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${latest}T00:00:00Z`)) / DAY_MS);
  if (ageDays < 0) return { ok: false, ageDays, reason: `最新の記録 ${latest} が今日 ${today} より先の日付` };
  if (ageDays > maxAgeDays) return { ok: false, ageDays, reason: `最新の記録 ${latest} が ${ageDays} 日前（上限 ${maxAgeDays} 日・youtube-own-metrics.yml が毎月 1 日に回る）` };
  return { ok: true, ageDays, reason: null };
}

function main() {
  const latest = latestFileDate(REPO_ROOT, 'youtube.own-videos');
  const r = assessOwnFreshness(latest, todayJst(), freshnessDays('youtube.own-videos', 'warnDays'));
  console.log(`check-youtube-own-freshness: 記録の最新 ${latest ?? 'なし'} / 経過 ${r.ageDays ?? '-'} 日 / ${r.ok ? 'OK' : 'FAIL'}`);
  if (!r.ok) { console.error(`  ${r.reason}`); process.exitCode = 1; }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
