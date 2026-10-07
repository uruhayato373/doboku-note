#!/usr/bin/env node
/**
 * check-image-origin.mjs — 公開記事のラスター画像（写真・切り出し図）すべてに出所の記録があり、
 * 写真（AI 生成画像）は仕様どおりに生成・配置・判定まで済んでいるかを検査する（DN-0574・DN-0578）。
 *
 * 台帳は 2 つ（手で「済」と書く欄は無い。状態は台帳から導く）:
 *   仕様 … config/figure-sources.json の provenance（図ごとの出所の正本。写真は kind: ai-generated・tool・prompt）
 *   実績 … .claude/state/quality/ai-image-review-ledger.json（配置した画像の sha・どの指示から作ったか＝promptSha・判定）
 * 種別は scripts/lib/dataset-schemas-config-media.mjs の IMAGE_ORIGIN_KINDS、判定と状態は scripts/lib/image-origin.mjs。
 *
 * 違反:
 *   missing-origin         … 出所の記録が無い
 *   comment-mismatch       … MDX の出典コメント（AI 画像）と台帳の種別が食い違う
 *   photo-not-ai           … 実写（CC 等）を使っている（写真は AI 生成だけ・2026-10-07 運営者決定）
 *   attribution-missing    … 公的資料の caption に提供者が無い
 *   ai-aspect              … 写真の比率が config/image-limits.json の aiPhoto と違う
 *   ai-not-generated       … 仕様の指示から作った記録が今の画像に無い（指示を変えた・手で差し替えた）
 *   ai-unreviewed          … 生成・配置したが、実物どおりかの判定が無い
 *   ai-failed              … 実物と違うと判定されたまま公開している
 *
 * 使い方:
 *   node scripts/check-image-origin.mjs                     # 集計・写真の状態・違反の一覧（違反があれば exit 1）
 *   node scripts/check-image-origin.mjs --json              # 同じ内容を JSON で
 *   node scripts/check-image-origin.mjs --ai-queue [--json] # 判定待ち（未監査）の写真。ai-image-fidelity-auditor へ渡す材料
 *   node scripts/check-image-origin.mjs record-ai <verdicts.json>  # 判定を実績の台帳へ（今の画像のハッシュつき）
 * 生成と配置は scripts/gen-article-photo.mjs（npm run gen-article-photo）。
 *
 * 終了コード: 0 = 違反なし / 1 = 違反あり・record の入力が不正 / 2 = 検査不成立（公開記事の画像を 1 枚も読めない）
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import matter from 'gray-matter';
import sharp from 'sharp';
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { parseJson, readJsonIf, writeJson } from './lib/json-io.mjs';
import { isCliEntry } from './lib/cli-run.mjs';
import { figuresInExplanation, sourceIdsOf } from './lib/figure-source-wiring.mjs';
import { describeFigure, fileSha, listFigureKeys } from './lib/figure-review.mjs';
import {
  AI_KINDS, AI_LEDGER_FILE, aiPhotoStatus, captionFor, emptyAiLedger, imageTagFor, originFindings, originOf,
  sourceCommentFor, validateAiVerdict,
} from './lib/image-origin.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const STATUS_LABEL = { 'not-generated': '未生成', unreviewed: '未監査', failed: '不合格', ok: '合格' };

function loadInputs() {
  const sources = readJsonIf(ROOT, datasetPath('config.figure-sources'));
  const cfg = readJsonIf(ROOT, datasetPath('config.reference-sources'));
  if (!sources || !cfg) throw new Error('図の出典の台帳か参考文献の台帳を読めない');
  const ledger = readJsonIf(ROOT, AI_LEDGER_FILE) ?? emptyAiLedger();
  const aiPhoto = readJsonIf(ROOT, datasetPath('config.image-limits'))?.aiPhoto ?? null;
  if (!aiPhoto) throw new Error('写真の比率（image-limits の aiPhoto）を読めない');
  return { provenance: sources.provenance ?? {}, cfg, ledger, aiPhoto };
}

/** 公開記事が参照しているラスター画像と、記事ごとの sources: */
function liveImages() {
  const cache = new Map();
  const figs = listFigureKeys(SITE_CONTENT_ROOT).map((figKey) => describeFigure({ siteRoot: SITE_CONTENT_ROOT, repoRoot: ROOT, figKey, cache }));
  const live = figs.filter((f) => f.live);
  const articleSources = new Map();
  for (const f of live) {
    if (articleSources.has(f.slug)) continue;
    const raw = readFileSync(join(ROOT, f.mdx), 'utf8');
    let data = {};
    try { data = matter(raw).data; } catch { /* frontmatter が壊れた記事は sources なし */ }
    articleSources.set(f.slug, sourceIdsOf(data.sources));
  }
  return { figs, live, cache, articleSources };
}

