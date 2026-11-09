#!/usr/bin/env node
/**
 * standards-visual-review.mjs — 基準書の章ページを撮影し、エージェントの目視判定を記録する（撮影 → 判定 → 記録 → 起票）。
 * ---------------------------------------------------------------------------
 * 止めたい事故: check-standard-articles（20 検査）が全 PASS でも、読者の画面では表の記法の文字が
 *   そのまま出ていた（DN-0916・近畿の必携 約 10 章）。機械の検査は形を見るが、画面と原本を見比べる者がいなかった。
 *   描画の検査（check-rendered-pages）と目視用の一覧（standards-table-gallery）は手で回す道具で、誰も定期に読んでいなかった。
 *
 * 流れ（手順は /standards-visual-review）:
 *   prepare  対象の章を選び（未判定・中身が変わった章を優先）、画面を撮り、表・図ごとに原本のページ画像を添えた作業票を作る。
 *            描画で決定的に判定できる崩れ（記法が生で出る・横はみ出し・読めない画像。scripts/lib/rendered-page-inspect.mjs）も同時に拾う。
 *   （親がエージェント standards-page-visual-auditor に作業票を渡し、verdicts/*.json に判定を書かせる）
 *   record   判定を検証して台帳（.claude/state/quality/standards-visual-review.json）へ書く。--ticket で不合格を文書ごとに DN カードへ起票。
 *   status   台帳の被覆と未処理を出す。週次の点検（review-wiring の weekly）が読む。
 *
 * 判定の規則（record が機械で止める）: 決定的な崩れが 1 件でもあれば fail。major の指摘があれば fail。
 *   作業票の章ごとに、中身のハッシュ（manifest の outputSha256）が一致する判定がちょうど 1 件あること。
 *
 * Usage:
 *   npm run standards-visual-review -- prepare [--limit 12] [--only kinki/hikkei] [--keys kinki/hikkei/19-2,...] [--base http://localhost:3025]
 *   npm run standards-visual-review -- record --run <作業票のフォルダ> [--ticket] [--dry-run]
 *   npm run standards-visual-review -- status [--json]
 * exit:
 *   prepare 0 作った / 2 検査不成立（out/ が無い・古い・原本画像が読めない・対象 0 件・ページを開けない）
 *   record  0 記録した / 1 判定の欠け・矛盾 / 2 作業票が読めない
 *   status  0 未処理なし / 1 未起票の不合格がある・14 日以上回していないのに判定待ちがある / 2 台帳が読めない
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { formatJson, readJson, readJsonIf } from './lib/json-io.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { standardsRenderTargets } from './lib/standards-render-targets.mjs';
import { inspectInPage } from './lib/rendered-page-inspect.mjs';

const ARTICLES_ROOT = join(REPO_ROOT, 'content', 'site', 'standards-articles');
const SOURCES_ROOT = join(REPO_ROOT, 'content', 'sources', 'standards');
export const LEDGER_PATH = join(REPO_ROOT, datasetPath('state.standards-visual-review'));
const RUN_ROOT = join(REPO_ROOT, '.tmp', 'standards-visual-review');
export const STALE_DAYS = 14;
const MAX_SHOT_HEIGHT = 2400;
const TILE_HEIGHT = 1500;
// 計測・広告は止めて開く（止めた広告の画像は「読めない画像」に数えない）
const BLOCKED_REQUEST = /googletagmanager|google-analytics|doubleclick|googlesyndication|a8\.net|moshimo|afi-b|cloudflareinsights/;
export const FINDING_TYPES = ['markup', 'table', 'figure', 'missing', 'layout', 'text', 'other'];

// ---- 純粋な部品（tests/standards-visual-review.test.mjs） ------------------------------------------

/** "502" / "502-504" / "502,505" → [502, …] */
export function parsePages(raw) {
  const pages = [];
  for (const part of String(raw ?? '').split(/[,\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    for (let p = from; p <= to && p - from < 20; p += 1) pages.push(p);
  }
  return pages;
}

/**
 * 章の Markdown から、画面に出る表と図を出てくる順に並べ、直後の <SourceRef> の原本ページを結ぶ。
 * 表＝行頭が `|` の行の塊（`\|` で escape された行は表にならないので数えない）。図＝<ArticleImage>。
 * @returns {{ kind: 'table' | 'figure', pages: number[] | null }[]}
 */
export function parseMdElements(md) {
  const elements = [];
  let inTable = false;
  for (const line of md.split('\n')) {
    const t = line.trim();
    if (t.startsWith('|')) {
      if (!inTable) elements.push({ kind: 'table', pages: null });
      inTable = true;
      continue;
    }
    inTable = false;
    if (t.startsWith('<ArticleImage')) {
      elements.push({ kind: 'figure', pages: null });
      continue;
    }
    const ref = t.match(/^<SourceRef\s+pages="([^"]*)"(?:\s+kind="(table|figure)")?/);
    if (ref) {
      const kind = ref[2] ?? null;
      const target = [...elements].reverse().find((e) => e.pages === null && (!kind || e.kind === kind));
      if (target) target.pages = parsePages(ref[1]);
    }
  }
  return elements;
}

/** 多すぎるときは等間隔に間引く（最初と最後を含む） */
export function pickEvenly(count, max) {
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  if (max <= 1) return [0];
  const picked = new Set();
  for (let i = 0; i < max; i += 1) picked.add(Math.round((i * (count - 1)) / (max - 1)));
  return [...picked].sort((a, b) => a - b);
}

/**
 * 対象の順番: (1) 不合格のあと中身が変わった章（直したかの確認）(2) 合格のあと中身が変わった章 (3) 未判定の章。
 * 同じ段の中は、索引される章 → 表と図の多い章 → key の順。中身が同じで判定済みの章は選ばない。
 */
export function selectTargets(candidates, ledger, { limit = 12, only = '', keys = [] } = {}) {
  const chapters = ledger?.chapters ?? {};
  if (keys.length) {
    const wanted = new Set(keys);
    return candidates.filter((c) => wanted.has(c.key));
  }
  const tierOf = (c) => {
    const prev = chapters[c.key];
    if (!prev) return 3;
    if (prev.outputSha256 === c.outputSha256) return null;
    return prev.verdict === 'fail' ? 1 : 2;
  };
  return candidates
    .filter((c) => !only || c.key === only || c.key.startsWith(`${only.replace(/\/$/, '')}/`))
    .map((c) => ({ c, tier: tierOf(c) }))
    .filter((x) => x.tier !== null)
    .sort((a, b) => a.tier - b.tier || Number(b.c.indexable) - Number(a.c.indexable) || b.c.elements - a.c.elements || a.c.key.localeCompare(b.c.key))
    .slice(0, limit)
    .map((x) => x.c);
}

/**
 * 判定を検証して台帳の行にする。
 * @returns {{ entries: Record<string, object>, errors: string[] }}
 */
export function buildLedgerEntries(packet, verdicts, { now = new Date().toISOString() } = {}) {
  const errors = [];
  const byKey = new Map();
  for (const v of verdicts) {
    if (!v || typeof v.key !== 'string') {
      errors.push(`key の無い判定: ${JSON.stringify(v).slice(0, 80)}`);
      continue;
    }
    if (byKey.has(v.key)) errors.push(`${v.key}: 判定が 2 件ある`);
    byKey.set(v.key, v);
  }
  const entries = {};
  for (const ch of packet.chapters) {
    const v = byKey.get(ch.key);
    byKey.delete(ch.key);
    if (!v) {
      errors.push(`${ch.key}: 判定が無い`);
      continue;
    }
    if (v.outputSha256 !== ch.outputSha256) {
      errors.push(`${ch.key}: 判定の outputSha256 が作業票と違う（別の回の判定を混ぜていないか）`);
      continue;
    }
    if (v.verdict !== 'pass' && v.verdict !== 'fail') {
      errors.push(`${ch.key}: verdict は pass か fail（${v.verdict}）`);
      continue;
    }
    const findings = Array.isArray(v.findings) ? v.findings : null;
    if (!findings) {
      errors.push(`${ch.key}: findings が配列でない`);
      continue;
    }
    const bad = findings.find((f) => !['major', 'minor'].includes(f?.severity) || !FINDING_TYPES.includes(f?.type) || !String(f?.detail ?? '').trim());
    if (bad) {
      errors.push(`${ch.key}: 指摘の形が違う（severity は major/minor・type は ${FINDING_TYPES.join('/')}・detail 必須）: ${JSON.stringify(bad).slice(0, 120)}`);
      continue;
    }
    const shotFiles = new Set(ch.shots.map((s) => s.file));
    const checked = Array.isArray(v.checkedShots) ? v.checkedShots : [];
    const unchecked = [...shotFiles].filter((f) => !checked.includes(f));
    if (unchecked.length) {
      errors.push(`${ch.key}: 見ていない撮影がある（checkedShots に無い: ${unchecked.join(', ')}）`);
      continue;
    }
    const hasMajor = findings.some((f) => f.severity === 'major');
    const deterministic = ch.deterministicIssues ?? [];
    if (v.verdict === 'pass' && hasMajor) {
      errors.push(`${ch.key}: major の指摘があるのに pass`);
      continue;
    }
    if (v.verdict === 'pass' && deterministic.length) {
      errors.push(`${ch.key}: 描画の決定的な崩れ（${deterministic.map((d) => d.type).join('・')}）があるのに pass`);
      continue;
    }
    if (v.verdict === 'fail' && !hasMajor && !deterministic.length) {
      errors.push(`${ch.key}: fail なのに major の指摘も決定的な崩れも無い（minor だけなら pass）`);
      continue;
    }
    entries[ch.key] = {
      outputSha256: ch.outputSha256,
      verdict: v.verdict,
      reviewedAt: now,
      runId: packet.runId,
      urls: ch.urls,
      findings: findings.map((f) => ({ severity: f.severity, type: f.type, detail: String(f.detail).trim(), ...(f.shot ? { shot: f.shot } : {}), ...(f.sourcePage ? { sourcePage: f.sourcePage } : {}) })),
      deterministic,
      ticket: null,
    };
  }
  for (const key of byKey.keys()) errors.push(`${key}: 作業票に無い章の判定`);
  return { entries, errors };
}

/** 台帳と現在の章から、被覆と未処理を数える */
export function summarizeStatus(ledger, candidates, { now = new Date() } = {}) {
  const chapters = ledger?.chapters ?? {};
  let current = 0;
  let changed = 0;
  let never = 0;
  const failsOpen = [];
  const failsTicketed = [];
  for (const c of candidates) {
    const e = chapters[c.key];
    if (!e) {
      never += 1;
      continue;
    }
    if (e.outputSha256 !== c.outputSha256) {
      changed += 1;
      continue;
    }
    current += 1;
    if (e.verdict === 'fail') (e.ticket ? failsTicketed : failsOpen).push(c.key);
  }
  const lastRun = (ledger?.runs ?? []).map((r) => r.at).sort().at(-1) ?? null;
  const ageDays = lastRun ? (now.getTime() - Date.parse(lastRun)) / 86_400_000 : null;
  const pending = changed + never;
  const problems = [];
  if (failsOpen.length) problems.push(`不合格のまま起票されていない章 ${failsOpen.length} 件（record --ticket で起票する）: ${failsOpen.slice(0, 5).join(', ')}`);
  if (pending > 0 && (ageDays === null || ageDays >= STALE_DAYS)) {
    problems.push(`判定待ち ${pending} 章（未判定 ${never}・中身が変わった ${changed}）があるのに、最後の実行が ${lastRun ? `${Math.floor(ageDays)} 日前` : '無い'}（${STALE_DAYS} 日以内に /standards-visual-review を回す）`);
  }
  return { total: candidates.length, current, changed, never, failsOpen, failsTicketed, lastRun, problems };
}

// ---- 章の一覧 ------------------------------------------------------------------------------------

/** 中身が異なる章（standards-render-targets の all）を、manifest の情報つきで返す */
export function listCandidates(articlesRoot = ARTICLES_ROOT) {
  const chapterUrls = new Map();
  for (const url of standardsRenderTargets(articlesRoot, { scope: 'all' })) {
    const m = url.match(/^\/standards\/([^/]+)\/([^/]+)\/chapters\/([^/]+)/);
    if (!m) continue;
    const key = `${m[1]}/${m[2]}/${m[3]}`;
    if (!chapterUrls.has(key)) chapterUrls.set(key, []);
    chapterUrls.get(key).push(url);
  }
  const manifests = new Map();
  const out = [];
  for (const [key, urls] of chapterUrls) {
    const [agencyId, documentId, chapterId] = key.split('/');
    const docKey = `${agencyId}/${documentId}`;
    if (!manifests.has(docKey)) manifests.set(docKey, readJson(join(articlesRoot, agencyId, documentId), 'manifest.json'));
    const manifest = manifests.get(docKey);
    const ch = manifest.chapters.find((c) => c.chapterId === chapterId);
    if (!ch) continue;
    const mdPath = join(articlesRoot, agencyId, documentId, ch.file);
    const md = existsSync(mdPath) ? readFileSync(mdPath, 'utf8') : '';
    out.push({
      key,
      agencyId,
      documentId,
      chapterId,
      title: ch.title,
      documentTitle: manifest.documentTitle,
      outputSha256: ch.outputSha256,
      indexable: Boolean(ch.indexable ?? manifest.indexable),
      elements: parseMdElements(md).length,
      sourcePages: ch.sourcePages ?? [],
      mdPath: relative(REPO_ROOT, mdPath),
      urls,
    });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

function readLedger() {
  if (!existsSync(LEDGER_PATH)) return { version: 1, runs: [], chapters: {} };
  return readJson(REPO_ROOT, relative(REPO_ROOT, LEDGER_PATH));
}

function writeLedger(ledger) {
  mkdirSync(join(LEDGER_PATH, '..'), { recursive: true });
  const sorted = { ...ledger, chapters: Object.fromEntries(Object.entries(ledger.chapters).sort(([a], [b]) => a.localeCompare(b))) };
  writeFileSync(LEDGER_PATH, formatJson(sorted));
}

// ---- 引数 ----------------------------------------------------------------------------------------

function parseArgs(argv) {
  const flags = parseCliArgs(
    {
      base: { type: 'string', default: 'http://localhost:3025' },
      limit: { type: 'integer', default: 12 },
      only: { type: 'string', default: '' },
      keys: { type: 'string', default: '' },
      channel: { type: 'string', default: '' },
      'max-shots': { type: 'integer', default: 10 },
      'max-tiles': { type: 'integer', default: 4 },
      run: { type: 'string', default: '' },
      ticket: { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      json: { type: 'boolean' },
    },
    argv,
  );
  const opts = { ...flags, command: flags._[0], base: flags.base.replace(/\/$/, ''), keys: flags.keys.split(',').map((s) => s.trim()).filter(Boolean) };
  if (flags._.length > 1) throw new Error(`不明な引数: ${flags._.slice(1).join(' ')}`);
  if (!Number.isInteger(opts.limit) || opts.limit < 1) throw new Error('--limit は 1 以上の整数');
  if (!Number.isInteger(opts.maxShots) || opts.maxShots < 1) throw new Error('--max-shots は 1 以上の整数');
  if (!Number.isInteger(opts.maxTiles) || opts.maxTiles < 0) throw new Error('--max-tiles は 0 以上の整数');
  return opts;
}

// ---- prepare -------------------------------------------------------------------------------------

/** 原本のページ画像のフォルダ（Drive vault）。沖縄版のような別名（sameAs）は元の文書をたどる */
function pageImageDirFor(agencyId, documentId, vaultRoot) {
  let docDir = join(SOURCES_ROOT, agencyId, documentId);
  let m = readJsonIf(docDir, 'manifest.json');
  if (m?.sameAs) {
    docDir = join(SOURCES_ROOT, ...String(m.sameAs).split('/'));
    m = readJsonIf(docDir, 'manifest.json');
  }
  if (!m) return null;
  if (existsSync(join(docDir, 'pages'))) return join(docDir, 'pages');
  // 初期の 10 文書は pagesLocation を持たず、原本 PDF と同名のフォルダ（check-standards-page-images と同じ規則）
  const vaultDir = m.pagesLocation?.vaultDir ?? (m.sourceFile ? `原資料PDF/共通仕様書/${m.sourceFile.replace(/\.pdf$/i, '')}` : null);
  if (!vaultRoot || !vaultDir) return null;
  const dir = join(vaultRoot, ...vaultDir.split('/'), 'pages');
  return existsSync(dir) ? dir : null;
}

function copySourcePage(pageDir, page, destDir) {
  const name = `p${String(page).padStart(4, '0')}.jpg`;
  const src = join(pageDir, name);
  if (!existsSync(src)) return null;
  const dest = join(destDir, `source-${name}`);
  if (!existsSync(dest)) {
    // 270dpi の原本は大きいので、読める範囲で縮める（macOS の sips。無ければそのまま写す）
    const r = spawnSync('sips', ['-Z', '1800', src, '--out', dest], { stdio: 'ignore' });
    if (r.status !== 0 || !existsSync(dest)) copyFileSync(src, dest);
  }
  return relative(REPO_ROOT, dest);
}

function outIsStale(base) {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) return null;
  const marker = join(REPO_ROOT, 'out/standards');
  if (!existsSync(marker)) return 'out/standards が無い（npm run build のあと npm run serve）';
  const r = spawnSync('git', ['log', '-1', '--format=%ct', '--', 'content/site/standards-articles', 'src/app/standards', 'src/components'], { cwd: REPO_ROOT, encoding: 'utf8' });
  const lastChange = Number(r.stdout.trim()) * 1000;
  if (lastChange && statSync(marker).mtimeMs < lastChange) {
    return `out/ が章記事・描画の最後の変更（${new Date(lastChange).toISOString().slice(0, 16)}）より古い（npm run build し直す）`;
  }
  return null;
}

const SHOT_STYLE =
  '[data-standards-chapter] .table-scroll{overflow:visible!important;width:max-content!important;max-width:none!important}[data-standards-sidebar],aside{display:none!important}article,main,main *{overflow:visible!important}';

/** 要素を撮る。高すぎる要素は上の MAX_SHOT_HEIGHT だけ撮り、その旨の文字列を返す */
async function shootElement(page, locator, path) {
  await locator.scrollIntoViewIfNeeded();
  const rect = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
  });
  if (rect.height > MAX_SHOT_HEIGHT) {
    await page.screenshot({ path, fullPage: true, clip: { x: Math.max(0, rect.x), y: rect.y, width: Math.max(1, rect.width), height: MAX_SHOT_HEIGHT } });
    return `高さ ${Math.round(rect.height)}px の上 ${MAX_SHOT_HEIGHT}px だけ`;
  }
  await locator.screenshot({ path });
  return null;
}

async function shootChapter({ desktop, mobile, base, chapter, dir, maxShots, maxTiles, pageDir }) {
  const deterministicIssues = [];
  const elements = [];
  const overview = [];
  let tileBudget = maxTiles;
  let markupShots = 0;
  for (const [urlIndex, url] of chapter.urls.entries()) {
    const m = await mobile.newPage();
    try {
      const res = await m.goto(`${base}${url}`, { waitUntil: 'networkidle', timeout: 120_000 });
      if (!res || res.status() !== 200) throw new Error(`HTTP ${res?.status()}`);
      for (const issue of await m.evaluate(inspectInPage)) {
        if (issue.type === 'image' && BLOCKED_REQUEST.test(issue.detail)) continue;
        deterministicIssues.push({ ...issue, url });
      }
      if (urlIndex === 0) {
        const file = 'mobile-01.png';
        await m.screenshot({ path: join(dir, file) });
        overview.push(file);
      }
    } finally {
      await m.close();
    }

    const d = await desktop.newPage();
    try {
      await d.goto(`${base}${url}`, { waitUntil: 'networkidle', timeout: 120_000 });
      await d.addStyleTag({ content: SHOT_STYLE });
      const locator = d.locator('[data-standards-chapter] table, [data-standards-chapter] img[src*="/standards-articles/"]');
      const count = await locator.count();
      for (let i = 0; i < count; i += 1) {
        const kind = await locator.nth(i).evaluate((el) => (el.tagName === 'TABLE' ? 'table' : 'figure'));
        elements.push({ url, kind, page: d, index: i, locator: locator.nth(i) });
      }
      // 撮影は同じページを開いている間に済ませる
      const own = elements.filter((e) => e.page === d);
      const ownStart = elements.length - own.length;
      const mdElements = chapter.mdElements;
      const sameShape = mdElements.length >= elements.length;
      for (const [j, e] of own.entries()) {
        e.globalIndex = ownStart + j;
        e.mdPages = sameShape && mdElements[e.globalIndex]?.kind === e.kind ? mdElements[e.globalIndex].pages : null;
      }
      const picked = new Set(pickEvenly(chapter.totalElementsHint ?? count, maxShots));
      for (const e of own) {
        if (!picked.has(e.globalIndex) && chapter.totalElementsHint !== undefined) continue;
        const n = String(e.globalIndex + 1).padStart(2, '0');
        const file = `${e.kind}-${n}.png`;
        const truncated = await shootElement(d, e.locator, join(dir, file));
        const sourceImages = (e.mdPages ?? []).map((p) => copySourcePage(pageDir, p, dir)).filter(Boolean);
        e.shot = { file, kind: e.kind, url, index: e.globalIndex + 1, sourcePages: e.mdPages, sourceImages, ...(truncated ? { truncated } : {}) };
      }
      // 記法が生で出ている段落（表になり損ねた行など）を撮る。原本との対応は付けない
      const leaks = d.locator('[data-standards-chapter] p, [data-standards-chapter] li');
      const leakIndexes = await leaks.evaluateAll((els) => els.map((el, i) => (/\|\s*:?-{3,}:?\s*\||^#{2,4} |\*\*[^*\s][^*]{0,40}\*\*/.test(el.textContent ?? '') ? i : -1)).filter((i) => i >= 0));
      for (const i of leakIndexes.slice(0, Math.max(0, 3 - markupShots))) {
        markupShots += 1;
        const file = `markup-${String(markupShots).padStart(2, '0')}.png`;
        await shootElement(d, leaks.nth(i), join(dir, file));
        overview.push(file);
      }
      // 本文全体を縦に区切った画面（流れ・段落・図の抜けを見る）。多いときは等間隔に間引く
      const remainingUrls = chapter.urls.length - urlIndex;
      const allot = Math.max(1, Math.floor(tileBudget / remainingUrls));
      const body = d.locator('[data-standards-chapter]').first();
      if (tileBudget > 0 && (await body.count())) {
        const rect = await body.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
        });
        const tiles = Math.max(1, Math.ceil(rect.height / TILE_HEIGHT));
        for (const t of pickEvenly(tiles, Math.min(allot, tileBudget))) {
          tileBudget -= 1;
          const file = `page-${String(maxTiles - tileBudget).padStart(2, '0')}.png`;
          const y = rect.y + t * TILE_HEIGHT;
          await d.screenshot({ path: join(dir, file), fullPage: true, clip: { x: Math.max(0, rect.x), y, width: Math.max(1, rect.width), height: Math.min(TILE_HEIGHT, rect.y + rect.height - y) } });
          overview.push(file);
        }
      }
    } finally {
      await d.close();
    }
  }
  const shots = elements.filter((e) => e.shot).map((e) => e.shot);
  const counts = (list) => ({ table: list.filter((e) => e.kind === 'table').length, figure: list.filter((e) => e.kind === 'figure').length });
  const rendered = counts(elements);
  const inMd = counts(chapter.mdElements);
  const notes = [];
  if (rendered.table !== inMd.table || rendered.figure !== inMd.figure) {
    notes.push(`画面の表 ${rendered.table}・図 ${rendered.figure} と Markdown の表 ${inMd.table}・図 ${inMd.figure} の数が違う（原本ページとの対応は付けていない。表が段落に化けていないか本文の撮影で確かめる）`);
  }
  if (elements.length > shots.length) notes.push(`表と図 ${elements.length} 件のうち ${shots.length} 件を等間隔に撮影`);
  return { deterministicIssues, shots, overview, rendered, notes };
}

async function prepare(opts) {
  const stale = outIsStale(opts.base);
  if (stale) {
    console.error(`[standards-visual-review] 検査不成立: ${stale}`);
    return 2;
  }
  const candidates = listCandidates();
  const ledger = readLedger();
  const targets = selectTargets(candidates, ledger, opts);
  if (targets.length === 0) {
    console.error(`[standards-visual-review] 対象 0 件（判定待ちの章が無い、または --only/--keys が合っていない）。全 ${candidates.length} 章`);
    return 2;
  }

  const { resolveVaultRoot } = await import('./lib/drive-vault.mjs');
  let vaultRoot = null;
  try {
    vaultRoot = resolveVaultRoot().root;
  } catch {
    vaultRoot = null;
  }

  const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const runDir = join(RUN_ROOT, runId);
  rmSync(runDir, { recursive: true, force: true });
  mkdirSync(join(runDir, 'verdicts'), { recursive: true });

  const { chromium } = await import('playwright');
  const browser = await chromium.launch(opts.channel ? { channel: opts.channel } : {});
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light', serviceWorkers: 'block' });
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light', serviceWorkers: 'block', isMobile: true });
  const blocked = BLOCKED_REQUEST;
  await desktop.route(blocked, (r) => r.abort());
  await mobile.route(blocked, (r) => r.abort());

  const packet = { runId, createdAt: new Date().toISOString(), base: opts.base, ledger: relative(REPO_ROOT, LEDGER_PATH), chapters: [] };
  const failures = [];
  try {
    for (const target of targets) {
      const pageDir = pageImageDirFor(target.agencyId, target.documentId, vaultRoot);
      if (!pageDir) {
        failures.push(`${target.key}: 原本のページ画像のフォルダが見つからない（Drive vault がマウントされているか・npm run check-standards-page-images）`);
        continue;
      }
      const dir = join(runDir, target.key.replaceAll('/', '__'));
      mkdirSync(dir, { recursive: true });
      const md = readFileSync(join(REPO_ROOT, target.mdPath), 'utf8');
      const mdElements = parseMdElements(md);
      try {
        // 撮る番号は Markdown の並びで先に決める（画面の数が違うときは画面で数え直す）
        const chapter = { ...target, mdElements, totalElementsHint: mdElements.length || undefined };
        const shot = await shootChapter({ desktop, mobile, base: opts.base, chapter, dir, maxShots: opts.maxShots, maxTiles: opts.maxTiles, pageDir });
        packet.chapters.push({
          key: target.key,
          title: `${target.documentTitle} ${target.title}`,
          outputSha256: target.outputSha256,
          indexable: target.indexable,
          urls: target.urls.map((u) => `${opts.base}${u}`),
          mdPath: target.mdPath,
          dir: relative(REPO_ROOT, dir),
          pageImageDir: pageDir,
          chapterSourcePages: [target.sourcePages[0], target.sourcePages.at(-1)].filter((p) => p !== undefined),
          deterministicIssues: shot.deterministicIssues,
          overview: shot.overview,
          shots: shot.shots,
          notes: shot.notes,
        });
        console.log(`  ${target.key}: 撮影 ${shot.shots.length}・決定的な崩れ ${shot.deterministicIssues.length}${shot.notes.length ? `・注 ${shot.notes.length}` : ''}`);
      } catch (error) {
        failures.push(`${target.key}: ${String(error.message).split('\n')[0]}`);
      }
    }
  } finally {
    await browser.close();
  }

  writeFileSync(join(runDir, 'packet.json'), `${JSON.stringify(packet, null, 2)}\n`);
  const shots = packet.chapters.reduce((a, c) => a + c.shots.length, 0);
  const det = packet.chapters.filter((c) => c.deterministicIssues.length).length;
  console.log(`[standards-visual-review] 判定待ち ${candidates.length} 章中から選んだ ${targets.length} 章 / 作業票 ${packet.chapters.length} 章・撮影 ${shots} 枚・決定的な崩れのある章 ${det}`);
  console.log(`  作業票: ${relative(REPO_ROOT, join(runDir, 'packet.json'))}（判定は ${relative(REPO_ROOT, join(runDir, 'verdicts'))}/ に書く）`);
  if (failures.length) {
    for (const f of failures) console.error(`  ✗ ${f}`);
    console.error(`[standards-visual-review] 検査不成立: ${failures.length} 章を撮れなかった`);
    return 2;
  }
  return 0;
}

// ---- record --------------------------------------------------------------------------------------

function resolveRunDir(run) {
  if (!run) throw new Error('--run が要る（prepare が出した作業票のフォルダか runId）');
  const candidates = [run, join(RUN_ROOT, run), join(REPO_ROOT, run)];
  const dir = candidates.find((p) => existsSync(join(p, 'packet.json')));
  if (!dir) throw new Error(`作業票が見つからない: ${run}`);
  return dir;
}

function readVerdicts(runDir) {
  const dir = join(runDir, 'verdicts');
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const data = readJson(dir, f);
    out.push(...(Array.isArray(data) ? data : (data.chapters ?? [data])));
  }
  return out;
}

function cardBody(documentKey, entries, runId) {
  const lines = [
    `**起点**: ${todayJst()} の画面の目視判定（\`npm run standards-visual-review\`・作業票 ${runId}）で、${documentKey} の ${entries.length} 章が不合格になった。判定は撮影した画面と原本のページ画像の見比べ（エージェント standards-page-visual-auditor）と、描画で決まる崩れの機械判定。台帳は ${relative(REPO_ROOT, LEDGER_PATH)}。`,
    '',
  ];
  for (const [key, e] of entries) {
    lines.push(`- ${key}（${e.urls[0]}）`);
    for (const d of e.deterministic.slice(0, 3)) lines.push(`  - 機械: ${d.type} ${String(d.detail).slice(0, 120)}`);
    for (const f of e.findings.filter((x) => x.severity === 'major').slice(0, 4)) lines.push(`  - ${f.type}: ${f.detail.slice(0, 200)}${f.shot ? `（${f.shot}${f.sourcePage ? `・原本 p${f.sourcePage}` : ''}）` : ''}`);
  }
  lines.push(
    '',
    '**やること**: 原因（生成器 scripts/build-standard-articles.mjs・表の台帳・描画の部品のどれか）を直す。同じ原因の章はまとめて直す。',
    '',
    `**完了条件**: \`npm run standards-visual-review -- prepare --keys ${entries.map(([k]) => k).join(',')}\` で撮り直して判定し、record で全章が pass と台帳に記録される。`,
  );
  return lines.join('\n');
}

function createTicket(documentKey, entries, runId) {
  const bodyFile = join(RUN_ROOT, runId, `card-${documentKey.replace('/', '__')}.md`);
  writeFileSync(bodyFile, `${cardBody(documentKey, entries, runId)}\n`);
  const title = `基準書 ${documentKey} の ${entries.length} 章が画面の目視判定で不合格（${entries.map(([k]) => k.split('/')[2]).slice(0, 6).join('・')}${entries.length > 6 ? ' ほか' : ''}）`;
  const r = spawnSync(
    process.execPath,
    [join(REPO_ROOT, 'scripts/todo-add.mjs'), '--title', title, '--tier', '中', '--kind', '不具合', '--domain', 'サイト', '--body-file', bodyFile, '--verify', 'standards-visual-review', '--commit'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(`todo:add に失敗（${documentKey}）: ${(r.stderr || r.stdout).trim().split('\n').slice(-3).join(' / ')}`);
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
    console.error(`[standards-visual-review] ${error.message}`);
    return 2;
  }
  const verdicts = readVerdicts(runDir);
  const { entries, errors } = buildLedgerEntries(packet, verdicts);
  console.log(`[standards-visual-review] 作業票 ${packet.chapters.length} 章 / 判定 ${verdicts.length} 件 / 記録できる ${Object.keys(entries).length} 章`);
  if (errors.length) {
    for (const e of errors) console.error(`  ✗ ${e}`);
    console.error('[standards-visual-review] 判定に欠け・矛盾がある。直してから record し直す（台帳は書いていない）');
    return 1;
  }
  const ledger = readLedger();
  const fails = Object.entries(entries).filter(([, e]) => e.verdict === 'fail');
  for (const [key, e] of Object.entries(entries)) {
    const prev = ledger.chapters[key];
    // 中身が同じまま不合格が続くなら、前の起票を引き継ぐ
    if (e.verdict === 'fail' && prev?.verdict === 'fail' && prev.outputSha256 === e.outputSha256 && prev.ticket) e.ticket = prev.ticket;
  }
  console.log(`  合格 ${Object.keys(entries).length - fails.length} / 不合格 ${fails.length}`);
  for (const [key, e] of fails) console.log(`  ✗ ${key}: ${[...e.deterministic.map((d) => d.type), ...e.findings.filter((f) => f.severity === 'major').map((f) => f.type)].join('・')}`);
  if (opts.dryRun) {
    console.log('  （--dry-run: 台帳は書いていない）');
    return 0;
  }
  Object.assign(ledger.chapters, entries);
  ledger.runs = [...(ledger.runs ?? []), { runId: packet.runId, at: new Date().toISOString(), base: packet.base, chapters: packet.chapters.length, pass: Object.keys(entries).length - fails.length, fail: fails.length }].slice(-50);
  writeLedger(ledger);
  console.log(`  台帳: ${relative(REPO_ROOT, LEDGER_PATH)}`);

  if (opts.ticket) {
    const byDocument = new Map();
    for (const [key, e] of fails) {
      if (e.ticket) continue;
      const doc = key.split('/').slice(0, 2).join('/');
      if (!byDocument.has(doc)) byDocument.set(doc, []);
      byDocument.get(doc).push([key, e]);
    }
    for (const [doc, list] of byDocument) {
      const id = createTicket(doc, list, packet.runId);
      for (const [key] of list) ledger.chapters[key].ticket = id;
      writeLedger(ledger);
      console.log(`  起票 ${id}: ${doc} の ${list.length} 章`);
    }
  } else if (fails.some(([, e]) => !e.ticket)) {
    console.log('  未起票の不合格がある（--ticket で文書ごとに起票する）');
  }
  return 0;
}

// ---- status --------------------------------------------------------------------------------------

function status(opts) {
  let ledger;
  try {
    ledger = readLedger();
  } catch (error) {
    console.error(`[standards-visual-review] 台帳が読めない: ${error.message}`);
    return 2;
  }
  const candidates = listCandidates();
  if (candidates.length === 0) {
    console.error('[standards-visual-review] 検査不成立: 章が 0 件');
    return 2;
  }
  const s = summarizeStatus(ledger, candidates);
  if (opts.json) {
    console.log(JSON.stringify(s, null, 2));
  } else {
    console.log(`[standards-visual-review] 対象 ${s.total} 章（中身が異なる章） / 判定済み ${s.current}（不合格 ${s.failsOpen.length + s.failsTicketed.length}・うち起票済み ${s.failsTicketed.length}） / 中身が変わり判定待ち ${s.changed} / 未判定 ${s.never} / 最後の実行 ${s.lastRun?.slice(0, 10) ?? 'なし'}`);
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
    console.error(`[standards-visual-review] ${error.message}`);
    return 2;
  }
  if (opts.command === 'prepare') return prepare(opts);
  if (opts.command === 'record') return record(opts);
  if (opts.command === 'status') return status(opts);
  console.error('[standards-visual-review] サブコマンドは prepare / record / status');
  return 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(`[standards-visual-review] ${error.stack ?? error}`);
      process.exit(2);
    });
}
