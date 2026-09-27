import { readFileSync } from 'node:fs';
import { repoPath } from './repo-root';

/**
 * サイドバーの「教材一覧」の下に並べる教材（棚＝shelf ごと、短い表示名＝shortTitle）。
 * 正本は .claude/config/reference-sources.json。読めなければ空（一覧ページは別に開ける）。
 */
export function materialsNav(): { shelf: string; items: { id: string; label: string }[] }[] {
  try {
    const reg = JSON.parse(readFileSync(repoPath('.claude/config/reference-sources.json'), 'utf8')) as {
      sources: { id: string; class: string; shortTitle?: string; shelf?: string }[];
    };
    const shelves = new Map<string, { id: string; label: string }[]>();
    for (const s of reg.sources) {
      if (!['commercial-book', 'operator-owned'].includes(s.class)) continue;
      const shelf = s.shelf ?? 'その他';
      if (!shelves.has(shelf)) shelves.set(shelf, []);
      shelves.get(shelf)!.push({ id: s.id, label: s.shortTitle ?? s.id });
    }
    return [...shelves].map(([shelf, items]) => ({ shelf, items }));
  } catch {
    return [];
  }
}
