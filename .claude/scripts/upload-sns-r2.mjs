/**
 * Archive SNS binary deliverables (wav / mp4 等) to Cloudflare R2 (S3 API)
 *
 * content/sns 配下の「再生成可能だが手元に置くと容量を圧迫する」生成物（reels の
 * wav・video.mp4 等）を R2 の `sns/` prefix へ退避する。git では追跡しない方針
 * （.gitignore で除外済み）。SoT（slide-data.json / script.txt / caption.txt /
 * status.json）と carousel 成果物 PNG は git 追跡のままなのでここでは扱わない。
 *
 * 安全不変条件: --purge-local は「R2 に同一バイト数で存在することを HeadObject で
 * 確認できた後」にのみローカルを削除する。確認できなければ削除しない（データ消失防止）。
 *
 * Usage:
 *   node .claude/scripts/upload-sns-r2.mjs                       # wav+mp4 を R2 へアップロード
 *   node .claude/scripts/upload-sns-r2.mjs --dry-run             # 対象プレビューのみ
 *   node .claude/scripts/upload-sns-r2.mjs --skip-existing       # R2 に同サイズ既存ならスキップ
 *   node .claude/scripts/upload-sns-r2.mjs --prefix instagram/cem/exam-packs/r07
 *   node .claude/scripts/upload-sns-r2.mjs --ext wav,mp4,m4a     # 対象拡張子を上書き
 *   node .claude/scripts/upload-sns-r2.mjs --posted-only         # status.json が投稿済みの pack のみ
 *   node .claude/scripts/upload-sns-r2.mjs --purge-local         # R2 検証後にローカル削除（退避）
 *
 * 典型運用（投稿済みパックを退避）:
 *   node .claude/scripts/upload-sns-r2.mjs --posted-only --purge-local --skip-existing
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { SNS_CONTENT_ROOT } from '../../scripts/lib/repository-paths.mjs';

const root = process.cwd();

// Load .env.local（CI では env 直供給。会社PCはプロキシで外部API遮断のため CI 経由が正）
const envPath = path.join(root, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

// R2 のキーは snsDir からの相対パスで決まるので、ローカルの置き場が変わっても object key は不変
const snsDir = SNS_CONTENT_ROOT;

// R2 のキーは常に '/' 区切り（Windows の path.sep が '\\' のため正規化）
const toPosix = (p) => p.split(path.sep).join('/');

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const BUCKET = 'doboku-note';
const CONCURRENCY = 20;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// --dry-run は R2 に触れないため creds 不要。実アップロード時のみ必須。
let s3 = null;
if (!dryRun) {
  if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
    console.error('Error: Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY in .env.local');
    process.exit(1);
  }
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  });
}
const skipExisting = args.includes('--skip-existing');
const purgeLocal = args.includes('--purge-local');
const postedOnly = args.includes('--posted-only');
const prefixIdx = args.indexOf('--prefix');
const filterPrefix = prefixIdx !== -1 ? toPosix(args[prefixIdx + 1]) : null;
const extIdx = args.indexOf('--ext');
const exts = (extIdx !== -1 ? args[extIdx + 1] : 'wav,mp4')
  .split(',')
  .map((e) => '.' + e.trim().replace(/^\./, '').toLowerCase());

const MIME_TYPES = {
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.m4a': 'audio/mp4',
  '.mov': 'video/quicktime',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

// 各バイナリの「投稿済み」判定: 直近の祖先 status.json を探し、いずれかのチャネルに
// posted_at（truthy）または status === 'posted' があれば投稿済みとみなす（pack 単位）。
// status.json が無ければ未投稿扱い（保守的に退避対象外）。
const postedCache = new Map();
function isPosted(fileFull) {
  let dir = path.dirname(fileFull);
  while (dir.startsWith(snsDir)) {
    if (postedCache.has(dir)) {
      const v = postedCache.get(dir);
      if (v !== undefined) return v;
    } else {
      const sj = path.join(dir, 'status.json');
      if (fs.existsSync(sj)) {
        let posted = false;
        try {
          const data = JSON.parse(fs.readFileSync(sj, 'utf8'));
          for (const ch of Object.values(data)) {
            if (ch && typeof ch === 'object' && (ch.posted_at || ch.status === 'posted')) {
              posted = true;
              break;
            }
          }
        } catch {
          posted = false;
        }
        postedCache.set(dir, posted);
        return posted;
      }
      postedCache.set(dir, undefined); // この階層に status.json なし → 親へ
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

function findBinaries(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findBinaries(full));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (exts.includes(ext)) results.push(full);
    }
  }
  return results;
}

let items = findBinaries(snsDir).map((full) => ({
  full,
  rel: toPosix(path.relative(snsDir, full)),
  ext: path.extname(full).toLowerCase(),
}));

if (filterPrefix) items = items.filter((it) => it.rel.startsWith(filterPrefix));
if (postedOnly) items = items.filter((it) => isPosted(it.full));

const totalBytes = items.reduce((s, it) => s + fs.statSync(it.full).size, 0);
console.log(
  `Found ${items.length} files (${(totalBytes / 1048576).toFixed(1)} MB)` +
    `${dryRun ? ' [dry-run]' : ''}${postedOnly ? ' [posted-only]' : ''}${purgeLocal ? ' [purge-local]' : ''}`
);
console.log(`  ext: ${exts.join(' ')}${filterPrefix ? `  prefix: ${filterPrefix}` : ''}`);

if (dryRun) {
  for (const it of items.slice(0, 20)) console.log(`  sns/${it.rel}`);
  if (items.length > 20) console.log(`  ... and ${items.length - 20} more`);
  process.exit(0);
}

let uploaded = 0;
let skipped = 0;
let purged = 0;
let failed = 0;
const startTime = Date.now();

async function r2Size(key) {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return head.ContentLength;
  } catch {
    return null;
  }
}

async function processOne(item) {
  const key = `sns/${item.rel}`;
  const body = fs.readFileSync(item.full);
  const contentType = MIME_TYPES[item.ext] || 'application/octet-stream';

  let inR2 = false;
  if (skipExisting || purgeLocal) {
    const size = await r2Size(key);
    if (size === body.length) inR2 = true;
  }

  if (inR2 && skipExisting) {
    skipped++;
  } else {
    try {
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
      uploaded++;
      inR2 = true;
      if ((uploaded + skipped) % 100 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        console.log(`  Progress: ${uploaded + skipped}/${items.length} (${elapsed}s)`);
      }
    } catch (e) {
      console.error(`  FAILED: ${key} - ${e.message?.slice(0, 80)}`);
      failed++;
      return;
    }
  }

  // 安全不変条件: R2 に同一バイト数で存在することを再確認してからのみ削除
  if (purgeLocal) {
    const verify = await r2Size(key);
    if (verify === body.length) {
      fs.unlinkSync(item.full);
      purged++;
    } else {
      console.error(`  PURGE-SKIP（R2検証不一致のため保持）: ${key}`);
      failed++;
    }
  }
}

for (let i = 0; i < items.length; i += CONCURRENCY) {
  const batch = items.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(processOne));
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\nDone in ${elapsed}s! Uploaded: ${uploaded}, Skipped: ${skipped}, Purged-local: ${purged}, Failed: ${failed}`);

if (failed > 0) {
  console.error(`\nERROR: ${failed} 件失敗。R2 認証(トークン)・権限を確認してください。`);
  process.exitCode = 1;
}
