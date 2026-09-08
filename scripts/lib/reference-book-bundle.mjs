/**
 * 参考文献の「1 ID = 1 書籍ディレクトリ」bundle を扱う純関数。
 *
 * バイナリ実体は Google Drive vault、来歴の book-manifest.json だけは Git に置く。
 * このモジュールはパス規約とページ対応を一か所に固定し、生成器と検査器で共有する。
 */

export const REFERENCE_BOOK_REPO_ROOT = 'content/sources/books';
export const REFERENCE_BOOK_VAULT_ROOT = '原資料PDF/書籍';
export const BOOK_MANIFEST_NAME = 'book-manifest.json';
export const BOOK_BUNDLE_MODES = ['pdfimages-spread', 'pdfimages-auto-spread', 'pymupdf-single', 'born-digital'];

const toPosInt = (value) => Number.isInteger(value) && value > 0;
const PAGE_LAYOUTS = ['single', 'spread'];

const validateContentCrop = (sourceId, label, crop) => {
  if (crop == null) return;
  if (typeof crop !== 'object' || Array.isArray(crop)) throw new Error(`${sourceId}: ${label} は object にする`);
  for (const edge of ['top', 'right', 'bottom', 'left']) {
    if (!Number.isInteger(crop[edge]) || crop[edge] < 0 || crop[edge] > 1000) {
      throw new Error(`${sourceId}: ${label}.${edge} は 0..1000 の整数`);
    }
  }
};

const rangeContains = (range, page) => page >= range.start && page <= range.end;

/** PDF ページ単位の除外・回転・単ページ/見開き・UI crop を1か所で解決する。 */
export function resolvedPdfPageTransform(source, file, pdfPage) {
  const profile = source.bookBundle.renderProfile;
  const override = (file.pageTransforms || []).find((range) => rangeContains(range, pdfPage));
  const excluded = (file.excludedPdfPageRanges || []).some((range) => rangeContains(range, pdfPage));
  const defaultLayout = profile.mode === 'pdfimages-spread'
    ? 'spread'
    : profile.mode === 'pdfimages-auto-spread' && !(file.singlePdfPages || []).includes(pdfPage)
      ? 'spread'
      : 'single';
  return {
    excluded,
    rotation: override?.rotation ?? profile.rotation ?? 0,
    layout: override?.layout ?? defaultLayout,
    contentCrop: override?.contentCrop ?? profile.contentCrop ?? null,
  };
}

export function bookRepoRoot(source) {
  return `${REFERENCE_BOOK_REPO_ROOT}/${source.bookBundle.directory}`;
}

export function sourceRepoPath(source, order) {
  return `${bookRepoRoot(source)}/source/${String(order).padStart(3, '0')}.pdf`;
}

export function pageRepoPath(source, page) {
  return `${bookRepoRoot(source)}/pages/p${String(page).padStart(4, '0')}.jpg`;
}

export function manifestRepoPath(source) {
  return `${bookRepoRoot(source)}/${BOOK_MANIFEST_NAME}`;
}

export function cropRepoPath(source, fileName) {
  if (!/^p[0-9]{4}_[^/]+\.(?:png|jpe?g|webp)$/i.test(fileName || '')) {
    throw new Error(`${source.id}: crop ファイル名は pNNNN_名前.(png|jpg|webp) にする`);
  }
  return `${bookRepoRoot(source)}/crops/${fileName}`;
}

export function expectedBookVaultDir(source) {
  return `${REFERENCE_BOOK_VAULT_ROOT}/${source.bookBundle.directory}`;
}

/**
 * 参考文献台帳の bookBundle を検証する。設定事故は生成前に例外で止める。
 */
