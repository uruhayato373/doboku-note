// note-cover-inventory.mjs — note カバー生成の対象一覧（記事＋マガジン）を 1 箇所で作る。
//
// generate-note-covers（記事・CI の note-cover-supply が呼ぶ）/ generate-magazine-covers（マガジン）/
// generate-note-character-covers（独立出力先への一括生成）/ check-note-cover-fit（pre-commit ゲート）が
// 同じ関数で対象と入力を組み立てる。ポーズは全件に割り当ててから絞り込むので、どの入口から
// 1 件だけ再生成しても一括生成と同じポーズになる（note-cover-character-v5.md「ポーズの使い分け」）。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import { resolveCoverExam, assignCoverPoses } from './note-character-cover.mjs';

export const hashBytes = (value) => createHash('sha256').update(value).digest('hex');
export const ARTICLE_FILE_RE = /^article(?:-[^/]+)?\.md$/;
const toPosix = (p) => p.replaceAll('\\', '/');

/** 生成に要る設定を読む。config（補完定義）だけは生成器側の checkout から読めるよう root を分ける。 */
export function loadCoverSources(sourceRoot, configRoot = sourceRoot) {
  const readJson = (root, rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));
  const tokens = readJson(sourceRoot, '.claude/knowledge/design-system/note-cover-tokens.json');
  const poseLabels = Object.fromEntries(readJson(sourceRoot, '.claude/config/character-poses.json')
    .poses.map((pose) => [pose.slug, pose.label]));
  const v4Map = readJson(sourceRoot, '.claude/config/note-cover-magazine-v4.json');
  const config = readJson(configRoot, '.claude/config/note-character-covers.json');
  return { tokens, poseLabels, v4Map, config };
}

/** content/note 配下の article*.md を絶対パスの昇順で返す（img/ とシンボリックリンクは辿らない）。 */
export function collectArticleFiles(sourceRoot) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'img' && !entry.isSymbolicLink()) walk(path);
      else if (entry.isFile() && ARTICLE_FILE_RE.test(entry.name)) files.push(path);
    }
  };
  walk(join(sourceRoot, 'content/note'));
  return files.sort();
}

/** 記事 1 本の生成対象。raw を渡せば再読込しない（staged 検査などで使う）。 */
export function buildArticleTarget(sourceRoot, absPath, { tokens, config }, raw = readFileSync(absPath, 'utf8')) {
  const source = toPosix(relative(sourceRoot, absPath));
  const { data, content } = matter(raw);
  const examKey = resolveCoverExam(source, tokens);
  const exam = tokens.exams[examKey];
  const title = data.title || content.match(/^#\s+(.+)$/m)?.[1];
  const suffix = absPath.match(/[/\\]article(-[^/\\]+)?\.md$/)?.[1] || '';
  const imagePath = toPosix(relative(sourceRoot, join(dirname(absPath), 'img', `cover${suffix}.png`)));
  return {
    key: source, kind: 'article', source, sourceSha256: hashBytes(raw), imagePath,
    previousImageSha256: existsSync(join(sourceRoot, imagePath)) ? hashBytes(readFileSync(join(sourceRoot, imagePath))) : null,
    noteId: data.noteId || data.noteUrl?.match(/\/n\/(n[0-9a-f]+)/)?.[1] || null,
    noteStatus: data.noteStatus || null,
    input: {
      cover: { ...data.cover, ...config.articleOverrides[source] }, coverTitle: data.coverTitle, title, examKey, category: exam.short,
      palette: { band: exam[data.cover?.tone || (data.notePricing === 'paid' ? 'deep' : 'base')] || exam.base },
    },
  };
}

/** マガジン定義（generate-magazine-covers の MAGAZINES ＋ 設定の補完分）を生成対象へ。退役・出力先不明は別枠で返す。 */
export function buildMagazineTargets(sourceRoot, magazines, { tokens, v4Map, config }) {
  const targets = [];
  const retired = [];
  const errors = [];
  const merged = [...magazines, ...config.additionalMagazines.filter((extra) => !magazines.some((mag) => mag.id === extra.id))];
  for (const raw of merged) {
    if (config.retiredMagazineIds[raw.id]) { retired.push({ id: raw.id, reason: config.retiredMagazineIds[raw.id] }); continue; }
    const mag = { ...raw, ...(v4Map[raw.id] || {}) };
    if (!mag.magazineDir) { errors.push({ key: `magazine:${mag.id}`, error: 'magazineDirがありません' }); continue; }
    const examKey = mag.examKey || resolveCoverExam(mag.magazineDir, tokens);
    const imagePath = `${mag.magazineDir}/_cover.png`;
    targets.push({
      key: `magazine:${mag.id}`, kind: 'magazine', source: 'scripts/generate-magazine-covers.mjs',
      sourceSha256: hashBytes(JSON.stringify(mag)), imagePath,
      previousImageSha256: existsSync(join(sourceRoot, imagePath)) ? hashBytes(readFileSync(join(sourceRoot, imagePath))) : null,
      noteKey: mag.noteKey || null,
      input: { ...mag, cover: mag, magazine: true, examKey, palette: { band: mag.fillBg || tokens.exams[examKey].deep, label: mag.category } },
    });
  }
  return { targets, retired, errors };
}

/**
 * 全対象（記事→マガジンの順）にポーズを割り当てて返す。
 * magazines を省くと sourceRoot の generate-magazine-covers.mjs から MAGAZINES を読む。
 */
export async function loadNoteCoverInventory(sourceRoot, { configRoot = sourceRoot, magazines = null } = {}) {
  const sources = loadCoverSources(sourceRoot, configRoot);
  if (!magazines) ({ MAGAZINES: magazines } = await import(pathToFileURL(join(sourceRoot, 'scripts/generate-magazine-covers.mjs')).href));
  const articles = collectArticleFiles(sourceRoot).map((path) => buildArticleTarget(sourceRoot, path, sources));
  const { targets: magazineTargets, retired, errors } = buildMagazineTargets(sourceRoot, magazines, sources);
  const targets = assignCoverPoses([...articles, ...magazineTargets]);
  const seen = new Set();
  for (const target of targets) {
    if (seen.has(target.imagePath)) throw new Error(`出力先が重複しています: ${target.imagePath}`);
    seen.add(target.imagePath);
  }
  return { targets, retired, errors, ...sources };
}
