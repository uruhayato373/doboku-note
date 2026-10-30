#!/usr/bin/env node
/**
 * affiliate-layout-shots.mjs — 転職アフィリエイトの配置を「ページの種類 × 画面幅 × 意匠の案」ごとに撮り、機械で判定する。
 * ---------------------------------------------------------------------------
 * 目的: 広告が各ページに適切に置けているかを、人が管理画面（アフィリエイト ＞ 広告配置）で一覧して確かめる。
 * 撮る対象: config/affiliate-placements.json の target から、ページの種類ごとの代表 URL を機械で 1 つずつ選ぶ
 *   （scripts/lib/affiliate-layout-judge.mjs の selectTargets。記事はカテゴリごとに本文が中央の大きさのもの）。
 * 判定: (b) 素材キーごとの計測ピクセルが 1 以下 (c) バナーが素材の大きさ以上に引き伸ばされない（(a)「1 画面目に広告が無い」は 2026-10-31 に運営者の指示で廃止）
 *       (d) 広告・ページが横にはみ出さない (e) 面と案件からルール（PL-xxxx）を引く（無ければ NG・期間外だけなら注意）
 * 案の固定: 本番ビルドでは ?affiliateVariant= が効かない（開発サーバーだけ）ので、localStorage の割り当てキー
 *   （src/lib/affiliate-experiment.mjs の AFFILIATE_VARIANT_KEY）を読み込み前に入れて固定する。案の一覧は AFFILIATE_VARIANTS（--variants で上書き）。
 * 読むだけ: 計測（GA4・A8・もしもの計測ピクセル）へのリクエストは中断する。クリックはしない。
 *
 * 使い方:
 *   npm run affiliate:shots                                  # npm run serve（:3025・要 build）を撮る
 *   npm run affiliate:shots -- --base https://doboku-note.com
 *   npm run affiliate:shots -- --only category --widths sp --variants B
 * 出力: data/affiliate/layout-shots/<UTC 時刻>/（PNG と manifest.json・git 管理外）
 * exit 0 = 全件 OK / 1 = 検査不成立（接続不能・対象 0 件・撮影失敗が MAX_FETCH_FAIL_RATE 超・1 枚も撮れない）/ 2 = 判定 NG あり
 * ---------------------------------------------------------------------------
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import matter from 'gray-matter';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { datasetDir, datasetPath } from './lib/datasets.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { LaunchGuardError, guardBrowserLaunch, mergeLeanOptions } from './lib/playwright-launch.mjs';
import { fetchFailDominant } from './lib/inconclusive-gate.mjs';
import { collectPublishedDocs } from './lib/published-docs.mjs';
import { VIEWPORTS, expectedSlots, judgeShot, selectTargets } from './lib/affiliate-layout-judge.mjs';
import { AFFILIATE_VARIANTS, AFFILIATE_VARIANT_KEY, AFFILIATE_EXPERIMENT_ID } from '../src/lib/affiliate-experiment.mjs';

const flags = parseCliArgs({
  base: { type: 'string', default: 'http://localhost:3025' },
  variants: { type: 'string', default: AFFILIATE_VARIANTS.join(',') },
  widths: { type: 'string', default: VIEWPORTS.map((v) => v.id).join(',') },
  only: { type: 'string', default: '' },
  limit: { type: 'integer', default: 0 },
  'max-height': { type: 'integer', default: 14000 },
});
const BASE = flags.base.replace(/\/$/, '');
const VARIANTS = flags.variants.split(',').map((s) => s.trim()).filter(Boolean);
const WIDTHS = VIEWPORTS.filter((v) => flags.widths.split(',').includes(v.id));
const MAX_HEIGHT = flags.maxHeight;

// 計測を汚さない: GA4・広告配信・A8 / もしもの計測ピクセル（バナー画像は止めない）
const BLOCK = /googletagmanager|google-analytics|analytics\.google|doubleclick|googlesyndication|cloudflareinsights|\/0\.gif\?a8mat=|moshimo\.com\/af\/i\/impression/;

function curlText(url) {
  return execFileSync('curl', ['--ssl-no-revoke', '-sS', '-L', '--max-time', '30', '-f', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function loadSitemapPaths() {
  const xml = curlText(`${BASE}/sitemap.xml`);
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    try { return new URL(m[1]).pathname.replace(/(.)\/$/, '$1'); } catch { return null; }
  });
  return paths.filter(Boolean);
}

function loadDocs() {
  const { docs } = collectPublishedDocs(REPO_ROOT);
  const map = new Map();
  for (const d of docs) map.set(d.slug, { bytes: statSync(d.filePath).size, career: Array.isArray(d.data.tags) && d.data.tags.includes('career') });
  return map;
}

/** ブラウザ側: 見えている広告と note の導線を、文書座標で測る */
function measureInPage() {
  const sy = window.scrollY;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const box = (r) => ({ top: r.top + sy, left: r.left, right: r.right, bottom: r.bottom + sy });
  const ads = [...document.querySelectorAll('a[data-cta="affiliate"]')].filter(visible).map((a) => ({
    placement: a.getAttribute('data-cta-placement') || '',
    program: a.getAttribute('data-cta-program') || '',
    variant: a.getAttribute('data-cta-variant'),
    label: a.getAttribute('data-cta-label'),
    rect: box(a.getBoundingClientRect()),
    imgs: [...a.querySelectorAll('img')].map((i) => ({ src: i.currentSrc || i.getAttribute('src') || '', w: i.getBoundingClientRect().width, h: i.getBoundingClientRect().height, naturalWidth: i.naturalWidth }))
      .filter((i) => i.w > 2 && i.h > 2),
  }));
  const notes = [...document.querySelectorAll('[data-cta="note"]')].filter(visible).map((n) => ({
    label: n.getAttribute('data-cta-label') || n.getAttribute('data-cta-placement') || '',
    rect: box(n.getBoundingClientRect()),
  }));
  return { ads, notes, scrollWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight };
}

