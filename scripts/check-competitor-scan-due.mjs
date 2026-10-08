#!/usr/bin/env node
/**
 * check-competitor-scan-due.mjs
 * ---------------------------------------------------------------------------
 * 競合の再取得（scout-*-competitors）が四半期サイクル（既定90日）に対して期限切れかを
 * 全チャネル（note / coconala / x / ig / youtube）と、資格キーワードでの市場スキャン（market）で機械判定する surfacer。
 * note / coconala / ig は competitor-scan.yml が四半期に自動取得し、本 surfacer は
 * その失敗・停止の backstop。X はログイン済み個人セッションが
 * 必要なため、weekly-review-guard / weekly-review から手動期限を通知する。YouTube も手動（npm run scout-youtube-competitors）。
 *
 * 判定: 各チャネルの時系列（台帳 <取得元>.competitors・market は analysis.qualification-market）の最新の日付から経過日数
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

import { freshnessDays, latestFile } from './lib/datasets.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// チャネル → 時系列の台帳の id
const PLATFORMS = {
  note: { dataset: 'note.competitors', automation: 'ci', review: 'competitor-scan.yml の失敗を確認。取得済みなら /competitor-review --platform note で意味分析' },
  coconala: { dataset: 'coconala.competitors', automation: 'ci', review: 'competitor-scan.yml の失敗を確認。取得済みなら /competitor-review --platform coconala で意味分析' },
  x: { dataset: 'x.competitors', review: '/competitor-review --platform x' },
  ig: { dataset: 'instagram.competitors', automation: 'ci', review: 'competitor-scan.yml の失敗を確認。取得済みなら /competitor-review --platform ig で意味分析' },
  // YouTube は一覧（yt-dlp）を手元で取る。分析の文章は docs/marketing/07c（画面・尺・型）
  youtube: { dataset: 'youtube.competitors', review: 'npm run scout-youtube-competitors → docs/marketing/07c の再取得手順で前回と比べる' },
  // 資格ごとの混み具合（YouTube・note・ココナラの検索）。展開の判断（npm run qualification-market）が読む
  market: { dataset: 'analysis.qualification-market', review: 'npm run scan-qualification-market -- --coconala → /competitor-review で展開の判断を見直す' },
};

const args = process.argv.slice(2);
const WANT_JSON = args.includes('--json');
const di = args.indexOf('--days');
// しきい値はチャネルごとに台帳（scripts/lib/datasets.mjs）の freshness.warnDays。--days は全チャネルに掛ける一時的な上書き
const DAYS_OVERRIDE = di >= 0 && args[di + 1] ? parseInt(args[di + 1], 10) || null : null;
const thresholdOf = (dataset) => DAYS_OVERRIDE ?? freshnessDays(dataset, 'warnDays');
const pi = args.indexOf('--platform');
const ONLY = pi >= 0 && args[pi + 1] ? args[pi + 1] : null;

function latestScanDate(dataset) {
  const latest = latestFile(ROOT, dataset);
  return latest ? latest.match(/(\d{4}-\d{2}-\d{2})\.json$/)?.[1] ?? null : null;
}

const platforms = ONLY ? { [ONLY]: PLATFORMS[ONLY] } : PLATFORMS;
if (ONLY && !PLATFORMS[ONLY]) {
  console.error(`ERROR: 未知のチャネル "${ONLY}"（${Object.keys(PLATFORMS).join('|')}）`);
  process.exit(0);
}

const perPlatform = {};
for (const [name, cfg] of Object.entries(platforms)) {
  const last = latestScanDate(cfg.dataset);
  const daysSince = last ? Math.floor((Date.now() - Date.parse(last + 'T00:00:00Z')) / 86400000) : null;
  const due = last == null || daysSince >= thresholdOf(cfg.dataset);
  perPlatform[name] = { lastScan: last, daysSince, due, automation: cfg.automation ?? 'manual', review: cfg.review };
}

const dueList = Object.entries(perPlatform).filter(([, v]) => v.due).map(([k]) => k);
const result = {
  check: 'competitor-scan-due',
  // 全チャネルが同じ値のあいだは「その値」。分かれたら最大（チャネルごとの値は台帳と下の本文に出る）
  thresholdDays: Math.max(...Object.values(platforms).map((cfg) => thresholdOf(cfg.dataset))),
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
          ? `[競合再スキャン:${name}] DUE: 前回 ${v.lastScan}（${v.daysSince}日前・しきい値${thresholdOf(platforms[name].dataset)}日）→ ${v.review}`
          : `[競合再スキャン:${name}] DUE: 履歴なし（初回）→ ${v.review}`
      );
    } else {
      console.log(`[競合再スキャン:${name}] OK: 前回 ${v.lastScan}（${v.daysSince}日前・次回まで${thresholdOf(platforms[name].dataset) - v.daysSince}日）`);
    }
  }
}
// --fail-on-due: 期限切れなら exit 1（quality-audit の ops:true が日次で読む＝週次レビューから移した点検・DN-0394）。既定は従来どおり常に exit 0。
process.exit(args.includes("--fail-on-due") && dueList.length > 0 ? 1 : 0);
