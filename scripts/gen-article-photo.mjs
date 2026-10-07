#!/usr/bin/env node
/**
 * gen-article-photo.mjs — 記事の写真を AI で生成し、比率を揃えて配置し、実績を台帳に残す（DN-0578・2026-10-07）。
 *
 * 写真は AI で生成した画像だけを使う（運営者決定・2026-10-07）。1 枚ごとの仕様（被写体の指示）は
 * config/figure-sources.json の provenance（kind: ai-generated・tool・prompt）、全写真に共通する指示と比率は
 * config/image-limits.json の aiPhoto。このスクリプトは次を一度に行う:
 *   1. 生成（codex exec の画像生成）か、--from の画像を使う
 *   2. 中央で aiPhoto.aspect に切り、aiPhoto.width に縮めて content/site/<figKey>.webp へ書く
 *   3. 記事の <ArticleImage>/<img> の src を .webp に、width/height を新しい寸法に合わせる
 *   4. 実績の台帳（AI 画像の台帳）に sha・promptSha・生成日時を記録する（判定は消える＝未監査に戻る）
 * 次は ai-image-fidelity-auditor で判定し、node scripts/check-image-origin.mjs record-ai で記録する。
 *
 * 使い方:
 *   npm run gen-article-photo -- --fig <資格/記事/img/名前> [--prompt "被写体の指示" | --prompt-file <path>] [--model <codex のモデル>]
 *   npm run gen-article-photo -- --fig <figKey> --from <生成済みの画像> [--tool "Codex（gpt-6-astra）"]
 *   --prompt を渡すと仕様（provenance の prompt）を書き換えてから生成する。渡さなければ仕様の prompt を使う。
 *
 * 終了コード: 0 = 配置した / 1 = 入力・仕様の不備 / 3 = 生成に失敗（画像が出てこない）
 */
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { readJsonIf, writeJson } from './lib/json-io.mjs';
import { writeDataset } from './lib/dataset-write.mjs';
import { isCliEntry } from './lib/cli-run.mjs';
import { describeFigure, fileSha, syncImageDims } from './lib/figure-review.mjs';
import { AI_LEDGER_FILE, emptyAiLedger, promptSha } from './lib/image-origin.mjs';
import { readMdxFile, writeMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';

const ROOT = resolve(import.meta.dirname, '..');

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
}

/** codex exec の画像生成で 1 枚作り、作業ディレクトリに出た画像のパスを返す（出なければ null） */
function generateWithCodex(fullPrompt, model) {
  const dir = mkdtempSync(join(tmpdir(), 'gen-article-photo-'));
  const args = ['exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', dir, ...(model ? ['-m', model] : []),
    `Use your image generation tool. ${fullPrompt} After generating, copy the generated image file into the current working directory as out.png. Reply with only the saved path.`];
  try { execFileSync('codex', args, { stdio: ['ignore', 'ignore', 'inherit'], timeout: 15 * 60 * 1000 }); } catch { /* 画像が出たかで判断する */ }
  const out = readdirSync(dir).find((f) => /\.(png|jpe?g|webp)$/i.test(f));
  return out ? join(dir, out) : null;
}

/**
 * 中央で aspect に切り、width に縮めた webp のバッファと寸法。maxBytes（image-limits の webp 上限）を超えたら画質を下げて書き直す
 * （2026-10-07: 写真 4 枚が quality 82 で 150KB を超え、check-image-assets:ci で止まった）。
 */
export async function fitPhoto(input, { aspect, width }, maxBytes = Infinity) {
  const { width: w, height: h } = await sharp(input).metadata();
  const want = aspect[0] / aspect[1];
  const cw = w / h > want ? Math.round(h * want) : w;
  const ch = w / h > want ? h : Math.round(w / want);
  const height = Math.round(width / want);
  const resized = await sharp(input)
    .extract({ left: Math.floor((w - cw) / 2), top: Math.floor((h - ch) / 2), width: cw, height: ch })
    .resize(width, height)
    .toBuffer();
  let buf;
  for (const quality of [82, 76, 70, 64, 58]) {
    buf = await sharp(resized).webp({ quality }).toBuffer();
    if (buf.length <= maxBytes) break;
  }
  if (buf.length > maxBytes) throw new Error(`画質 58 でも ${Math.round(buf.length / 1024)}KB で上限 ${Math.round(maxBytes / 1024)}KB を超える`);
  return { buf, width, height };
}

