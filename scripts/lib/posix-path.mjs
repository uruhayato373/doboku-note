/**
 * posix-path.mjs — パスの区切りを '/' にそろえる（依存ゼロ）。R2 のキー・リポジトリ相対パスの表示・保存は常に '/'。
 * Windows の path.sep ('\\') を '/' にする。macOS・Linux では変えない。
 */
import { sep } from 'node:path';

export const toPosix = (p) => p.split(sep).join('/');
