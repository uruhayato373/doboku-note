#!/usr/bin/env node

/**
 * 参考文献の台帳・記事結線・文字起こし・逐語禁止を検査する。
 *
 *   node scripts/check-reference-sources.mjs
 *   node scripts/check-reference-sources.mjs --staged
 *   node scripts/check-reference-sources.mjs --deep
 *
 * exit 0 = 整合 / exit 1 = 違反 / exit 2 = 検査不成立
 */

import { execFileSync } from 'node:child_process';
import { basename, join, relative } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { loadDriveConfig, loadDriveManifest, resolveVaultRoot, vaultAbsFor } from './lib/drive-vault.mjs';
import {
  buildSourceIndex,
  buildTranscriptIndex,
  checkCitationEvidence,
  classRuleOf,
  evaluateMissingSourcesRatchet,
  findVerbatimRuns,
  loadReferenceBaseline,
  loadReferenceSources,
  loadStandardsCatalog,
  parseTranscriptHeader,
  resolveSourceRef,
  sourcesRequiringArticle,
} from './lib/reference-sources.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const ARGS = process.argv.slice(2);
const STAGED = ARGS.includes('--staged');
const DEEP = ARGS.includes('--deep');
const NAME = 'check-reference-sources';

const failures = [];
const warnings = [];
const fail = (kind, path, detail) => failures.push({ kind, path, detail });
const warn = (kind, path, detail) => warnings.push({ kind, path, detail });

function toRepoRel(path) {
  return relative(REPO_ROOT, path).split('\\').join('/');
}

function walkFiles(dir, extension, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(path, extension, out);
    else if (entry.isFile() && entry.name.endsWith(extension)) out.push(path);
  }
  return out;
}

