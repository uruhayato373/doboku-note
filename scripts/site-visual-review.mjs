#!/usr/bin/env node
/**
 * site-visual-review.mjs — サイトの代表ページを全部の画面幅で撮り、機械の検査とエージェントの目視判定を記録する（撮影 → 判定 → 記録 → 起票）。
 * ---------------------------------------------------------------------------
 * なぜ: 横はみ出し（check-rendered-pages・e2e）は見ていても、「区画ごとにコンテナ幅が違う」「題名が…で切れる」
 *   「商品導線が画面幅によって消える・埋もれる」は誰も見ていなかった（2026-11-11 にトップページで 1280px を超える幅だけ
 *   2 区画が左右 40px 広いのを人が見つけた）。画面幅を 1 つしか見ない確認は、ほかの幅の崩れを通す。
 *
 * 対象と画面幅は config/site-visual-review.json（ページの種類ごとの代表 URL・期待する商品導線・画面幅）。
 * 機械の検査は全部の幅で測る。撮影して目視に回すのは visual: true の幅と、機械で決まる崩れが出た幅だけ
 * （判定のトークンの大半は画像。2026-11-11 の初回は 6 幅 × 15 ページ・約 450 枚で約 190 万トークン）。
 * shotMaxWidth より広い撮影は縮めて渡す。
 *
 * 流れ（手順は /site-visual-review）:
 *   prepare  判定待ちのページ（未判定・骨組みが変わった）を全部の画面幅で撮り、作業票（packet.json）を作る。
 *            機械で決まる崩れ（横はみ出し・読めない画像・コンテナ幅の不統一・期待する導線が無い）はここで確定する。
 *   （親がエージェント site-page-visual-auditor に作業票を渡し、verdicts/*.json に判定を書かせる）
 *   record   判定を検証して台帳（.claude/state/quality/site-visual-review.json）へ書く。--ticket で不合格をページごとに起票。
 *   status   被覆と未処理を出す（週次の点検が読む）。
 *
 * 判定はページの「骨組みのハッシュ」（全画面幅の区画のタグ・クラス・左右の余白・見えている導線）に結ぶ。
 * 部品やレイアウトを変えるとハッシュが変わり、そのページは判定待ちに戻る。文章だけの変更では戻らない。
 *
 * 使い方:
 *   npm run site-visual-review -- prepare [--limit 4] [--keys home,exam-hub] [--base http://localhost:3025] [--all] [--channel chrome]
 *     （--channel chrome は Playwright のブラウザを入れていない端末で、入っている Chrome を使う）
 *   npm run site-visual-review -- record --run <作業票のフォルダ> [--ticket] [--dry-run]
 *   npm run site-visual-review -- status [--json]
 *
 * exit:
 *   prepare 0 作った / 2 検査不成立（out/ が無い・古い・対象 0 件・ページを開けない）
 *   record  0 記録した / 1 判定の欠け・矛盾 / 2 作業票が読めない
 *   status  0 未処理なし / 1 未起票の不合格がある・14 日以上回していないのに判定待ちがある / 2 台帳・設定が読めない
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { formatJson, readJson } from './lib/json-io.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { inspectInPage } from './lib/rendered-page-inspect.mjs';
import { inspectLayoutInPage } from './lib/site-visual-inspect.mjs';
import { reviewTier, summarizeCoverage, validateVerdicts } from './lib/visual-review-ledger.mjs';

export const LEDGER_PATH = join(REPO_ROOT, datasetPath('state.site-visual-review'));
const RUN_ROOT = join(REPO_ROOT, '.tmp', 'site-visual-review');
export const STALE_DAYS = 14;
/** 1 枚の撮影の高さの上限（これより長いページは縦に区切る） */
const TILE_HEIGHT = 1600;
// 計測を汚さない: GA4・広告配信・A8 / もしもの計測ピクセル（バナー画像は止めない。affiliate-layout-shots と同じ範囲）
const BLOCKED_REQUEST = /googletagmanager|google-analytics|analytics\.google|doubleclick|googlesyndication|cloudflareinsights|\/0\.gif\?a8mat=|moshimo\.com\/af\/i\/impression/;
export const FINDING_TYPES = ['layout', 'hierarchy', 'typography', 'consistency', 'cta', 'content', 'other'];
export const CTA_KINDS = ['note', 'affiliate', 'coconala'];

