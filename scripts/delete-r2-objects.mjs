/**
 * R2 から既存オブジェクトを「明示リストに書かれたキーだけ」削除する。
 *
 * 背景: r2-sync.yml はアップロードのみで削除を行わない。そのためリポジトリから
 * 画像を消しても R2 には残り続け、URL を直接叩けば取得できる状態が続く。
 * 著作権対応で撤去した画像などは、これでは撤去したことにならない。
 *
 * 設計: 「リポジトリに無いものを全部消す」自動 prune はしない。R2 にしか存在しない
 * 成果物を黙って壊す危険があるため、削除するキーは必ず明示リストで与える。
 *
 * Usage:
 *   node scripts/delete-r2-objects.mjs                    # dry-run（既定・何も消さない）
 *   node scripts/delete-r2-objects.mjs --commit           # 実際に削除する
 *   node scripts/delete-r2-objects.mjs --list <path>      # リストファイルを指定
 */
import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const root = process.cwd();

// .env.local があれば読む（ローカル実行用。CI では env から渡る）
const envPath = path.join(root, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error('Error: CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_R2_ACCESS_KEY_ID / CLOUDFLARE_R2_SECRET_ACCESS_KEY が必要です');
  process.exit(1);
}

const BUCKET = 'doboku-note';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

const args = process.argv.slice(2);
const commit = args.includes('--commit');
const listIdx = args.indexOf('--list');
const listPath = listIdx !== -1 ? args[listIdx + 1] : '.claude/config/r2-delete-list.txt';

if (!fs.existsSync(listPath)) {
  console.error(`Error: リストが見つかりません: ${listPath}`);
  process.exit(1);
}

const keys = fs
  .readFileSync(listPath, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

if (keys.length === 0) {
  console.error(`[delete-r2-objects] リストにキーが 1 件もありません: ${listPath}`);
  console.error('  検査対象ゼロを成功として扱わないため exit 1 とします。');
  process.exit(1);
}

// リポジトリに同じパスのファイルが現存するキーは、差し替え後の実体を消してしまうため弾く。
const guarded = [];
const targets = [];
for (const key of keys) {
  const local = key.startsWith('posts/') ? path.join(root, '.local/r2', key) : null;
  if (local && fs.existsSync(local)) guarded.push(key);
  else targets.push(key);
}

console.log(`[delete-r2-objects] リスト ${keys.length} 件 / 削除対象 ${targets.length} 件 / 保護 ${guarded.length} 件`);
if (guarded.length) {
  console.log('  保護（リポジトリに同名ファイルが現存するため削除しない）:');
  for (const k of guarded) console.log(`    ${k}`);
}
if (!commit) console.log('  ※ dry-run です。実際に削除するには --commit を付けてください。');

let deleted = 0;
let missing = 0;
let failed = 0;

for (const key of targets) {
  let exists = true;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    exists = false;
  }

  if (!exists) {
    missing++;
    console.log(`  skip(不在)  ${key}`);
    continue;
  }

  if (!commit) {
    console.log(`  would-delete ${key}`);
    continue;
  }

  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    deleted++;
    console.log(`  deleted     ${key}`);
  } catch (e) {
    failed++;
    console.error(`  FAILED      ${key}: ${e.message}`);
  }
}

console.log('');
console.log(`[delete-r2-objects] 対象 ${targets.length} 件 / 削除 ${deleted} 件 / 不在 ${missing} 件 / 失敗 ${failed} 件`);
if (failed > 0) process.exit(1);
