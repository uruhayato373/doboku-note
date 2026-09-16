#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { resolve, join, dirname, relative } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { renderNoteCharacterCover, resolveCoverExam } from './lib/note-character-cover.mjs';

const ownRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
const sourceRoot = resolve(option('--source-root') || ownRoot);
const outputRoot = resolve(option('--output-root') || join(ownRoot, '.tmp/note-character-covers'));
const filter = option('--filter');
const hash = value => createHash('sha256').update(value).digest('hex');
const sourceContent = join(sourceRoot, 'content');
if (sourceRoot === outputRoot || outputRoot === sourceContent || outputRoot.startsWith(sourceContent + '/')) {
  throw new Error('生成先を原稿ツリーに重ねられません。独立した出力ディレクトリを指定してください');
}
const tokens = JSON.parse(readFileSync(join(sourceRoot, '.claude/knowledge/design-system/note-cover-tokens.json'), 'utf8'));
const v4Map = JSON.parse(readFileSync(join(sourceRoot, '.claude/config/note-cover-magazine-v4.json'), 'utf8'));
const config = JSON.parse(readFileSync(join(ownRoot, '.claude/config/note-character-covers.json'), 'utf8'));
const { MAGAZINES } = await import(pathToFileURL(join(sourceRoot, 'scripts/generate-magazine-covers.mjs')).href);
const targets = [];
const errors = [];
const articleFiles = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'img' && !entry.isSymbolicLink()) walk(path);
    else if (entry.isFile() && /^article(?:-[^/]+)?\.md$/.test(entry.name)) articleFiles.push(path);
  }
}
walk(join(sourceRoot, 'content/note'));
for (const path of articleFiles.sort()) {
  const source = relative(sourceRoot, path).replaceAll('\\', '/');
  const raw = readFileSync(path, 'utf8');
  const { data, content } = matter(raw);
  const examKey = resolveCoverExam(source, tokens);
  const exam = tokens.exams[examKey];
  const title = data.title || content.match(/^#\s+(.+)$/m)?.[1];
  const suffix = path.match(/\/article(-[^/]+)?\.md$/)?.[1] || '';
  const imagePath = relative(sourceRoot, join(dirname(path), 'img', `cover${suffix}.png`)).replaceAll('\\', '/');
  targets.push({ key: source, kind: 'article', source, sourceSha256: hash(raw), imagePath,
    previousImageSha256: existsSync(join(sourceRoot, imagePath)) ? hash(readFileSync(join(sourceRoot, imagePath))) : null,
    noteId: data.noteId || data.noteUrl?.match(/\/n\/(n[0-9a-f]+)/)?.[1] || null,
    noteStatus: data.noteStatus || null,
    input: { cover: { ...data.cover, ...config.articleOverrides[source] }, coverTitle: data.coverTitle, title, examKey, category: exam.short,
      palette: { band: exam[data.cover?.tone || (data.notePricing === 'paid' ? 'deep' : 'base')] || exam.base } },
  });
}
const retired = [];
const magazines = [...MAGAZINES, ...config.additionalMagazines.filter(extra => !MAGAZINES.some(mag => mag.id === extra.id))];
for (const raw of magazines) {
  if (config.retiredMagazineIds[raw.id]) { retired.push({ id: raw.id, reason: config.retiredMagazineIds[raw.id] }); continue; }
  const mag = { ...raw, ...(v4Map[raw.id] || {}) };
  if (!mag.magazineDir) { errors.push({ key: `magazine:${mag.id}`, error: 'magazineDirがありません' }); continue; }
  const examKey = mag.examKey || resolveCoverExam(mag.magazineDir, tokens);
  const imagePath = `${mag.magazineDir}/_cover.png`;
  targets.push({ key: `magazine:${mag.id}`, kind: 'magazine', source: 'scripts/generate-magazine-covers.mjs',
    sourceSha256: hash(JSON.stringify(mag)), imagePath,
    previousImageSha256: existsSync(join(sourceRoot, imagePath)) ? hash(readFileSync(join(sourceRoot, imagePath))) : null,
    noteKey: mag.noteKey || null,
    input: { ...mag, cover: mag, magazine: true, examKey,
      palette: { band: mag.fillBg || tokens.exams[examKey].deep, label: mag.category } },
  });
}
const selected = filter ? targets.filter(target => target.key.includes(filter)) : targets;
if (!selected.length) throw new Error('生成対象0件');
const seen = new Set();
for (const target of selected) {
  if (seen.has(target.imagePath)) throw new Error(`出力先が重複しています: ${target.imagePath}`);
  seen.add(target.imagePath);
}
mkdirSync(outputRoot, { recursive: true });
const report = { version: 1, generatedAt: new Date().toISOString(), sourceRoot,
  sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8' }).trim(),
  generatorHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ownRoot, encoding: 'utf8' }).trim(),
  rendererSha256: hash(readFileSync(join(ownRoot, 'scripts/lib/note-character-cover.mjs'))),
  targetCount: selected.length, generatedCount: 0, failedCount: 0, retired, targets: [], errors };
const reportPath = join(outputRoot, 'manifest.json');
const save = () => { writeFileSync(reportPath + '.tmp', JSON.stringify(report, null, 2) + '\n'); renameSync(reportPath + '.tmp', reportPath); };
save();
for (const [index, target] of selected.entries()) {
  try {
    const result = await renderNoteCharacterCover(sourceRoot, target.input);
    const destination = join(outputRoot, target.imagePath);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination + '.tmp', result.buffer); renameSync(destination + '.tmp', destination);
    const { buffer, ...design } = result;
    report.targets.push({ ...target, design, outputSha256: hash(buffer), byteLength: buffer.length });
    report.generatedCount++;
  } catch (error) {
    report.errors.push({ key: target.key, error: error.message }); report.failedCount++;
    console.error(`[失敗] ${target.key}: ${error.message}`);
  }
  if ((index + 1) % 50 === 0) { save(); console.log(`対象${selected.length}件 / 処理${index + 1}件 / 生成${report.generatedCount}件 / 失敗${report.failedCount}件`); }
}
save();
console.log(JSON.stringify({ targetCount: report.targetCount, generatedCount: report.generatedCount, failedCount: report.failedCount,
  inventoryErrors: errors.length - report.failedCount, retired: retired.length, reportPath }));
if (report.failedCount || errors.length || report.generatedCount !== report.targetCount) process.exitCode = 1;