export function validateBookBundleSource(source) {
  if (!source?.id || !source?.bookBundle) throw new Error('bookBundle を持つ参考文献が必要');
  const bundle = source.bookBundle;
  const expectedPrefix = `${source.id}__`;
  if (!bundle.directory?.startsWith(expectedPrefix) || bundle.directory.includes('/')) {
    throw new Error(`${source.id}: bookBundle.directory は "${expectedPrefix}{短い書名}" の1セグメントにする`);
  }
  if (source.origin?.kind !== 'drive') throw new Error(`${source.id}: bookBundle は origin.kind=drive が必要`);
  const expectedVault = expectedBookVaultDir(source);
  if (source.origin.vaultDir !== expectedVault) {
    throw new Error(`${source.id}: origin.vaultDir は ${expectedVault} にする`);
  }
  const expectedTranscriptDir = `${REFERENCE_BOOK_REPO_ROOT}/${bundle.directory}/ocr`;
  if (bundle.transcriptDir && bundle.transcriptDir !== expectedTranscriptDir) {
    throw new Error(`${source.id}: bookBundle.transcriptDir は ${expectedTranscriptDir} にする`);
  }

  const profile = bundle.renderProfile || {};
  if (!BOOK_BUNDLE_MODES.includes(profile.mode)) throw new Error(`${source.id}: renderProfile.mode が未知`);
  if (['pdfimages-spread', 'pdfimages-auto-spread'].includes(profile.mode)) {
    if (![90, 270].includes(profile.rotation)) throw new Error(`${source.id}: 見開きは rotation=90|270 が必要`);
    if (JSON.stringify(profile.splitOrder) !== JSON.stringify(['left', 'right'])) {
      throw new Error(`${source.id}: splitOrder は ["left","right"] に固定する`);
    }
    if (!(profile.gutterOverlapPercent >= 0 && profile.gutterOverlapPercent <= 10)) {
      throw new Error(`${source.id}: gutterOverlapPercent は 0..10`);
    }
  }
  if (profile.mode === 'pdfimages-auto-spread'
    && !(profile.singlePageAspectThreshold >= 1 && profile.singlePageAspectThreshold <= 1.5)) {
    throw new Error(`${source.id}: singlePageAspectThreshold は 1..1.5`);
  }
  if (['pymupdf-single', 'born-digital'].includes(profile.mode)
    && ![0, 90, 180, 270].includes(profile.rotation || 0)) {
    throw new Error(`${source.id}: rotation は 0|90|180|270`);
  }
  if (!(profile.jpegQuality >= 60 && profile.jpegQuality <= 100)) throw new Error(`${source.id}: jpegQuality は 60..100`);
  if (!toPosInt(profile.ocrWidth) || !toPosInt(profile.cropWidth)) throw new Error(`${source.id}: ocrWidth/cropWidth は正の整数`);
  validateContentCrop(source.id, 'renderProfile.contentCrop', profile.contentCrop);

  const files = bundle.sourceFiles;
  if (!Array.isArray(files) || files.length === 0) throw new Error(`${source.id}: sourceFiles が空`);
  const seenLegacy = new Set();
  const seenVault = new Set();
  const seenMyDrive = new Set();
  let previousPrintedEnd = null;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const order = i + 1;
    if (file.order !== order) throw new Error(`${source.id}: sourceFiles の order は 1..N 連番（${file.order}）`);
    const hasRepoPath = typeof file.legacyRepoPath === 'string';
    const hasVaultPath = typeof file.legacyVaultPath === 'string';
    const hasMyDrivePath = typeof file.legacyMyDrivePath === 'string';
    if ([hasRepoPath, hasVaultPath, hasMyDrivePath].filter(Boolean).length !== 1) {
      throw new Error(`${source.id}: sourceFiles[${i}] は legacyRepoPath / legacyVaultPath / legacyMyDrivePath のどれか1つが必要`);
    }
    if (hasRepoPath) {
      if (!file.legacyRepoPath.startsWith('content/sources/textbook/') || !/\.pdf$/i.test(file.legacyRepoPath)) {
        throw new Error(`${source.id}: sourceFiles[${i}].legacyRepoPath は旧 textbook PDF の repo 相対キーにする`);
      }
      if (seenLegacy.has(file.legacyRepoPath)) throw new Error(`${source.id}: legacyRepoPath が重複: ${file.legacyRepoPath}`);
      seenLegacy.add(file.legacyRepoPath);
    }
    if (hasVaultPath) {
      if (!file.legacyVaultPath.startsWith('原資料PDF/') || !/\.pdf$/i.test(file.legacyVaultPath)) {
        throw new Error(`${source.id}: sourceFiles[${i}].legacyVaultPath は原資料PDF/ 配下の PDF にする`);
      }
      if (seenVault.has(file.legacyVaultPath)) throw new Error(`${source.id}: legacyVaultPath が重複: ${file.legacyVaultPath}`);
      seenVault.add(file.legacyVaultPath);
    }
    if (hasMyDrivePath) {
      const normalized = file.legacyMyDrivePath.normalize('NFC');
      const segments = normalized.split('/');
      if (normalized !== file.legacyMyDrivePath || normalized.startsWith('/') || !/\.pdf$/i.test(normalized)
        || segments.some((segment) => !segment || segment === '.' || segment === '..')) {
        throw new Error(`${source.id}: sourceFiles[${i}].legacyMyDrivePath はマイドライブ相対の安全な PDF パスにする`);
      }
      if (seenMyDrive.has(normalized)) throw new Error(`${source.id}: legacyMyDrivePath が重複: ${normalized}`);
      seenMyDrive.add(normalized);
    }
    if (!file.originalName || file.originalName.includes('/')) throw new Error(`${source.id}: sourceFiles[${i}].originalName が不正`);
    if (!toPosInt(file.expectedPdfPages)) throw new Error(`${source.id}: sourceFiles[${i}].expectedPdfPages が不正`);
    const excludedRanges = file.excludedPdfPageRanges || [];
    if (!Array.isArray(excludedRanges)) throw new Error(`${source.id}: sourceFiles[${i}].excludedPdfPageRanges は配列`);
    let previousRangeEnd = 0;
    for (const [rangeIndex, range] of excludedRanges.entries()) {
      if (!toPosInt(range?.start) || !toPosInt(range?.end) || range.end < range.start || range.end > file.expectedPdfPages) {
        throw new Error(`${source.id}: sourceFiles[${i}].excludedPdfPageRanges[${rangeIndex}] が不正`);
      }
      if (range.start <= previousRangeEnd) throw new Error(`${source.id}: sourceFiles[${i}] の除外範囲が重複または未整列`);
      if (!range.reason) throw new Error(`${source.id}: sourceFiles[${i}] の除外範囲に reason が必要`);
      previousRangeEnd = range.end;
    }
    const pageTransforms = file.pageTransforms || [];
    if (!Array.isArray(pageTransforms)) throw new Error(`${source.id}: sourceFiles[${i}].pageTransforms は配列`);
    previousRangeEnd = 0;
    for (const [rangeIndex, range] of pageTransforms.entries()) {
      if (!toPosInt(range?.start) || !toPosInt(range?.end) || range.end < range.start || range.end > file.expectedPdfPages) {
        throw new Error(`${source.id}: sourceFiles[${i}].pageTransforms[${rangeIndex}] が不正`);
      }
      if (range.start <= previousRangeEnd) throw new Error(`${source.id}: sourceFiles[${i}] の pageTransforms が重複または未整列`);
      if (range.rotation != null && ![0, 90, 180, 270].includes(range.rotation)) {
        throw new Error(`${source.id}: sourceFiles[${i}] の pageTransforms.rotation が不正`);
      }
      if (range.layout != null && !PAGE_LAYOUTS.includes(range.layout)) {
        throw new Error(`${source.id}: sourceFiles[${i}] の pageTransforms.layout が不正`);
      }
      validateContentCrop(source.id, `sourceFiles[${i}].pageTransforms[${rangeIndex}].contentCrop`, range.contentCrop);
      previousRangeEnd = range.end;
    }
    let singlePdfPages = [];
    if (profile.mode === 'pdfimages-auto-spread') {
      if (!Array.isArray(file.singlePdfPages)) throw new Error(`${source.id}: sourceFiles[${i}].singlePdfPages が必要`);
      singlePdfPages = file.singlePdfPages;
      const unique = new Set(singlePdfPages);
      if (unique.size !== singlePdfPages.length
        || singlePdfPages.some((page) => !toPosInt(page) || page > file.expectedPdfPages)) {
        throw new Error(`${source.id}: sourceFiles[${i}].singlePdfPages が不正`);
      }
    }
    let expectedOutput = 0;
    for (let page = 1; page <= file.expectedPdfPages; page++) {
      const transform = resolvedPdfPageTransform(source, file, page);
      if (!transform.excluded) expectedOutput += transform.layout === 'spread' ? 2 : 1;
    }
    if (file.printedPages != null) {
      const start = file.printedPages?.start;
      const end = file.printedPages?.end;
      if (!toPosInt(start) || !toPosInt(end) || end < start) throw new Error(`${source.id}: sourceFiles[${i}].printedPages が不正`);
      const printedCount = end - start + 1;
      if (printedCount !== expectedOutput) {
        throw new Error(`${source.id}: sourceFiles[${i}] の版面 ${start}-${end} は ${printedCount}p、生成予定は ${expectedOutput}p`);
      }
      if (previousPrintedEnd !== null && start !== previousPrintedEnd + 1) {
        throw new Error(`${source.id}: 版面ページが連続しない（${previousPrintedEnd} → ${start}）`);
      }
      previousPrintedEnd = end;
    } else {
      previousPrintedEnd = null;
    }
    if (!file.section) throw new Error(`${source.id}: sourceFiles[${i}].section が無い`);
  }
  return source;
}

