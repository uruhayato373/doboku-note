#!/usr/bin/env node
/**
 * check-competitor-scan-due.mjs
 * ---------------------------------------------------------------------------
 * 競合の再取得（scout-*-competitors）が四半期サイクル（既定90日）に対して期限切れかを
 * 全チャネル（note / coconala / x / ig / brain）で機械判定する surfacer。weekly-review
 *（唯一稼働のクラウド PDCA）から呼ばれ、「そろそろ再スキャンの時期」を思い出させる＝
 * 新規 cron を作らずに定期性を担保する（クラウドルーティン最小化方針の遵守）。
 *
 * 判定: 各チャネルの history/ の最新 competitors-YYYY-MM-DD.json の日付から経過日数
 *       >= しきい値（既定90日）で DUE。履歴が無ければ DUE(初回)。
 *
 * 使い方:
 *   npm run check-competitor-scan-due                 # 全チャネルの1行サマリ
 *   npm run check-competitor-scan-due -- --json       # weekly-review エージェント用 JSON
 *   npm run check-competitor-scan-due -- --platform x # 単一チャネルのみ
 *   npm run check-competitor-scan-due -- --days 120   # しきい値変更
 * 常に exit 0（非ブロッキング surfacer）。
 * ---------------------------------------------------------------------------
 */

import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// チャネル → history ディレクトリ（既存 note/coconala は専用dir、X/IG/Brain は機能スコープdir）
const PLATFORMS = {
  note: { dir: '.claude/state/note/history', review: '/competitor-review --platform note' },
  coconala: { dir: '.claude/state/coconala/history', review: '/competitor-review --platform coconala' },
  x: { dir: '.claude/state/x-competitors/history', review: '/competitor-review --platform x' },
  ig: { dir: '.claude/state/ig-competitors/history', review: '/competitor-review --platform ig' },
  brain: { dir: '.claude/state/brain-competitors/history', review: '手動: WebSearch(allowed_domains:brain-market.com)で新規exam販売者確認＝白地(自動scoutなし・09§E)' },
};

const args = process.argv.slice(2);
const WANT_JSON = args.includes('--json');
const di = args.indexOf('--days');
const THRESHOLD = di >= 0 && args[di + 1] ? parseInt(args[di + 1], 10) || 90 : 90;
const pi = args.indexOf('--platform');
const ONLY = pi >= 0 && args[pi + 1] ? args[pi + 1] : null;

function latestScanDate(dir) {
  let files = [];
  try {
    files = readdirSync(join(ROOT, dir)).filter((f) => /^competitors-(\d{4}-\d{2}-\d{2})\.json$/.test(f));
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  const dates = files.map((f) => f.match(/(\d{4}-\d{2}-\d{2})/)[1]).sort();
  return dates[dates.length - 1];
}

const platforms = ONLY ? { [ONLY]: PLATFORMS[ONLY] } : PLATFORMS;
if (ONLY && !PLATFORMS[ONLY]) {
  console.error(`ERROR: 未知のチャネル "${ONLY}"（note|coconala|x|ig|brain）`);
  process.exit(0);
}

const perPlatform = {};
for (const [name, cfg] of Object.entries(platforms)) {
  const last = latestScanDate(cfg.dir);
  const daysSince = last ? Math.floor((Date.now() - Date.parse(last + 'T00:00:00Z')) / 86400000) : null;
  const due = last == null || daysSince >= THRESHOLD;
  perPlatform[name] = { lastScan: last, daysSince, due, review: cfg.review };
}

const dueList = Object.entries(perPlatform).filter(([, v]) => v.due).map(([k]) => k);
const result = {
  check: 'competitor-scan-due',
  thresholdDays: THRESHOLD,
  anyDue: dueList.length > 0,
  duePlatforms: dueList,
  platforms: perPlatform,
};

if (WANT_JSON) {
  console.log(JSON.stringify(result, null, 2));
} else {
  for (const [name, v] of Object.entries(perPlatform)) {
    if (v.due) {
      console.log(
        v.lastScan
          ? `[競合再スキャン:${name}] DUE: 前回 ${v.lastScan}（${v.daysSince}日前・しきい値${THRESHOLD}日）→ ${v.review}`
          : `[競合再スキャン:${name}] DUE: 履歴なし（初回）→ ${v.review}`
      );
    } else {
      console.log(`[競合再スキャン:${name}] OK: 前回 ${v.lastScan}（${v.daysSince}日前・次回まで${THRESHOLD - v.daysSince}日）`);
    }
  }
}
process.exit(0);
