#!/usr/bin/env node
/**
 * サイト内サムネイルのページ別の絵を Codex で作る。通常は scripts/site-thumbnails.mjs から呼ばれる。設計は docs/operations/画像運用設計.md。
 *   node scripts/generate-site-thumbnails.mjs --exam civil-construction-1 --pages [--only <ページ>] [--model <m>]
 * 出力: 記事の隣の site-photo.webp（1200×630・OGP の背景に使う原寸）と site-thumb.webp（640×245・カード用）。
 *   同じ Codex の出力から 2 枚を切るので、版（version = site-thumb の sha の先頭 8 字）は両方を指す。
 *   来歴は ai-image-review-ledger.json、版は config/site-thumbnails.json。
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { generateWithCodexAsync } from './lib/codex-image.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { recordAiImage } from './lib/image-origin.mjs';
import { recordKey, stalePages, loadLedger, saveLedger } from './lib/site-thumbnails-pipeline.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const { values: args } = parseArgs({ options: { exam: { type: 'string' }, only: { type: 'string' }, model: { type: 'string' }, pages: { type: 'boolean' } } });
if (!args.exam || !args.pages) throw new Error('--exam と --pages が要る');
const configPath = join(ROOT, datasetPath('config.site-thumbnails'));
const rules = JSON.parse(readFileSync(join(ROOT, datasetPath('config.image-generation')), 'utf8'));
const thumbs = JSON.parse(readFileSync(configPath, 'utf8'));
const pages = thumbs.pages[args.exam] ?? {};
const ledger = loadLedger(ROOT);
const only = args.only?.split(',');
const keys = only ?? stalePages(pages, ledger, args.exam, thumbs.styleVersion);
if (!keys.length) { console.log('未生成 0 件'); process.exit(0); }

const sha = (value) => createHash('sha256').update(value).digest('hex');

/**
 * 1 回分の結果を台帳へ書く。読み込んだ時点の全体を書き戻すと、生成中に別の処理（二次監査の --record など）が
 * 書いた行を消すので、書く直前に読み直して、この回で作ったページの行だけを差し込む（2026-11-13）。
 */
function commitBatch(done) {
  if (!done.length) return;
  const current = JSON.parse(readFileSync(configPath, 'utf8'));
  for (const row of done) current.pages[args.exam][row.key].version = row.version;
  writeFileSync(configPath, `${JSON.stringify(current, null, 2)}\n`);
  const fresh = loadLedger(ROOT);
  for (const row of done) recordAiImage(fresh, recordKey(args.exam, row.key), row.record);
  saveLedger(ROOT, fresh);
}
const seen = new Map();
let failed = 0;
const concurrency = 3;
for (let i = 0; i < keys.length; i += concurrency) {
  const done = [];
  await Promise.all(keys.slice(i, i + concurrency).map(async (key) => {
    const prompt = `${thumbs.style}${rules.antiAi.real}${rules.antiAi.avoid}題材: ${pages[key].scene}`;
    const raw = await generateWithCodexAsync(prompt, args.model ?? null);
    if (!raw) { failed += 1; console.error(`生成なし: ${key}`); return; }
    const source = readFileSync(raw);
    // 生の出力の寸法を確かめる。横長（幅÷高さ 1.4 以上）でないと、1200×630・640×245 へ切るときに主題の上下が大きく欠ける
    const { width: rawWidth, height: rawHeight } = await sharp(source).metadata();
    if (!rawWidth || !rawHeight || rawWidth / rawHeight < 1.4) { failed += 1; console.error(`横長でない: ${key}（${rawWidth}×${rawHeight}）。次の実行で作り直す`); return; }
    const rawSha = sha(source);
    if (seen.has(rawSha)) { failed += 1; console.error(`同じ画像: ${key} と ${seen.get(rawSha)}`); return; }
    seen.set(rawSha, key);
    const dir = join(ROOT, 'content/site', args.exam, key);
    const photo = await sharp(source).resize(1200, 630, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
    const webp = await sharp(source).resize(640, 245, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
    writeFileSync(join(dir, thumbs.photoFile), photo);
    writeFileSync(join(dir, thumbs.imageFile), webp);
    const digest = sha(webp);
    done.push({ key, version: digest.slice(0, 8), record: { sha: digest, prompt, generatedAt: new Date().toISOString(), tool: 'Codex', styleVersion: thumbs.styleVersion, rawSize: `${rawWidth}x${rawHeight}` } });
    console.log(`OK ${key}`);
  }));
  commitBatch(done);
}
console.log(`対象 ${keys.length} 件 / 失敗 ${failed} 件`);
process.exit(failed ? 1 : 0);
