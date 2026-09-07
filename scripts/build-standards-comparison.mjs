#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const ARTICLES_ROOT = join(ROOT, 'content', 'site', 'standards-articles');
const CATALOG_PATH = join(ROOT, 'content', 'site', 'standards-library', 'catalog.json');
const CONFIG_PATH = join(ROOT, '.claude', 'config', 'standards-structure.json');
const OUTPUT_PATH = join(ARTICLES_ROOT, 'comparison.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readManifest(agencyId, documentId) {
  const path = join(ARTICLES_ROOT, agencyId, documentId, 'manifest.json');
  return existsSync(path) ? readJson(path) : null;
}

function normalizeMarkdownLines(source) {
  return source
    .replace(/^\{\/\*[\s\S]*?\*\/\}\s*/u, '')
    .split(/\r?\n/u)
    .map((line) => line.trim().replace(/[\t\u3000 ]+/gu, ' '))
    .filter((line) => line && !line.startsWith('<SourceRef '));
}

// Myers diff。共通仕様書はほぼ同一で差分 D が小さいため、長い章でも O((N+M)D) で比較できる。
function diffLines(before, after) {
  const max = before.length + after.length;
  const frontier = new Map([[1, 0]]);
  const trace = [];

  for (let distance = 0; distance <= max; distance += 1) {
    trace.push(new Map(frontier));
    for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
      const previous = frontier.get(diagonal - 1) ?? Number.NEGATIVE_INFINITY;
      const next = frontier.get(diagonal + 1) ?? Number.NEGATIVE_INFINITY;
      let x;
      if (diagonal === -distance || (diagonal !== distance && previous < next)) {
        x = next;
      } else {
        x = previous + 1;
      }
      if (!Number.isFinite(x)) x = 0;
      let y = x - diagonal;
      while (x < before.length && y < after.length && before[x] === after[y]) {
        x += 1;
        y += 1;
      }
      frontier.set(diagonal, x);
      if (x >= before.length && y >= after.length) {
        return backtrack(trace, before, after);
      }
    }
  }
  return [];
}

function backtrack(trace, before, after) {
  let x = before.length;
  let y = after.length;
  const result = [];

  for (let distance = trace.length - 1; distance >= 0; distance -= 1) {
    const frontier = trace[distance];
    const diagonal = x - y;
    const previous = frontier.get(diagonal - 1) ?? Number.NEGATIVE_INFINITY;
    const next = frontier.get(diagonal + 1) ?? Number.NEGATIVE_INFINITY;
    const previousDiagonal =
      diagonal === -distance || (diagonal !== distance && previous < next)
        ? diagonal + 1
        : diagonal - 1;
    const previousX = frontier.get(previousDiagonal) ?? 0;
    const previousY = previousX - previousDiagonal;

    while (x > previousX && y > previousY) {
      result.push({ type: 'equal', line: before[x - 1] });
      x -= 1;
      y -= 1;
    }
    if (distance === 0) break;
    if (x === previousX) {
      result.push({ type: 'add', line: after[y - 1] });
      y -= 1;
    } else {
      result.push({ type: 'remove', line: before[x - 1] });
      x -= 1;
    }
  }
  return result.reverse();
}

