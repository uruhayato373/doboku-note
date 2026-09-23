#!/usr/bin/env node
/**
 * check-youtube-public-view.mjs — YouTube の公開動画を「未ログインの視聴者にどう見えるか」で週次検査する。
 *
 * - 全件（台帳で公開の動画）: YouTube oEmbed（ログイン・API キー不要）で見られるか（404 削除・403 非公開）。
 *   CI のブラウザでは bot 確認でプレーヤーが隠れるので、再生可否はページではなく oEmbed で決める。
 * - 代表動画（--review）: Shorts と通常動画それぞれで公開がいちばん新しい 1 本を、YouTube の
 *   ブレイクポイントで区切った帯ごとの画面幅（.claude/config/public-view-breakpoints.json）で開いて撮る。
 *   画像は週次レビューでエージェントが見る。CSS の切り替わり幅も数え直し、設定と違えば WARN。
 * 判定は scripts/lib/youtube-public-view.mjs。
 *
 * 使い方: node scripts/check-youtube-public-view.mjs [--review] [--out <path>]
 * 終了コード: 0 = 異常なし / 1 = 異常あり、または oEmbed で判定できないものが 20% を超えた（検査不成立）
 * 撮影: CI では YouTube が bot 確認でプレーヤー部分を隠すことがある。タイトル・説明・周辺のレイアウトを見る。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { collectPublicVideos, watchUrl, classifyOembed, pickYoutubeRepresentatives } from './lib/youtube-public-view.mjs';
import { loadBreakpointConfig, contextOptions, launchPublicBrowser, openAndSettle, shootTopAndEnd, countMediaQueriesInPage, significantBreakpoints, breakpointDrift } from './lib/public-view-browser.mjs';
import { guardBrowserLaunch } from './lib/playwright-launch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const REVIEW = argv.includes('--review');
const OUT = (() => { const i = argv.indexOf('--out'); return i >= 0 ? argv[i + 1] : null; })();
const REVIEW_DIR = join(ROOT, '.tmp/youtube-public-view/review');
const BP = loadBreakpointConfig();
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const videos = collectPublicVideos(readJson('.claude/state/youtube-schedule.json'), readJson('.claude/state/video-content-status.json'));
console.log(`[check-youtube-public-view] 台帳で公開の動画 ${videos.length} 本が対象（Shorts ${videos.filter((v) => v.kind === 'shorts').length}・通常 ${videos.filter((v) => v.kind === 'long').length}）`);
if (videos.length === 0) {
  console.error('[check-youtube-public-view] ✗ 対象 0 本（台帳の読み取りを確認・検査不成立）');
  process.exit(1);
}

const results = new Map(videos.map((v) => [v.videoId, { videoId: v.videoId, title: v.title, url: watchUrl(v), bad: [], warn: [] }]));
let unknown = 0;

// ---- 全件: oEmbed で見られるか
for (const v of videos) {
  const r = spawnSync('curl', ['-s', '-o', '/dev/null', '-m', '20', '--ssl-no-revoke', '-w', '%{http_code}', `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${v.videoId}&format=json`], { encoding: 'utf8' });
  const c = classifyOembed(Number(r.stdout) || 0);
  if (c.unknown) unknown++;
  const res = results.get(v.videoId);
  res.bad.push(...c.bad); res.warn.push(...c.warn);
}
console.log(`  oEmbed: ${videos.length - unknown} 本を判定（判定できない ${unknown}）`);

// ---- 代表動画 × 画面幅
let bpReport = null;
let reps = [];
if (REVIEW) {
  guardBrowserLaunch({ processRows: [] });
  const browser = await launchPublicBrowser();
  const pcVp = BP.youtube.viewports.find((v) => v.width === 1280) || BP.youtube.viewports.at(-1);
  reps = pickYoutubeRepresentatives(videos);
  mkdirSync(REVIEW_DIR, { recursive: true });
  const index = reps.map((v) => ({ videoId: v.videoId, kind: v.kind, title: v.title, url: watchUrl(v), date: v.date, shots: [] }));
  for (const vp of BP.youtube.viewports) {
    const c = await browser.newContext(contextOptions(vp, BP));
    for (const entry of index) {
      const page = await c.newPage();
      try {
        await openAndSettle(page, entry.url);
        await page.waitForTimeout(1500);
        // 通常動画は説明欄の直前まで、Shorts は最初の画面だけ（説明は別パネル）
        for (const file of await shootTopAndEnd(page, REVIEW_DIR, `${entry.videoId}-${vp.name}`, entry.kind === 'long' ? ['#description', 'ytm-expandable-video-description-body-renderer'] : [])) {
          entry.shots.push({ viewport: vp.name, width: vp.width, file });
        }
        if (!bpReport && vp === pcVp) {
          const { counts, unreadable } = await page.evaluate(countMediaQueriesInPage);
          const measured = significantBreakpoints(counts, { minRules: BP.significantRuleCount, minWidth: BP.minDeviceWidth });
          bpReport = { measuredOn: entry.url, measured, unreadable, drift: breakpointDrift(BP.youtube.breakpoints, measured) };
        }
      } catch (e) {
        results.get(entry.videoId).warn.push(`[${vp.width}px] 撮れない: ${String(e.message || e).split('\n')[0].slice(0, 60)}`);
      } finally {
        await page.close().catch(() => {});
      }
    }
    await c.close();
  }
  writeFileSync(join(REVIEW_DIR, 'index.json'), JSON.stringify({ service: 'youtube', viewports: BP.youtube.viewports, breakpoints: bpReport, pages: index }, null, 2) + '\n');
  console.log(`  代表動画: ${reps.length} 本 × ${BP.youtube.viewports.length} 画面幅を撮影 ${index.reduce((n, e) => n + e.shots.length, 0)} 枚`);
  if (bpReport) {
    const { added, removed } = bpReport.drift;
    if (added.length || removed.length) console.log(`  WARN YouTube の CSS の切り替わり幅が設定と違う（増: ${added.join(',') || 'なし'} / 減: ${removed.join(',') || 'なし'}）。.claude/config/public-view-breakpoints.json を見直す`);
    else console.log(`  切り替わり幅: 設定どおり（${bpReport.measured.join('/')}px）`);
  } else {
    console.log('  WARN 切り替わり幅を数え直せなかった（未確認）');
  }
  await browser.close();
}

const all = [...results.values()];
const bad = all.filter((r) => r.bad.length);
const warn = all.filter((r) => !r.bad.length && r.warn.length);
for (const r of bad) console.error(`  BAD  ${r.videoId} ${r.title.slice(0, 40)}\n       ${r.bad.join(' / ')}\n       ${r.url}`);
for (const r of warn) console.log(`  WARN ${r.videoId}: ${r.warn.join(' / ')}`);
if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ targets: videos.length, unknown, representatives: reps.length, breakpoints: bpReport, bad, warn }, null, 2) + '\n');
}
if (unknown / videos.length > 0.2) {
  console.error(`[check-youtube-public-view] ✗ 検査不成立: oEmbed で判定できない ${unknown}/${videos.length} 本`);
  process.exit(1);
}
if (bad.length) {
  console.error(`[check-youtube-public-view] ✗ 視聴者から見て不整合 ${bad.length} 本（WARN ${warn.length}）`);
  process.exit(1);
}
console.log(`[check-youtube-public-view] ✓ ${videos.length} 本で不整合なし（WARN ${warn.length}）`);
