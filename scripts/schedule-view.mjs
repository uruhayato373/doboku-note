/**
 * schedule-view.mjs — 予約・計画・期日の横断ビュー（読み取り専用・JST）
 * ---------------------------------------------------------------------------
 * scripts/lib/schedule-events.mjs の collectScheduleEvents を叩くだけの CLI。
 * 日付ロジック・パース・写像は一切ここに書かない（schedule-events.mjs / backlog-lib.mjs に集約）。
 *
 * 使い方:
 *   node scripts/schedule-view.mjs                    # 今月
 *   node scripts/schedule-view.mjs --month 2026-09
 *   node scripts/schedule-view.mjs --channel x --status overdue
 *   node scripts/schedule-view.mjs --json              # collectScheduleEvents の生データ（フィルタ無視）
 *
 * 検査ゼロを PASS と呼ばない（§9）: ソース健全性を先頭に出し、読めなかったソースは
 * [FAIL] として明示する。1件でも [FAIL] があれば exit code 1（0 件と読めていないを混同しない）。
 *
 * console.log 直後の process.exit はパイプで出力を切り詰めることがあるため、
 * ここでは process.exit() を呼ばず process.exitCode だけを設定する。
 * ---------------------------------------------------------------------------
 */
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { collectScheduleEvents, groupByDay, summarize, weekdayLabel } from './lib/schedule-events.mjs';
import { todayJst } from './lib/jst-date.mjs';

function argValue(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : undefined;
}

const asJson = process.argv.includes('--json');
const monthOpt = argValue('month');
const channelOpt = argValue('channel');
const statusOpt = argValue('status');
const month = monthOpt && /^\d{4}-\d{2}$/.test(monthOpt) ? monthOpt : todayJst().slice(0, 7);

const result = await collectScheduleEvents(REPO_ROOT);
const anyFail = result.sources.some((s) => !s.ok);

if (asJson) {
  // --json は collectScheduleEvents の返り値をそのまま出す（month/channel/status フィルタは適用しない）。
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = anyFail ? 1 : 0;
} else {
  let events = result.events.filter((e) => e.date.startsWith(month));
  if (channelOpt) events = events.filter((e) => e.channel === channelOpt);
  if (statusOpt) events = events.filter((e) => e.status === statusOpt);

  console.log(`schedule-view — ${month}（生成 ${result.generatedAt}）`);
  console.log('');

  console.log('# ソース健全性');
  for (const s of result.sources) {
    if (!s.ok) {
      console.error(`[FAIL] ${s.id}: ${s.errors.map((e) => e.message).join('; ') || '不明なエラー'}`);
      continue;
    }
    const extras = [];
    if (s.dateless) extras.push(`dateless ${s.dateless}`);
    if (s.legacy) extras.push(`legacy ${s.legacy}`);
    if (s.errors.length) extras.push(`errors ${s.errors.length}`);
    console.log(`[ok] ${s.id} ${s.count}件${extras.length ? ` (${extras.join(', ')})` : ''}`);
    for (const e of s.errors) console.log(`      ! ${e.path || '(dir)'}: ${e.message}`);
  }
  console.log('');

  const filterLabel = `channel=${channelOpt ?? 'all'} status=${statusOpt ?? 'all'}`;
  console.log(`# ${month} 日別（フィルタ: ${filterLabel}）`);
  const byDay = groupByDay(events);
  const days = [...byDay.keys()].sort();
  if (!days.length) console.log('  （該当イベントなし）');
  for (const day of days) {
    console.log(`${day} (${weekdayLabel(day)})`);
    for (const ev of byDay.get(day)) {
      const time = ev.time ?? '(終日)';
      console.log(`  ${time} [${ev.channel}/${ev.status}] ${ev.label}`);
    }
  }
  console.log('');

  console.log('# チャネル×状態サマリ');
  const summary = summarize(events);
  const channels = Object.keys(summary).sort();
  if (!channels.length) console.log('  （集計対象なし）');
  for (const channel of channels) {
    const parts = Object.entries(summary[channel])
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(' ');
    console.log(`  ${channel.padEnd(10)} ${parts}`);
  }

  if (anyFail) {
    console.error('');
    console.error('[schedule-view] 読めていないソースがあります（0件と混同しない・§9）。上記 [FAIL] を確認してください。');
  }
  process.exitCode = anyFail ? 1 : 0;
}