// ---- 純粋な部品（tests/site-visual-review.test.mjs） ----------------------------------------------

/** 縦に区切る位置。上限を超えるページは等間隔に間引く（最初と最後は必ず撮る） */
export function planTiles(docHeight, { tileHeight = TILE_HEIGHT, maxTiles = 6 } = {}) {
  const count = Math.max(1, Math.ceil(docHeight / tileHeight));
  const all = Array.from({ length: count }, (_, i) => ({ y: i * tileHeight, height: Math.min(tileHeight, docHeight - i * tileHeight) }));
  if (count <= maxTiles) return { tiles: all, skipped: 0 };
  const picked = new Set();
  for (let i = 0; i < maxTiles; i += 1) picked.add(Math.round((i * (count - 1)) / (maxTiles - 1)));
  return { tiles: all.filter((_, i) => picked.has(i)), skipped: count - picked.size };
}

/** その幅を撮るか。目視に回す幅（visual）と、機械で決まる崩れが出た幅だけを撮る（判定のトークンの大半は画像） */
export function shouldShoot(viewport, issuesAtViewport) {
  return Boolean(viewport.visual) || issuesAtViewport.length > 0;
}

/** 撮影を縮める倍率。上限より広い撮影だけを縮める（1 = そのまま） */
export function shotScale(width, maxWidth) {
  if (!maxWidth || width <= maxWidth) return 1;
  return Math.round((maxWidth / width) * 1000) / 1000;
}