/** ブラウザ側: 枠と面の名前を重ね書きする（広告＝緑/赤、note＝青） */
function drawOverlay({ ads, notes }) {
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none';
  const put = (r, color, text) => {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;top:${r.top}px;left:${Math.max(0, r.left)}px;width:${r.right - Math.max(0, r.left)}px;height:${r.bottom - r.top}px;outline:3px dashed ${color};outline-offset:-2px`;
    const t = document.createElement('div');
    t.textContent = text;
    // 広告の中身を隠さないよう枠の上に出す（枠が文書の先頭なら内側）
    t.style.cssText = `position:absolute;${r.top > 20 ? 'bottom:100%' : 'top:0'};left:0;max-width:100%;background:${color};color:#fff;font:bold 12px/1.4 sans-serif;padding:1px 5px;white-space:normal`;
    d.appendChild(t);
    host.appendChild(d);
  };
  for (const a of ads) put(a.rect, a.problems.length ? '#d32f2f' : '#1b873f', `${a.ruleId ?? 'ルール無し'} ${a.placement} ${a.program}${a.variant ? ` 案${a.variant}` : ''}${a.problems.length ? ` NG:${a.problems.join(',')}` : ''}`);
  for (const n of notes) put(n.rect, '#1565c0', `note ${n.label}`);
  document.body.appendChild(host);
}

async function settle(page) {
  // 遅延読み込みの画像と、画面に入って描かれる部品を出すため、上から下まで一度送る
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
    const step = Math.max(400, window.innerHeight - 100);
    for (let y = 0; y < document.documentElement.scrollHeight + step; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 70));
    }
    window.scrollTo(0, 0);
    const imgs = [...document.images].filter((i) => !i.complete);
    await Promise.race([Promise.all(imgs.map((i) => new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); }))), new Promise((r) => setTimeout(r, 6000))]);
    await new Promise((r) => setTimeout(r, 300));
  });
}

