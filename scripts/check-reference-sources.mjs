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
import { existsSync, readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { loadDriveConfig, loadDriveManifest, resolveVaultRoot, vaultAbsFor } from './lib/drive-vault.mjs';
import {
  buildSourceIndex,
  buildTranscriptIndex,
  checkCitationEvidence,
  classRuleOf,
  evaluateMissingSourcesRatchet,
  excludeOfficialRuns,
  findVerbatimRuns,
  loadReferenceBaseline,
  loadReferenceSources,
  loadStandardsCatalog,
  maskOfficialNames,
  officialNamesOf,
  officialQuestionText,
  parseTranscriptHeader,
  resolveSourceRef,
  sourcesRequiringArticle,
  transcriptDirsForSource,
  VERBATIM_MIN_RUN,
} from './lib/reference-sources.mjs';
import { figureSourceFindings, figuresInExplanation, sourceIdsOf } from './lib/figure-source-wiring.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { listFiles } from './lib/fs-walk.mjs';

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
  const dirs = transcriptDirsForSource(source);
  if (dirs.length === 0) return [];
  return Object.entries(manifest.entries || {})
    .filter(([path, entry]) => entry.group === 'source-transcript'
      && dirs.some((dir) => path === dir || path.startsWith(dir + '/')))
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
    const allowedTranscriptDirs = transcriptDirsForSource(resolved.source);
    if (!allowedTranscriptDirs.some((dir) => relPath === dir || relPath.startsWith(dir + '/'))) {
      fail('transcript-source-path', relPath, `source=${resolved.id} の transcriptDir とパスが一致しない`);
    }
    if (header.sourcePdfs !== undefined && !Array.isArray(header.sourcePdfs)) {
      fail('transcript-pdf', relPath, 'sourcePdfs は配列でなければならない');
    }
    for (const sourcePdf of Array.isArray(header.sourcePdfs) ? header.sourcePdfs : []) {
      const group = manifest.entries?.[sourcePdf]?.group;
      if (!['textbook-source-pdf', 'reference-book-source-pdf'].includes(group)) {
        fail('transcript-pdf', relPath, `sourcePdfs が原本 PDF 台帳に無い: ${sourcePdf}`);
      }
    }
    const entries = bySource.get(resolved.id) || [];
    entries.push({ key: relPath, source: resolved.id, text: stripFrontmatter(raw) });
    bySource.set(resolved.id, entries);
  }

  // 書籍も載せる公式の文章（DN-0617）。過去問ページの設問と、記事が出典に挙げた公的資料の officialTexts を
  // 書籍との一致から差し引き、法令・指針の正式名称と参考資料の題名は比較の前に外す。
  const official = buildOfficialTexts({ cfg, index, articles });
  const officialNames = officialNamesOf(cfg);
  let verbatimPairs = 0;
  let verbatimHits = 0;
  let officialExcluded = 0;
  let namesMasked = 0;
  for (const source of cfg.sources.filter((item) => cfg.classes[item.class]?.verbatim === 'forbidden')) {
    const transcripts = bySource.get(source.id) || [];
    if (transcripts.length === 0) continue;
    const transcriptIndex = buildTranscriptIndex(transcripts);
    const derivedArticles = articles.filter((article) => article.requiredBy.some((item) => item.id === source.id)
      || article.resolvedSources.some((item) => item.id === source.id));
    for (const article of derivedArticles) {
      verbatimPairs += 1;
      const { text, masked } = maskOfficialNames(article.body, officialNames);
      namesMasked += masked;
      let hits = findVerbatimRuns(text, transcriptIndex, { minRun: VERBATIM_MIN_RUN, maxHits: 200 });
      for (const officialIndex of [official.questions, official.citedBy(article)]) {
        const result = excludeOfficialRuns(text, hits, officialIndex, { minRun: VERBATIM_MIN_RUN });
        officialExcluded += result.excluded.length;
        hits = result.kept;
      }
      for (const hit of hits) {
        verbatimHits += 1;
        fail('verbatim', article.relPath, `${source.id} / ${hit.key}: 一致 ${hit.run} 字「${hit.sample}」`);
      }
    }
  }

  console.log(`  deep: 文字起こし対象 ${targets.length} 件 / 実体 ${files.length} 件 / frontmatter 実検査 ${transcriptHeaders} 件 / commercial-book 記事×原本 ${verbatimPairs} 組 / 逐語一致 ${verbatimHits} 件`);
  console.log(`  deep: 公式の文章 過去問ページ ${official.questionPages} 本の設問 ${official.questionChars} 字・公的資料の文 ${official.textCount} 件 / 公式の文章として除いた一致 ${officialExcluded} 件 / 比較から外した名称 ${namesMasked} 件`);
  if (official.questionPages === 0) fail('official-texts', datasetPath('config.reference-sources'), '過去問ページの設問が 0 件で、公式の文章を差し引けない（検査不成立）');
  return { transcriptTargets: targets.length, transcriptFiles: files.length, transcriptHeaders, verbatimPairs, verbatimHits, officialExcluded };
}

/**
 * 公式の文章の索引。過去問ページ（question-only の原本の appliesTo に当たる記事）の設問は全記事に効く。
 * 公的資料の officialTexts は、その資料を sources に挙げた記事にだけ効かせる（出典を書かずに引いた文は除かない）。
 */
