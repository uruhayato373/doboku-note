#!/usr/bin/env node

/**
 * 参考文献の既存データを共通 SSOT へ移行する。
 *
 * 既定は dry-run。書き込みは --commit を明示したときだけ行う。
 *
 *   node scripts/backfill-reference-sources.mjs --transcripts
 *   node scripts/backfill-reference-sources.mjs --transcripts --commit
 *
 * --transcripts は文字起こし本文を変更せず、legacy / frontmatter 無しのファイル先頭へ
 * 来歴 frontmatter を追加する。旧 `> 出典:` 行は人向け注記として残す。
 */

import { basename, dirname, join, relative } from 'node:path';
import { readdirSync } from 'node:fs';
import { readMdxFile, writeMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';
import { loadDriveManifest } from './lib/drive-vault.mjs';
import {
  loadReferenceSources,
  parseTranscriptHeader,
} from './lib/reference-sources.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const ARGS = new Set(process.argv.slice(2));
const COMMIT = ARGS.has('--commit');
const TRANSCRIPTS = ARGS.has('--transcripts');

function usage(message = null) {
  if (message) console.error(message);
  console.error('使い方: node scripts/backfill-reference-sources.mjs --transcripts [--commit]');
  process.exitCode = 2;
}

function toRepoRel(path) {
  return relative(REPO_ROOT, path).split('\\').join('/');
}

function walkMarkdown(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdown(path, out);
    else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') out.push(path);
  }
  return out;
}

function sourceForTranscript(relPath, cfg) {
  const matches = cfg.sources.filter((source) => source.transcriptDir
    && (relPath === source.transcriptDir || relPath.startsWith(source.transcriptDir + '/')));
  return matches.length === 1 ? { source: matches[0], matches } : { source: null, matches };
}

function sourcePdfForLegacy(relPath, source, pdfFile, pdfEntries) {
  if (!pdfFile) return { key: null, matches: [] };

  const direct = dirname(relPath).split('\\').join('/') + '/' + pdfFile;
  const matches = pdfEntries.filter((key) => key === direct
    || (key.startsWith(source.transcriptDir + '/') && basename(key) === pdfFile));
  const unique = [...new Set(matches)];
  return unique.length === 1 ? { key: unique[0], matches: unique } : { key: null, matches: unique };
}

function yamlScalar(value) {
  return JSON.stringify(String(value));
}

function transcriptFrontmatter({ sourceId, sourcePdf, pdfPages, printedPages, method }) {
  const lines = ['---', `source: ${yamlScalar(sourceId)}`];
  if (sourcePdf) lines.push('sourcePdfs:', `  - ${yamlScalar(sourcePdf)}`);
  if (pdfPages) lines.push(`pdfPages: ${yamlScalar(pdfPages)}`);
  if (printedPages) lines.push(`printedPages: ${yamlScalar(printedPages)}`);
  lines.push(`method: ${yamlScalar(method)}`, '---', '');
  return lines.join('\n');
}

function runTranscripts() {
  const cfg = loadReferenceSources();
  const manifest = loadDriveManifest();
  const pdfEntries = Object.entries(manifest.entries || {})
    .filter(([, entry]) => entry.group === 'textbook-source-pdf')
    .map(([key]) => key);
  const root = join(REPO_ROOT, 'content/sources/textbook');
  const files = walkMarkdown(root).sort((a, b) => toRepoRel(a).localeCompare(toRepoRel(b), 'ja'));

  const stats = { frontmatter: 0, legacy: 0, none: 0, planned: 0, written: 0 };
  const unresolvedSources = [];
  const unresolvedPdfs = [];
  const changes = [];

  for (const path of files) {
    const relPath = toRepoRel(path);
    const { raw, eol } = readMdxFile(path);
    const header = parseTranscriptHeader(raw);
    stats[header.kind] += 1;
    if (header.kind === 'frontmatter') continue;

    const sourceMatch = sourceForTranscript(relPath, cfg);
    if (!sourceMatch.source) {
      unresolvedSources.push({ relPath, matches: sourceMatch.matches.map((source) => source.id) });
      continue;
    }

    const pdfMatch = sourcePdfForLegacy(relPath, sourceMatch.source, header.pdfFile, pdfEntries);
    if (header.pdfFile && !pdfMatch.key) {
      unresolvedPdfs.push({ relPath, pdfFile: header.pdfFile, matches: pdfMatch.matches });
    }

    const method = /tesseract/i.test(relPath) || /tesseract/i.test(raw) ? 'tesseract' : 'visual-ocr';
    const frontmatter = transcriptFrontmatter({
      sourceId: sourceMatch.source.id,
      sourcePdf: pdfMatch.key,
      pdfPages: header.pdfPages,
      printedPages: header.printedPages,
      method,
    });
    changes.push({ path, relPath, raw, eol, frontmatter });
    stats.planned += 1;
  }

  console.log(`=== backfill-reference-sources --transcripts (${COMMIT ? 'COMMIT' : 'dry-run'}) ===`);
  console.log(`対象: ${files.length} 件（frontmatter ${stats.frontmatter} / legacy ${stats.legacy} / none ${stats.none}）`);
  console.log(`追加予定: ${stats.planned} 件`);
  console.log(`未解決 source: ${unresolvedSources.length} 件`);
  for (const item of unresolvedSources) {
    console.error(`  source: ${item.relPath}（候補: ${item.matches.join(', ') || 'なし'}）`);
  }
  console.log(`未解決 sourcePdfs: ${unresolvedPdfs.length} 件`);
  for (const item of unresolvedPdfs) {
    console.warn(`  sourcePdfs: ${item.relPath} — ${item.pdfFile}（候補: ${item.matches.join(', ') || 'なし'}）`);
  }

  // source が決まらないファイルを残したまま一部だけ移行しない。PDF は optional なので、
  // 解決できなければ一覧化したうえで sourcePdfs を付けずに移行できる。
  if (unresolvedSources.length > 0) {
    console.error('FAIL: source を一意に決められない文字起こしがあるため、1 件も書き込みません。');
    process.exitCode = 1;
    return;
  }

  if (COMMIT) {
    for (const change of changes) {
      writeMdxFile(change.path, change.frontmatter + change.raw, change.eol);
      stats.written += 1;
    }
  }

  console.log(`書き込み: ${stats.written} 件`);
  if (!COMMIT && stats.planned > 0) console.log('dry-run: --commit を付けると frontmatter を追加します。');
}

if (!TRANSCRIPTS || ARGS.has('--articles')) usage('モードは --transcripts を 1 つ指定してください。');
else runTranscripts();