/**
 * 分冊 PDF の各 PDF ページを、書籍全体の通しページへ展開する。
 * pdfimages-spread は 1 PDF page → left/right の2ページ。
 */
export function buildBookPagePlan(source) {
  validateBookBundleSource(source);
  const pages = [];
  for (const file of source.bookBundle.sourceFiles) {
    let printedPage = file.printedPages?.start ?? null;
    for (let sourcePdfPage = 1; sourcePdfPage <= file.expectedPdfPages; sourcePdfPage++) {
      const transform = resolvedPdfPageTransform(source, file, sourcePdfPage);
      if (transform.excluded) continue;
      const sides = transform.layout === 'spread' ? ['left', 'right'] : [null];
      for (const side of sides) {
        const page = pages.length + 1;
        pages.push({
          id: `p${String(page).padStart(4, '0')}`,
          page,
          sourceFile: `s${String(file.order).padStart(3, '0')}`,
          sourcePdfPage,
          side,
          rotation: transform.rotation,
          contentCrop: transform.contentCrop,
          printedPage,
          section: file.section,
          image: `pages/p${String(page).padStart(4, '0')}.jpg`,
          repoPath: pageRepoPath(source, page),
          ocrStatus: 'pending',
          cropStatus: 'pending',
        });
        if (printedPage !== null) printedPage += 1;
      }
    }
    if (printedPage !== null && printedPage - 1 !== file.printedPages.end) {
      throw new Error(`${source.id}: source ${file.order} の版面ページ終端が一致しない`);
    }
  }
  return pages;
}

