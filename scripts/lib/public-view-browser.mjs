/**
 * public-view-browser.mjs — 公開ページの見え方検査（note / YouTube）で共通に使う画面幅まわりの処理。
 *
 * 画面幅は .claude/config/public-view-breakpoints.json（各サービスの CSS を数えた実測）から取る。
 * 実行のたびに CSS の media query を数え直し、設定に無い主要な切り替わり幅が出たら知らせる
 * （サービス側の変更で撮る幅が古くならないように）。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

export function loadBreakpointConfig() {
  return JSON.parse(readFileSync(join(ROOT, '.claude/config/public-view-breakpoints.json'), 'utf8'));
}

/** Playwright の newContext に渡す値（端末の種類ごとに UA・タッチ・倍率を変える）。 */
export function contextOptions(viewport, cfg) {
  const phone = viewport.device === 'phone';
  const touch = viewport.device !== 'desktop';
  return {
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: phone ? 2 : 1,
    isMobile: touch,
    hasTouch: touch,
    userAgent: cfg.userAgents[viewport.device],
  };
}

/**
 * media query の min/max-width を「下の帯の最大幅」にそろえる。
 * max-width: 480 → 480、min-width: 481 → 480、max-width: 527.9 → 527、min-width: 528 → 527。
 */
export function boundaryOf(kind, value) {
  return kind === 'max' ? Math.floor(value) : Math.ceil(value) - 1;
}

/**
 * ページの CSS から数えた { 'min-481': 規則数, ... } を、主要な切り替わり幅の一覧にする。
 * 規則数が minRules 以上・実機の最小幅（minWidth）以上のものだけ。
 */
export function significantBreakpoints(counts, { minRules = 15, minWidth = 320 } = {}) {
  const byBoundary = new Map();
  for (const [key, n] of Object.entries(counts)) {
    const m = key.match(/^(min|max)-([\d.]+)$/);
    if (!m) continue;
    const b = boundaryOf(m[1], Number(m[2]));
    byBoundary.set(b, (byBoundary.get(b) || 0) + n);
  }
  return [...byBoundary].filter(([b, n]) => n >= minRules && b >= minWidth).map(([b]) => b).sort((a, b) => a - b);
}

/** 設定の切り替わり幅と実測の差（設定に無い幅・実測に無い幅）。 */
export function breakpointDrift(configured, measured) {
  return {
    added: measured.filter((b) => !configured.includes(b)),
    removed: configured.filter((b) => !measured.includes(b)),
  };
}

/** ブラウザ内で実行する: 読めるスタイルシートの media query を数える（page.evaluate に渡す）。 */
export function countMediaQueriesInPage() {
  const counts = {};
  let unreadable = 0;
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { unreadable++; continue; }
    const walk = (list) => {
      for (const rule of list) {
        if (rule.media) {
          for (const m of rule.media.mediaText.matchAll(/(min|max)-width:\s*([\d.]+)px/g)) {
            const key = `${m[1]}-${m[2]}`;
            counts[key] = (counts[key] || 0) + (rule.cssRules ? rule.cssRules.length : 1);
          }
        }
        if (rule.cssRules) walk(rule.cssRules);
      }
    };
    walk(rules);
  }
  return { counts, unreadable, sheets: document.styleSheets.length };
}

/**
 * 切り替わり幅で区切った帯のうち、撮る画面幅が 1 つも無い帯（設定の抜け）を返す。
 * 帯は [minWidth..b0], [b0+1..b1], …, [bN+1..∞]。
 */
export function uncoveredBands(breakpoints, viewports, minWidth = 320) {
  const edges = [...breakpoints].sort((a, b) => a - b);
  const bands = [];
  let lo = minWidth;
  for (const b of edges) { bands.push([lo, b]); lo = b + 1; }
  bands.push([lo, Infinity]);
  return bands.filter(([a, b]) => !viewports.some((v) => v.width >= a && v.width <= b)).map(([a, b]) => `${a}〜${b === Infinity ? '' : b}`);
}

/** CI は同梱 Chromium、手元はシステムの Chrome（リポジトリの Playwright は同梱ブラウザを入れていない）。 */
export async function launchPublicBrowser() {
  const { chromium } = await import('playwright');
  return chromium.launch({ headless: true, ...(process.env.CI ? {} : { channel: 'chrome' }) });
}

/** サーバー側の一時的な失敗（5xx）。読者から見た不整合ではないので、呼び出し側は「開けない」に数える。 */
export class TransientServerError extends Error {}

/**
 * ページを開き、遅延読み込みの画像を読ませるため下までスクロールしてから落ち着くのを待つ。
 * 5xx は 3 秒おいて 1 回だけやり直し、それでも 5xx なら TransientServerError を投げる
 * （2026-09-23: note が 150 回中 1 回 503 を返し、読者向けの異常として報告しかけた）。
 */
export async function openAndSettle(page, url, { readySelector = null } = {}) {
  let resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  if ((resp?.status() ?? 0) >= 500) {
    await page.waitForTimeout(3000);
    resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    if ((resp?.status() ?? 0) >= 500) throw new TransientServerError(`HTTP ${resp.status()}（やり直しても同じ）`);
  }
  const ready = readySelector
    ? await page.waitForSelector(readySelector, { timeout: 20_000 }).then(() => true).catch(() => false)
    : true;
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((res) => setTimeout(res, 150)); }
  });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  return { status: resp?.status() ?? 0, ready };
}

/**
 * 目視確認用に「最初の画面」と「endSelector の直前（無ければ撮らない）」を JPEG で撮る。
 * 返り値は撮れたファイル名の一覧（撮れなかったものは入らない＝レビュー側で件数を数える）。
 */
export async function shootTopAndEnd(page, dir, stem, endSelectors = []) {
  const files = [];
  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dir, `${stem}-top.jpg`), type: 'jpeg', quality: 70 });
    files.push(`${stem}-top.jpg`);
    const moved = await page.evaluate((selectors) => {
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el) { el.scrollIntoView({ block: 'end' }); return true; }
      }
      return false;
    }, endSelectors);
    if (moved) {
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(dir, `${stem}-end.jpg`), type: 'jpeg', quality: 70 });
      files.push(`${stem}-end.jpg`);
    }
  } catch { /* 撮れなかった分は files に入らない */ }
  return files;
}