/** 公開記事のラスター画像 1 枚ごとの出所・状態・違反 */
export async function inspect() {
  const { provenance, cfg, ledger, aiPhoto } = loadInputs();
  const { figs, live, cache, articleSources } = liveImages();
  const explanation = new Map();
  const rows = [];
  for (const f of live) {
    const { content } = cache.get(f.slug);
    if (!explanation.has(f.slug)) explanation.set(f.slug, figuresInExplanation(content));
    const origin = originOf({ figKey: f.figKey, provenance, articleSources, cfg, inExplanation: explanation.get(f.slug).has(f.name) });
    const sha = fileSha(f.abs);
    const isAi = AI_KINDS.has(origin?.kind);
    const size = isAi ? await sharp(f.abs).metadata().then((m) => [m.width, m.height]) : null;
    const status = isAi ? aiPhotoStatus({ entry: origin.entry, rec: ledger.figures?.[f.figKey], sha }) : null;
    const findings = originFindings({
      figKey: f.figKey, origin, sha, ledger, size, aiPhoto,
      comment: sourceCommentFor(content, f.name), caption: captionFor(content, f.name),
    });
    rows.push({ ...f, origin, sha, size, status, findings });
  }
  return { scanned: figs.length, rows, ledger, provenance };
}

function countBy(list, key) {
  const m = {};
  for (const x of list) { const k = key(x); m[k] = (m[k] || 0) + 1; }
  return m;
}

async function runCheck(argv) {
  const { scanned, rows } = await inspect();
  const byKind = countBy(rows, (r) => r.origin?.kind ?? '(記録なし)');
  const photos = rows.filter((r) => r.status);
  const byStatus = countBy(photos, (r) => STATUS_LABEL[r.status]);
  const bad = rows.filter((r) => r.findings.length);
  if (argv.includes('--json')) {
    console.log(JSON.stringify({
      scanned, live: rows.length, byKind, photos: photos.map((r) => ({ figKey: r.figKey, status: r.status, size: r.size })),
      violations: bad.map((r) => ({ figKey: r.figKey, mdx: r.mdx, findings: r.findings })),
    }, null, 2));
  } else {
    console.log(`[check-image-origin] 記事のラスター画像 ${scanned} 枚を走査 / 公開記事で使用中 ${rows.length} 枚を実検査`);
    console.log(`  出所の種別: ${Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' / ')}`);
    console.log(`  写真（AI 生成）${photos.length} 枚の状態: ${Object.entries(byStatus).map(([k, n]) => `${k} ${n}`).join(' / ') || 'なし'}`);
    for (const r of bad) for (const f of r.findings) console.log(`  ✗ [${f.kind}] ${r.figKey}: ${f.detail}`);
    console.log(bad.length ? `✗ 違反 ${bad.length} 枚` : '✓ 公開記事のラスター画像はすべて出所が記録され、写真はすべて生成・配置・判定まで済んでいる');
  }
  if (rows.length === 0) { console.error('✗ 検査不成立: 公開記事の画像を 1 枚も読めない'); return 2; }
  return bad.length ? 1 : 0;
}