/** 全画面幅の骨組みと、見えている商品導線から、判定を結ぶハッシュを作る */
export function layoutSha(measures) {
  const body = measures.map((m) => ({
    viewport: m.viewport,
    skeleton: m.skeleton,
    ctas: m.ctas.filter((c) => c.visible).map((c) => `${c.kind}|${c.placement ?? ''}`).sort(),
  }));
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

/**
 * 商品導線を画面幅をまたいで見る。
 * issues（不合格が確定）: 期待する種類の導線が、その画面幅に 1 つも見えていない。
 * hints（目視の材料）: 画面幅によって見えたり消えたりする導線・期待していない種類の導線。
 */
export function judgeCtas(measures, expect = {}) {
  const issues = [];
  const hints = [];
  for (const kind of CTA_KINDS) {
    const wanted = expect[kind];
    const shownAt = measures.filter((m) => m.ctas.some((c) => c.kind === kind && c.visible)).map((m) => m.viewport);
    const missingAt = measures.filter((m) => !shownAt.includes(m.viewport)).map((m) => m.viewport);
    if (wanted === true) {
      for (const viewport of missingAt) issues.push({ type: 'cta-missing', viewport, detail: `${kind} の導線が ${viewport} の幅で 1 つも見えていない（設定では必ず出すページ）` });
    } else if (shownAt.length && missingAt.length) {
      hints.push({ type: 'cta-vanish', detail: `${kind} の導線が ${shownAt.join('・')} では見え、${missingAt.join('・')} では見えない` });
    }
    if (wanted === false && shownAt.length) hints.push({ type: 'cta-unexpected', detail: `${kind} の導線が出ている（設定では出さないページ）: ${shownAt.join('・')}` });
  }
  return { issues, hints };
}

/** 対象の順番: (1) 不合格のあと骨組みが変わった (2) 合格のあと変わった・未判定。prepare は撮ってからハッシュが分かるので、撮る前は台帳の有無と verdict で並べる */
export function selectTargets(targets, ledger, { limit = 4, keys = [], all = false } = {}) {
  if (keys.length) {
    const wanted = new Set(keys);
    return targets.filter((t) => wanted.has(t.key));
  }
  const pages = ledger?.pages ?? {};
  const rank = (t) => {
    const e = pages[t.key];
    if (!e) return 0;
    return e.verdict === 'fail' ? 1 : 2;
  };
  const oldest = (t) => pages[t.key]?.reviewedAt ?? '';
  const sorted = [...targets].sort((a, b) => rank(a) - rank(b) || oldest(a).localeCompare(oldest(b)));
  return all ? sorted : sorted.slice(0, limit);
}

/** 判定を検証して台帳の行にする */
export function buildLedgerEntries(packet, verdicts, { now = new Date().toISOString() } = {}) {
  const { valid, errors } = validateVerdicts({ items: packet.pages, verdicts, hashField: 'layoutSha256', findingTypes: FINDING_TYPES, noun: 'ページ' });
  const entries = {};
  for (const { item: page, verdict, findings, deterministic } of valid) {
    entries[page.key] = {
      layoutSha256: page.layoutSha256,
      verdict,
      reviewedAt: now,
      runId: packet.runId,
      path: page.path,
      findings: findings.map((f) => ({ severity: f.severity, type: f.type, detail: String(f.detail).trim(), ...(f.viewport ? { viewport: f.viewport } : {}), ...(f.shot ? { shot: f.shot } : {}) })),
      deterministic,
      ticket: null,
    };
  }
  return { entries, errors };
}

/**
 * 台帳と設定から、被覆と未処理を数える。骨組みのハッシュは撮らないと分からないので、status は
 * 「設定にあるのに判定が無いページ」「不合格のまま未起票」「最後の実行からの日数」を見る。
 */
export function summarizeStatus(ledger, targets, { now = new Date() } = {}) {
  // 撮っていない status では、台帳のハッシュをそのまま現在の値として扱う（未判定だけが判定待ちになる）
  const candidates = targets.map((t) => ({ key: t.key, layoutSha256: ledger?.pages?.[t.key]?.layoutSha256 }));
  const c = summarizeCoverage({ entries: ledger?.pages, runs: ledger?.runs, candidates, hashField: 'layoutSha256', now });
  const problems = [];
  if (c.failsOpen.length) problems.push(`不合格のまま起票されていないページ ${c.failsOpen.length} 件（record --ticket で起票する）: ${c.failsOpen.join(', ')}`);
  if (c.never > 0 && (c.ageDays === null || c.ageDays >= STALE_DAYS)) {
    problems.push(`未判定のページ ${c.never} 件があるのに、最後の実行が ${c.lastRun ? `${Math.floor(c.ageDays)} 日前` : '無い'}（/site-visual-review を回す）`);
  }
  if (c.never === 0 && c.ageDays !== null && c.ageDays >= STALE_DAYS * 2) {
    problems.push(`最後の実行が ${Math.floor(c.ageDays)} 日前（${STALE_DAYS * 2} 日に 1 回は /site-visual-review を回し、骨組みが変わったページを判定し直す）`);
  }
  return { total: c.total, reviewed: c.current, never: c.never, failsOpen: c.failsOpen, failsTicketed: c.failsTicketed, lastRun: c.lastRun, problems };
}

// ---- 入出力 --------------------------------------------------------------------------------------

function readConfig() {
  return readDataset(REPO_ROOT, 'config.site-visual-review');
}

function readLedger() {
  if (!existsSync(LEDGER_PATH)) return { version: 1, runs: [], pages: {} };
  return readJson(REPO_ROOT, relative(REPO_ROOT, LEDGER_PATH));
}

function writeLedger(ledger) {
  mkdirSync(join(LEDGER_PATH, '..'), { recursive: true });
  const sorted = { ...ledger, pages: Object.fromEntries(Object.entries(ledger.pages).sort(([a], [b]) => a.localeCompare(b))) };
  writeFileSync(LEDGER_PATH, formatJson(sorted));
}

function parseArgs(argv) {
  const flags = parseCliArgs(
    {
      base: { type: 'string', default: 'http://localhost:3025' },
      limit: { type: 'integer', default: 4 },
      keys: { type: 'string', default: '' },
      all: { type: 'boolean', default: false },
      'max-tiles': { type: 'integer', default: 6 },
      channel: { type: 'string', default: '' },
      run: { type: 'string', default: '' },
      ticket: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
    },
    argv,
  );
  return { ...flags, command: flags._[0], base: flags.base.replace(/\/$/, ''), keys: flags.keys.split(',').map((s) => s.trim()).filter(Boolean) };
}

/** out/ を配る 3025 を撮るとき、out/ が画面のコードの最後の変更より古ければ理由を返す（dev の 3020 と本番は見ない） */
function outIsStale(base) {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1):3025$/.test(base)) return null;
  const marker = join(REPO_ROOT, 'out', 'index.html');
  if (!existsSync(marker)) return 'out/index.html が無い（npm run build のあと npm run serve。dev を撮るなら --base http://localhost:3020）';
  const r = spawnSync('git', ['log', '-1', '--format=%ct', '--', 'src'], { cwd: REPO_ROOT, encoding: 'utf8' });
  const lastChange = Number(r.stdout.trim()) * 1000;
  if (lastChange && statSync(marker).mtimeMs < lastChange) {
    return `out/ が src/ の最後のコミット（${new Date(lastChange).toISOString().slice(0, 16)}）より古い（npm run build し直すか、--base http://localhost:3020 で dev を撮る）`;
  }
  return null;
}

