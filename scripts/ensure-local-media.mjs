import { existsSync, lstatSync, mkdirSync, readlinkSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localPosts = resolve(repoRoot, 'content', 'site');
const publicPosts = resolve(repoRoot, 'public', 'posts');

mkdirSync(localPosts, { recursive: true });
mkdirSync(dirname(publicPosts), { recursive: true });

function linkPointsToLocalPosts() {
  try {
    const item = lstatSync(publicPosts);
    if (!item.isSymbolicLink()) return false;
    return resolve(dirname(publicPosts), readlinkSync(publicPosts)) === localPosts;
  } catch {
    return false;
  }
}

if (linkPointsToLocalPosts()) {
  // 旧方式のリンクは next build が全画像を out/ へコピーするため撤去する。
  // unlink はリンクだけを外し、content/site の実データには触れない。
  unlinkSync(publicPosts);
  console.log('[local-media] 旧 public/posts リンクを撤去しました（画像実体は保持）。');
} else if (existsSync(publicPosts)) {
  const item = lstatSync(publicPosts);
  if (item.isSymbolicLink()) {
    console.warn('[local-media] public/posts は別のリンクです。安全のため変更しません。');
  } else {
    console.warn('[local-media] public/posts は実ディレクトリです。安全のため変更しません。');
  }
}

console.log('[local-media] content/site: OK（dev時はローカル画像サーバーで配信）');
