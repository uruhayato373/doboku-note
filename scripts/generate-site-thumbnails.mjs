#!/usr/bin/env node
/**
 * サイト内サムネイルのページ別の写真を Codex で作る。通常は scripts/site-thumbnails.mjs から呼ばれる。設計は docs/operations/画像運用設計.md。
 *   node scripts/generate-site-thumbnails.mjs --exam civil-construction-1 --pages [--only <ページ>] [--model <m>]
 *   node scripts/generate-site-thumbnails.mjs --exam civil-construction-2 --rederive   # 手元の原寸からカード用を作り直し、測り直す（Codex を呼ばない）
 * 出力: 記事の隣の site-photo.webp（原寸・OGP の背景）と site-thumb.webp（カード用・原寸と同じ比率の縮小）。寸法は config の spec。
 *   カード用は原寸から縮めるだけなので、版（version）は原寸の sha の先頭 8 字で、両方を指す。
 * 機械の検査（spec）: 生の出力が横長でなければ採用しない。明るい面の割合・平均輝度が範囲を外れたら採用せず、指摘を題材へ足して
 *   次の実行で作り直す。測った値（metrics）と生の寸法（rawSize）は AI 台帳の行に残し、CI のテストが spec と照らす。
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { generateWithCodexAsync } from './lib/codex-image.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { recordAiImage } from './lib/image-origin.mjs';
import { imageMetrics, metricViolations } from './lib/site-thumbnail-metrics.mjs';
import { recordKey, stalePages, loadLedger, saveLedger } from './lib/site-thumbnails-pipeline.mjs';
import { REPO_ROOT as ROOT, SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const { values: args } = parseArgs({ options: { exam: { type: 'string' }, only: { type: 'string' }, model: { type: 'string' }, pages: { type: 'boolean' }, rederive: { type: 'boolean' } } });
if (!args.exam || (!args.pages && !args.rederive)) throw new Error('--exam と、--pages か --rederive が要る');
const configPath = join(ROOT, datasetPath('config.site-thumbnails'));
const rules = JSON.parse(readFileSync(join(ROOT, datasetPath('config.image-generation')), 'utf8'));
const thumbs = JSON.parse(readFileSync(configPath, 'utf8'));
const { spec } = thumbs;
const pages = thumbs.pages[args.exam] ?? {};
const dirOf = (key) => join(SITE_CONTENT_ROOT, args.exam, key);
const sha = (value) => createHash('sha256').update(value).digest('hex');

/** 原寸から、原寸とカード用の 2 枚と測った値を作る（カード用は原寸を縮めるだけ） */
async function derive(photo) {
  const card = await sharp(photo).resize(spec.card.width, spec.card.height, { fit: 'cover' }).webp({ quality: spec.card.quality }).toBuffer();
  return { card, metrics: await imageMetrics(photo, spec) };
}

/**
 * 1 回分の結果を台帳へ書く。読み込んだ時点の全体を書き戻すと、生成中に別の処理（二次監査の --record など）が
 * 書いた行を消すので、書く直前に読み直して、この回で作ったページの行だけを差し込む（2026-11-13）。
 * rows: [{ key, version?, record?, keep?, sceneNote? }]。keep は既存の判定（verdict など）を残して sha・metrics だけ替える
 */
function commitBatch(rows) {
  if (!rows.length) return;
  const current = JSON.parse(readFileSync(configPath, 'utf8'));
  const fresh = loadLedger(ROOT);
  for (const row of rows) {
    const page = current.pages[args.exam][row.key];
    if (row.sceneNote) { page.scene = `${page.scene.split(' 前回の問題:')[0]} 前回の問題: ${row.sceneNote}。これを避ける。`; delete page.version; }
    if (row.version) page.version = row.version;
    if (row.keep) Object.assign(fresh.figures[recordKey(args.exam, row.key)], row.keep);
    else if (row.record) recordAiImage(fresh, recordKey(args.exam, row.key), row.record);
  }
  writeFileSync(configPath, `${JSON.stringify(current, null, 2)}\n`);
  saveLedger(ROOT, fresh);
}

if (args.rederive) {
  // 手元の原寸からカード用を作り直す（カードの比率を原寸にそろえた 2026-11-13 の移行用）。判定は同じ写真なので残す
  const ledger = loadLedger(ROOT);
  const rows = [];
  let missing = 0;
  for (const [key, page] of Object.entries(pages)) {
    if (!page.version) continue;
    const photoPath = join(dirOf(key), thumbs.photoFile);
    if (!existsSync(photoPath)) { missing += 1; continue; }
    const photo = readFileSync(photoPath);
    const { card, metrics } = await derive(photo);
    writeFileSync(join(dirOf(key), thumbs.imageFile), card);
    const digest = sha(photo);
    const entry = ledger.figures[recordKey(args.exam, key)] ?? {};
    rows.push({ key, version: digest.slice(0, 8), keep: { sha: digest.slice(0, 16), metrics, ...(entry.rawSize ? {} : { rawSize: 'unrecorded' }) } });
  }
  commitBatch(rows);
  console.log(`作り直し ${rows.length} 件 / 原寸が手元に無い ${missing} 件`);
  process.exit(rows.length ? 0 : 2);
}

const ledger = loadLedger(ROOT);
const keys = args.only?.split(',') ?? stalePages(pages, ledger, args.exam, thumbs.styleVersion);
if (!keys.length) { console.log('未生成 0 件'); process.exit(0); }

const seen = new Map();
let failed = 0;
const concurrency = 3;
for (let i = 0; i < keys.length; i += concurrency) {
  const rows = [];
  await Promise.all(keys.slice(i, i + concurrency).map(async (key) => {
    const prompt = `${thumbs.style}${rules.antiAi.real}${rules.antiAi.avoid}題材: ${pages[key].scene}`;
    const raw = await generateWithCodexAsync(prompt, args.model ?? null);
    if (!raw) { failed += 1; console.error(`生成なし: ${key}`); return; }
    const source = readFileSync(raw);
    const { width: rawWidth, height: rawHeight } = await sharp(source).metadata();
    const rawSize = `${rawWidth}x${rawHeight}`;
    const rawSha = sha(source);
    if (seen.has(rawSha)) { failed += 1; console.error(`同じ画像: ${key} と ${seen.get(rawSha)}`); return; }
    seen.set(rawSha, key);
    const photo = await sharp(source).resize(spec.photo.width, spec.photo.height, { fit: 'cover' }).webp({ quality: spec.photo.quality }).toBuffer();
    const { card, metrics } = await derive(photo);
    const problems = metricViolations({ rawSize, metrics }, spec);
    if (problems.length) {
      // 採用しない。指摘を題材へ足して版を外し、次の実行で作り直す
      failed += 1;
      console.error(`機械の検査で不合格: ${key}（${problems.join('・')}）`);
      rows.push({ key, sceneNote: problems.join('・') });
      return;
    }
    writeFileSync(join(dirOf(key), thumbs.photoFile), photo);
    writeFileSync(join(dirOf(key), thumbs.imageFile), card);
    const digest = sha(photo);
    rows.push({ key, version: digest.slice(0, 8), record: { sha: digest, prompt, generatedAt: new Date().toISOString(), tool: 'Codex', styleVersion: thumbs.styleVersion, rawSize, metrics } });
    console.log(`OK ${key}`);
  }));
  commitBatch(rows);
}
console.log(`対象 ${keys.length} 件 / 失敗 ${failed} 件`);
process.exit(failed ? 1 : 0);