// ---- prepare -------------------------------------------------------------------------------------

/** 撮った PNG を上限の横幅まで縮めて上書きする */
async function shrinkShot(path, scale, width) {
  if (scale === 1) return;
  const { default: sharp } = await import('sharp');
  const buffer = await sharp(path).resize({ width: Math.round(width * scale) }).png().toBuffer();
  writeFileSync(path, buffer);
}

async function shootPage({ browser, base, target, viewports, dir, maxTiles, shotMaxWidth }) {
  const measures = [];
  const shots = [];
  const deterministicIssues = [];
  const notes = [];
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      colorScheme: 'light',
      serviceWorkers: 'block',
      locale: 'ja-JP',
      isMobile: vp.width < 768,
      hasTouch: vp.width < 768,
    });
    try {
      await context.route(BLOCKED_REQUEST, (r) => r.abort());
      // 訪問者ごとに案を振る実験（転職枠・note の本文）は最初の案に固定する。固定しないと撮るたびに骨組みが変わる
      await context.addInitScript(() => { Math.random = () => 0; });
      const page = await context.newPage();
      const resp = await page.goto(`${base}${target.path}`, { waitUntil: 'load', timeout: 90_000 });
      if (!resp || resp.status() !== 200) throw new Error(`${vp.id}: HTTP ${resp?.status() ?? '応答なし'}`);
      await page.evaluate(() => document.fonts.ready);
      // 画面外の段落を描画から外す設定（globals.css の content-visibility: auto）は、全体を撮ると空白になる。撮影の間だけ外す
      await page.addStyleTag({ content: '*{content-visibility:visible!important}' });
      // 遅延読み込みの画像を出すために末尾まで送り、先頭へ戻す
      await page.evaluate(async () => {
        const step = window.innerHeight;
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(300);

      const generic = await page.evaluate(inspectInPage);
      const layout = await page.evaluate(inspectLayoutInPage);
      const ignore = new Set(target.ignore ?? []);
      const before = deterministicIssues.length;
      for (const issue of [...generic, ...layout.issues]) {
        if (ignore.has(issue.type)) continue;
        // 自分で止めた計測ピクセルは「読めない画像」に数えない
        if (issue.type === 'image' && BLOCKED_REQUEST.test(issue.detail)) continue;
        deterministicIssues.push({ type: issue.type, viewport: vp.id, detail: issue.detail });
      }
      measures.push({ viewport: vp.id, width: vp.width, docHeight: layout.docHeight, blocks: layout.blocks, hints: layout.hints, ctas: layout.ctas, skeleton: layout.skeleton });

      if (!shouldShoot(vp, deterministicIssues.slice(before))) continue;
      const scale = shotScale(vp.width, shotMaxWidth);
      const { tiles, skipped } = planTiles(layout.docHeight, { maxTiles });
      if (skipped) notes.push(`${vp.id}: 高さ ${layout.docHeight}px を ${tiles.length} 枚に間引いた（${skipped} 区切りは撮っていない）`);
      for (const [i, tile] of tiles.entries()) {
        const file = `${vp.id}-${String(i + 1).padStart(2, '0')}.png`;
        await page.screenshot({ path: join(dir, file), fullPage: true, clip: { x: 0, y: tile.y, width: vp.width, height: Math.max(1, tile.height) } });
        await shrinkShot(join(dir, file), scale, vp.width);
        shots.push({ file, viewport: vp.id, width: vp.width, scale, from: tile.y, to: tile.y + tile.height });
      }
      // 間引いた区切りに入った商品導線は、まわりごと別に撮る（1 つの幅で 3 枚まで）
      const covered = (top) => tiles.some((t) => top >= t.y && top < t.y + t.height);
      const orphaned = layout.ctas.filter((c) => c.visible && !covered(c.top)).slice(0, 3);
      for (const [i, cta] of orphaned.entries()) {
        const file = `${vp.id}-cta-${String(i + 1).padStart(2, '0')}.png`;
        const y = Math.max(0, cta.top - 300);
        const height = Math.min(layout.docHeight - y, cta.height + 600);
        await page.screenshot({ path: join(dir, file), fullPage: true, clip: { x: 0, y, width: vp.width, height: Math.max(1, height) } });
        await shrinkShot(join(dir, file), scale, vp.width);
        shots.push({ file, viewport: vp.id, width: vp.width, scale, from: y, to: y + height, cta: `${cta.kind}:${cta.placement ?? cta.label}` });
      }
    } finally {
      await context.close();
    }
  }
  const cta = judgeCtas(measures, target.expect);
  const ignore = new Set(target.ignore ?? []);
  deterministicIssues.push(...cta.issues.filter((i) => !ignore.has(i.type)));
  return { measures, shots, deterministicIssues, crossHints: cta.hints, notes, layoutSha256: layoutSha(measures) };
}

