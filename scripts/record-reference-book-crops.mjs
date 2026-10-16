#!/usr/bin/env node
/**
 * 本の頁の図の切り出しを、1 冊ぶんまとめて作って登録する（DN-0754・2026-10-16）。
 *
 * check-content-series --crop-jobs が出す「切り出し待ちの頁」を、頁ごとに「図なし」か「図の範囲（bbox）」に判定した
 * batch（scripts/lib/reference-book-crops.mjs の形）を受け取り、
 *   --preview <dir>  Drive の頁画像から切り出した PNG を <dir> に書く（監査に見せる用。台帳と Drive は書かない）
 *   既定（dry-run）  検査だけ
 *   --commit         切り出しを Drive の crops/ に置き、book-manifest（repo と Drive）と Drive 台帳を更新する
 * 図なしの頁は cropStatus=not-needed、切り出した頁は complete。切り出しには合格した監査点（4 軸）が要る。
 * 本の図は構図の参考と写真の描き直しの元にだけ使う（サイトには載せない・image-policy）。1 枚ずつは record-reference-book-artifacts。
 *
 * 使い方: npm run record-reference-book-crops -- --batch <batch.json> [--preview <dir> | --commit] [--replace]
 * 終了コード: 0 = 完了 / 1 = 検査の違反・書き込みの失敗 / 2 = 引数・Drive の不備
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { parseCliArgs } from './lib/cli-args.mjs';
import {
  driveGroupFor,
  loadDriveConfig,
  loadDriveManifest,
  realBytesAndHashes,
  resolveVaultRoot,
  sanitizeDriveEntry,
  vaultAbsFor,
  vaultRelFor,
  writeDriveManifestAtomic,
} from './lib/drive-vault.mjs';
import { bookRepoRoot, manifestRepoPath, validateBookBundleSource, validateBookManifestShape } from './lib/reference-book-bundle.mjs';
import { applyCropBatch, cropFileName, validateCropBatch } from './lib/reference-book-crops.mjs';
import { loadReferenceSources } from './lib/reference-sources.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const NAME = 'record-reference-book-crops';
const args = parseCliArgs({ batch: { type: 'string' }, preview: { type: 'string' }, commit: { type: 'boolean' }, replace: { type: 'boolean' } });
const die = (message, code = 1) => { console.error(`[${NAME}] ✗ ${message}`); process.exit(code); };
if (!args.batch) die('--batch <batch.json> が要る', 2);
if (args.preview && args.commit) die('--preview と --commit は同時に使わない', 2);

const batch = JSON.parse(fs.readFileSync(args.batch, 'utf8'));
const source = loadReferenceSources().sources.find((s) => s.id === batch.sourceId);
if (!source) die(`reference-sources.json に ${batch.sourceId} が無い`, 2);
try { validateBookBundleSource(source); } catch (error) { die(error.message, 2); }
const manifestAbs = path.join(REPO_ROOT, ...manifestRepoPath(source).split('/'));
const manifest = JSON.parse(fs.readFileSync(manifestAbs, 'utf8'));
const errors = validateCropBatch(batch, manifest, { requireAudit: !args.preview });
if (errors.length) die(`batch の違反 ${errors.length} 件:\n  ${errors.join('\n  ')}`);

const crops = batch.pages.flatMap((p) => (p.crops ?? []).map((c) => ({ page: p.page, ...c })));
const notNeeded = batch.pages.filter((p) => p.notNeeded).length;
console.log(`[${NAME}] ${source.id}: 頁 ${batch.pages.length}（図なし ${notNeeded}・切り出し ${crops.length} 枚）を検査した`);

const driveConfig = loadDriveConfig();
const mount = resolveVaultRoot({ cfg: driveConfig });
if (!mount.root) die(mount.reason, 2);
const pageGroup = driveGroupFor(`${bookRepoRoot(source)}/pages/p0001.jpg`, driveConfig, { includePending: false });
if (pageGroup?.id !== 'reference-book-page-image') die('頁画像の Drive の group が reference-book-page-image でない', 2);
const pageImageAbs = (page) => vaultAbsFor(mount.root, vaultRelFor(`${bookRepoRoot(source)}/pages/${page}.jpg`, pageGroup));

async function cut(c) {
  const src = pageImageAbs(c.page);
  if (!fs.existsSync(src)) throw new Error(`${c.page}: Drive に頁画像が無い（${src}）`);
  return sharp(src).extract({ left: c.bbox.x, top: c.bbox.y, width: c.bbox.w, height: c.bbox.h }).png().toBuffer();
}

if (args.preview) {
  fs.mkdirSync(args.preview, { recursive: true });
  for (const c of crops) fs.writeFileSync(path.join(args.preview, cropFileName(c.page, c.figureId)), await cut(c));
  console.log(`[${NAME}] 下見: ${crops.length} 枚を ${args.preview} に書いた（台帳と Drive は書いていない）`);
  process.exit(0);
}
if (!args.commit) {
  console.log(`[${NAME}] DRY-RUN — 実行は --commit（下見は --preview <dir>）`);
  process.exit(0);
}

const driveManifest = loadDriveManifest();
const timestamp = new Date().toISOString();
const results = new Map();
let written = 0;
let kept = 0;
for (const c of crops) {
  const file = cropFileName(c.page, c.figureId);
  const repoPath = `${bookRepoRoot(source)}/crops/${file}`;
  const group = driveGroupFor(repoPath, driveConfig, { includePending: false });
  if (group?.id !== 'reference-book-page-image') die(`${repoPath}: Drive の group が reference-book-page-image でない`);
  const vaultPath = vaultRelFor(repoPath, group);
  const dest = vaultAbsFor(mount.root, vaultPath);
  const buf = await cut(c);
  const temp = `${dest}.tmp-${process.pid}`;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(temp, buf);
  const measured = await realBytesAndHashes(temp);
  if (fs.existsSync(dest)) {
    const cur = await realBytesAndHashes(dest);
    if (cur.sha256 === measured.sha256) { fs.unlinkSync(temp); kept++; }
    else if (!args.replace) { fs.unlinkSync(temp); die(`${vaultPath}: 中身の違う切り出しが既にある（置き換えるなら --replace）`); }
    else { fs.renameSync(temp, dest); written++; }
  } else { fs.renameSync(temp, dest); written++; }
  const meta = await sharp(buf).metadata();
  results.set(file, { repoPath, ...measured, width: meta.width, height: meta.height });
  driveManifest.entries[repoPath] = sanitizeDriveEntry({
    group: group.id, vaultPath, sha256: measured.sha256, md5: measured.md5, bytes: measured.bytes,
    width: meta.width, height: meta.height, regenerable: group.regenerable, syncedAt: timestamp, verifiedAt: timestamp,
  });
}

const next = applyCropBatch(manifest, batch, { results, bookRoot: bookRepoRoot(source), timestamp });
const shapeErrors = validateBookManifestShape(source, next);
if (shapeErrors.length) die(`更新後の book-manifest が不正: ${shapeErrors.join(' / ')}`);
const writeJson = (file, value) => {
  const temp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n');
  JSON.parse(fs.readFileSync(temp, 'utf8'));
  fs.renameSync(temp, file);
};
writeJson(manifestAbs, next);
writeJson(vaultAbsFor(mount.root, `${source.origin.vaultDir}/book-manifest.json`), next);
writeDriveManifestAtomic(driveManifest, driveConfig);
console.log(`[${NAME}] ✓ ${source.id}: 図なし ${notNeeded} 頁・切り出し ${crops.length} 枚（新しく書いた ${written}・同じ中身で据え置き ${kept}）を登録した`);