function toHunks(operations) {
  const hunks = [];
  let current = null;
  let heading = null;
  let beforeLine = 0;
  let afterLine = 0;

  const finish = () => {
    if (!current) return;
    current.removedCount = current.before.length;
    current.addedCount = current.after.length;
    hunks.push(current);
    current = null;
  };

  for (const operation of operations) {
    if (operation.type === 'equal') {
      finish();
      beforeLine += 1;
      afterLine += 1;
      if (/^#{2,4}\s+/u.test(operation.line)) heading = operation.line.replace(/^#+\s+/u, '');
      continue;
    }
    if (!current) {
      current = {
        context: heading,
        beforeLine: beforeLine + 1,
        afterLine: afterLine + 1,
        before: [],
        after: [],
        removedCount: 0,
        addedCount: 0,
      };
    }
    if (operation.type === 'remove') {
      current.before.push(operation.line);
      beforeLine += 1;
    } else {
      current.after.push(operation.line);
      afterLine += 1;
    }
  }
  finish();
  return hunks;
}

function compareChapter(baselinePath, targetPath) {
  const before = normalizeMarkdownLines(readFileSync(baselinePath, 'utf8'));
  const after = normalizeMarkdownLines(readFileSync(targetPath, 'utf8'));
  const hunks = toHunks(diffLines(before, after));
  return {
    removedLines: hunks.reduce((sum, hunk) => sum + hunk.removedCount, 0),
    addedLines: hunks.reduce((sum, hunk) => sum + hunk.addedCount, 0),
    hunks,
  };
}

function main() {
  const catalog = readJson(CATALOG_PATH);
  const config = readJson(CONFIG_PATH);
  const baselineAgencyId = config.canonical.commonAgencyId;
  const baselineDocumentId = 'common';
  const baselineManifest = readManifest(baselineAgencyId, baselineDocumentId);
  if (!baselineManifest) throw new Error(`比較基準 manifest がありません: ${baselineAgencyId}/${baselineDocumentId}`);

  const baselineByChapter = new Map(
    baselineManifest.chapters.map((chapter) => [chapter.chapterId, chapter]),
  );
  const rows = [];
  const changes = [];

  for (const document of catalog.documents.filter((entry) => entry.role === 'common')) {
    const manifest = readManifest(document.agencyId, document.documentId);
    if (!manifest) {
      rows.push({
        agencyId: document.agencyId,
        agencyName: document.agencyName,
        documentId: document.documentId,
        title: document.title,
        pages: document.pages,
        sourceSha256: document.sourceSha256,
        structured: false,
        indexable: false,
        status: document.duplicateOf ? 'source-duplicate' : 'different-document-structure',
        duplicateOf: document.duplicateOf ?? null,
        sameChapters: 0,
        changedChapters: 0,
        changedChapterIds: [],
        removedLines: 0,
        addedLines: 0,
      });
      continue;
    }

    let sameChapters = 0;
    let removedLines = 0;
    let addedLines = 0;
    const changedChapterIds = [];
    for (const chapter of manifest.chapters) {
      const baselineChapter = baselineByChapter.get(chapter.chapterId);
      if (baselineChapter?.outputSha256 === chapter.outputSha256) {
        sameChapters += 1;
        continue;
      }
      if (!baselineChapter) {
        changedChapterIds.push(chapter.chapterId);
        continue;
      }
      const baselinePath = join(ARTICLES_ROOT, baselineAgencyId, baselineDocumentId, baselineChapter.file);
      const targetPath = join(ARTICLES_ROOT, document.agencyId, document.documentId, chapter.file);
      const comparison = compareChapter(baselinePath, targetPath);
      // 出典ページ番号だけの差は normalizeMarkdownLines で除外済み。実差分が0なら同一扱いに戻す。
      if (comparison.removedLines === 0 && comparison.addedLines === 0) {
        sameChapters += 1;
        continue;
      }
      changedChapterIds.push(chapter.chapterId);
      removedLines += comparison.removedLines;
      addedLines += comparison.addedLines;
      changes.push({
        agencyId: document.agencyId,
        agencyName: document.agencyName,
        chapterId: chapter.chapterId,
        chapterTitle: chapter.title,
        removedLines: comparison.removedLines,
        addedLines: comparison.addedLines,
        hunks: comparison.hunks,
      });
    }

    const isBaseline = document.agencyId === baselineAgencyId;
    rows.push({
      agencyId: document.agencyId,
      agencyName: document.agencyName,
      documentId: document.documentId,
      title: document.title,
      pages: document.pages,
      sourceSha256: document.sourceSha256,
      structured: true,
      indexable: manifest.indexable,
      status: isBaseline ? 'baseline' : changedChapterIds.length > 0 ? 'different' : 'identical',
      duplicateOf: document.duplicateOf ?? null,
      sameChapters,
      changedChapters: changedChapterIds.length,
      changedChapterIds,
      removedLines,
      addedLines,
    });
  }

  const output = {
    schemaVersion: 1,
    asOf: catalog.asOf,
    generatedAt: catalog.generatedAt,
    baseline: `${baselineAgencyId}/${baselineDocumentId}`,
    method: '章Markdownから生成器コメント・SourceRef・空白差を除外し、Myers差分で行単位比較',
    summary: {
      commonDocuments: rows.length,
      structuredDocuments: rows.filter((row) => row.structured).length,
      identicalDocuments: rows.filter((row) => row.status === 'identical').length,
      differentDocuments: rows.filter((row) => row.status === 'different').length,
      changedChapters: changes.length,
      changeHunks: changes.reduce((sum, change) => sum + change.hunks.length, 0),
    },
    rows,
    changes,
  };

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(
    `[standards-comparison] ${rows.length}文書 / 実差分 ${changes.length}章 / ${output.summary.changeHunks}箇所`,
  );
  console.log(`[standards-comparison] output: ${OUTPUT_PATH}`);
}

main();