async function prepare(opts) {
  const stale = outIsStale(opts.base);
  if (stale) {
    console.error(`[site-visual-review] 検査不成立: ${stale}`);
    return 2;
  }
  const config = readConfig();
  const ledger = readLedger();
  const targets = selectTargets(config.targets, ledger, opts);
  if (targets.length === 0) {
    console.error(`[site-visual-review] 対象 0 件（--keys が設定の key に合っていない）。設定 ${config.targets.length} ページ: ${config.targets.map((t) => t.key).join(', ')}`);
    return 2;
  }

  const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const runDir = join(RUN_ROOT, runId);
  rmSync(runDir, { recursive: true, force: true });
  mkdirSync(join(runDir, 'verdicts'), { recursive: true });

  const { chromium } = await import('playwright');
  const { guardBrowserLaunch, mergeLeanOptions } = await import('./lib/playwright-launch.mjs');
  guardBrowserLaunch();
  const browser = await chromium.launch(mergeLeanOptions({ headless: true, ...(opts.channel ? { channel: opts.channel } : {}) }));
  const packet = { runId, createdAt: new Date().toISOString(), base: opts.base, ledger: relative(REPO_ROOT, LEDGER_PATH), viewports: config.viewports, pages: [] };
  const failures = [];
  const unchanged = [];
  try {
    for (const target of targets) {
      const dir = join(runDir, target.key);
      mkdirSync(dir, { recursive: true });
      try {
        const shot = await shootPage({ browser, base: opts.base, target, viewports: config.viewports, dir, maxTiles: opts.maxTiles, shotMaxWidth: config.shotMaxWidth });
        const tier = reviewTier(ledger.pages[target.key], shot.layoutSha256, 'layoutSha256');
        if (tier === null && !opts.keys.length) {
          // 骨組みが前の判定と同じ。判定は生きているので作業票に載せない
          unchanged.push(target.key);
          rmSync(dir, { recursive: true, force: true });
          continue;
        }
        packet.pages.push({
          key: target.key,
          label: target.label,
          pageType: target.pageType,
          path: target.path,
          url: `${opts.base}${target.path}`,
          expect: target.expect ?? {},
          layoutSha256: shot.layoutSha256,
          dir: relative(REPO_ROOT, dir),
          deterministicIssues: shot.deterministicIssues,
          crossViewportHints: shot.crossHints,
          viewports: shot.measures.map(({ skeleton, ...rest }) => rest),
          shots: shot.shots,
          notes: shot.notes,
        });
        console.log(`  ${target.key}: 撮影 ${shot.shots.length} 枚（測定 ${config.viewports.length} 幅・撮影 ${new Set(shot.shots.map((s) => s.viewport)).size} 幅）・機械で決まる崩れ ${shot.deterministicIssues.length}・目視の材料 ${shot.measures.reduce((a, m) => a + m.hints.length, 0) + shot.crossHints.length}`);
      } catch (error) {
        failures.push(`${target.key}: ${String(error.message).split('\n')[0]}`);
      }
    }
  } finally {
    await browser.close();
  }

  writeFileSync(join(runDir, 'packet.json'), `${JSON.stringify(packet, null, 2)}\n`);
  const shots = packet.pages.reduce((a, p) => a + p.shots.length, 0);
  console.log(`[site-visual-review] 設定 ${config.targets.length} ページ中 ${targets.length} ページを撮影 / 作業票 ${packet.pages.length} ページ・${shots} 枚 / 骨組みが前の判定と同じで載せなかった ${unchanged.length}${unchanged.length ? `（${unchanged.join(', ')}）` : ''} / 機械で決まる崩れのあるページ ${packet.pages.filter((p) => p.deterministicIssues.length).length}`);
  for (const p of packet.pages) for (const d of p.deterministicIssues) console.log(`  ✗ ${p.key} [${d.viewport}] ${d.type}: ${d.detail}`);
  console.log(`  作業票: ${relative(REPO_ROOT, join(runDir, 'packet.json'))}（判定は ${relative(REPO_ROOT, join(runDir, 'verdicts'))}/ に書く）`);
  if (failures.length) {
    for (const f of failures) console.error(`  ✗ ${f}`);
    console.error(`[site-visual-review] 検査不成立: ${failures.length} ページを撮れなかった`);
    return 2;
  }
  return 0;
}

