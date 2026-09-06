#!/usr/bin/env node

/**
 * 参考文献の既存データを共通 SSOT へ移行する。
 *
 * 既定は dry-run。書き込みは --commit を明示したときだけ行う。
 *
 *   node scripts/backfill-reference-sources.mjs --transcripts
 *   node scripts/backfill-reference-sources.mjs --transcripts --commit
 *   node scripts/backfill-reference-sources.mjs --articles
 *   node scripts/backfill-reference-sources.mjs --articles --commit
 *
 * --transcripts は文字起こし本文を変更せず、legacy / frontmatter 無しのファイル先頭へ
 * 来歴 frontmatter を追加する。旧 `> 出典:` 行は人向け注記として残す。
 */

import { basename, dirname, join, relative } from 'node:path';
import { readdirSync } from 'node:fs';
import matter from 'gray-matter';
import { readMdxFile, writeMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';
import { loadDriveManifest } from './lib/drive-vault.mjs';
import {
  REFERENCE_BASELINE_PATH,
  buildSourceIndex,
  loadReferenceSources,
  loadStandardsCatalog,
  parseTranscriptHeader,
  resolveSourceRef,
  sourcesRequiringArticle,
} from './lib/reference-sources.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const ARGS = new Set(process.argv.slice(2));
const COMMIT = ARGS.has('--commit');
const TRANSCRIPTS = ARGS.has('--transcripts');
const ARTICLES = ARGS.has('--articles');

function usage(message = null) {
  if (message) console.error(message);
  console.error('使い方: node scripts/backfill-reference-sources.mjs (--transcripts | --articles) [--commit]');
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

function walkMdx(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkMdx(path, out);
    else if (entry.isFile() && entry.name.endsWith('.mdx')) out.push(path);
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

/**
 * `sources:` の block sequence だけを書き換える。gray-matter で得た配列と行数が一致しない
 * frontmatter は黙って再構築せず、呼び出し側で FAIL にする。
 */
function replaceSourcesBlock(raw, sourceRefs, replacements) {
  const firstDelimiterEnd = raw.indexOf('\n');
  const closingDelimiter = raw.indexOf('\n---', firstDelimiterEnd + 1);
  if (!raw.startsWith('---') || closingDelimiter < 0) return null;

  const header = raw.slice(0, closingDelimiter + 1);
  const sourceBlock = /(^sources:[ \t]*(?:\r?\n))((?:[ \t]+-[^\r\n]*(?:\r?\n|$))+)/m.exec(header);
  if (!sourceBlock) return null;

  const lines = sourceBlock[2].match(/[^\r\n]*(?:\r\n|\n|$)/g).filter((line) => line.trim());
  if (lines.length !== sourceRefs.length || replacements.length !== sourceRefs.length) return null;

  const replacedLines = lines.map((line, i) => {
    const match = /^([ \t]+-[ \t]+).*?(\r?\n|$)$/.exec(line);
    if (!match) return null;
    return match[1] + yamlScalar(replacements[i]) + match[2];
  });
  if (replacedLines.some((line) => line === null)) return null;

  const blockStart = sourceBlock.index + sourceBlock[1].length;
  const blockEnd = blockStart + sourceBlock[2].length;
  return raw.slice(0, blockStart) + replacedLines.join('') + raw.slice(blockEnd);
}

function runArticles() {
  const cfg = loadReferenceSources();
  const index = buildSourceIndex(cfg, { catalog: loadStandardsCatalog() });
  const files = walkMdx(join(REPO_ROOT, 'content/site')).sort((a, b) => toRepoRel(a).localeCompare(toRepoRel(b), 'ja'));

  const changes = [];
  const missingSources = [];
  const unresolvedRefs = [];
  const unsupportedFrontmatter = [];
  let withSources = 0;
  let refsChecked = 0;
  let refsReplaced = 0;
  let requiringSources = 0;

  for (const path of files) {
    const relPath = toRepoRel(path);
    const { raw, eol } = readMdxFile(path);
    let data;
    try {
      data = matter(raw).data;
    } catch (error) {
      unsupportedFrontmatter.push({ relPath, reason: `frontmatter parse error: ${error.message}` });
      continue;
    }

    const requiredBy = sourcesRequiringArticle(relPath, cfg);
    if (requiredBy.length > 0) requiringSources += 1;
    const sourceRefs = Array.isArray(data.sources) ? data.sources : [];
    if (sourceRefs.length === 0) {
      if (requiredBy.length > 0) missingSources.push(relPath);
      continue;
    }

    withSources += 1;
    const replacements = [];
    let articleHasError = false;
    for (const ref of sourceRefs) {
      refsChecked += 1;
      const resolved = resolveSourceRef(ref, index);
      if (resolved.ok) replacements.push(resolved.ref);
      else if (resolved.suggest) {
        replacements.push(resolved.suggest);
        refsReplaced += 1;
      } else {
        unresolvedRefs.push({ relPath, ref: String(ref) });
        articleHasError = true;
      }
    }
    if (articleHasError) continue;
    if (replacements.every((ref, i) => ref === String(sourceRefs[i]))) continue;

    const replaced = replaceSourcesBlock(raw, sourceRefs, replacements);
    if (replaced === null) {
      unsupportedFrontmatter.push({ relPath, reason: 'sources は単純な block sequence ではないか、項目数が parse 結果と違う' });
      continue;
    }
    changes.push({ path, relPath, eol, raw: replaced });
  }

  missingSources.sort();
  const baseline = {
    version: 1,
    description: 'reference-sources.json の appliesTo に一致するが、移行時点で sources frontmatter が無かった記事。件数を増やさず、原本を確認できた記事から削るラチェット。',
    missingSources,
  };

  console.log(`=== backfill-reference-sources --articles (${COMMIT ? 'COMMIT' : 'dry-run'}) ===`);
  console.log(`対象記事: ${files.length} 件 / sources あり: ${withSources} 件 / 参照: ${refsChecked} 件`);
  console.log(`旧表記の置換: ${refsReplaced} 件（${changes.length} 記事）`);
  console.log(`appliesTo 対象: ${requiringSources} 件 / baseline: ${missingSources.length} 件`);
  console.log(`未解決参照: ${unresolvedRefs.length} 件`);
  for (const item of unresolvedRefs) console.error(`  ref: ${item.relPath} — ${item.ref}`);
  console.log(`未対応 frontmatter: ${unsupportedFrontmatter.length} 件`);
  for (const item of unsupportedFrontmatter) console.error(`  frontmatter: ${item.relPath} — ${item.reason}`);

  if (unresolvedRefs.length > 0 || unsupportedFrontmatter.length > 0) {
    console.error('FAIL: 解決できない記事があるため、記事と baseline は1件も書き込みません。');
    process.exitCode = 1;
    return;
  }

  if (COMMIT) {
    for (const change of changes) writeMdxFile(change.path, change.raw, change.eol);
    writeMdxFile(REFERENCE_BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
  }

  console.log(`書き込み: ${COMMIT ? changes.length : 0} 記事 / baseline: ${COMMIT ? '1' : '0'} ファイル`);
  if (!COMMIT) console.log('dry-run: --commit を付けると sources を置換し、baseline を書き出します。');
}

if (TRANSCRIPTS === ARTICLES) usage('モードは --transcripts / --articles のどちらか 1 つを指定してください。');
else if (TRANSCRIPTS) runTranscripts();
else runArticles();
