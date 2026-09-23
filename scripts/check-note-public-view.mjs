#!/usr/bin/env node
/**
 * check-note-public-view.mjs — note 公開記事を「未ログインの読者にどう見えるか」で週次検査する。
 *
 * 2 層（判定は scripts/lib/note-public-view.mjs の純関数）:
 *   API 層（全件・ログイン不要）: 添付 PDF の本数（有料エリア見出し「N ファイル」＝remained_file_num）・
 *     価格・カバー画像・無料記事の全文会員限定。PDF はディスクに無くても退避台帳から「あるべき本数」を出す。
 *   ブラウザ層（全件・いちばん狭い帯の 360px・ログインなし）: 画像が読み込めるか・リンクカードが描画されるか・
 *     本文が横にはみ出さないか。異常のあったページは最初の画面をスクリーンショットで残す。
 *   代表ページ（--review）: 資格 × 記事の種類ごとに 1 本（公開・更新がいちばん新しいもの）を、note の
 *     ブレイクポイントで区切った帯ごとの画面幅（.claude/config/public-view-breakpoints.json）で開き直し、
 *     同じ数値判定をしたうえで「最初の画面」と「有料エリア直前（無ければ本文末尾）」を撮る。画像は週次
 *     レビューでエージェントが見る（判定には使わない）。あわせて CSS の切り替わり幅を数え直し、設定と
 *     違えば WARN を出す。
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
 *   --review       代表ページを全画面幅で検査・撮影する（.tmp/note-public-view/review/ と index.json）
 * 例外台帳: .claude/config/note-public-view.json（意図した全文ロック・判断待ち）
 * 終了コード: 0 = 異常なし / 1 = 異常あり、または取得失敗が 20% を超えた（検査不成立）
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkArticles, expectedPdfs, frontmatterValue } from './lib/note-attachments.mjs';
import { fetchNoteRaw } from './lib/note-live-check.mjs';
import { evaluateApi, evaluateRendered, noteGroup, pickRepresentatives } from './lib/note-public-view.mjs';
import { loadBreakpointConfig, contextOptions, launchPublicBrowser, openAndSettle, shootTopAndEnd, countMediaQueriesInPage, significantBreakpoints, breakpointDrift } from './lib/public-view-browser.mjs';
import { guardBrowserLaunch } from './lib/playwright-launch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const API_ONLY = argv.includes('--api-only');
const argValue = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const SAMPLE = Number(argValue('--sample') || 0);
const REVIEW = argv.includes('--review');
const OUT = argValue('--out');
const FILTER = argv.find((a, i) => !a.startsWith('--') && !['--sample', '--out'].includes(argv[i - 1])) || '';
const SHOT_DIR = join(ROOT, '.tmp/note-public-view');
const REVIEW_DIR = join(SHOT_DIR, 'review');
const CONCURRENCY = 3;

const policy = JSON.parse(readFileSync(join(ROOT, '.claude/config/note-public-view.json'), 'utf8'));
const BP = loadBreakpointConfig();

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
  const pricing = frontmatterValue(raw, 'notePricing');
  const pdfs = expectedPdfs(abs, { root: ROOT }).length;
  const dates = [frontmatterValue(raw, 'notePublishedAt'), frontmatterValue(raw, 'dateModified')].filter(Boolean).map((d) => String(d).slice(0, 10));
  targets.push({
    path, noteId, url,
    group: noteGroup({ rel: path.replace(/^content\/note\//, ''), pricing, pdfs }),
    date: dates.sort().at(-1) || '',
    src: {
      pricing,
      price: Number(frontmatterValue(raw, 'price') || 0),
      expectedPdfs: pdfs,
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
const MEASURE = () => {
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
};
const BODY = '.note-common-styles__textnote-body';
let viewTargets = [];
let viewFail = 0;
let reps = [];
let repFail = 0;
let bpReport = null;
if (!API_ONLY) {
  viewTargets = SAMPLE > 0 ? targets.filter((_, i) => i % Math.max(1, Math.floor(targets.length / SAMPLE)) === 0).slice(0, SAMPLE) : targets;
  // 認証プロファイルを使わない匿名ブラウザなので、他の note 操作とは衝突しない。空きメモリだけ見る。
  guardBrowserLaunch({ processRows: [] });
  const browser = await launchPublicBrowser();
  const vpByName = Object.fromEntries(BP.note.viewports.map((v) => [v.name, v]));
  const baseVp = vpByName[BP.note.allPagesViewport];
  const context = await browser.newContext(contextOptions(baseVp, BP));
  mkdirSync(SHOT_DIR, { recursive: true });
  const inspect = async (t) => {
    const page = await context.newPage();
    const r = results.get(t.noteId);
    try {
      const { status, ready } = await openAndSettle(page, t.url, { readySelector: BODY });
      const v = evaluateRendered({ status, bodyFound: ready, locked: limitedIds.has(t.noteId), ...(await page.evaluate(MEASURE)) });
      r.bad.push(...v.bad.map((x) => `[${baseVp.width}px] ${x}`)); r.warn.push(...v.warn);
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
  await context.close();
  console.log(`  ブラウザ層（${baseVp.width}px）: ${viewTargets.length - viewFail} 本を検査（開けない ${viewFail}${SAMPLE ? `・抽出 ${SAMPLE} 本` : ''}）`);

  // ---- 代表ページ × 画面幅（ブレイクポイントの帯ごと）
  if (REVIEW) {
    reps = pickRepresentatives(targets);
    mkdirSync(REVIEW_DIR, { recursive: true });
    const index = [];
    for (const vp of BP.note.viewports) {
      const ctx = await browser.newContext(contextOptions(vp, BP));
      const shootOne = async (t) => {
        const page = await ctx.newPage();
        const r = results.get(t.noteId);
        let entry = index.find((e) => e.noteId === t.noteId);
        if (!entry) { entry = { noteId: t.noteId, group: t.group, path: t.path, url: t.url, pricing: t.src.pricing, price: t.src.price, shots: [] }; index.push(entry); }
        try {
          const { status, ready } = await openAndSettle(page, t.url, { readySelector: BODY });
          const v = evaluateRendered({ status, bodyFound: ready, locked: limitedIds.has(t.noteId), ...(await page.evaluate(MEASURE)) });
          r.bad.push(...v.bad.map((x) => `[${vp.width}px] ${x}`));
          for (const file of await shootTopAndEnd(page, REVIEW_DIR, `${t.noteId}-${vp.name}`, ['.m-paywallHeader', `${BODY} > :last-child`])) {
            entry.shots.push({ viewport: vp.name, width: vp.width, file });
          }
          // 切り替わり幅の数え直し（いちばん広い画面幅で 1 回だけ）
          if (!bpReport && vp === BP.note.viewports.at(-1)) {
            const { counts, unreadable } = await page.evaluate(countMediaQueriesInPage);
            const measured = significantBreakpoints(counts, { minRules: BP.significantRuleCount, minWidth: BP.minDeviceWidth });
            bpReport = { measuredOn: t.url, measured, unreadable, drift: breakpointDrift(BP.note.breakpoints, measured) };
          }
        } catch (e) {
          repFail++;
          r.warn.push(`[${vp.width}px] ブラウザで開けない: ${String(e.message || e).split('\n')[0].slice(0, 60)}`);
        } finally {
          await page.close().catch(() => {});
        }
      };
      for (let i = 0; i < reps.length; i += CONCURRENCY) await Promise.all(reps.slice(i, i + CONCURRENCY).map(shootOne));
      await ctx.close();
    }
    writeFileSync(join(REVIEW_DIR, 'index.json'), JSON.stringify({ service: 'note', viewports: BP.note.viewports, breakpoints: bpReport, pages: index }, null, 2) + '\n');
    const shots = index.reduce((n, e) => n + e.shots.length, 0);
    console.log(`  代表ページ: ${reps.length} グループ × ${BP.note.viewports.length} 画面幅（${BP.note.viewports.map((v) => v.width).join('/')}px）を検査・撮影 ${shots} 枚（開けない ${repFail}）`);
    if (bpReport) {
      const { added, removed } = bpReport.drift;
      if (added.length || removed.length) console.log(`  WARN note の CSS の切り替わり幅が設定と違う（増: ${added.join(',') || 'なし'} / 減: ${removed.join(',') || 'なし'}）。.claude/config/public-view-breakpoints.json を見直す`);
      else console.log(`  切り替わり幅: 設定どおり（${bpReport.measured.join('/')}px）`);
    } else {
      console.log('  WARN 切り替わり幅を数え直せなかった（未確認）');
    }
  }
  await browser.close();
}

// ---- 集計
const all = [...results.values()];
const bad = all.filter((r) => r.bad.length);
const warn = all.filter((r) => !r.bad.length && r.warn.length);
for (const r of bad) console.error(`  BAD  ${r.path}\n       ${r.bad.join(' / ')}${r.warn.length ? `（WARN: ${r.warn.join(' / ')}）` : ''}\n       ${r.url}`);
for (const r of warn) console.log(`  WARN ${r.path}: ${r.warn.join(' / ')}`);
if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ targets: targets.length, apiFail, apiLimited, viewTargets: viewTargets.length, viewFail, representatives: reps.length, repFail, breakpoints: bpReport, bad, warn }, null, 2) + '\n');
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