// ---- record --------------------------------------------------------------------------------------

function resolveRunDir(run) {
  if (!run) throw new Error('--run が要る（prepare が出した作業票のフォルダか runId）');
  const dir = [run, join(RUN_ROOT, run), join(REPO_ROOT, run)].find((p) => existsSync(join(p, 'packet.json')));
  if (!dir) throw new Error(`作業票が見つからない: ${run}`);
  return dir;
}

function readVerdicts(runDir) {
  const dir = join(runDir, 'verdicts');
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const data = readJson(dir, f);
    out.push(...(Array.isArray(data) ? data : (data.pages ?? [data])));
  }
  return out;
}

function cardBody(key, entry, runId) {
  const lines = [
    `**起点**: ${todayJst()} の画面の点検（\`npm run site-visual-review\`・作業票 ${runId}）で、${key}（${entry.path}）が不合格になった。全部の画面幅で撮った画面を、機械の検査とエージェント site-page-visual-auditor の目視で判定した。台帳は ${relative(REPO_ROOT, LEDGER_PATH)}。`,
    '',
  ];
  for (const d of entry.deterministic.slice(0, 8)) lines.push(`- 機械 [${d.viewport}] ${d.type}: ${String(d.detail).slice(0, 220)}`);
  for (const f of entry.findings.filter((x) => x.severity === 'major').slice(0, 8)) lines.push(`- ${f.type}${f.viewport ? ` [${f.viewport}]` : ''}: ${f.detail.slice(0, 240)}${f.shot ? `（${f.shot}）` : ''}`);
  lines.push(
    '',
    '**やること**: 原因の部品を直す。同じ崩れがほかのページにも出る共通の部品（コンテナ・カード・導線の部品）なら、ページごとに直さず部品を直す。',
    '',
    `**完了条件**: \`npm run site-visual-review -- prepare --keys ${key}\` で撮り直して判定し、record で pass と台帳に記録される。`,
  );
  return lines.join('\n');
}

