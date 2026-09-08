#!/usr/bin/env node
/**
 * 校正済み OCR と監査済み図クロップを、book-manifest / Drive 台帳へ同時登録する。
 *
 * 既定は dry-run。原本・既存成果物を削除せず、コピー先に異なる bytes/hash があれば停止する。
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
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
import {
  bookRepoRoot,
  manifestRepoPath,
  validateBookBundleSource,
  validateBookManifestShape,
} from './lib/reference-book-bundle.mjs';
import { loadReferenceSources } from './lib/reference-sources.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const NAME = 'record-reference-book-artifacts';
const args = process.argv.slice(2);
const value = (name, fallback = null) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const COMMIT = args.includes('--commit');
const SOURCE_ID = value('source-id');
const OCR_PATH = value('ocr-path');
const OCR_PAGES = (value('ocr-pages', '') || '').split(',').map((item) => item.trim()).filter(Boolean);
const OCR_METHOD = value('ocr-method', 'visual-ocr+visual-proofread');
const CROP_PATH = value('crop-path');
const CROP_PAGE = value('crop-page');
const FIGURE_ID = value('figure-id');
const CAPTION = value('caption');
const CROP_STATUS = value('crop-status', 'partial');
const numberList = (name) => (value(name, '') || '').split(',').map((item) => item.trim()).filter(Boolean).map(Number);
const BBOX = numberList('bbox');
const AUDIT_SCORES = numberList('audit-scores');

const die = (message, code = 1) => {
  console.error(`[${NAME}] ✗ ${message}`);
  process.exit(code);
};
const repoAbs = (repoPath) => path.join(REPO_ROOT, ...repoPath.split('/'));
const HAS_OCR = Boolean(OCR_PATH || OCR_PAGES.length);
const HAS_CROP = Boolean(CROP_PATH || CROP_PAGE || FIGURE_ID || CAPTION || BBOX.length || AUDIT_SCORES.length);

if (!SOURCE_ID || (!HAS_OCR && !HAS_CROP)) {
  die('--source-id と、OCR一式またはcrop一式の少なくとも一方が必要', 2);
}
if (HAS_OCR && (!OCR_PATH || OCR_PAGES.length === 0)) die('OCR は --ocr-path / --ocr-pages を組で指定する', 2);
if (HAS_CROP && (!CROP_PATH || !CROP_PAGE || !FIGURE_ID || !CAPTION)) {
  die('crop は --crop-path / --crop-page / --figure-id / --caption を組で指定する', 2);
}
if (HAS_CROP && (BBOX.length !== 4 || !BBOX.every(Number.isInteger) || BBOX.some((n) => n < 0) || BBOX[2] === 0 || BBOX[3] === 0)) {
  die('--bbox は x,y,w,h の非負整数（w/h > 0）', 2);
}
if (HAS_CROP && (AUDIT_SCORES.length !== 4 || !AUDIT_SCORES.every((score) => Number.isInteger(score) && score >= 2 && score <= 3))) {
  die('--audit-scores は pass 済み4軸の整数（各2..3）', 2);
}
if (HAS_CROP && !['partial', 'complete'].includes(CROP_STATUS)) die('--crop-status は partial|complete', 2);

const referenceConfig = loadReferenceSources();
const source = referenceConfig.sources.find((item) => item.id === SOURCE_ID);
if (!source) die(`reference-sources.json に source-id=${SOURCE_ID} が無い`);
try { validateBookBundleSource(source); }
catch (error) { die(error.message); }
if (!source.bookBundle.transcriptDir) die(`${SOURCE_ID}: bookBundle.transcriptDir が無い`);
if (HAS_OCR && !OCR_PATH.startsWith(source.bookBundle.transcriptDir + '/')) {
  die(`ocr-path は ${source.bookBundle.transcriptDir}/ 配下にする`);
}
if (HAS_CROP && !CROP_PATH.startsWith(`${bookRepoRoot(source)}/crops/`)) {
  die(`crop-path は ${bookRepoRoot(source)}/crops/ 配下にする`);
}
if (HAS_CROP && !new RegExp(`/crops/${CROP_PAGE}_[^/]+\\.(?:png|jpe?g|webp)$`, 'i').test(CROP_PATH)) {
  die(`crop-path は ${CROP_PAGE}_ で始める`);
}

const bookManifestAbs = repoAbs(manifestRepoPath(source));
if (!fs.existsSync(bookManifestAbs)) die(`${manifestRepoPath(source)} が無い`);
const bookManifest = JSON.parse(fs.readFileSync(bookManifestAbs, 'utf8'));
const pageById = new Map((bookManifest.pages || []).map((page) => [page.id, page]));
if (HAS_OCR) for (const pageId of OCR_PAGES) if (!pageById.has(pageId)) die(`ocr-pages の ${pageId} が book-manifest に無い`);
const cropPage = HAS_CROP ? pageById.get(CROP_PAGE) : null;
if (HAS_CROP && !cropPage) die(`crop-page=${CROP_PAGE} が book-manifest に無い`);
const [x, y, w, h] = BBOX;
if (HAS_CROP && (x + w > cropPage.width || y + h > cropPage.height)) die(`bbox が ${CROP_PAGE} の ${cropPage.width}x${cropPage.height} を越える`);

const driveConfig = loadDriveConfig();
const driveManifest = loadDriveManifest();
const mount = resolveVaultRoot({ cfg: driveConfig });
if (!mount.root) die(mount.reason, 2);

async function inspectAsset(repoPath, expectedGroup, withDimensions = false) {
  const sourcePath = repoAbs(repoPath);
  if (!fs.existsSync(sourcePath)) die(`${repoPath} のローカル実体が無い`);
  const group = driveGroupFor(repoPath, driveConfig, { includePending: false });
  if (group?.id !== expectedGroup) die(`${repoPath}: group=${group?.id || 'none'}、期待=${expectedGroup}`);
  const vaultPath = vaultRelFor(repoPath, group);
  const destination = vaultAbsFor(mount.root, vaultPath);
  const measured = await realBytesAndHashes(sourcePath);
  const dimensions = withDimensions ? await sharp(sourcePath).metadata() : {};
  if (withDimensions && (!dimensions.width || !dimensions.height)) die(`${repoPath}: 画像寸法を読めない`);
  if (fs.existsSync(destination)) {
    const current = await realBytesAndHashes(destination);
    if (current.sha256 !== measured.sha256 || current.bytes !== measured.bytes) {
      die(`${vaultPath}: 既存ファイルが異なるため上書きしない`);
    }
  }
  return { repoPath, sourcePath, group, vaultPath, destination, ...measured, width: dimensions.width, height: dimensions.height };
}

async function copyAtomic(asset) {
  if (fs.existsSync(asset.destination)) return;
  fs.mkdirSync(path.dirname(asset.destination), { recursive: true });
  const temp = `${asset.destination}.tmp-${process.pid}`;
  try {
    fs.copyFileSync(asset.sourcePath, temp, fs.constants.COPYFILE_EXCL);
    const written = await realBytesAndHashes(temp);
    if (written.sha256 !== asset.sha256 || written.bytes !== asset.bytes) throw new Error(`${asset.repoPath}: コピー後の検証に失敗`);
    fs.renameSync(temp, asset.destination);
  } catch (error) {
    try { fs.unlinkSync(temp); } catch { /* 一時ファイルが無ければよい */ }
    throw error;
  }
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  JSON.parse(fs.readFileSync(temp, 'utf8'));
  fs.renameSync(temp, file);
}

