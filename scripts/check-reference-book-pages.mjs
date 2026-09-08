#!/usr/bin/env node
/**
 * 参考文献の「1 ID = 1 書籍ディレクトリ」とページ画像 provenance を検査する。
 *
 * CI（Drive mount なし）では参考文献台帳 ↔ book-manifest ↔ drive-manifest を検査する。
 * Drive mount がある端末では、全原本とページ画像サンプル（--deep は全件）の bytes/sha256 も照合する。
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  loadDriveConfig,
  loadDriveManifest,
  realBytesAndHashes,
  resolveVaultRoot,
  vaultAbsFor,
} from './lib/drive-vault.mjs';
import {
  BOOK_MANIFEST_NAME,
  bookRepoRoot,
  buildBookPagePlan,
  manifestRepoPath,
  sourceRepoPath,
  validateBookBundleSource,
  validateBookManifestShape,
} from './lib/reference-book-bundle.mjs';
import { loadReferenceSources } from './lib/reference-sources.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const NAME = 'check-reference-book-pages';
const args = process.argv.slice(2);
const value = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const DEEP = args.includes('--deep');
const SOURCE_ID = value('source-id');
const SAMPLE = Math.max(1, Number(value('sample', '12')) || 12);
const failures = [];
const warnings = [];
const fail = (label, message) => failures.push(`${label}: ${message}`);

let referenceConfig;
let driveConfig;
let driveManifest;
try {
  referenceConfig = loadReferenceSources();
  driveConfig = loadDriveConfig();
  driveManifest = loadDriveManifest();
} catch (error) {
  console.error(`[${NAME}] ✗ ${error.message}`);
  process.exit(2);
}

let targets = referenceConfig.sources.filter((source) => source.bookBundle);
if (SOURCE_ID) targets = targets.filter((source) => source.id === SOURCE_ID);
if (targets.length === 0) {
  console.error(`[${NAME}] ✗ 対象 0 件${SOURCE_ID ? `（source-id=${SOURCE_ID}）` : ''}。検査不成立`);
  process.exit(2);
}

const directories = new Map();
for (const source of targets) {
  const owner = directories.get(source.bookBundle.directory);
  if (owner) fail(source.id, `bookBundle.directory が ${owner} と重複`);
  directories.set(source.bookBundle.directory, source.id);
}

const mount = resolveVaultRoot({ cfg: driveConfig });
if (!mount.root) warnings.push(`Drive mount 無し（${mount.reason}）。実体検査は 0 件`);

let checkedManifests = 0;
let checkedSources = 0;
let checkedPages = 0;
let checkedOcrArtifacts = 0;
let checkedCrops = 0;
for (const source of targets) {
  const label = source.id;
  try { validateBookBundleSource(source); }
  catch (error) { fail(label, error.message); continue; }

  const manifestRel = manifestRepoPath(source);
  const manifestAbs = path.join(REPO_ROOT, ...manifestRel.split('/'));
  if (!fs.existsSync(manifestAbs)) {
    fail(label, `${manifestRel} が無い（npm run build-reference-book-pages -- --source-id ${source.id} --commit）`);
    continue;
  }
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestAbs, 'utf8')); }
  catch (error) { fail(label, `${manifestRel} を読めない: ${error.message}`); continue; }
  checkedManifests += 1;
  for (const message of validateBookManifestShape(source, manifest)) fail(label, message);
  const expectedPages = buildBookPagePlan(source);
  if (manifest.pageCount !== expectedPages.length) fail(label, `pageCount ${manifest.pageCount} / 期待 ${expectedPages.length}`);

  for (let i = 0; i < source.bookBundle.sourceFiles.length; i++) {
    const repoPath = sourceRepoPath(source, i + 1);
    const entry = driveManifest.entries[repoPath];
    const recorded = manifest.sourceFiles?.[i];
    if (!entry) { fail(label, `${repoPath} が drive-manifest に無い`); continue; }
    if (entry.group !== 'reference-book-source-pdf') fail(label, `${repoPath} の group=${entry.group}`);
    if (recorded && (entry.sha256 !== recorded.sha256 || entry.md5 !== recorded.md5 || entry.bytes !== recorded.bytes)) {
      fail(label, `${repoPath} の book-manifest と drive-manifest が不一致`);
    }
  }

  for (let i = 0; i < expectedPages.length; i++) {
    const repoPath = expectedPages[i].repoPath;
    const entry = driveManifest.entries[repoPath];
    const recorded = manifest.pages?.[i];
    if (!entry) { fail(label, `${repoPath} が drive-manifest に無い`); continue; }
    if (entry.group !== 'reference-book-page-image') fail(label, `${repoPath} の group=${entry.group}`);
    if (recorded && (entry.sha256 !== recorded.sha256 || entry.md5 !== recorded.md5 || entry.bytes !== recorded.bytes
      || entry.width !== recorded.width || entry.height !== recorded.height)) {
      fail(label, `${repoPath} の book-manifest と drive-manifest が不一致`);
    }
  }

  for (const artifact of manifest.ocrArtifacts || []) {
    const entry = driveManifest.entries[artifact.repoPath];
    if (!entry) { fail(label, `${artifact.repoPath} が drive-manifest に無い`); continue; }
    if (entry.group !== 'source-transcript') fail(label, `${artifact.repoPath} の group=${entry.group}`);
    if (entry.sha256 !== artifact.sha256 || entry.md5 !== artifact.md5 || entry.bytes !== artifact.bytes) {
      fail(label, `${artifact.repoPath} の book-manifest と drive-manifest が不一致`);
    }
  }
  for (const crop of manifest.crops || []) {
    const entry = driveManifest.entries[crop.repoPath];
    if (!entry) { fail(label, `${crop.repoPath} が drive-manifest に無い`); continue; }
    if (entry.group !== 'reference-book-page-image') fail(label, `${crop.repoPath} の group=${entry.group}`);
    if (entry.sha256 !== crop.sha256 || entry.md5 !== crop.md5 || entry.bytes !== crop.bytes
      || entry.width !== crop.width || entry.height !== crop.height) {
      fail(label, `${crop.repoPath} の book-manifest と drive-manifest が不一致`);
    }
  }

  if (!mount.root) continue;
  const driveBookDir = path.join(mount.root, ...source.origin.vaultDir.split('/'));
  const driveBookManifest = path.join(driveBookDir, BOOK_MANIFEST_NAME);
  if (!fs.existsSync(driveBookManifest)) {
    fail(label, `${source.origin.vaultDir}/${BOOK_MANIFEST_NAME} が Drive に無い`);
  } else if (fs.readFileSync(driveBookManifest, 'utf8') !== fs.readFileSync(manifestAbs, 'utf8')) {
    fail(label, `Drive と Git の ${BOOK_MANIFEST_NAME} が一致しない`);
  }
  const sourceDir = path.join(driveBookDir, 'source');
  const pagesDir = path.join(driveBookDir, 'pages');
  const cropsDir = path.join(driveBookDir, 'crops');
  const ocrDir = path.join(driveBookDir, 'ocr');
  const sourceNames = fs.existsSync(sourceDir) ? fs.readdirSync(sourceDir).filter((name) => /\.pdf$/i.test(name)).sort() : [];
  const pageNames = fs.existsSync(pagesDir) ? fs.readdirSync(pagesDir).filter((name) => /\.jpe?g$/i.test(name)).sort() : [];
  if (sourceNames.length !== source.bookBundle.sourceFiles.length) fail(label, `Drive source/ は ${sourceNames.length} PDF、期待 ${source.bookBundle.sourceFiles.length}`);
  if (pageNames.length !== expectedPages.length) fail(label, `Drive pages/ は ${pageNames.length} 画像、期待 ${expectedPages.length}`);
  if (!fs.existsSync(cropsDir) || !fs.statSync(cropsDir).isDirectory()) fail(label, 'Drive crops/ が無い');
  if (!fs.existsSync(ocrDir) || !fs.statSync(ocrDir).isDirectory()) fail(label, 'Drive ocr/ が無い');

  for (const recorded of manifest.sourceFiles || []) {
    const entry = driveManifest.entries[recorded.repoPath];
    if (!entry?.vaultPath) continue;
    const file = vaultAbsFor(mount.root, entry.vaultPath);
    if (!fs.existsSync(file)) { fail(label, `${entry.vaultPath} が Drive に無い`); continue; }
    const actual = await realBytesAndHashes(file);
    checkedSources += 1;
    if (actual.sha256 !== recorded.sha256 || actual.bytes !== recorded.bytes) fail(label, `${entry.vaultPath} の原本 bytes/sha256 が不一致`);
  }

  const pageRecords = manifest.pages || [];
  const picked = DEEP
    ? pageRecords
    : pageRecords.filter((_, i) => i === 0 || i === pageRecords.length - 1 || i % Math.max(1, Math.floor(pageRecords.length / SAMPLE)) === 0);
  for (const recorded of picked) {
    const entry = driveManifest.entries[recorded.repoPath];
    if (!entry?.vaultPath) continue;
    const file = vaultAbsFor(mount.root, entry.vaultPath);
    if (!fs.existsSync(file)) { fail(label, `${entry.vaultPath} が Drive に無い`); continue; }
    const actual = await realBytesAndHashes(file);
    checkedPages += 1;
    if (actual.sha256 !== recorded.sha256 || actual.bytes !== recorded.bytes) fail(label, `${entry.vaultPath} のページ画像 bytes/sha256 が不一致`);
  }

  for (const recorded of manifest.ocrArtifacts || []) {
    const entry = driveManifest.entries[recorded.repoPath];
    if (!entry?.vaultPath) continue;
    const file = vaultAbsFor(mount.root, entry.vaultPath);
    if (!fs.existsSync(file)) { fail(label, `${entry.vaultPath} が Drive に無い`); continue; }
    const actual = await realBytesAndHashes(file);
    checkedOcrArtifacts += 1;
    if (actual.sha256 !== recorded.sha256 || actual.bytes !== recorded.bytes) fail(label, `${entry.vaultPath} の OCR bytes/sha256 が不一致`);
  }
  for (const recorded of manifest.crops || []) {
    const entry = driveManifest.entries[recorded.repoPath];
    if (!entry?.vaultPath) continue;
    const file = vaultAbsFor(mount.root, entry.vaultPath);
    if (!fs.existsSync(file)) { fail(label, `${entry.vaultPath} が Drive に無い`); continue; }
    const actual = await realBytesAndHashes(file);
    checkedCrops += 1;
    if (actual.sha256 !== recorded.sha256 || actual.bytes !== recorded.bytes) fail(label, `${entry.vaultPath} の crop bytes/sha256 が不一致`);
  }

  const prefix = `${bookRepoRoot(source)}/`;
  const unexpectedSource = Object.entries(driveManifest.entries)
    .filter(([repoPath, entry]) => repoPath.startsWith(prefix) && entry.group === 'reference-book-source-pdf')
    .map(([repoPath]) => repoPath)
    .filter((repoPath) => !manifest.sourceFiles?.some((item) => item.repoPath === repoPath));
  for (const repoPath of unexpectedSource) fail(label, `book-manifest に無い原本エントリ: ${repoPath}`);
}

console.log(`[${NAME}] 対象 ${targets.length} 冊 / manifest ${checkedManifests} 冊`);
console.log(`[${NAME}] Drive 実体照合: 原本 ${checkedSources} ファイル / ページ画像 ${checkedPages} 枚${DEEP ? '（全件）' : `（各冊 約${SAMPLE} 枚）`} / OCR ${checkedOcrArtifacts} / crop ${checkedCrops}`);
for (const warning of warnings) console.warn(`  ! ${warning}`);
if (checkedManifests === 0) {
  console.error(`[${NAME}] ✗ manifest を1件も検査していない。検査不成立`);
  process.exit(2);
}
if (failures.length) {
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  console.error(`[${NAME}] ✗ FAIL ${failures.length} 件`);
  process.exit(1);
}
console.log(`[${NAME}] ✓ 1参考文献ID=1ディレクトリ、原本・ページ対応・台帳が整合`);