function createTicket(key, entry, runId) {
  const bodyFile = join(RUN_ROOT, runId, `card-${key}.md`);
  writeFileSync(bodyFile, `${cardBody(key, entry, runId)}\n`);
  const kinds = [...new Set([...entry.deterministic.map((d) => d.type), ...entry.findings.filter((f) => f.severity === 'major').map((f) => f.type)])];
  const title = `${key}（${entry.path}）が画面の点検で不合格（${kinds.slice(0, 5).join('・')}）`;
  const r = spawnSync(
    process.execPath,
    [join(REPO_ROOT, 'scripts/todo-add.mjs'), '--title', title, '--tier', '中', '--kind', '不具合', '--domain', 'サイト', '--body-file', bodyFile, '--verify', 'site-visual-review', '--commit'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(`todo:add に失敗（${key}）: ${(r.stderr || r.stdout).trim().split('\n').slice(-3).join(' / ')}`);
  const id = r.stdout.trim().split('\n').at(-1).trim();
  if (!/^DN-\d{4}$/.test(id)) throw new Error(`todo:add の出力から ID を読めない: ${id}`);
  return id;
}

function record(opts) {
  let runDir;
  let packet;
  try {
    runDir = resolveRunDir(opts.run);
    packet = readJson(runDir, 'packet.json');
  } catch (error) {
    console.error(`[site-visual-review] ${error.message}`);
    return 2;
  }
  const verdicts = readVerdicts(runDir);
  const { entries, errors } = buildLedgerEntries(packet, verdicts);
  console.log(`[site-visual-review] 作業票 ${packet.pages.length} ページ / 判定 ${verdicts.length} 件 / 記録できる ${Object.keys(entries).length} ページ`);
  if (errors.length) {
    for (const e of errors) console.error(`  ✗ ${e}`);
    console.error('[site-visual-review] 判定に欠け・矛盾がある。直してから record し直す（台帳は書いていない）');
    return 1;
  }
  const ledger = readLedger();
  const fails = Object.entries(entries).filter(([, e]) => e.verdict === 'fail');
  for (const [key, e] of fails) {
    const prev = ledger.pages[key];
    // 骨組みが同じまま不合格が続くなら、前の起票を引き継ぐ
    if (prev?.verdict === 'fail' && prev.layoutSha256 === e.layoutSha256 && prev.ticket) e.ticket = prev.ticket;
  }
  console.log(`  合格 ${Object.keys(entries).length - fails.length} / 不合格 ${fails.length}`);
  for (const [key, e] of fails) console.log(`  ✗ ${key}: ${[...new Set([...e.deterministic.map((d) => d.type), ...e.findings.filter((f) => f.severity === 'major').map((f) => f.type)])].join('・')}`);
  if (opts.dryRun) {
    console.log('  （--dry-run: 台帳は書いていない）');
    return 0;
  }
  Object.assign(ledger.pages, entries);
  ledger.runs = [...(ledger.runs ?? []), { runId: packet.runId, at: new Date().toISOString(), base: packet.base, pages: packet.pages.length, pass: Object.keys(entries).length - fails.length, fail: fails.length }].slice(-50);
  writeLedger(ledger);
  console.log(`  台帳: ${relative(REPO_ROOT, LEDGER_PATH)}`);

  if (opts.ticket) {
    for (const [key, e] of fails) {
      if (e.ticket) continue;
      const id = createTicket(key, e, packet.runId);
      ledger.pages[key].ticket = id;
      writeLedger(ledger);
      console.log(`  起票 ${id}: ${key}`);
    }
  } else if (fails.some(([, e]) => !e.ticket)) {
    console.log('  未起票の不合格がある（--ticket でページごとに起票する。この場で直すなら直してから prepare --keys で撮り直す）');
  }
  return 0;
}

// ---- status --------------------------------------------------------------------------------------

function status(opts) {
  let ledger;
  let config;
  try {
    ledger = readLedger();
    config = readConfig();
  } catch (error) {
    console.error(`[site-visual-review] 台帳か設定が読めない: ${error.message}`);
    return 2;
  }
  if (config.targets.length === 0) {
    console.error('[site-visual-review] 検査不成立: 設定のページが 0 件');
    return 2;
  }
  const s = summarizeStatus(ledger, config.targets);
  if (opts.json) {
    console.log(JSON.stringify(s, null, 2));
  } else {
    console.log(`[site-visual-review] 設定 ${s.total} ページ × ${config.viewports.length} 幅 / 判定済み ${s.reviewed}（不合格 ${s.failsOpen.length + s.failsTicketed.length}・うち起票済み ${s.failsTicketed.length}） / 未判定 ${s.never} / 最後の実行 ${s.lastRun?.slice(0, 10) ?? 'なし'}`);
    for (const p of s.problems) console.log(`  ✗ ${p}`);
  }
  return s.problems.length ? 1 : 0;
}

// ---- main ----------------------------------------------------------------------------------------

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[site-visual-review] ${error.message}`);
    return 2;
  }
  if (opts.command === 'prepare') return prepare(opts);
  if (opts.command === 'record') return record(opts);
  if (opts.command === 'status') return status(opts);
  console.error('[site-visual-review] サブコマンドは prepare / record / status');
  return 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`[site-visual-review] ${error.stack ?? error}`);
      process.exitCode = 2;
    });
}
