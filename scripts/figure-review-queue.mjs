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
 *   node scripts/figure-review-queue.mjs record <verdicts.json>           # 判定を台帳へ、出典を config/figure-sources.json の provenance へ記録し、直した図は MDX の寸法を合わせる
 *
 * 終了コード: 0 = 完走（判定待ちが残っていても 0）/ 1 = record の入力が不正 / 2 = 検査不成立（走査 0 枚・画素検査の失敗が支配的）
 */
import { readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import sharp from 'sharp';
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { parseJson, readJsonIf, writeJson } from './lib/json-io.mjs';
import { writeDataset } from './lib/dataset-write.mjs';
import { fetchFailDominant } from './lib/inconclusive-gate.mjs';
import matter from 'gray-matter';
import { driveGroupFor, loadDriveConfig, loadDriveManifest, resolveVaultRoot, vaultRelFor } from './lib/drive-vault.mjs';
import { sourceCandidatesFor, sourceIdsOf } from './lib/figure-source-wiring.mjs';
import { isCliEntry } from './lib/cli-run.mjs';
import { analyzeImage } from './check-figure-crop-integrity.mjs';
import { readMdxFile, writeMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';
import {
  LEDGER_FILE, emptyLedger, fileSha, buildQueue, listFigureKeys, describeFigure,
  syncImageDims, validateVerdict,
} from './lib/figure-review.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const PROVENANCE_FILE = '.claude/state/figure-provenance.json';
const toPosix = (p) => p.split(sep).join('/');

const listFigureBases = () => listFigureKeys(SITE_CONTENT_ROOT);
const describe = (figKey, cache) => describeFigure({ siteRoot: SITE_CONTENT_ROOT, repoRoot: ROOT, figKey, cache });

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
  // 写真（AI 生成画像）は切り出し図ではない。実物どおりかは AI 画像の台帳と check-image-origin が見る（OCR は写真の模様を文字と誤読する・2026-10-07）
  const provenanceCfg = readJsonIf(ROOT, datasetPath('config.figure-sources'))?.provenance ?? {};
  const photos = live.filter((f) => provenanceCfg[f.figKey]?.kind === 'ai-generated');
  const crops = live.filter((f) => provenanceCfg[f.figKey]?.kind !== 'ai-generated');
  const flaggedNoLedger = crops.filter((f) => !ledger.figures?.[f.figKey] || ledger.figures[f.figKey].sha !== f.sha);
  const trusted = trustedManual(flaggedNoLedger);
  const minLongSide = readJsonIf(ROOT, datasetPath('config.image-limits'))?.figureMinLongSide ?? 0;
  const queue = buildQueue({ figures: crops, ledger, trusted, minLongSide });
  queue.counts.photos = photos.length;
  // 試験ページでない記事で、原典が流用不可（figureReuse: false）の書籍しか無い図は切り出し直さない（DN-0563）
  queue.reuseForbidden = [];
  queue.reextract = queue.reextract.filter((f) => {
    const w = wiringOf(f);
    if (w.candidates.length === 0 && w.forbidden.length > 0) { queue.reuseForbidden.push({ ...f, forbidden: w.forbidden }); return false; }
    return true;
  });
  queue.counts.pendingReextract = queue.reextract.length;
  queue.counts.reuseForbidden = queue.reuseForbidden.length;
  return { figs, live, analyzed, failed, prov, ledger, queue };
}

/**
 * 原典を探す予備の場所（sourceCandidates で見つからないときだけ使う）。Drive 台帳の原資料系 group から導く。
 * 2026-10-07 まで 過去問・教材・書籍 の固定 3 つで、白書・共通仕様書を探さなかった（DN-0564）。
 */
function sourceRoots() {
  const roots = [];
  const v = resolveVaultRoot();
  if (v.root) {
    const dirs = loadDriveConfig().groups
      .filter((g) => g.status === 'active' && g.audience === 'human' && /^原資料PDF\/[^/]+$/.test(String(g.vaultDir || '')))
      .map((g) => g.vaultDir);
    for (const d of [...new Set(dirs)].sort()) roots.push(`${v.root}/${d}`);
  }
  roots.push(toPosix(join(ROOT, 'content', 'sources', 'past-exams')));
  return { roots, vaultNote: v.root ? null : v.reason };
}

let referenceCfg = null;
let figureCategories = null;
let pastExamDirs = null;
const articleSourcesCache = new Map();

/** 図の記事の sources（と試験ページなら資格の scanReferences）から原典候補を作る。 */
function wiringOf(f) {
  referenceCfg ??= readJsonIf(ROOT, datasetPath('config.reference-sources')) ?? { sources: [], classes: {} };
  figureCategories ??= readJsonIf(ROOT, datasetPath('config.figure-sources'))?.categories ?? {};
  const articleDir = f.figKey.split('/img/')[0];
  if (!articleSourcesCache.has(articleDir)) {
    let ids = [];
    try { ids = sourceIdsOf(matter(readFileSync(join(ROOT, f.mdx), 'utf8')).data.sources); } catch { /* 記事が読めなければ候補なし */ }
    articleSourcesCache.set(articleDir, ids);
  }
  if (!pastExamDirs) {
    // 公式過去問の原本フォルダ（content/sources/past-exams/{資格} ↔ vault 原資料PDF/過去問/{資格}）
    const inv = readJsonIf(ROOT, datasetPath('pastexams.inventory'));
    pastExamDirs = new Map(Object.entries(inv?.exams ?? {})
      .filter(([, e]) => typeof e?.dir === 'string' && e.dir.startsWith('content/sources/past-exams/'))
      .map(([k, e]) => [k, '原資料PDF/過去問/' + e.dir.slice('content/sources/past-exams/'.length)]));
  }
  const qualification = articleDir.split('/')[0];
  return sourceCandidatesFor({
    articleDir, sourceIds: articleSourcesCache.get(articleDir), cfg: referenceCfg,
    vaultRoot: resolveVaultRoot().root ?? null, scanRefIds: figureCategories[qualification]?.scanReferences ?? [],
    examDir: pastExamDirs.get(qualification) ?? null,
  });
}

/** 記録済みの出典（config/figure-sources.json の provenance）。vault: は手元のマウント先の絶対パスへ開く */
function recordedSourceOf(figKey) {
  const src = readJsonIf(ROOT, datasetPath('config.figure-sources'))?.provenance?.[figKey];
  if (!src?.pdf) return null; // AI 生成・CC 写真などの出所（kind）は切り出し直しの原典ではない
  const root = resolveVaultRoot().root;
  const pdf = src.pdf.startsWith('vault:') && root ? `${root}/${src.pdf.slice('vault:'.length)}` : src.pdf;
  return { pdf, page: src.page ?? null, dpi: src.dpi ?? null };
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
  say(`[figure-review] 図 ${figs.length} 枚を走査（公開記事で使用中 ${live.length}・画素検査 ${analyzed}・失敗 ${failed}）。うち写真（AI 生成）${c.photos} 枚は check-image-origin が見るので判定待ちに入れない`);
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
  if (c.reuseForbidden) say(`  流用不可の書籍の図で切り出し直さない ${c.reuseForbidden}（自作の図への置き換えか削除を運営者へ: ${queue.reuseForbidden.slice(0, 3).map((f) => f.figKey).join(' / ')}${c.reuseForbidden > 3 ? ' ほか' : ''}）`);
  if (c.pendingReview === 0 && c.pendingReextract === 0) say('✓ 判定待ち・切り出し直し待ちとも 0（ループ完了）');

  const nextIdx = argv.indexOf('--next');
  if (nextIdx >= 0) {
    const n = Number(argv[nextIdx + 1]) || 10;
    const stage = argv.includes('--stage') ? argv[argv.indexOf('--stage') + 1] : 'review';
    const { roots, vaultNote } = sourceRoots();
    const items = stage === 'reextract'
      ? queue.reextract.slice(0, n).map((f) => itemOf(f, stage, {
        whyCut: f.entry.reason, recordedSource: recordedSourceOf(f.figKey), sourceCandidates: wiringOf(f).candidates,
        sourceRoots: roots, ...(vaultNote ? { vaultNote } : {}),
      }))
      : queue.review.slice(0, n).map((f) => itemOf(f, stage, { tier: f.tier }));
    if (json) console.log(JSON.stringify(items, null, 2));
    else for (const it of items) say(`  - ${it.img}  ${it.signals.map((s) => s.signal + (s.side ? `(${s.side})` : '')).join(' ')}`);
  }
  return 0;
}

/**
 * 出典 PDF のパスを機械に依存しない形（`vault:原資料PDF/...` か https の URL）にする。
 * リポジトリ側のパス（content/sources/past-exams/... 等）は Drive 台帳の group から vault のパスへ引く。引けなければ投げる。
 */
let driveForPaths = null;
function portablePath(p) {
  if (/^https:\/\//.test(p) || p.startsWith('vault:')) return p;
  const posix = toPosix(p).normalize('NFC');
  const v = resolveVaultRoot();
  if (v.root && posix.startsWith(`${v.root.normalize('NFC')}/`)) return `vault:${posix.slice(v.root.length + 1)}`;
  const root = toPosix(ROOT);
  const rel = posix.startsWith(`${root}/`) ? posix.slice(root.length + 1) : posix;
  driveForPaths ??= { cfg: loadDriveConfig(), manifest: loadDriveManifest() };
  const entry = driveForPaths.manifest.entries[rel];
  if (entry?.vaultPath) return `vault:${entry.vaultPath}`;
  const group = driveGroupFor(rel, driveForPaths.cfg, { includePending: false });
  if (!group) throw new Error(`出典 ${p} は vault にも https にも当たらない（原典は Drive vault に置いてから記録する）`);
  return `vault:${vaultRelFor(rel, group)}`;
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
  // 出典の正本は config/figure-sources.json の provenance。判定台帳は合否と理由だけを持つ（2026-10-07・DN-0555 前半）
  const sourcesDoc = readJsonIf(ROOT, datasetPath('config.figure-sources'));
  if (!sourcesDoc) { console.error(`✗ ${datasetPath('config.figure-sources')} を読めない（台帳は書いていない）`); return 1; }
  sourcesDoc.provenance ??= {};
  let provenanceUpdated = 0;
  let mdxUpdated = 0;
  for (const { v, f } of described) {
    const action = v.action ?? 'none';
    const { width, height } = await sharp(f.abs).metadata();
    if (action !== 'none' && f.mdx) {
      const abs = join(ROOT, f.mdx);
      const { raw, eol } = readMdxFile(abs);
      const r = syncImageDims(raw, f.name, width, height);
      if (r.changed) { writeMdxFile(abs, r.raw, eol); mdxUpdated += r.changed; }
    }
    ledger.figures[v.figKey] = {
      sha: fileSha(f.abs), verdict: v.verdict, action, reason: v.reason.trim(),
      px: [width, height], // 判定したときの画素数（LOW_RES を見た判定の印）
      reviewedAt: new Date().toISOString(),
    };
    if (v.source) {
      const { pdf, page, dpi } = v.source;
      const keepKind = sourcesDoc.provenance[v.figKey]?.kind === 'exam-official' ? { kind: 'exam-official' } : {}; // PDF から切り出した図は pdf-crop（kind 省略）か試験の図
      sourcesDoc.provenance[v.figKey] = { ...keepKind, pdf: portablePath(pdf), ...(page >= 1 ? { page } : {}), ...(Number.isInteger(dpi) ? { dpi } : {}) };
      provenanceUpdated++;
    }
  }
  ledger.figures = Object.fromEntries(Object.entries(ledger.figures).sort(([a], [b]) => a.localeCompare(b)));
  if (provenanceUpdated) {
    sourcesDoc.provenance = Object.fromEntries(Object.entries(sourcesDoc.provenance).sort(([a], [b]) => a.localeCompare(b)));
    writeDataset(ROOT, 'config.figure-sources', sourcesDoc); // 型（vault: か https・ページは 1 以上）を検査してから書く
  }
  writeJson(ROOT, LEDGER_FILE, ledger);
  const by = list.reduce((m, v) => ({ ...m, [v.verdict]: (m[v.verdict] || 0) + 1 }), {});
  console.log(`[figure-review] 台帳に ${list.length} 件を記録（${Object.entries(by).map(([k, n]) => `${k}:${n}`).join(' ')}）・出典 ${provenanceUpdated} 件・MDX の寸法を ${mdxUpdated} か所更新 → ${LEDGER_FILE}${provenanceUpdated ? ` / ${datasetPath('config.figure-sources')}` : ''}`);
  return 0;
}

export async function run(argv = process.argv.slice(2)) {
  if (argv[0] === 'record') return runRecord(argv[1]);
  return runSummary(argv);
}

if (isCliEntry(import.meta.url)) {
  run().then((code) => { process.exitCode = code; }, (e) => { console.error(e?.stack || String(e)); process.exitCode = 1; });
}
