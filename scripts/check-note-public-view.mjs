#!/usr/bin/env node
/**
 * check-note-public-view.mjs — note 公開記事を「未ログインの読者にどう見えるか」で週次検査する。
 *
 * 2 層（判定は scripts/lib/note-public-view.mjs の純関数）:
 *   API 層（全件・ログイン不要）: 添付 PDF の本数（有料エリア見出し「N ファイル」＝remained_file_num）・
 *     価格・カバー画像・無料記事の全文会員限定。PDF はディスクに無くても退避台帳から「あるべき本数」を出す。
 *   ブラウザ層（全件・スマホ幅 375px・ログインなし）: 画像が読み込めるか・リンクカードが描画されるか・
 *     本文が横にはみ出さないか。異常のあったページは最初の画面をスクリーンショットで残す。
 *
 * 背景（2026-09-23）: 公開 API の本文だけを見る検査では、1級まるごとパック入口 LP が未ログインで
 *   本文 0 字（タイトルと価格の直後が「ここから先は」）になっていることも、無料記事が全文会員限定に
 *   なった事故も、画面で見るまで分からなかった。
 *
 * 使い方:
 *   node scripts/check-note-public-view.mjs                  # 全件（API＋ブラウザ）
 *   node scripts/check-note-public-view.mjs --api-only       # API 層だけ（数分）
 *   node scripts/check-note-public-view.mjs --sample 40      # ブラウザ層を等間隔に 40 本だけ
 *   node scripts/check-note-public-view.mjs 技術士総監        # パス部分一致で絞る
 *   --out <path>   結果 JSON を保存（CI の成果物）
 * 例外台帳: .claude/config/note-public-view.json（意図した全文ロック・判断待ち）
 * 終了コード: 0 = 異常なし / 1 = 異常あり、または取得失敗が 20% を超えた（検査不成立）
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkArticles, expectedPdfs, frontmatterValue } from './lib/note-attachments.mjs';
import { fetchNoteRaw } from './lib/note-live-check.mjs';
import { evaluateApi, evaluateRendered } from './lib/note-public-view.mjs';
import { guardBrowserLaunch } from './lib/playwright-launch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const API_ONLY = argv.includes('--api-only');
const argValue = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const SAMPLE = Number(argValue('--sample') || 0);
const OUT = argValue('--out');
const FILTER = argv.find((a, i) => !a.startsWith('--') && !['--sample', '--out'].includes(argv[i - 1])) || '';
const SHOT_DIR = join(ROOT, '.tmp/note-public-view');
const CONCURRENCY = 3;

const policy = JSON.parse(readFileSync(join(ROOT, '.claude/config/note-public-view.json'), 'utf8'));

// ---- 対象: 公開済み（noteUrl 非空 OR noteStatus に publish）・予約中は除く（check-note-live-headings と同じ判定）
const targets = [];
let reserved = 0;
for (const abs of walkArticles(join(ROOT, 'content/note'))) {
  const path = abs.slice(ROOT.length + 1).replaceAll('\\', '/');
  if (FILTER && !path.includes(FILTER)) continue;
  const raw = readFileSync(abs, 'utf8');
  const fm = raw.startsWith('---') ? raw.split('---')[1] || '' : '';
  if (!/^noteUrl:\s*\S/m.test(fm) && !/noteStatus:.*publish/.test(fm)) continue;
  if (/^noteStatus:\s*reserved\b/m.test(fm)) { reserved++; continue; }
  const noteId = (fm.match(/noteId:\s*"?(n[0-9a-f]{12})"?/) || [])[1];
  const url = (fm.match(/^noteUrl:\s*"?([^"\s]+)"?/m) || [])[1] || (noteId ? `https://note.com/dobokunote/n/${noteId}` : null);
  if (!noteId) continue;
  targets.push({
    path, noteId, url,
    src: {
      pricing: frontmatterValue(raw, 'notePricing'),
      price: Number(frontmatterValue(raw, 'price') || 0),
      expectedPdfs: expectedPdfs(abs, { root: ROOT }).length,
      lockPolicy: policy.intentional?.[path] ? 'intentional' : policy.pending?.[path] ? 'pending' : null,
      pendingRef: policy.pending?.[path]?.split(':')[0],
    },
  });
}
console.log(`[check-note-public-view] 公開 ${targets.length} 本が対象（予約中 ${reserved} 本は公開前のため除外）`);
if (targets.length === 0) {
  console.error('[check-note-public-view] ✗ 対象 0 本（検査不成立）');
  process.exit(1);
}

const results = new Map(targets.map((t) => [t.noteId, { path: t.path, url: t.url, bad: [], warn: [] }]));

// ---- API 層
let apiFail = 0;
let apiLimited = 0;
const limitedIds = new Set();
for (let i = 0; i < targets.length; i += 8) {
  await Promise.all(targets.slice(i, i + 8).map(async (t) => {
    const d = await fetchNoteRaw(t.noteId);
    const r = results.get(t.noteId);
    if (!d) { apiFail++; r.warn.push('公開 API を取得できない'); return; }
    if (d.is_limited === true) { apiLimited++; limitedIds.add(t.noteId); }
    const v = evaluateApi(t.src, { price: d.price ?? null, is_limited: d.is_limited ?? null, eyecatch: d.eyecatch ?? null, remained_file_num: d.remained_file_num ?? 0, body: d.body || '' });
    r.bad.push(...v.bad); r.warn.push(...v.warn);
  }));
}
console.log(`  API 層: ${targets.length - apiFail} 本を検査（取得失敗 ${apiFail}・会員限定で添付を数えられない ${apiLimited}）`);

// ---- ブラウザ層
let viewTargets = [];
let viewFail = 0;
if (!API_ONLY) {
  viewTargets = SAMPLE > 0 ? targets.filter((_, i) => i % Math.max(1, Math.floor(targets.length / SAMPLE)) === 0).slice(0, SAMPLE) : targets;
  // 認証プロファイルを使わない匿名ブラウザなので、他の note 操作とは衝突しない。空きメモリだけ見る。
  guardBrowserLaunch({ processRows: [] });
  const { chromium } = await import('playwright');
  // CI は同梱 Chromium、手元はシステムの Chrome（リポジトリの Playwright は同梱ブラウザを入れていない）
  const browser = await chromium.launch({ headless: true, ...(process.env.CI ? {} : { channel: 'chrome' }) });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  mkdirSync(SHOT_DIR, { recursive: true });
  const inspect = async (t) => {
    const page = await context.newPage();
    const r = results.get(t.noteId);
    try {
      const resp = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      const bodyFound = await page.waitForSelector('.note-common-styles__textnote-body', { timeout: 20_000 }).then(() => true).catch(() => false);
      // 遅延読み込みの画像を読ませるため、下までスクロールしてから待つ
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((res) => setTimeout(res, 150)); }
      });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      const m = await page.evaluate(() => {
        const body = document.querySelector('.note-common-styles__textnote-body');
        const cw = document.documentElement.clientWidth;
        const imgs = [...(body?.querySelectorAll('img') || [])];
        return {
          imgs: imgs.length,
          imgBroken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
          imgPending: imgs.filter((i) => !i.complete).length,
          cardHeights: [...(body?.querySelectorAll('figure[embedded-service]') || [])].map((f) => Math.round(f.getBoundingClientRect().height)),
          overflow: [...(body?.querySelectorAll('*') || [])].filter((e) => e.getBoundingClientRect().right > cw + 1).slice(0, 3).map((e) => e.tagName.toLowerCase()),
        };
      });
      const v = evaluateRendered({ status: resp?.status() ?? 0, bodyFound, locked: limitedIds.has(t.noteId), ...m });
      r.bad.push(...v.bad); r.warn.push(...v.warn);
      if (v.bad.length) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: join(SHOT_DIR, `${t.noteId}.png`) }).catch(() => {});
      }
    } catch (e) {
      viewFail++;
      r.warn.push(`ブラウザで開けない: ${String(e.message || e).split('\n')[0].slice(0, 80)}`);
    } finally {
      await page.close().catch(() => {});
    }
  };
  for (let i = 0; i < viewTargets.length; i += CONCURRENCY) {
    await Promise.all(viewTargets.slice(i, i + CONCURRENCY).map(inspect));
  }
  await browser.close();
  console.log(`  ブラウザ層: ${viewTargets.length - viewFail} 本を検査（開けない ${viewFail}${SAMPLE ? `・抽出 ${SAMPLE} 本` : ''}）`);
}

// ---- 集計
const all = [...results.values()];
const bad = all.filter((r) => r.bad.length);
const warn = all.filter((r) => !r.bad.length && r.warn.length);
for (const r of bad) console.error(`  BAD  ${r.path}\n       ${r.bad.join(' / ')}${r.warn.length ? `（WARN: ${r.warn.join(' / ')}）` : ''}\n       ${r.url}`);
for (const r of warn) console.log(`  WARN ${r.path}: ${r.warn.join(' / ')}`);
if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ targets: targets.length, apiFail, apiLimited, viewTargets: viewTargets.length, viewFail, bad, warn }, null, 2) + '\n');
}

const failRate = Math.max(apiFail / targets.length, viewTargets.length ? viewFail / viewTargets.length : 0);
if (failRate > 0.2) {
  console.error(`[check-note-public-view] ✗ 検査不成立: 取得・表示の失敗が ${Math.round(failRate * 100)}%（API ${apiFail}/${targets.length}・ブラウザ ${viewFail}/${viewTargets.length}）`);
  process.exit(1);
}
if (bad.length) {
  console.error(`[check-note-public-view] ✗ 読者から見て不整合 ${bad.length} 本（WARN ${warn.length}）。スクリーンショット: .tmp/note-public-view/`);
  process.exit(1);
}
console.log(`[check-note-public-view] ✓ ${targets.length} 本で不整合なし（WARN ${warn.length}）`);
