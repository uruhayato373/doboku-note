#!/usr/bin/env node
/**
 * 参考文献の市販書籍を「1 ID = 1 Drive ディレクトリ」へ安全にコピーし、
 * 見開き PDF を 1 ページ 1 画像へ展開する。
 *
 * 既定は dry-run。--commit でも旧配置の rename / move / delete はしない。
 * 原本コピーとページ画像は一時名へ書き、bytes + sha256 を読み直してから正しい名前へ置く。
 *
 *   npm run build-reference-book-pages -- --source-id safety-management-all-7th
 *   npm run build-reference-book-pages -- --source-id safety-management-all-7th --commit
 *   npm run build-reference-book-pages -- --source-id safety-management-all-7th --commit --replace-derived
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';
import {
  driveGroupFor,
  loadDriveConfig,
  loadDriveManifest,
  realBytesAndHashes,
  resolveVaultRoot,
  sanitizeDriveEntry,
  toVaultRel,
  vaultAbsFor,
  vaultRelFor,
  writeDriveManifestAtomic,
} from './lib/drive-vault.mjs';
import {
  BOOK_MANIFEST_NAME,
  bookRepoRoot,
  buildBookPagePlan,
  manifestRepoPath,
  resolvedPdfPageTransform,
  sourceRepoPath,
  validateBookBundleSource,
} from './lib/reference-book-bundle.mjs';
import { loadReferenceSources } from './lib/reference-sources.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const NAME = 'build-reference-book-pages';
const args = process.argv.slice(2);
const value = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const COMMIT = args.includes('--commit');
const REPLACE_DERIVED = args.includes('--replace-derived');
const SOURCE_ID = value('source-id');

const die = (message, code = 1) => {
  console.error(`[${NAME}] ✗ ${message}`);
  process.exit(code);
};
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const md5 = (buffer) => createHash('md5').update(buffer).digest('hex');

for (const bin of ['pdfimages', 'pdfinfo', 'pdftoppm']) {
  try { execFileSync('which', [bin], { stdio: 'pipe' }); }
  catch { die(`${bin} が無い（brew install poppler）。検査不成立`, 2); }
}
if (!SOURCE_ID) die('--source-id が必要');

const refConfig = loadReferenceSources();
const source = refConfig.sources.find((item) => item.id === SOURCE_ID);
if (!source) die(`reference-sources.json に source-id=${SOURCE_ID} が無い`);
try { validateBookBundleSource(source); }
catch (error) { die(error.message); }
const driveConfig = loadDriveConfig();
const driveManifest = loadDriveManifest();
const mount = resolveVaultRoot({ cfg: driveConfig });
if (!mount.root) die(mount.reason, 2);

const sourceGroup = driveConfig.groups.find((group) => group.id === 'reference-book-source-pdf');
const pageGroup = driveConfig.groups.find((group) => group.id === 'reference-book-page-image');
if (!sourceGroup || !pageGroup) die('reference-book-source-pdf / reference-book-page-image group が無い');

const pdfPages = (pdf) => {
  const info = execFileSync('pdfinfo', [pdf], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const pages = Number(/^Pages:\s+(\d+)$/m.exec(info)?.[1]);
  if (!pages) throw new Error(`${path.basename(pdf)}: pdfinfo がページ数を返さない`);
  return pages;
};

const inspectEmbeddedImages = (pdf, expectedPages) => {
  const output = execFileSync('pdfimages', ['-list', pdf], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const rows = output.split('\n').flatMap((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 9 || parts[2] !== 'image' || !/^\d+$/.test(parts[0])) return [];
    return [{ page: Number(parts[0]), encoding: parts[8], width: Number(parts[3]), height: Number(parts[4]) }];
  });
  const perPage = new Map();
  for (const row of rows) perPage.set(row.page, [...(perPage.get(row.page) || []), row]);
  if (perPage.size !== expectedPages) throw new Error(`${path.basename(pdf)}: 画像を持つ PDF page は ${perPage.size}/${expectedPages}`);
  for (let page = 1; page <= expectedPages; page++) {
    const images = perPage.get(page) || [];
    if (images.length !== 1) throw new Error(`${path.basename(pdf)}: PDF page ${page} の埋め込み画像は ${images.length} 件（1件必要）`);
    if (images[0].encoding !== 'jpeg') throw new Error(`${path.basename(pdf)}: PDF page ${page} は JPEG でない（${images[0].encoding}）`);
  }
  return rows;
};

const inputs = [];
for (const spec of source.bookBundle.sourceFiles) {
  const newRepoPath = sourceRepoPath(source, spec.order);
  const canonicalEntry = driveManifest.entries[newRepoPath];
  const oldEntry = spec.legacyRepoPath ? driveManifest.entries[spec.legacyRepoPath] : null;
  if (!canonicalEntry && spec.legacyRepoPath && (!oldEntry || oldEntry.group !== 'textbook-source-pdf')) {
    die(`${spec.legacyRepoPath}: 旧 textbook-source-pdf 台帳に無い`);
  }
  const legacyVaultPath = oldEntry?.vaultPath || spec.legacyVaultPath;
  const myDriveRoot = path.dirname(mount.root);
  const legacyAbs = spec.legacyMyDrivePath
    ? path.join(myDriveRoot, ...spec.legacyMyDrivePath.split('/'))
    : legacyVaultPath
      ? vaultAbsFor(mount.root, legacyVaultPath)
      : null;
  const oldAbs = canonicalEntry ? vaultAbsFor(mount.root, canonicalEntry.vaultPath) : legacyAbs;
  const legacyLabel = canonicalEntry ? canonicalEntry.vaultPath : spec.legacyMyDrivePath
    ? `マイドライブ/${spec.legacyMyDrivePath}`
    : legacyVaultPath;
  if (!oldAbs || !legacyLabel) die(`${spec.originalName}: 旧 Drive パスを解決できない`);
  if (!fs.existsSync(oldAbs)) die(`${legacyLabel}: Drive に原本が無い`);
  const actual = await realBytesAndHashes(oldAbs);
  const expectedEntry = canonicalEntry || oldEntry;
  if (expectedEntry && (actual.sha256 !== expectedEntry.sha256 || actual.bytes !== expectedEntry.bytes)) {
    die(`${legacyLabel}: 台帳と実体の bytes/sha256 が不一致`);
  }
  const count = pdfPages(oldAbs);
  if (count !== spec.expectedPdfPages) {
    die(`${legacyLabel}: PDF ${count}p、設定 ${spec.expectedPdfPages}p`);
  }
  const embedded = ['pdfimages-spread', 'pdfimages-auto-spread'].includes(source.bookBundle.renderProfile.mode)
    ? inspectEmbeddedImages(oldAbs, count)
    : [];
  if (source.bookBundle.renderProfile.mode === 'pdfimages-auto-spread') {
    for (const image of embedded) {
      const transform = resolvedPdfPageTransform(source, spec, image.page);
      if (transform.excluded) continue;
      const quarterTurn = [90, 270].includes(transform.rotation);
      const width = quarterTurn ? image.height : image.width;
      const height = quarterTurn ? image.width : image.height;
      const detectedSingle = width / height <= source.bookBundle.renderProfile.singlePageAspectThreshold;
      if (detectedSingle !== (transform.layout === 'single')) {
        die(`${legacyLabel}: PDF page ${image.page} の単ページ/見開き判定が設定と不一致`);
      }
    }
  }

  const routed = driveGroupFor(newRepoPath, driveConfig, { includePending: false });
  if (routed?.id !== sourceGroup.id) die(`${newRepoPath}: ${sourceGroup.id} に分類されない`);
  const newVaultPath = vaultRelFor(newRepoPath, sourceGroup);
  const expectedVaultPrefix = `${source.origin.vaultDir}/source/`;
  if (!newVaultPath.startsWith(expectedVaultPrefix)) die(`${newRepoPath}: 目標が ${expectedVaultPrefix} 配下でない`);
  inputs.push({ spec, oldEntry, legacyVaultPath, legacyLabel, oldAbs, actual, count, newRepoPath, newVaultPath });
}

const pagePlan = buildBookPagePlan(source);
console.log(`[${NAME}] source=${source.id} / 分冊 ${inputs.length} / PDF ${inputs.reduce((n, item) => n + item.count, 0)}p / 書籍ページ ${pagePlan.length}p`);
console.log(`  入力: ${[...new Set(inputs.map((item) => path.posix.dirname(item.legacyLabel)))].join(' / ')}`);
console.log(`  正本: ${source.origin.vaultDir}/{source,pages,ocr,crops,${BOOK_MANIFEST_NAME}}`);
for (const item of inputs) {
  console.log(`  ${item.legacyLabel}\n    → ${item.newVaultPath}  sha256=${item.actual.sha256.slice(0, 12)}…`);
}
if (!COMMIT) {
  console.log(`[${NAME}] DRY-RUN — Drive と台帳には書いていない。実行は --commit。派生画像の再生成は --commit --replace-derived。旧配置は削除しない。`);
  process.exit(0);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `doboku-reference-book-${source.id}-`));
const timestamp = new Date().toISOString();
const sourceEntries = [];
const pageEntries = new Array(pagePlan.length);
const pagePlanIndex = new Map(pagePlan.map((page, index) => [
  `${page.sourceFile}:${page.sourcePdfPage}:${page.side || 'single'}`,
  index,
]));
let completedPages = 0;
let previousManifest = null;
const previousManifestAbs = path.join(REPO_ROOT, ...manifestRepoPath(source).split('/'));
if (fs.existsSync(previousManifestAbs)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(previousManifestAbs, 'utf8'));
    if (parsed.sourceId === source.id) previousManifest = parsed;
  } catch { /* 壊れた既存 manifest は後段の上書きで復旧する */ }
}
const previousPages = new Map((previousManifest?.pages || []).map((page) => [page.id, page]));
const pageDirAbs = path.join(mount.root, ...source.origin.vaultDir.split('/'), 'pages');
const pageBackupAbs = `${pageDirAbs}.backup-${process.pid}-${Date.now()}`;
const repoManifestSnapshot = fs.existsSync(previousManifestAbs) ? fs.readFileSync(previousManifestAbs) : null;
const driveManifestAbsBefore = path.join(mount.root, ...source.origin.vaultDir.split('/'), BOOK_MANIFEST_NAME);
const driveBookManifestSnapshot = fs.existsSync(driveManifestAbsBefore) ? fs.readFileSync(driveManifestAbsBefore) : null;
let pageBackupCreated = false;

