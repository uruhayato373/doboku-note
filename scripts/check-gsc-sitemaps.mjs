#!/usr/bin/env node
/**
 * check-gsc-sitemaps.mjs — sitemap の送信・Google の読み込み状況の週次見張り（surfacer）
 * ---------------------------------------------------------------------------
 * fetch-metrics.yml（金曜）の gsc-sitemaps.mjs が書く sitemaps-latest.json を読み、次のどれかで DUE:
 * 記録が古い／robots.txt にある sitemap が GSC に未登録／送信失敗（権限不足を含む）／GSC のエラー／
 * Google が 14 日以上読み込んでいない。weekly-review-guard.yml（月曜）が job summary に出す。
 * 判定は scripts/lib/gsc-sitemaps.mjs（純関数・tests/gsc-sitemaps.test.mjs）。
 *
 *   npm run check-gsc-sitemaps            # 人向け
 *   npm run check-gsc-sitemaps -- --json
 * 常に exit 0（非ブロッキング surfacer）。記録が無いときは「検査不能」として DUE に出す。
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync } from "node:fs";
import { SITEMAPS_STATE, evaluateSitemapsDue } from "./lib/gsc-sitemaps.mjs";

const latest = existsSync(SITEMAPS_STATE) ? JSON.parse(readFileSync(SITEMAPS_STATE, "utf8")) : null;
const verdict = evaluateSitemapsDue({ latest });
const result = { channel: "gsc-sitemaps", label: "GSC sitemap", fetchedAt: latest?.fetchedAt ?? null, ...verdict };

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`[${result.label}] ${result.due ? "DUE" : "OK"}: ${result.due ? result.reasons.join(" / ") : `記録 ${result.fetchedAt}・${(latest?.sitemaps ?? []).length} 件とも正常`}`);
  for (const s of latest?.sitemaps ?? []) {
    console.log(`  ${s.path}  最終読込 ${s.lastDownloaded ?? "未"} / エラー ${s.errors} / 警告 ${s.warnings}`);
  }
  if (result.due) console.log("  → 再取得: gh workflow run fetch-metrics.yml ／ 権限不足なら Search Console の「設定 → ユーザーと権限」でサービスアカウントを「フル」に");
}
// console.log 直後の process.exit はパイプで出力を捨てるので exitCode だけ決める。
process.exitCode = 0;