function buildOfficialTexts({ cfg, index, articles }) {
  const questionArticles = articles.filter((article) => article.requiredBy
    .some((source) => classRuleOf(source, index)?.verbatim === 'question-only'));
  const entries = questionArticles
    .map((article) => ({ key: article.relPath, source: 'official-question', text: officialQuestionText(article.body) }))
    .filter((entry) => entry.text.trim());
  const textSources = cfg.sources.filter((source) => source.officialTexts?.length);
  const cache = new Map();
  return {
    questions: entries.length ? buildTranscriptIndex(entries) : null,
    questionPages: entries.length,
    questionChars: entries.reduce((sum, entry) => sum + entry.text.length, 0),
    textCount: textSources.reduce((sum, source) => sum + source.officialTexts.length, 0),
    citedBy(article) {
      const cited = textSources.filter((source) => article.resolvedSources.some((item) => item.id === source.id));
      if (cited.length === 0) return null;
      const key = cited.map((source) => source.id).join(',');
      if (!cache.has(key)) {
        cache.set(key, buildTranscriptIndex(cited.flatMap((source) => source.officialTexts
          .map((item, i) => ({ key: `${source.id}#${i + 1}`, source: source.id, text: item.text })))));
      }
      return cache.get(key);
    },
  };
}

/**
 * 図の原典の結線（DN-0563・DN-0564）。
 *   - 白書などの vaultCopies が Drive 台帳に載っているか
 *   - 原典から切り出した図（config/figure-sources.json の provenance）の記事が、その原典を sources に書いているか
 *   - 流用不可（figureReuse: false）の書籍から、試験ページでない記事へ切り出した図（baseline ラチェット）
 */
function checkFigureWiring({ cfg, manifest, inputs, baseline }) {
  const vaultPaths = new Set(Object.values(manifest.entries || {}).map((e) => String(e.vaultPath || '').normalize('NFC')));
  let vaultCopies = 0;
  for (const s of cfg.sources || []) {
    for (const c of s.vaultCopies || []) {
      vaultCopies += 1;
      if (!vaultPaths.has(c.path.normalize('NFC'))) fail('vault-copy-unregistered', s.id, `${c.path} が drive-manifest に無い（drive-vault-sync --group white-paper-source-pdf --from-vault で登録する）`);
    }
  }
  const sourcesRel = datasetPath('config.figure-sources');
  const sourcesAbs = join(REPO_ROOT, sourcesRel);
  if (!existsSync(sourcesAbs)) {
    fail('figure-provenance', sourcesRel, '図の出典の台帳が無く、図の原典の結線を検査できない');
    return { vaultCopies, figureChecks: 0, reuseDebt: 0 };
  }
  const provenance = JSON.parse(readFileSync(sourcesAbs, 'utf8')).provenance || {};
  const articleSources = new Map();
  const explanationFigs = new Set();
  for (const { relPath, raw } of inputs) {
    const m = /^content\/site\/(.+)\/article\.mdx$/.exec(relPath);
    if (!m) continue;
    let data = {};
    try { data = matter(raw).data; } catch { continue; }
    articleSources.set(m[1], sourceIdsOf(data.sources));
    for (const name of figuresInExplanation(raw)) explanationFigs.add(`${m[1]}/img/${name}`);
  }
  const { checked, findings } = figureSourceFindings({ provenance, cfg, articleSources, explanationFigs });
  const debt = [];
  for (const f of findings) {
    if (f.kind === 'figure-reuse-forbidden') { debt.push(f.figKey); continue; }
    fail(f.kind, `content/site/${f.articleDir}/article.mdx`, `${f.figKey}: ${f.detail}`);
  }
  const ratchet = evaluateMissingSourcesRatchet(debt, baseline.figureReuseDebt || []);
  for (const figKey of ratchet.increased) fail('figure-reuse-forbidden', figKey, '流用不可（figureReuse: false）の書籍から、試験ページでない記事か試験ページの解説欄へ図を切り出した。切り出し直さず、自作の図への置き換えか削除にする（baseline にも無い）');
  for (const figKey of ratchet.repaid) warn('figure-reuse-repaid', figKey, '流用不可の書籍の図が出典の台帳から消えた。reference-sources-baseline.json の figureReuseDebt から削る');
  return { vaultCopies, figureChecks: checked, reuseDebt: debt.length };
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
  else paths = listFiles(join(REPO_ROOT, 'content/site'), { ext: '.mdx', allowMissing: true }).map(toRepoRel).sort();

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
  let wiring = null;
  if (!STAGED) {
    const baseline = loadReferenceBaseline();
    wiring = checkFigureWiring({ cfg, manifest, inputs, baseline });
    baselineCount = Array.isArray(baseline.missingSources) ? baseline.missingSources.length : 0;
    const ratchet = evaluateMissingSourcesRatchet(checked.currentMissing, baseline.missingSources || []);
    for (const path of ratchet.increased) fail('baseline-increased', path, 'appliesTo に一致するのに sources が無く、baseline にも無い');
    for (const path of ratchet.repaid) warn('baseline-repaid', path, 'sources 欠落が解消済み。reference-sources-baseline.json から削る');
  }

  let deep = null;
  if (DEEP) deep = checkDeepTranscripts({ cfg, index, manifest, articles: checked.articles });

  console.log(`[${NAME}${STAGED ? ' --staged' : DEEP ? ' --deep' : ''}] 台帳 ${registryEntries} 件 / 記事 ${checked.parsedArticles} 件を実検査 / sources ${checked.sourceRefs} 参照 / citation ${checked.citationChecks} 件 / 漏洩 ${checked.leakChecks} 組 / baseline ${baselineCount} 件`);
  if (wiring) console.log(`  図の原典: 白書などの vault の写し ${wiring.vaultCopies} 件 / 出典のある図×記事 ${wiring.figureChecks} 件を実検査 / 流用不可の書籍の図 ${wiring.reuseDebt} 件（baseline 管理）`);
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