const ocr = HAS_OCR ? await inspectAsset(OCR_PATH, 'source-transcript') : null;
const crop = HAS_CROP ? await inspectAsset(CROP_PATH, 'reference-book-page-image', true) : null;
const assets = [ocr, crop].filter(Boolean);
const timestamp = new Date().toISOString();
console.log(`[${NAME}] source=${SOURCE_ID}`);
if (ocr) console.log(`  OCR ${OCR_PAGES.length}p: ${OCR_PATH} → ${ocr.vaultPath}`);
if (crop) console.log(`  crop ${CROP_PAGE}/${FIGURE_ID}: ${CROP_PATH} → ${crop.vaultPath}`);
if (!COMMIT) {
  console.log(`[${NAME}] DRY-RUN — Drive と台帳には書いていない。実行は --commit。`);
  process.exit(0);
}

try {
  for (const asset of assets) await copyAtomic(asset);
} catch (error) {
  die(error.message || String(error));
}

for (const asset of assets) {
  driveManifest.entries[asset.repoPath] = sanitizeDriveEntry({
    group: asset.group.id,
    vaultPath: asset.vaultPath,
    sha256: asset.sha256,
    md5: asset.md5,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    regenerable: asset.group.regenerable,
    syncedAt: timestamp,
    verifiedAt: timestamp,
  });
}

if (ocr) {
  for (const pageId of OCR_PAGES) pageById.get(pageId).ocrStatus = 'complete';
  bookManifest.ocrArtifacts = [
    ...(bookManifest.ocrArtifacts || []).filter((artifact) => artifact.repoPath !== OCR_PATH),
    {
      id: path.basename(OCR_PATH, path.extname(OCR_PATH)),
      repoPath: OCR_PATH,
      pageIds: OCR_PAGES,
      method: OCR_METHOD,
      sha256: ocr.sha256,
      md5: ocr.md5,
      bytes: ocr.bytes,
      recordedAt: timestamp,
    },
  ];
}
if (crop) {
  cropPage.cropStatus = CROP_STATUS;
  bookManifest.crops = [
    ...(bookManifest.crops || []).filter((item) => item.repoPath !== CROP_PATH),
    {
      id: FIGURE_ID,
      pageId: CROP_PAGE,
      sourceImage: cropPage.image,
      path: CROP_PATH.slice(bookRepoRoot(source).length + 1),
      repoPath: CROP_PATH,
      caption: CAPTION,
      bbox: { x, y, w, h },
      sha256: crop.sha256,
      md5: crop.md5,
      bytes: crop.bytes,
      width: crop.width,
      height: crop.height,
      audit: {
        status: 'pass',
        scores: {
          clipPurity: AUDIT_SCORES[0],
          completeness: AUDIT_SCORES[1],
          correctFigure: AUDIT_SCORES[2],
          altIdentifiability: AUDIT_SCORES[3],
        },
        reviewedAt: timestamp,
      },
    },
  ];
}
bookManifest.updatedAt = timestamp;

const shapeErrors = validateBookManifestShape(source, bookManifest);
if (shapeErrors.length) die(`更新後 book-manifest が不正: ${shapeErrors.join(' / ')}`);

const driveBookManifest = vaultAbsFor(mount.root, `${source.origin.vaultDir}/book-manifest.json`);
writeJsonAtomic(bookManifestAbs, bookManifest);
writeJsonAtomic(driveBookManifest, bookManifest);
writeDriveManifestAtomic(driveManifest, driveConfig);
console.log(`[${NAME}] ✓ ${ocr ? `OCR ${OCR_PAGES.length}p` : ''}${ocr && crop ? ' と ' : ''}${crop ? '監査済み crop 1点' : ''}を登録`);
