/**
 * Diff local `content/site/` against R2 bucket `doboku-note` (prefix `posts/`).
 *
 * Usage:
 *   node .claude/skills/dev/diff-r2/scripts/diff-r2.mjs                        # 全件を比較
 *   node .claude/skills/dev/diff-r2/scripts/diff-r2.mjs --prefix civil-...     # 特定プレフィックスのみ
 *   node .claude/skills/dev/diff-r2/scripts/diff-r2.mjs --images-only          # 画像のみ
 *   node .claude/skills/dev/diff-r2/scripts/diff-r2.mjs --mdx-only             # MDX のみ
 *   node .claude/skills/dev/diff-r2/scripts/diff-r2.mjs --verbose              # 全差分をリスト出力（デフォルトは上位20件）
 *   node .claude/skills/dev/diff-r2/scripts/diff-r2.mjs --json                 # JSON 出力
 *
 * Exit code: 0 if in sync, 1 if any diff found.
 */
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { SITE_CONTENT_ROOT } from '../../../../../scripts/lib/repository-paths.mjs';

const root = process.cwd();

// Load .env.local
const envPath = path.join(root, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error('Error: Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY in .env.local');
  process.exit(2);
}

const BUCKET = 'doboku-note';
const KEY_PREFIX = 'posts/';
const contentDir = SITE_CONTENT_ROOT;

const args = process.argv.slice(2);
const prefixIdx = args.indexOf('--prefix');
const filterPrefix = prefixIdx !== -1 ? args[prefixIdx + 1] : null;
const imagesOnly = args.includes('--images-only');
const mdxOnly = args.includes('--mdx-only');
const verbose = args.includes('--verbose');
const jsonOut = args.includes('--json');

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);

function classify(relPath) {
  const ext = path.extname(relPath).toLowerCase();
  if (ext === '.mdx') return 'mdx';
  if (IMAGE_EXTS.has(ext)) return 'image';
  return 'other';
}

function shouldInclude(type) {
  if (imagesOnly) return type === 'image';
  if (mdxOnly) return type === 'mdx';
  return type === 'image' || type === 'mdx';
}

function walkLocal(dir, base = '') {
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const [k, v] of walkLocal(full, rel)) map.set(k, v);
    } else {
      const type = classify(rel);
      if (!shouldInclude(type)) continue;
      if (filterPrefix && !rel.startsWith(filterPrefix)) continue;
      const size = fs.statSync(full).size;
      map.set(rel, { size, type });
    }
  }
  return map;
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

async function listRemote() {
  const map = new Map();
  let ContinuationToken;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: KEY_PREFIX,
        ContinuationToken,
      })
    );
    for (const obj of res.Contents || []) {
      const rel = obj.Key.slice(KEY_PREFIX.length);
      const type = classify(rel);
      if (!shouldInclude(type)) continue;
      if (filterPrefix && !rel.startsWith(filterPrefix)) continue;
      map.set(rel, { size: obj.Size, type });
    }
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return map;
}

function fmtBytes(n) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

(async () => {
  if (!jsonOut) {
    console.log(`Scanning local: ${path.relative(root, contentDir)}`);
  }
  const local = walkLocal(contentDir);
  if (!jsonOut) console.log(`  ${local.size} files`);

  if (!jsonOut) console.log(`Listing R2: ${BUCKET}/${KEY_PREFIX}`);
  const remote = await listRemote();
  if (!jsonOut) console.log(`  ${remote.size} objects`);

  const onlyLocal = [];
  const onlyRemote = [];
  const sizeMismatch = [];

  for (const [key, l] of local) {
    const r = remote.get(key);
    if (!r) onlyLocal.push({ key, localSize: l.size, type: l.type });
    else if (r.size !== l.size)
      sizeMismatch.push({ key, localSize: l.size, remoteSize: r.size, type: l.type });
  }
  for (const [key, r] of remote) {
    if (!local.has(key)) onlyRemote.push({ key, remoteSize: r.size, type: r.type });
  }

  const inSync =
    onlyLocal.length === 0 && onlyRemote.length === 0 && sizeMismatch.length === 0;

  if (jsonOut) {
    console.log(
      JSON.stringify(
        {
          localCount: local.size,
          remoteCount: remote.size,
          onlyLocal,
          onlyRemote,
          sizeMismatch,
          inSync,
        },
        null,
        2
      )
    );
    process.exit(inSync ? 0 : 1);
  }

  const printList = (title, list, fmt) => {
    if (list.length === 0) return;
    console.log(`\n${title} (${list.length}):`);
    const limit = verbose ? list.length : 20;
    for (const item of list.slice(0, limit)) console.log(`  ${fmt(item)}`);
    if (list.length > limit) console.log(`  ... and ${list.length - limit} more`);
  };

  printList(
    'Only local (missing on R2) — run `npm run upload-images-r2`',
    onlyLocal,
    (i) => `${i.key}  [${fmtBytes(i.localSize)}]`
  );
  printList(
    'Only remote (missing locally) — run `/sync-r2-images`',
    onlyRemote,
    (i) => `${i.key}  [${fmtBytes(i.remoteSize)}]`
  );
  printList(
    'Size mismatch (content differs)',
    sizeMismatch,
    (i) =>
      `${i.key}  local ${fmtBytes(i.localSize)} ≠ remote ${fmtBytes(i.remoteSize)}`
  );

  console.log(
    `\nSummary: ${onlyLocal.length} only-local, ${onlyRemote.length} only-remote, ${sizeMismatch.length} size-mismatch`
  );
  if (inSync) console.log('✅ Local and R2 are in sync.');
  else console.log('⚠️  Diff detected.');

  process.exit(inSync ? 0 : 1);
})();
