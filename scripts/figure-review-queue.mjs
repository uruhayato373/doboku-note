#!/usr/bin/env node
/**
 * figure-review-queue.mjs — 記事図クロップの品質ループ（/figure-quality-loop）の判定待ちと判定台帳。
 *
 * 公開記事が使っている図（png/webp/jpg）を毎回その場で画素検査し（check-figure-crop-integrity の analyzeImage・
 * 700 枚で数秒）、provenance の OCR 判定（needs）と合わせて「兆候のある図」を選ぶ。そこから
 *   - 判定台帳（.claude/state/quality/figure-review-ledger.json）に今の画像のハッシュで記録がある図
 *   - figure-sources.json の manual_needs で目視済みの図（台帳より前の目視記録。画像のハッシュを持たないので、
 *     判定後に画像が変わったかは分からない。git 履歴は 2026-08-22 に 1 commit へ切り詰めたのでコミット日でも判別できない）
 * を除いたものが判定待ち。判定台帳で needs-source（元 PDF からの切り出し直し待ち）の図は別の列に出す。
 * 共通の判定と台帳の形は scripts/lib/figure-review.mjs。
 *
 * Usage:
 *   node scripts/figure-review-queue.mjs                                  # 集計（判定待ち・切り出し直し待ち・判定済み）
 *   node scripts/figure-review-queue.mjs --next 12 [--stage reextract] --json   # 次に回す図（既定は判定待ち）
 *   node scripts/figure-review-queue.mjs record <verdicts.json>           # 判定を台帳へ記録し、直した図は MDX の寸法を合わせる
 *
 * 終了コード: 0 = 完走（判定待ちが残っていても 0）/ 1 = record の入力が不正 / 2 = 検査不成立（走査 0 枚・画素検査の失敗が支配的）
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import sharp from 'sharp';
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { parseJson, readJsonIf, writeJson } from './lib/json-io.mjs';
import { fetchFailDominant } from './lib/inconclusive-gate.mjs';
import { resolveVaultRoot } from './lib/drive-vault.mjs';
import { isCliEntry } from './lib/cli-run.mjs';
import { analyzeImage } from './check-figure-crop-integrity.mjs';
import { readMdxFile, writeMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';
import {
  LEDGER_FILE, emptyLedger, fileSha, buildQueue, articleInfo, referencedExt, servedExt,
  syncImageDims, validateVerdict,
} from './lib/figure-review.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const PROVENANCE_FILE = '.claude/state/figure-provenance.json';
const toPosix = (p) => p.split(sep).join('/');

function listFigureBases() {
  const bases = new Set();
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!/\.(png|webp|jpg|jpeg)$/i.test(e.name) || /^ogp\./i.test(e.name)) continue;
      const rel = toPosix(relative(SITE_CONTENT_ROOT, full));
      if (!/\/img\/[^/]+$/.test(rel)) continue;
      bases.add(rel.replace(/\.(png|webp|jpg|jpeg)$/i, ''));
    }
  };
  walk(SITE_CONTENT_ROOT);
  return [...bases].sort();
}

/** 図 1 枚の基本情報（公開記事で使用中か・配信している画像・ハッシュ） */
function describe(figKey, cache) {
  const parts = figKey.split('/');
  const slug = parts.slice(0, 2).join('/');
  const name = parts[parts.length - 1];
  const art = articleInfo(SITE_CONTENT_ROOT, slug, cache);
  const refExt = art.found ? referencedExt(art.content, name) : null;
  const baseAbs = join(SITE_CONTENT_ROOT, figKey);
  const ext = servedExt(baseAbs, refExt);
  const abs = ext ? `${baseAbs}.${ext}` : null;
  return {
    figKey, name, ext, abs,
    img: abs ? toPosix(relative(ROOT, abs)) : null,
    mdx: art.path ? toPosix(relative(ROOT, art.path)) : null,
    live: Boolean(art.published && refExt && refExt !== 'svg' && abs),
  };
}

/** manual_needs の目視判定（figKey → needs）。台帳に記録が無い図だけに効く */
function trustedManual(figs) {
  const doc = readJsonIf(ROOT, datasetPath('config.figure-sources'));
  const manual = Array.isArray(doc?.manual_needs) ? doc.manual_needs : [];
  const out = new Map();
  for (const f of figs) {
    const m = manual.find((x) => f.figKey === x.figure || f.figKey.endsWith(`/${x.figure}`));
    if (m) out.set(f.figKey, m.needs);
  }
  return out;
}