/** 本文の src の拡張子を .webp に揃え、width/height を合わせる。変えた箇所の数 */
function rewireMdx(mdxAbs, name, w, h) {
  const { raw, eol } = readMdxFile(mdxAbs);
  const re = new RegExp(`(/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\.(?:png|jpe?g)\\b`, 'g');
  const swapped = raw.replace(re, '$1.webp');
  const r = syncImageDims(swapped, name, w, h);
  if (r.raw !== raw) writeMdxFile(mdxAbs, r.raw, eol);
  return (swapped !== raw ? 1 : 0) + r.changed;
}

export async function run(argv = process.argv.slice(2)) {
  const figKey = arg(argv, '--fig');
  if (!figKey || !/^[a-z0-9-]+\/[^/]+\/img\/[^/]+$/.test(figKey)) { console.error('--fig <資格/記事/img/名前> が要る'); return 1; }
  const limits = readJsonIf(ROOT, datasetPath('config.image-limits'));
  const aiPhoto = limits?.aiPhoto;
  if (!aiPhoto) { console.error('✗ image-limits の aiPhoto（写真の比率と共通の指示）が無い'); return 1; }
  const sourcesDoc = readJsonIf(ROOT, datasetPath('config.figure-sources'));
  const fig = describeFigure({ siteRoot: SITE_CONTENT_ROOT, repoRoot: ROOT, figKey });
  if (!fig.mdx) { console.error(`✗ ${figKey}: 記事が見つからない`); return 1; }

  const promptArg = arg(argv, '--prompt') ?? (arg(argv, '--prompt-file') ? readFileSync(arg(argv, '--prompt-file'), 'utf8').trim() : null);
  const from = arg(argv, '--from');
  const model = arg(argv, '--model');
  const prev = sourcesDoc.provenance?.[figKey];
  const prompt = promptArg ?? prev?.prompt;
  if (!prompt) { console.error(`✗ ${figKey}: 仕様に被写体の指示（prompt）が無い。--prompt で渡す`); return 1; }
  const tool = arg(argv, '--tool') ?? (from ? prev?.tool : null) ?? `Codex${model ? `（${model}）` : ''}`;

  let input = from;
  if (!input) {
    console.log(`[gen-article-photo] ${figKey}: codex で生成中…`);
    input = generateWithCodex(`${aiPhoto.style} Subject: ${prompt}`, model);
    if (!input) { console.error(`✗ ${figKey}: 画像が生成されなかった（codex のログを確認）`); return 3; }
  } else if (!existsSync(input)) { console.error(`✗ --from ${input} が無い`); return 1; }

  const { buf, width, height } = await fitPhoto(input, aiPhoto, limits.maxBytes?.webp ?? Infinity);
  const target = join(SITE_CONTENT_ROOT, `${figKey}.webp`);
  writeFileSync(target, buf); // sharp(buf).toFile は再エンコードして上限に収めた画質が戻る
  const changed = rewireMdx(join(ROOT, fig.mdx), fig.name, width, height);

  sourcesDoc.provenance[figKey] = { kind: 'ai-generated', tool, prompt, ...(prev?.note && prev?.kind === 'ai-generated' ? { note: prev.note } : {}) };
  sourcesDoc.provenance = Object.fromEntries(Object.entries(sourcesDoc.provenance).sort(([a], [b]) => a.localeCompare(b)));
  writeDataset(ROOT, 'config.figure-sources', sourcesDoc);

  const ledger = readJsonIf(ROOT, AI_LEDGER_FILE) ?? emptyAiLedger();
  ledger.figures[figKey] = { sha: fileSha(target), promptSha: promptSha(prompt), tool, generatedAt: new Date().toISOString() };
  ledger.figures = Object.fromEntries(Object.entries(ledger.figures).sort(([a], [b]) => a.localeCompare(b)));
  writeJson(ROOT, AI_LEDGER_FILE, ledger);

  const leftovers = ['png', 'jpg', 'jpeg'].map((e) => join(SITE_CONTENT_ROOT, `${figKey}.${e}`)).filter(existsSync);
  console.log(`[gen-article-photo] ${figKey}: ${width}×${height} webp を配置・記事 ${changed} か所を更新・実績を記録（未監査）`);
  if (leftovers.length) console.log(`  ⚠ 同じ名前の古い画像が残っている（参照されないなら git rm する）: ${leftovers.map((p) => p.slice(ROOT.length + 1)).join(' ')}`);
  if (!from && input.startsWith(tmpdir())) rmSync(resolve(input, '..'), { recursive: true, force: true });
  console.log('  次: node scripts/check-image-origin.mjs --ai-queue --json → ai-image-fidelity-auditor → record-ai');
  return 0;
}

if (isCliEntry(import.meta.url)) {
  run().then((code) => { process.exitCode = code; }, (e) => { console.error(e?.stack || String(e)); process.exitCode = 1; });
}
