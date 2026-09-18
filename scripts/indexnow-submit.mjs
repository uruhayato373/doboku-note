#!/usr/bin/env node
/**
 * indexnow-submit.mjs — deploy 後に「最近更新した URL」を IndexNow（Bing 等）へ通知する
 * ---------------------------------------------------------------------------
 * なぜ: Google は登録リクエストの API を出していないが、Bing/Yandex は IndexNow で受け付ける。
 * GA4 の organic は GSC クリックの数倍あり Bing 経由が無視できない（gsc-management.md 2026-06-19）。
 * Cloudflare Pages への deploy 後に、本番 sitemap の lastmod が直近 N 日の URL だけを送る。
 * lastmod は pre-commit が本文変更のときだけ動かす（PR #517）ので、送る集合は「実際に変わったページ」。
 *
 * 状態は持たない（deploy ごとに直近 N 日を再送。IndexNow は再送を許容し、変化が無ければ無視する）。
 *
 * ゲート（§9・検査ゼロを PASS と呼ばない）:
 *   - sitemap が取れない／0 URL → exit 2（検査不成立）
 *   - key ファイルが本番で読めない・内容不一致 → exit 2（送っても 403 になるだけ）
 *   - 直近 N 日の URL が 0 件 → exit 0 だが「対象 0 件（送信なし）」と明示
 *   - 送信して 200/202 以外 → exit 1
 *
 * CLI:
 *   node scripts/indexnow-submit.mjs                 # 送信
 *   node scripts/indexnow-submit.mjs --dry-run       # 対象 URL を出すだけ
 *   node scripts/indexnow-submit.mjs --days 3        # 窓を変える（既定は config.windowDays）
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from "node:fs";
import { buildPayload, classifyResponse, parseSitemap, selectRecentlyModified } from "./lib/indexnow.mjs";

const CONFIG = ".claude/config/indexnow.json";
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const di = args.indexOf("--days");

const cfg = JSON.parse(readFileSync(CONFIG, "utf8"));
const days = di >= 0 && args[di + 1] ? Number(args[di + 1]) : cfg.windowDays;
const localKeyFile = `public/${cfg.key}.txt`;
if (!existsSync(localKeyFile) || readFileSync(localKeyFile, "utf8").trim() !== cfg.key) {
  console.error(`[indexnow] ✗ ${localKeyFile} が無いか内容が config.key と一致しない`);
  process.exit(2);
}

async function getText(url) {
  const res = await fetch(url, { headers: { "user-agent": "doboku-note-indexnow/1.0" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const sitemapUrl = `https://${cfg.host}/sitemap.xml`;
  let entries;
  try {
    entries = parseSitemap(await getText(sitemapUrl));
  } catch (e) {
    console.error(`[indexnow] ✗ sitemap を取得できない: ${e.message}`);
    process.exit(2);
  }
  if (entries.length === 0) {
    console.error(`[indexnow] ✗ sitemap の URL が 0 件（検査不成立）`);
    process.exit(2);
  }
  let liveKey;
  try {
    liveKey = (await getText(cfg.keyLocation)).trim();
  } catch (e) {
    console.error(`[indexnow] ✗ key ファイルが本番で読めない: ${e.message}（deploy 前か、public/ に無い）`);
    process.exit(2);
  }
  if (liveKey !== cfg.key) {
    console.error(`[indexnow] ✗ 本番の key ファイル内容が config と不一致`);
    process.exit(2);
  }

  const since = new Date(Date.now() - days * 86400000);
  const urlList = selectRecentlyModified(entries, since);
  console.log(`[indexnow] sitemap ${entries.length} URL / lastmod が直近 ${days} 日: ${urlList.length} 件（since ${since.toISOString().slice(0, 10)}）`);
  for (const u of urlList.slice(0, 15)) console.log(`  ${u}`);
  if (urlList.length > 15) console.log(`  … 他 ${urlList.length - 15} 件`);
  if (urlList.length === 0) {
    console.log("[indexnow] 対象 0 件（送信なし・正常）");
    return;
  }
  if (DRY) {
    console.log("[indexnow] dry-run: 送信しない");
    return;
  }
  const payload = buildPayload({ host: cfg.host, key: cfg.key, keyLocation: cfg.keyLocation, urlList });
  const res = await fetch(cfg.endpoint, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const verdict = classifyResponse(res.status);
  console.log(`[indexnow] POST ${cfg.endpoint} → HTTP ${res.status} (${verdict.label}) / ${urlList.length} URL`);
  if (!verdict.ok) {
    const body = await res.text().catch(() => "");
    if (body) console.error(body.slice(0, 500));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("[indexnow] Fatal:", e?.message || e);
  process.exit(1);
});