async function collect() {
  const cache = new Map();
  const bases = listFigureBases();
  const prov = readJsonIf(ROOT, PROVENANCE_FILE);
  const ledger = readJsonIf(ROOT, LEDGER_FILE) ?? emptyLedger();
  const figs = bases.map((b) => describe(b, cache));
  let analyzed = 0;
  let failed = 0;
  for (const f of figs) {
    if (!f.live) continue;
    f.sha = fileSha(f.abs);
    f.needs = prov?.figures?.[f.figKey]?.needs ?? null;
    try {
      const a = await analyzeImage(f.abs);
      f.violations = a.violations;
      f.imgSize = [a.w, a.h];
      f.entropy = (await sharp(f.abs).greyscale().stats()).entropy;
      analyzed++;
    } catch {
      f.violations = [];
      failed++;
    }
  }
  const live = figs.filter((f) => f.live);
  const flaggedNoLedger = live.filter((f) => !ledger.figures?.[f.figKey] || ledger.figures[f.figKey].sha !== f.sha);
  const trusted = trustedManual(flaggedNoLedger);
  const queue = buildQueue({ figures: live, ledger, trusted });
  return { figs, live, analyzed, failed, prov, ledger, queue };
}

function sourceRoots() {
  const roots = [];
  const v = resolveVaultRoot();
  if (v.root) for (const d of ['原資料PDF/過去問', '原資料PDF/教材', '原資料PDF/書籍']) roots.push(`${v.root}/${d}`);
  roots.push(toPosix(join(ROOT, 'content', 'sources', 'past-exams')));
  return { roots, vaultNote: v.root ? null : v.reason };
}

function manualSourceOf(figKey) {
  const doc = readJsonIf(ROOT, datasetPath('config.figure-sources'));
  const m = (doc?.manual_needs || []).find((x) => x.source_pdf && (figKey === x.figure || figKey.endsWith(`/${x.figure}`)));
  return m ? { pdf: m.source_pdf, page: m.page ?? null, dpi: m.dpi ?? null } : null;
}

function itemOf(f, stage, extra = {}) {
  return {
    stage, figKey: f.figKey, img: f.img, kind: f.ext, imgSize: f.imgSize, mdx: f.mdx,
    signals: f.signals, ...extra,
  };
}

async function runSummary(argv) {
  const json = argv.includes('--json');
  // --json は標準出力を JSON だけにする（> batch.json で受けるため）。集計は標準エラーへ
  const say = json ? (...a) => console.error(...a) : (...a) => console.log(...a);
  const { figs, live, analyzed, failed, prov, queue } = await collect();
  const c = queue.counts;
  say(`[figure-review] 図 ${figs.length} 枚を走査（公開記事で使用中 ${live.length}・画素検査 ${analyzed}・失敗 ${failed}）`);
  if (live.length === 0 || fetchFailDominant(failed, live.length)) {
    console.error('✗ 検査不成立: 公開記事の図を 1 枚も検査できていない、または画素検査の失敗が多すぎる');
    return 2;
  }
  if (!prov) say('  ⚠ provenance が無い（OCR の兆候を使えない）→ npm run audit-figures');
  else {
    const missing = live.filter((f) => (prov.figures?.[f.figKey]?.textStatus ?? 'unaudited') === 'unaudited').length;
    if (missing) say(`  ⚠ OCR 未監査 ${missing} 枚（答え・本文の写り込み判定が効いていない）→ npm run audit-figures（provenance ${prov.generated_at} 生成）`);
  }
  say(`  兆候あり ${c.flagged} / 判定済み ok ${c.ok}・切り出し直し待ち ${c.needsSource}・原典なし ${c.sourceUnavailable} / 手動判定で確認済み ${c.trusted} / 画像が変わり記録が失効 ${c.stale}`);
  const tiers = [1, 2, 3].map((t) => `優先${t}: ${queue.review.filter((r) => r.tier === t).length}`).join('・');
  say(`  判定待ち ${c.pendingReview}（${tiers}）／切り出し直し待ち ${c.pendingReextract}`);
  if (c.pendingReview === 0 && c.pendingReextract === 0) say('✓ 判定待ち・切り出し直し待ちとも 0（ループ完了）');

  const nextIdx = argv.indexOf('--next');
  if (nextIdx >= 0) {
    const n = Number(argv[nextIdx + 1]) || 10;
    const stage = argv.includes('--stage') ? argv[argv.indexOf('--stage') + 1] : 'review';
    const { roots, vaultNote } = sourceRoots();
    const items = stage === 'reextract'
      ? queue.reextract.slice(0, n).map((f) => itemOf(f, stage, {
        whyCut: f.entry.reason, manualSource: manualSourceOf(f.figKey), sourceRoots: roots, ...(vaultNote ? { vaultNote } : {}),
      }))
      : queue.review.slice(0, n).map((f) => itemOf(f, stage, { tier: f.tier }));
    if (json) console.log(JSON.stringify(items, null, 2));
    else for (const it of items) say(`  - ${it.img}  ${it.signals.map((s) => s.signal + (s.side ? `(${s.side})` : '')).join(' ')}`);
  }
  return 0;
}

