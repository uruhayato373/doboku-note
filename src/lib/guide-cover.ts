import coverData from '@/config/guide-cover-photos.json';
import { type DocMeta } from '@/lib/docs';
import { classifyDoc } from '@/lib/doc-classifier';

// guide-cover-photos.json は資格 slug → 写真パス配列（+ `_note` メタキー）。
const pools = coverData as Record<string, unknown>;

function poolFor(category: string | undefined): string[] {
  if (!category) return [];
  const v = pools[category];
  return Array.isArray(v) ? (v as string[]) : [];
}

// slug を安定ハッシュしてプール内の1枚を決める（同記事は常に同じ写真）。
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * ガイド記事カードのカバー写真パス（public 配信）を返す。
 * 非ガイド・プール未設定・該当なしは null（DocCard 側で現テキストカードに fallback）。
 */
export function guideCoverFor(doc: DocMeta): string | null {
  if (classifyDoc(doc) !== 'guide') return null;
  const pool = poolFor(doc.category);
  if (pool.length === 0) return null;
  return pool[hashStr(doc.slug || '') % pool.length] ?? null;
}