const restoreSnapshot = (file, snapshot) => {
  if (snapshot == null) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, snapshot);
  }
};

async function putFileVerified(src, dst, expected) {
  if (fs.existsSync(dst)) {
    const current = await realBytesAndHashes(dst);
    if (current.sha256 === expected.sha256 && current.bytes === expected.bytes) return current;
    throw new Error(`${toVaultRel(path.relative(mount.root, dst))}: 既存ファイルが期待ハッシュと異なるため上書きしない`);
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const tmp = `${dst}.tmp-${process.pid}`;
  try {
    await pipeline(fs.createReadStream(src), fs.createWriteStream(tmp, { flags: 'wx' }));
    const written = await realBytesAndHashes(tmp);
    if (written.sha256 !== expected.sha256 || written.bytes !== expected.bytes) {
      throw new Error(`${path.basename(dst)}: コピー後の bytes/sha256 が不一致`);
    }
    fs.renameSync(tmp, dst);
    return written;
  } catch (error) {
    try { fs.unlinkSync(tmp); } catch { /* 一時ファイルが無ければよい */ }
    throw error;
  }
}

async function putBufferVerified(buffer, dst) {
  const expected = { bytes: buffer.length, sha256: sha256(buffer), md5: md5(buffer) };
  if (fs.existsSync(dst)) {
    const current = await realBytesAndHashes(dst);
    if (current.sha256 === expected.sha256 && current.bytes === expected.bytes) return current;
    throw new Error(`${toVaultRel(path.relative(mount.root, dst))}: 既存画像が今回の生成結果と異なるため上書きしない`);
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const tmp = `${dst}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(tmp, buffer, { flag: 'wx' });
    const written = await realBytesAndHashes(tmp);
    if (written.sha256 !== expected.sha256 || written.bytes !== expected.bytes) throw new Error(`${path.basename(dst)}: 書き込み後の検証に失敗`);
    fs.renameSync(tmp, dst);
    return written;
  } catch (error) {
    try { fs.unlinkSync(tmp); } catch { /* 一時ファイルが無ければよい */ }
    throw error;
  }
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  JSON.parse(fs.readFileSync(tmp, 'utf8'));
  fs.renameSync(tmp, file);
}

async function runConcurrent(items, limit, worker) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) await worker(items[cursor++]);
  }));
}

let buildError = null;
try {
  if (REPLACE_DERIVED && fs.existsSync(pageDirAbs)) {
    fs.renameSync(pageDirAbs, pageBackupAbs);
    pageBackupCreated = true;
  }
  if (REPLACE_DERIVED) {
    const pagePrefix = `${bookRepoRoot(source)}/pages/`;
    for (const repoPath of Object.keys(driveManifest.entries)) {
      if (repoPath.startsWith(pagePrefix)) delete driveManifest.entries[repoPath];
    }
  }
  for (const input of inputs) {
    const dst = vaultAbsFor(mount.root, input.newVaultPath);
    const copied = await putFileVerified(input.oldAbs, dst, input.actual);
    const id = `s${String(input.spec.order).padStart(3, '0')}`;
    const originalVaultPath = previousManifest?.sourceFiles?.find(s => s.id === id)?.legacyVaultPath || input.legacyVaultPath;
    sourceEntries.push({
      id,
      order: input.spec.order,
      path: `source/${String(input.spec.order).padStart(3, '0')}.pdf`,
      repoPath: input.newRepoPath,
      originalName: input.spec.originalName,
      ...(input.spec.legacyRepoPath ? { legacyRepoPath: input.spec.legacyRepoPath } : {}),
      ...(originalVaultPath ? { legacyVaultPath: originalVaultPath } : {}),
      ...(input.spec.legacyMyDrivePath ? { legacyMyDrivePath: input.spec.legacyMyDrivePath } : {}),
      sha256: copied.sha256,
      md5: copied.md5,
      bytes: copied.bytes,
      pdfPages: input.count,
      printedPages: input.spec.printedPages,
      ...(input.spec.singlePdfPages ? { singlePdfPages: input.spec.singlePdfPages } : {}),
      ...(input.spec.excludedPdfPageRanges ? { excludedPdfPageRanges: input.spec.excludedPdfPageRanges } : {}),
      ...(input.spec.pageTransforms ? { pageTransforms: input.spec.pageTransforms } : {}),
      section: input.spec.section,
    });
    driveManifest.entries[input.newRepoPath] = sanitizeDriveEntry({
      group: sourceGroup.id,
      vaultPath: input.newVaultPath,
      sha256: copied.sha256,
      md5: copied.md5,
      bytes: copied.bytes,
      regenerable: false,
      syncedAt: timestamp,
      verifiedAt: timestamp,
    });

    const rawDir = path.join(tempRoot, id);
    fs.mkdirSync(rawDir, { recursive: true });
    const profile = source.bookBundle.renderProfile;
    const imageMode = ['pdfimages-spread', 'pdfimages-auto-spread'].includes(profile.mode);
    const rawPrefix = imageMode ? 'spread' : 'page';
    if (imageMode) {
      execFileSync('pdfimages', ['-j', dst, path.join(rawDir, rawPrefix)], {
        stdio: ['ignore', 'ignore', 'inherit'],
        maxBuffer: 64 * 1024 * 1024,
      });
    } else {
      execFileSync('pdftoppm', [
        '-jpeg', '-jpegopt', `quality=${profile.jpegQuality}`,
        '-scale-to-x', String(profile.ocrWidth), '-scale-to-y', '-1',
        dst, path.join(rawDir, rawPrefix),
      ], { stdio: ['ignore', 'ignore', 'inherit'], maxBuffer: 64 * 1024 * 1024 });
    }
    const rawImages = fs.readdirSync(rawDir)
      .filter((name) => new RegExp(`^${rawPrefix}-\\d+\\.jpe?g$`, 'i').test(name))
      .sort((a, b) => Number(/-(\d+)\./.exec(a)[1]) - Number(/-(\d+)\./.exec(b)[1]));
    if (rawImages.length !== input.count) {
      throw new Error(`${input.spec.originalName}: pdfimages は ${rawImages.length} 枚、PDF は ${input.count}p`);
    }

    await runConcurrent(rawImages.map((name, spreadIndex) => ({ name, spreadIndex })), 6, async ({ name, spreadIndex }) => {
      const raw = path.join(rawDir, name);
      const metadata = await sharp(raw).metadata();
      if (!metadata.width || !metadata.height) throw new Error(`${name}: 画像寸法を読めない`);
      const sourcePdfPage = spreadIndex + 1;
      const transform = resolvedPdfPageTransform(source, input.spec, sourcePdfPage);
      if (transform.excluded) return;
      const quarterTurn = [90, 270].includes(transform.rotation);
      const rotatedWidth = quarterTurn ? metadata.height : metadata.width;
      const rotatedHeight = quarterTurn ? metadata.width : metadata.height;
      const overlap = Math.round(rotatedWidth * profile.gutterOverlapPercent / 100);
      const middle = Math.floor(rotatedWidth / 2);
      const crops = {
        left: { left: 0, top: 0, width: Math.min(rotatedWidth, middle + overlap), height: rotatedHeight },
        right: { left: Math.max(0, middle - overlap), top: 0, width: rotatedWidth - Math.max(0, middle - overlap), height: rotatedHeight },
      };

      const sides = transform.layout === 'spread' ? ['left', 'right'] : [null];
      for (const side of sides) {
        const planIndex = pagePlanIndex.get(`${id}:${sourcePdfPage}:${side || 'single'}`);
        if (planIndex === undefined) throw new Error(`${id} PDF page ${sourcePdfPage} ${side || 'single'}: ページ計画に無い`);
        const planned = pagePlan[planIndex];
        if (planned.sourceFile !== id || planned.sourcePdfPage !== spreadIndex + 1 || planned.side !== side) {
          throw new Error(`${id} PDF page ${spreadIndex + 1} ${side}: ページ計画と生成順が不一致`);
        }
        let image = sharp(raw).rotate(transform.rotation);
        if (side) image = image.extract(crops[side]);
        const baseWidth = side ? crops[side].width : rotatedWidth;
        const baseHeight = side ? crops[side].height : rotatedHeight;
        if (transform.contentCrop) {
          const { top, right, bottom, left } = transform.contentCrop;
          const width = baseWidth - left - right;
          const height = baseHeight - top - bottom;
          if (width <= 0 || height <= 0) throw new Error(`${planned.id}: contentCrop が画像寸法以上`);
          image = image.extract({ left, top, width, height });
        }
        if (profile.mode === 'pdfimages-auto-spread') image = image.resize({ width: profile.ocrWidth });
        const rendered = await image
          .jpeg({ quality: profile.jpegQuality, chromaSubsampling: '4:4:4' })
          .toBuffer({ resolveWithObject: true });
        const routed = driveGroupFor(planned.repoPath, driveConfig, { includePending: false });
        if (routed?.id !== pageGroup.id) throw new Error(`${planned.repoPath}: ${pageGroup.id} に分類されない`);
        const vaultPath = vaultRelFor(planned.repoPath, pageGroup);
        const written = await putBufferVerified(rendered.data, vaultAbsFor(mount.root, vaultPath));
        const previous = previousPages.get(planned.id);
        const derivedIsCurrent = previous?.sha256 === written.sha256;
        pageEntries[planIndex] = {
          ...planned,
          ocrStatus: derivedIsCurrent ? previous.ocrStatus : planned.ocrStatus,
          cropStatus: derivedIsCurrent ? previous.cropStatus : planned.cropStatus,
          sha256: written.sha256,
          md5: written.md5,
          bytes: written.bytes,
          width: rendered.info.width,
          height: rendered.info.height,
        };
        driveManifest.entries[planned.repoPath] = sanitizeDriveEntry({
          group: pageGroup.id,
          vaultPath,
          sha256: written.sha256,
          md5: written.md5,
          bytes: written.bytes,
          width: rendered.info.width,
          height: rendered.info.height,
          regenerable: true,
          syncedAt: timestamp,
          verifiedAt: timestamp,
        });
        completedPages += 1;
        if (completedPages % 20 === 0 || completedPages === pagePlan.length) {
          console.log(`  pages ${completedPages}/${pagePlan.length}`);
        }
      }
    });
  }

  const generatedPages = pageEntries.filter(Boolean).length;
  if (generatedPages !== pagePlan.length) throw new Error(`生成ページ ${generatedPages}/${pagePlan.length}`);
  const currentPageHashes = new Map(pageEntries.map((page) => [page.id, page.sha256]));
  const pageUnchanged = (pageId) => previousPages.get(pageId)?.sha256 === currentPageHashes.get(pageId);
  const preservedOcrArtifacts = (previousManifest?.ocrArtifacts || [])
    .filter((artifact) => (artifact.pageIds || []).every(pageUnchanged));
  const preservedCrops = (previousManifest?.crops || [])
    .filter((crop) => pageUnchanged(crop.pageId));
  const bookManifest = {
    schemaVersion: 1,
    sourceId: source.id,
    class: source.class,
    title: source.title,
    directory: source.bookBundle.directory,
    access: 'internal-only',
    generatedAt: timestamp,
    sourceFiles: sourceEntries,
    renderProfile: source.bookBundle.renderProfile,
    pageCount: pageEntries.length,
    pages: pageEntries,
    ocrArtifacts: preservedOcrArtifacts,
    crops: preservedCrops,
    updatedAt: previousManifest?.updatedAt || timestamp,
    migration: {
      strategy: 'copy-verify-switch-then-delete-separately',
      legacyKept: true,
      note: '旧配置はこの生成処理では削除しない。新旧の sha256 と cloud md5 の確認後、別操作で撤去する。',
    },
  };

  const repoManifestAbs = path.join(REPO_ROOT, ...manifestRepoPath(source).split('/'));
  const driveBookDir = path.join(mount.root, ...source.origin.vaultDir.split('/'));
  const driveManifestAbs = path.join(driveBookDir, BOOK_MANIFEST_NAME);
  fs.mkdirSync(path.join(driveBookDir, 'crops'), { recursive: true });
  fs.mkdirSync(path.join(driveBookDir, 'ocr'), { recursive: true });
  writeJsonAtomic(repoManifestAbs, bookManifest);
  writeJsonAtomic(driveManifestAbs, bookManifest);
  writeDriveManifestAtomic(driveManifest, driveConfig);
  if (pageBackupCreated) {
    try { fs.rmSync(pageBackupAbs, { recursive: true, force: true }); }
    catch (error) { console.warn(`[${NAME}] ⚠ 旧派生画像の退避先を削除できない: ${error.message}`); }
  }
  console.log(`[${NAME}] ✓ ${bookRepoRoot(source)}/${BOOK_MANIFEST_NAME}`);
  console.log(`  原本 ${sourceEntries.length} / ページ画像 ${pageEntries.length} / 旧配置は保持`);
} catch (error) {
  buildError = error;
  if (REPLACE_DERIVED) {
    try {
      if (fs.existsSync(pageDirAbs)) fs.rmSync(pageDirAbs, { recursive: true, force: true });
      if (pageBackupCreated && fs.existsSync(pageBackupAbs)) fs.renameSync(pageBackupAbs, pageDirAbs);
      restoreSnapshot(previousManifestAbs, repoManifestSnapshot);
      restoreSnapshot(driveManifestAbsBefore, driveBookManifestSnapshot);
    } catch (restoreError) {
      buildError = new Error(`${error.message || error}; rollback 失敗: ${restoreError.message || restoreError}`);
    }
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
if (buildError) die(buildError.message || String(buildError));