/** 判定待ち（未監査）の写真。auditor に渡す材料（直前の見出し・本文・生成の指示）を付ける */
async function runAiQueue(argv) {
  const { rows } = await inspect();
  const items = rows.filter((r) => r.status === 'unreviewed').map((r) => {
    const content = readFileSync(join(ROOT, r.mdx), 'utf8');
    const t = imageTagFor(content, r.name);
    const before = t ? content.slice(0, t.index) : '';
    return {
      figKey: r.figKey, img: r.img, mdx: r.mdx,
      alt: t ? (/\balt="([^"]*)"/.exec(t.tag)?.[1] ?? null) : null,
      heading: [...before.matchAll(/^#{2,4} .+$/gm)].pop()?.[0] ?? null,
      context: before.trimEnd().split(/\n\s*\n/).slice(-2).join('\n\n').slice(-1200),
      prompt: r.origin.entry?.prompt ?? null,
    };
  });
  if (argv.includes('--json')) console.log(JSON.stringify(items, null, 2));
  else {
    console.log(`[check-image-origin] 判定待ち（未監査）の写真 ${items.length} 枚（写真 ${rows.filter((r) => r.status).length} 枚中）`);
    for (const i of items) console.log(`  ${i.figKey}`);
  }
  return 0;
}

async function runRecordAi(file) {
  if (!file) { console.error('usage: check-image-origin.mjs record-ai <verdicts.json>'); return 1; }
  const list = parseJson(readFileSync(file, 'utf8'), file);
  if (!Array.isArray(list)) { console.error('✗ 判定は配列で渡す'); return 1; }
  const errs = list.flatMap(validateAiVerdict);
  const { rows } = await inspect();
  const byKey = new Map(rows.map((r) => [r.figKey, r]));
  for (const v of list) {
    const r = byKey.get(v.figKey);
    if (!r) errs.push(`${v.figKey}: 公開記事で使っている画像ではない`);
    else if (!r.status) errs.push(`${v.figKey}: 台帳の種別が AI 生成でない（${r.origin?.kind ?? '記録なし'}）`);
    else if (r.status === 'not-generated') errs.push(`${v.figKey}: 今の画像が仕様の指示から作られた記録が無い。先に npm run gen-article-photo で生成・配置する`);
  }
  if (errs.length) { for (const e of errs) console.error(`✗ ${e}`); console.error('台帳は書いていない'); return 1; }
  const ledger = readJsonIf(ROOT, AI_LEDGER_FILE) ?? emptyAiLedger();
  for (const v of list) {
    const r = byKey.get(v.figKey);
    const prev = ledger.figures[v.figKey]?.sha === r.sha ? ledger.figures[v.figKey] : {}; // 生成の記録（promptSha 等）は残す
    ledger.figures[v.figKey] = { ...prev, sha: r.sha, verdict: v.verdict, reason: v.reason.trim(), reviewedAt: new Date().toISOString() };
  }
  ledger.figures = Object.fromEntries(Object.entries(ledger.figures).sort(([a], [b]) => a.localeCompare(b)));
  writeJson(ROOT, AI_LEDGER_FILE, ledger);
  const by = countBy(list, (v) => v.verdict);
  console.log(`[check-image-origin] 写真の判定 ${list.length} 件を記録（${Object.entries(by).map(([k, n]) => `${k}:${n}`).join(' ')}）→ ${AI_LEDGER_FILE}`);
  return 0;
}

export async function run(argv = process.argv.slice(2)) {
  if (argv[0] === 'record-ai') return runRecordAi(argv[1]);
  if (argv.includes('--ai-queue')) return runAiQueue(argv);
  return runCheck(argv);
}

if (isCliEntry(import.meta.url)) {
  run().then((code) => { process.exitCode = code; }, (e) => { console.error(e?.stack || String(e)); process.exitCode = 1; });
}
