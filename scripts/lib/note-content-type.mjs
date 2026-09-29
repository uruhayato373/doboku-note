import { readdirSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

export const NOTE_CONTENT_TYPES = Object.freeze([
  'product',
  'index',
  'learning',
  'career',
  'editorial',
]);

const CAREER_RE = /(転職|キャリア|年収|職務経歴|内定|退職|辞め|仕事選び|市場価値|発注者支援|公務員土木|公務員技術職の試験|公務員技術者の定年後|独立した技術者の収入実態|資格地図|建設コンサルタント転職|ゼネコン転職)/;
const EDITORIAL_RE = /(雑談|運営記録|制作記録|失敗談と教訓|自己紹介)/;

export function normalizeRepoPath(path) {
  return path.split(sep).join('/');
}

export function isNoteArticleFile(path) {
  return /^article(?:-[^/\\]+)?\.md$/i.test(basename(path));
}

export function listNoteArticleFiles(noteDir) {
  const files = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && isNoteArticleFile(path)) files.push(path);
    }
  };
  visit(noteDir);
  return files.sort();
}

export function isKnownNoteContentType(value) {
  return NOTE_CONTENT_TYPES.includes(value);
}

/**
 * 既存記事を初回移行するときだけ使う分類器。移行後の SSOT は frontmatter の
 * noteContentType であり、タイトルから毎回推測し直さない。
 */
export function inferNoteContentType({ path, root, data = {} }) {
  const repoPath = normalizeRepoPath(root ? relative(root, path) : path);
  const haystack = [repoPath, data.title, data.seoTitle, data.utmCampaign]
    .filter(Boolean)
    .join(' ');

  if (data.noteSeries === '総合案内') return 'index';
  if (data.utmCampaign === 'career' || CAREER_RE.test(haystack)) return 'career';
  if (EDITORIAL_RE.test(haystack)) return 'editorial';
  if (
    data.notePricing === 'paid'
    || data.notePricing === 'membership'
    || Boolean(data.noteMagazine)
    || /\/magazines\//.test(repoPath)
    || /\/メンバーシップ\//.test(repoPath)
  ) return 'product';
  return 'learning';
}
