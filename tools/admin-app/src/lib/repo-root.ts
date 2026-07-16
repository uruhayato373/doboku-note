import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * リポジトリルートを解決する。
 *
 * 再利用元の tools/admin/lib/*.mjs は `import.meta.url` から ROOT を逆算するが、
 * Turbopack バンドル下では `import.meta.url` が `.next/` 内を指しうるため信頼できない。
 * そこで `process.cwd()`（= `next dev tools/admin-app` を起動したリポジトリルート）から
 * package.json name=doboku-note を上方探索して確定する。結果はキャッシュ。
 */
let cached: string | null = null;

export function findRepoRoot(): string {
  if (cached) return cached;
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const pkg = join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        const { name } = JSON.parse(readFileSync(pkg, 'utf8')) as { name?: string };
        if (name === 'doboku-note') {
          cached = dir;
          return dir;
        }
      } catch {
        /* 壊れた package.json は無視して上へ */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // フォールバック: cwd をそのまま採用（開発時は cwd=リポジトリルートが基本）。
  cached = resolve(process.cwd());
  return cached;
}

/** リポジトリルート基準でパスを結合する薄いヘルパ。 */
export function repoPath(...parts: string[]): string {
  return join(findRepoRoot(), ...parts);
}
