#!/usr/bin/env node
/**
 * check-competitor-scan-due.mjs
 * ---------------------------------------------------------------------------
 * note 競合の再取得（scout-note-competitors）が四半期サイクル（既定90日）に対して
 * 期限切れかを機械判定する surfacer。weekly-review（唯一稼働のクラウド PDCA）から
 * 呼ばれ、「そろそろ再スキャンの時期」を思い出させる＝新規 cron を作らずに定期性を
 * 担保する（クラウドルーティン最小化方針の遵守）。
 *
 * 判定: .claude/state/note/history/ の最新 competitors-YYYY-MM-DD.json の日付から
 *       経過日数 >= しきい値（既定90日）で DUE。履歴が無ければ DUE(初回)。
 *
 * 使い方:
 *   npm run check-competitor-scan-due            # 人が読む1行サマリ
 *   npm run check-competitor-scan-due -- --json  # weekly-review エージェント用 JSON
 *   npm run check-competitor-scan-due -- --days 120  # しきい値変更
 * 常に exit 0（非ブロッキング surfacer）。
 * ---------------------------------------------------------------------------
 */

import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HISTORY_DIR = join(__dirname, '..', '.claude/state/note/history');

const args = process.argv.slice(2);
const WANT_JSON = args.includes('--json');
const di = args.indexOf('--days');
const THRESHOLD = di >= 0 && args[di + 1] ? parseInt(args[di + 1], 10) || 90 : 90;

function latestScanDate() {
  let files = [];
  try {
    files = readdirSync(HISTORY_DIR).filter((f) => /^competitors-(\d{4}-\d{2}-\d{2})\.json$/.test(f));
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  const dates = files.map((f) => f.match(/(\d{4}-\d{2}-\d{2})/)[1]).sort();
  return dates[dates.length - 1];
}

const last = latestScanDate();
let daysSince = null;
if (last) {
  const t = Date.parse(last + 'T00:00:00Z');
  daysSince = Math.floor((Date.now() - t) / 86400000);
}
const due = last == null || daysSince >= THRESHOLD;

const result = {
  check: 'competitor-scan-due',
  lastScan: last,
  daysSince,
  thresholdDays: THRESHOLD,
  due,
  action: due ? '`npm run scout-note-competitors` → note-competitor-analyst（/note-competitor-review）で再取得＋09反映' : null,
};

if (WANT_JSON) {
  console.log(JSON.stringify(result, null, 2));
} else if (due) {
  console.log(
    last
      ? `[競合再スキャン] DUE: 前回 ${last}（${daysSince}日前・しきい値${THRESHOLD}日）→ /note-competitor-review`
      : `[競合再スキャン] DUE: 履歴なし（初回）→ /note-competitor-review`
  );
} else {
  console.log(`[競合再スキャン] OK: 前回 ${last}（${daysSince}日前・次回まで${THRESHOLD - daysSince}日）`);
}
process.exit(0);
