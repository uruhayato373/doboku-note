import fs from 'fs';
import path from 'path';

// 記事一覧カード（A8/Yahoo 型サムネ）の画像を解決する。
// 方針: 記事ごとに画像を生成せず、資格別の「文字なし写真プール」から slug 決定的に 1 枚を選ぶ。
// 見出しは HTML で重ねる前提なので、文字が焼き込まれた OGP は使わない（真実源: brand-image-system.md）。
// フォールバック連鎖: guide-covers/{category}/{n}.webp -> card-{category}.webp -> undefined（呼び出し側で無地地）。

const PUBLIC_DIR = path.join(process.cwd(), 'public');

// ビルド時 fs アクセスをカテゴリ単位でキャッシュ（SSG の 1 プロセス内で使い回す）。
const poolCache = new Map<string, string[]>();
const cardCache = new Map<string, boolean>();

// guide-covers/{category}/ 内の webp をソートして返す（例: ["1.webp", ..., "5.webp"]）。
function listPool(category: string): string[] {
  const cached = poolCache.get(category);
  if (cached) return cached;
  const dir = path.join(PUBLIC_DIR, 'images', 'guide-covers', category);
  let files: string[];
  try {
    files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.webp'))
      .sort();
  } catch {
    files = [];
  }
  poolCache.set(category, files);
  return files;
}

function hasCardImage(category: string): boolean {
  const cached = cardCache.get(category);
  if (cached !== undefined) return cached;
  const exists = fs.existsSync(path.join(PUBLIC_DIR, 'images', `card-${category}.webp`));
  cardCache.set(category, exists);
  return exists;
}

// FNV-1a 32bit。slug から決定的にプール index を得る（ビルド間で安定させるため Math.random は使わない）。
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function resolveCardImage(
  category?: string | null,
  slug?: string | null,
): string | undefined {
  if (!category) return undefined;
  const pool = listPool(category);
  if (pool.length > 0) {
    const key = slug || category;
    const idx = fnv1a(key) % pool.length;
    return `/images/guide-covers/${category}/${pool[idx]}`;
  }
  if (hasCardImage(category)) return `/images/card-${category}.webp`;
  return undefined;
}