export function validateBookManifestShape(source, manifest) {
  const errors = [];
  const expectedPages = buildBookPagePlan(source);
  if (manifest?.schemaVersion !== 1) errors.push('schemaVersion は 1');
  if (manifest?.sourceId !== source.id) errors.push(`sourceId は ${source.id}`);
  if (manifest?.class !== source.class) errors.push(`class は ${source.class}`);
  if (manifest?.title !== source.title) errors.push('title が参考文献台帳と不一致');
  if (manifest?.directory !== source.bookBundle.directory) errors.push('directory が参考文献台帳と不一致');
  if (JSON.stringify(manifest?.renderProfile) !== JSON.stringify(source.bookBundle.renderProfile)) errors.push('renderProfile が参考文献台帳と不一致');

  if (!Array.isArray(manifest?.sourceFiles) || manifest.sourceFiles.length !== source.bookBundle.sourceFiles.length) {
    errors.push(`sourceFiles は ${source.bookBundle.sourceFiles.length} 件`);
  } else {
    manifest.sourceFiles.forEach((file, i) => {
      const order = i + 1;
      if (file.id !== `s${String(order).padStart(3, '0')}`) errors.push(`sourceFiles[${i}].id が不正`);
      if (file.order !== order) errors.push(`sourceFiles[${i}].order が不正`);
      if (file.path !== `source/${String(order).padStart(3, '0')}.pdf`) errors.push(`sourceFiles[${i}].path が不正`);
      if (file.repoPath !== sourceRepoPath(source, order)) errors.push(`sourceFiles[${i}].repoPath が不正`);
      if (!/^[a-f0-9]{64}$/.test(file.sha256 || '')) errors.push(`sourceFiles[${i}].sha256 が不正`);
      if (!/^[a-f0-9]{32}$/.test(file.md5 || '')) errors.push(`sourceFiles[${i}].md5 が不正`);
      if (!toPosInt(file.bytes) || file.pdfPages !== source.bookBundle.sourceFiles[i].expectedPdfPages) errors.push(`sourceFiles[${i}] の bytes/pdfPages が不正`);
      for (const key of ['singlePdfPages', 'excludedPdfPageRanges', 'pageTransforms']) {
        const expected = source.bookBundle.sourceFiles[i][key] || [];
        const actual = file[key] || [];
        if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(`sourceFiles[${i}].${key} が参考文献台帳と不一致`);
      }
    });
  }

  if (!Array.isArray(manifest?.pages) || manifest.pages.length !== expectedPages.length) {
    errors.push(`pages は ${expectedPages.length} 件`);
  } else {
    manifest.pages.forEach((page, i) => {
      const expected = expectedPages[i];
      for (const key of ['id', 'page', 'sourceFile', 'sourcePdfPage', 'side', 'rotation', 'printedPage', 'section', 'image', 'repoPath']) {
        if (page[key] !== expected[key]) errors.push(`pages[${i}].${key} が不正`);
      }
      if (JSON.stringify(page.contentCrop ?? null) !== JSON.stringify(expected.contentCrop)) errors.push(`pages[${i}].contentCrop が不正`);
      if (!/^[a-f0-9]{64}$/.test(page.sha256 || '')) errors.push(`pages[${i}].sha256 が不正`);
      if (!/^[a-f0-9]{32}$/.test(page.md5 || '')) errors.push(`pages[${i}].md5 が不正`);
      if (!toPosInt(page.bytes) || !toPosInt(page.width) || !toPosInt(page.height)) errors.push(`pages[${i}] の bytes/width/height が不正`);
      const statuses = ['pending', 'partial', 'complete', 'not-needed', 'failed'];
      if (!statuses.includes(page.ocrStatus) || !statuses.includes(page.cropStatus)) errors.push(`pages[${i}] の status が不正`);
    });
  }

  const pageIds = new Set(expectedPages.map((page) => page.id));
  const ocrCovered = new Set();
  const ocrIds = new Set();
  for (const [i, artifact] of (manifest?.ocrArtifacts || []).entries()) {
    if (!artifact?.id || ocrIds.has(artifact.id)) errors.push(`ocrArtifacts[${i}].id が無いか重複`);
    ocrIds.add(artifact?.id);
    if (!source.bookBundle.transcriptDir || !artifact?.repoPath?.startsWith(source.bookBundle.transcriptDir + '/')) {
      errors.push(`ocrArtifacts[${i}].repoPath が bookBundle.transcriptDir 配下でない`);
    }
    if (!Array.isArray(artifact?.pageIds) || artifact.pageIds.length === 0) errors.push(`ocrArtifacts[${i}].pageIds が空`);
    for (const pageId of artifact?.pageIds || []) {
      if (!pageIds.has(pageId)) errors.push(`ocrArtifacts[${i}] の pageId=${pageId} が不正`);
      ocrCovered.add(pageId);
    }
    if (!/^[a-f0-9]{64}$/.test(artifact?.sha256 || '') || !/^[a-f0-9]{32}$/.test(artifact?.md5 || '') || !toPosInt(artifact?.bytes)) {
      errors.push(`ocrArtifacts[${i}] の bytes/hash が不正`);
    }
  }

  const cropCovered = new Set();
  const cropIds = new Set();
  for (const [i, crop] of (manifest?.crops || []).entries()) {
    if (!crop?.id || cropIds.has(crop.id)) errors.push(`crops[${i}].id が無いか重複`);
    cropIds.add(crop?.id);
    if (!pageIds.has(crop?.pageId)) errors.push(`crops[${i}].pageId が不正`);
    cropCovered.add(crop?.pageId);
    if (!crop?.repoPath?.startsWith(`${bookRepoRoot(source)}/crops/`)) errors.push(`crops[${i}].repoPath が crops/ 配下でない`);
    if (!/^[a-f0-9]{64}$/.test(crop?.sha256 || '') || !/^[a-f0-9]{32}$/.test(crop?.md5 || '')
      || !toPosInt(crop?.bytes) || !toPosInt(crop?.width) || !toPosInt(crop?.height)) {
      errors.push(`crops[${i}] の bytes/hash/dimensions が不正`);
    }
    const box = crop?.bbox || {};
    if (![box.x, box.y, box.w, box.h].every((value) => Number.isInteger(value) && value >= 0) || box.w === 0 || box.h === 0) {
      errors.push(`crops[${i}].bbox が不正`);
    }
    if (crop?.audit?.status !== 'pass') errors.push(`crops[${i}] の audit.status は pass が必要`);
  }

  for (const page of manifest?.pages || []) {
    if (page.ocrStatus === 'complete' && !ocrCovered.has(page.id)) errors.push(`${page.id}: ocrStatus=complete だが ocrArtifacts に無い`);
    if (['partial', 'complete'].includes(page.cropStatus) && !cropCovered.has(page.id)) {
      errors.push(`${page.id}: cropStatus=${page.cropStatus} だが crops に無い`);
    }
  }
  return errors;
}
