import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * 一時フォルダに X の台帳（publications/x/<exam>.json）と下書きの tweets.md を作る（DN-0612 P7）。
 * @param {string} root 一時のリポジトリルート
 * @param {{ folder: string, key: number|string, status?: string, text?: string|null, title?: string, publishAt?: string,
 *   url?: string, publishedAt?: string, queueVerified?: string, exam?: string, base?: 'draft'|'published' }[]} posts
 *   text が null の行は文面（copy）を持たない行になる。status は台帳の状態（draft/approved/scheduled/published/stopped）
 */
export function writeXRegistry(root, posts) {
  const byExam = new Map();
  const mds = new Map();
  for (const p of posts) {
    const exam = p.exam ?? 'civil-construction-1';
    const base = p.base ?? 'draft';
    const key = Number(p.key);
    const nn = String(key).padStart(2, '0');
    const row = {
      id: `${exam}/${p.folder.replace(/^\d+-/, '')}/x.post.t${nn}`, work: p.folder.replace(/^\d+-/, ''), account: 'x:main', format: 'post', variant: `t${nn}`,
      legacyKey: `${base}/${p.folder}#${key}`, status: p.status ?? 'draft',
    };
    if (p.text !== null) {
      row.copy = `content/sns/x/${base}/${p.folder}/tweets.md#tweet/${key}`;
      const md = mds.get(`${base}/${p.folder}`) ?? ['# 題', ''];
      md.push(`## Tweet ${nn}: ${p.title ?? `見出し${key}`}`, '', p.text ?? `本文${key}`, '', '---', '');
      mds.set(`${base}/${p.folder}`, md);
    }
    if (p.publishAt) row.publishAt = p.publishAt;
    if (p.queueVerified) row.times = { queueVerified: p.queueVerified };
    if (p.url || p.publishedAt) row.platform = { id: String(key), ...(p.url ? { url: p.url } : {}), ...(p.publishedAt ? { publishedAt: p.publishedAt } : {}) };
    if (!byExam.has(exam)) byExam.set(exam, []);
    byExam.get(exam).push(row);
  }
  const put = (rel, body) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  for (const [exam, publications] of byExam) {
    put(`content/registry/publications/x/${exam}.json`, `${JSON.stringify({ schemaVersion: 1, channel: 'x', exam, publications }, null, 2)}\n`);
  }
  for (const [rel, md] of mds) put(`content/sns/x/${rel}/tweets.md`, `${md.join('\n')}\n`);
}