function stagedMdxFiles() {
  const output = execFileSync('git', [
    '-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', '*.mdx',
  ], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return output.split('\n').filter((path) => path.startsWith('content/site/') && path.endsWith('.mdx')).sort();
}

function readStaged(relPath) {
  return execFileSync('git', ['show', ':' + relPath], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function stripFrontmatter(raw) {
  try { return matter(raw).content; } catch { return raw; }
}

function transcriptNamesForSource(source, manifest) {
  if (!source?.transcriptDir) return [];
  return Object.entries(manifest.entries || {})
    .filter(([path, entry]) => entry.group === 'source-transcript' && path.startsWith(source.transcriptDir + '/'))
    .map(([path]) => basename(path));
}

function checkArticles(articleInputs, { cfg, index, manifest, checkMissing }) {
  let parsedArticles = 0;
  let sourceRefs = 0;
  let citationChecks = 0;
  let leakChecks = 0;
  const currentMissing = [];
  const articles = [];

  for (const input of articleInputs) {
    const { relPath, raw } = input;
    let parsed;
    try { parsed = matter(raw); }
    catch (error) { fail('frontmatter', relPath, 'frontmatter を読めない: ' + error.message); continue; }
    parsedArticles += 1;

    if (parsed.data.sources !== undefined && !Array.isArray(parsed.data.sources)) {
      fail('sources-type', relPath, 'sources は文字列配列でなければならない');
      continue;
    }
    const refs = Array.isArray(parsed.data.sources) ? parsed.data.sources : [];
    if (refs.some((ref) => typeof ref !== 'string')) {
      fail('sources-type', relPath, 'sources の各項目は文字列でなければならない');
      continue;
    }

    const requiredBy = sourcesRequiringArticle(relPath, cfg);
    if (checkMissing && requiredBy.length > 0 && refs.length === 0) currentMissing.push(relPath);

    const resolvedSources = [];
    for (const ref of refs) {
      sourceRefs += 1;
      const resolved = resolveSourceRef(ref, index);
      if (!resolved.ok) {
        fail('source-ref', relPath, resolved.suggest
          ? `旧表記 "${ref}" が残っている。sources は "${resolved.suggest}" へ置換する`
          : `台帳に無い sources 参照: "${ref}"`);
        continue;
      }
      resolvedSources.push(resolved.source);
      const rule = classRuleOf(resolved.source, index);
      const citation = checkCitationEvidence({
        citation: rule?.citation,
        source: resolved.source,
        ref,
        articleText: parsed.content,
      });
      citationChecks += 1;
      if (!citation.ok) fail('citation', relPath, `${ref}: ${citation.reason}`);
    }

    const nonPublic = [...requiredBy, ...resolvedSources]
      .filter((source, i, all) => all.findIndex((candidate) => candidate.id === source.id) === i)
      .filter((source) => classRuleOf(source, index)?.transcriptPublic === false);
    for (const source of nonPublic) {
      leakChecks += 1;
      if (raw.includes('content/sources/textbook/')) {
        fail('transcript-leak', relPath, `${source.id}: 非公開の文字起こしパス content/sources/textbook/ が本文に出ている`);
      }
      const leakedName = transcriptNamesForSource(source, manifest).find((name) => raw.includes(name));
      if (leakedName) fail('transcript-leak', relPath, `${source.id}: 非公開の文字起こしファイル名 "${leakedName}" が本文に出ている`);
    }

    articles.push({ relPath, raw, body: parsed.content, refs, requiredBy, resolvedSources });
  }

  return { articles, parsedArticles, sourceRefs, citationChecks, leakChecks, currentMissing: currentMissing.sort() };
}

function checkDeepTranscripts({ cfg, index, manifest, articles }) {
  const targets = Object.entries(manifest.entries || {})
    .filter(([, entry]) => entry.group === 'source-transcript')
    .sort(([a], [b]) => a.localeCompare(b, 'ja'));
  const mounted = resolveVaultRoot({ cfg: loadDriveConfig() });
  if (!mounted.root) {
    console.log(`  deep: 文字起こし対象 ${targets.length} 件 / 実体検査 0 件（${mounted.reason}）。(a)-(d) だけで判定する。`);
    return { transcriptTargets: targets.length, transcriptFiles: 0, transcriptHeaders: 0, verbatimPairs: 0, verbatimHits: 0 };
  }
  const mapped = targets.map(([relPath, entry]) => ({
    relPath,
    path: entry.vaultPath ? vaultAbsFor(mounted.root, entry.vaultPath) : null,
  }));
  for (const item of mapped) {
    if (!item.path || !existsSync(item.path)) fail('transcript-file', item.relPath, 'Drive vault に文字起こし実体が無い');
  }
  const files = mapped.filter((item) => item.path && existsSync(item.path));
  if (files.length === 0) {
    console.log(`  deep: 文字起こし対象 ${targets.length} 件 / 実体検査 0 件（Drive vault に対象実体が無い）。(a)-(d) だけで判定する。`);
    return { transcriptTargets: targets.length, transcriptFiles: 0, transcriptHeaders: 0, verbatimPairs: 0, verbatimHits: 0 };
  }

  let transcriptHeaders = 0;
  const bySource = new Map();
  for (const file of files) {
    const { relPath, path } = file;
    const raw = readFileSync(path, 'utf8');
    const header = parseTranscriptHeader(raw);
    if (header.kind !== 'frontmatter') {
      fail('transcript-frontmatter', relPath, `文字起こしの frontmatter が無い（${header.kind}）`);
      continue;
    }
    transcriptHeaders += 1;
    const resolved = resolveSourceRef(header.source, index);
    if (!resolved.ok) {
      fail('transcript-source', relPath, resolved.suggest
        ? `source は旧表記。"${resolved.suggest}" を使う`
        : `source が台帳に無い: "${header.source || ''}"`);
      continue;
    }
    if (!resolved.source.transcriptDir || !(relPath === resolved.source.transcriptDir || relPath.startsWith(resolved.source.transcriptDir + '/'))) {
      fail('transcript-source-path', relPath, `source=${resolved.id} の transcriptDir とパスが一致しない`);
    }
    if (header.sourcePdfs !== undefined && !Array.isArray(header.sourcePdfs)) {
      fail('transcript-pdf', relPath, 'sourcePdfs は配列でなければならない');
    }
    for (const sourcePdf of Array.isArray(header.sourcePdfs) ? header.sourcePdfs : []) {
      if (manifest.entries?.[sourcePdf]?.group !== 'textbook-source-pdf') {
        fail('transcript-pdf', relPath, `sourcePdfs が textbook-source-pdf 台帳に無い: ${sourcePdf}`);
      }
    }
    const entries = bySource.get(resolved.id) || [];
    entries.push({ key: relPath, source: resolved.id, text: stripFrontmatter(raw) });
    bySource.set(resolved.id, entries);
  }

  let verbatimPairs = 0;
  let verbatimHits = 0;
  for (const source of cfg.sources.filter((item) => cfg.classes[item.class]?.verbatim === 'forbidden')) {
    const transcripts = bySource.get(source.id) || [];
    if (transcripts.length === 0) continue;
    const transcriptIndex = buildTranscriptIndex(transcripts);
    const derivedArticles = articles.filter((article) => article.requiredBy.some((item) => item.id === source.id)
      || article.resolvedSources.some((item) => item.id === source.id));
    for (const article of derivedArticles) {
      verbatimPairs += 1;
      const hits = findVerbatimRuns(article.body, transcriptIndex, { minRun: 40 });
      for (const hit of hits) {
        verbatimHits += 1;
        fail('verbatim', article.relPath, `${source.id} / ${hit.key}: 一致 ${hit.run} 字「${hit.sample}」`);
      }
    }
  }

  console.log(`  deep: 文字起こし対象 ${targets.length} 件 / 実体 ${files.length} 件 / frontmatter 実検査 ${transcriptHeaders} 件 / commercial-book 記事×原本 ${verbatimPairs} 組 / 逐語一致 ${verbatimHits} 件`);
  return { transcriptTargets: targets.length, transcriptFiles: files.length, transcriptHeaders, verbatimPairs, verbatimHits };
}

function printProblems() {
  for (const problem of [...failures, ...warnings].slice(0, 80)) {
    const label = failures.includes(problem) ? 'FAIL' : 'WARN';
    console[label === 'FAIL' ? 'error' : 'warn'](`  [${label}] ${problem.kind} ${problem.path ? problem.path + ' — ' : ''}${problem.detail}`);
  }
  if (failures.length + warnings.length > 80) console.log(`  ... ほか ${failures.length + warnings.length - 80} 件`);
}

function main() {
  if (STAGED && DEEP) {
    console.error(`[${NAME}] 検査不成立: --staged と --deep は同時に指定できない`);
    process.exit(2);
  }

  let cfg, index, manifest;
  try {
    cfg = loadReferenceSources();
    index = buildSourceIndex(cfg, { catalog: loadStandardsCatalog() });
    manifest = loadDriveManifest();
  } catch (error) {
    console.error(`[${NAME}] 検査不成立: ${error.message}`);
    process.exit(2);
  }
  const registryEntries = index.byId.size;
  if (registryEntries === 0) {
    console.error(`[${NAME}] 検査不成立: 台帳 0 件`);
    process.exit(2);
  }

  let paths;
  if (STAGED) paths = stagedMdxFiles();
  else paths = walkFiles(join(REPO_ROOT, 'content/site'), '.mdx').map(toRepoRel).sort();

  if (STAGED && paths.length === 0) {
    console.log(`[${NAME} --staged] 対象 MDX 0 件。staged に content/site/**/*.mdx が無いため (b)(d) は skip。`);
    return;
  }
  if (!STAGED && paths.length === 0) {
    console.error(`[${NAME}] 検査不成立: 対象記事 0 件`);
    process.exit(2);
  }

  const inputs = paths.map((relPath) => ({
    relPath,
    raw: STAGED ? readStaged(relPath) : readFileSync(join(REPO_ROOT, relPath), 'utf8'),
  }));
  const checked = checkArticles(inputs, { cfg, index, manifest, checkMissing: !STAGED });

  let baselineCount = 0;
  if (!STAGED) {
    const baseline = loadReferenceBaseline();
    baselineCount = Array.isArray(baseline.missingSources) ? baseline.missingSources.length : 0;
    const ratchet = evaluateMissingSourcesRatchet(checked.currentMissing, baseline.missingSources || []);
    for (const path of ratchet.increased) fail('baseline-increased', path, 'appliesTo に一致するのに sources が無く、baseline にも無い');
    for (const path of ratchet.repaid) warn('baseline-repaid', path, 'sources 欠落が解消済み。reference-sources-baseline.json から削る');
  }

  let deep = null;
  if (DEEP) deep = checkDeepTranscripts({ cfg, index, manifest, articles: checked.articles });

  console.log(`[${NAME}${STAGED ? ' --staged' : DEEP ? ' --deep' : ''}] 台帳 ${registryEntries} 件 / 記事 ${checked.parsedArticles} 件を実検査 / sources ${checked.sourceRefs} 参照 / citation ${checked.citationChecks} 件 / 漏洩 ${checked.leakChecks} 組 / baseline ${baselineCount} 件`);
  if (DEEP && deep?.transcriptFiles === 0) console.log('  deep 実体検査 0 件（CI/別端末許容）');
  printProblems();
  if (failures.length > 0) {
    console.error(`[${NAME}] FAIL ${failures.length} 件（WARN ${warnings.length} 件）`);
    process.exit(1);
  }
  console.log(`[${NAME}] ✓ 参考文献の台帳・記事結線・出典粒度は整合${warnings.length ? `（WARN ${warnings.length} 件）` : ''}`);
}

try { main(); }
catch (error) {
  console.error(`[${NAME}] 検査不成立: ${error.message}`);
  process.exit(2);
}