async function main() {
  const startedAt = new Date();
  const rules = readDataset(REPO_ROOT, 'config.affiliate-placements').rules;
  const categories = JSON.parse(readFileSync(join(REPO_ROOT, 'src/config/categories.json'), 'utf8'));

  let sitemapPaths;
  try {
    sitemapPaths = loadSitemapPaths();
  } catch (e) {
    console.error(`[affiliate-shots] ${BASE}/sitemap.xml を取れない（${String(e.message).split('\n')[0]}）。ローカルなら npm run build 後に npm run serve`);
    return 1;
  }
  let targets = selectTargets({ rules, sitemapPaths, categories, docsBySlug: loadDocs() });
  if (flags.only) targets = targets.filter((t) => t.id.includes(flags.only) || t.path.includes(flags.only));
  if (flags.limit > 0) targets = targets.slice(0, flags.limit);
  const planned = targets.length * WIDTHS.length * VARIANTS.length;
  if (!planned) {
    console.error(`[affiliate-shots] 撮る対象が 0 件（検査不成立）: 対象ページ ${targets.length} × 幅 ${WIDTHS.length} × 案 ${VARIANTS.length}`);
    return 1;
  }

  const ts = startedAt.toISOString().replace(/\.\d+Z$/, 'Z').replace(/:/g, '-');
  const outDir = join(REPO_ROOT, datasetDir('affiliate.layout-shots'), ts);
  mkdirSync(outDir, { recursive: true });

  try {
    guardBrowserLaunch();
  } catch (e) {
    if (e instanceof LaunchGuardError) { console.error(`${e.message}\n  空きが足りなければ DOBOKU_PW_MIN_FREE_MB=NNNN で閾値を下げる`); return 1; }
    throw e;
  }
  const browser = await chromium.launch(mergeLeanOptions({ headless: true }));
  const nowMs = Date.now();
  const shots = [];
  let done = 0;
  try {
    for (const vp of WIDTHS) {
      for (const variant of VARIANTS) {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, serviceWorkers: 'block', locale: 'ja-JP' });
        await context.route(BLOCK, (route) => route.abort());
        await context.addInitScript(([k, v]) => { try { window.localStorage.setItem(k, v); } catch { /* 保存できなければ割り当てのまま */ } }, [AFFILIATE_VARIANT_KEY, variant]);
        const page = await context.newPage();
        for (const t of targets) {
          const base = { targetId: t.id, viewport: vp.id, variant, url: `${BASE}${t.path}` };
          done++;
          try {
            const resp = await page.goto(base.url, { waitUntil: 'load', timeout: 45000 });
            if (!resp || resp.status() >= 400) throw new Error(`HTTP ${resp?.status() ?? '—'}`);
            await page.waitForTimeout(700);
            await settle(page);
            const measured = await page.evaluate(measureInPage);
            const html = await page.content();
            const pageInfo = { pageKind: t.pageKind, category: t.category, isCareerDoc: t.isCareerDoc };
            const verdict = judgeShot(
              { viewport: { width: vp.width, height: vp.height }, scrollWidth: measured.scrollWidth, html, ads: measured.ads },
              { rules, page: pageInfo, nowMs, forcedVariant: variant, expectedCount: Object.keys(expectedSlots(rules, pageInfo, nowMs)).length },
            );
            await page.evaluate(drawOverlay, { ads: verdict.ads, notes: measured.notes });
            const file = `${t.id}__${vp.id}__${variant}.png`;
            const height = Math.min(measured.height, MAX_HEIGHT);
            await page.screenshot({ path: join(outDir, file), fullPage: true, clip: { x: 0, y: 0, width: vp.width, height } });
            shots.push({
              ...base, status: verdict.ok ? 'ok' : 'ng', file, pageHeight: measured.height, truncated: measured.height > MAX_HEIGHT,
              checks: verdict.checks, warnings: verdict.warnings, pixelCounts: verdict.pixelCounts,
              ads: verdict.ads.map((a) => ({ placement: a.placement, program: a.program, variant: a.variant, label: a.label, ruleId: a.ruleId, ruleStatus: a.ruleStatus, top: Math.round(a.rect.top), left: Math.round(a.rect.left), right: Math.round(a.rect.right), problems: a.problems })),
              notes: measured.notes.map((n) => ({ label: n.label, top: Math.round(n.rect.top) })),
            });
            process.stdout.write(`[${done}/${planned}] ${verdict.ok ? 'OK ' : 'NG '} ${t.id} ${vp.id} ${variant} 広告 ${verdict.ads.length}\n`);
          } catch (e) {
            shots.push({ ...base, status: 'error', error: String(e.message).split('\n')[0] });
            process.stdout.write(`[${done}/${planned}] ERR ${t.id} ${vp.id} ${variant}: ${String(e.message).split('\n')[0]}\n`);
          }
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const captured = shots.filter((s) => s.status !== 'error').length;
  const failed = shots.length - captured;
  const ng = shots.filter((s) => s.status === 'ng').length;
  const manifest = {
    schemaVersion: 1,
    generatedAt: startedAt.toISOString(),
    base: BASE,
    experiment: AFFILIATE_EXPERIMENT_ID,
    variants: VARIANTS,
    viewports: WIDTHS.map(({ id, label, width, height }) => ({ id, label, width, height })),
    maxHeight: MAX_HEIGHT,
    counts: { targets: targets.length, planned, captured, failed, ng, warn: shots.filter((s) => s.warnings?.length).length },
    targets: targets.map((t) => ({ ...t, expected: expectedSlots(rules, { pageKind: t.pageKind, category: t.category, isCareerDoc: t.isCareerDoc }, nowMs) })),
    shots,
  };
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`[affiliate-shots] 対象ページ ${targets.length} × 幅 ${WIDTHS.length} × 案 ${VARIANTS.length} = 計画 ${planned} / 撮れた ${captured} / 失敗 ${failed} / 判定 NG ${ng} / 出力 ${datasetPath('affiliate.layout-shots', { ts, '**': 'manifest.json' })}`);
  for (const s of shots.filter((x) => x.status === 'ng')) {
    const bad = Object.entries(s.checks).filter(([, c]) => !c.ok).map(([k, c]) => `${k}: ${c.detail.join('; ')}`);
    console.log(`  NG ${s.targetId} ${s.viewport} 案${s.variant} — ${bad.join(' / ')}`);
  }
  if (captured === 0 || fetchFailDominant(failed, shots.length)) {
    console.error(`[affiliate-shots] 検査不成立: 撮影に失敗 ${failed}/${shots.length}（上限を超えた、または 1 枚も撮れていない）`);
    return 1;
  }
  return ng > 0 ? 2 : 0;
}

main().then((code) => { process.exitCode = code; }, (e) => { console.error(e); process.exitCode = 1; });