/** 出典 PDF のパスを機械に依存しない形にする（Drive vault 配下は `vault:原資料PDF/...`、リポジトリ配下はリポジトリ相対） */
function portablePath(p) {
  const posix = toPosix(p).normalize('NFC');
  const v = resolveVaultRoot();
  if (v.root && posix.startsWith(`${v.root.normalize('NFC')}/`)) return `vault:${posix.slice(v.root.length + 1)}`;
  const root = toPosix(ROOT);
  return posix.startsWith(`${root}/`) ? posix.slice(root.length + 1) : posix;
}

async function runRecord(file) {
  if (!file) { console.error('usage: figure-review-queue.mjs record <verdicts.json>'); return 1; }
  const input = parseJson(readFileSync(resolve(file), 'utf8'), file);
  const list = Array.isArray(input) ? input : [input];
  const errs = list.flatMap(validateVerdict);
  const cache = new Map();
  const described = list.map((v) => ({ v, f: describe(v.figKey, cache) }));
  for (const { v, f } of described) if (!f.abs) errs.push(`${v.figKey}: 画像が見つからない`);
  if (errs.length) {
    console.error(`✗ 判定 ${list.length} 件のうち不正 ${errs.length} 件（台帳は書いていない）:`);
    for (const e of errs) console.error(`  - ${e}`);
    return 1;
  }
  const ledger = readJsonIf(ROOT, LEDGER_FILE) ?? emptyLedger();
  let mdxUpdated = 0;
  for (const { v, f } of described) {
    const action = v.action ?? 'none';
    if (action !== 'none' && f.mdx) {
      const { width, height } = await sharp(f.abs).metadata();
      const abs = join(ROOT, f.mdx);
      const { raw, eol } = readMdxFile(abs);
      const r = syncImageDims(raw, f.name, width, height);
      if (r.changed) { writeMdxFile(abs, r.raw, eol); mdxUpdated += r.changed; }
    }
    ledger.figures[v.figKey] = {
      sha: fileSha(f.abs), verdict: v.verdict, action, reason: v.reason.trim(),
      reviewedAt: new Date().toISOString(),
      ...(v.source ? { source: { ...v.source, pdf: portablePath(v.source.pdf) } } : {}),
    };
  }
  ledger.figures = Object.fromEntries(Object.entries(ledger.figures).sort(([a], [b]) => a.localeCompare(b)));
  writeJson(ROOT, LEDGER_FILE, ledger);
  const by = list.reduce((m, v) => ({ ...m, [v.verdict]: (m[v.verdict] || 0) + 1 }), {});
  console.log(`[figure-review] 台帳に ${list.length} 件を記録（${Object.entries(by).map(([k, n]) => `${k}:${n}`).join(' ')}）・MDX の寸法を ${mdxUpdated} か所更新 → ${LEDGER_FILE}`);
  return 0;
}

export async function run(argv = process.argv.slice(2)) {
  if (argv[0] === 'record') return runRecord(argv[1]);
  return runSummary(argv);
}

if (isCliEntry(import.meta.url)) {
  run().then((code) => { process.exitCode = code; }, (e) => { console.error(e?.stack || String(e)); process.exitCode = 1; });
}
