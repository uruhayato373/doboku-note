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
 * さらに **退避が確認できないキーは消さない**（2026-08-22 追加）。同日、教材 PDF 389 件の
 * うち 102 件（1.72 GiB）が「R2 に退避済みのはず」だったのに実際は R2 に無く、
 * git 履歴だけが唯一の実体だった。突合せずに消していれば永久に失われていた。
 * 「〜のはず」で消せてしまう経路をここで塞ぐ。
 *
 * 退避済みと認めるのは次のいずれか:
 *   1. 退避台帳（.claude/state/assets/manifest.json）に sha256 つきで載っている
 *   2. private の archive/legacy-r2/<key> として台帳に載っている（公開バケットからの退避）
 *   3. リポジトリ内に対応する実体が現存する
 * どれでもないキーは削除せず exit 1。意図的に消すなら --allow-unpreserved を付ける。
 * **--from-manifest-group のときは 1〜3 を使わない**（対象自身が台帳のキーなので循環する）。代わりに
 * Drive 台帳（drive-manifest.json）に同じ repo パス・同じ sha256 で載っているキーだけを保全済みとみなす。
 *
 * Usage:
 *   node scripts/delete-r2-objects.mjs                    # dry-run（既定・何も消さない・public バケット）
 *   node scripts/delete-r2-objects.mjs --commit           # 実際に削除する
 *   node scripts/delete-r2-objects.mjs --list <path>      # リストファイルを指定
 *   node scripts/delete-r2-objects.mjs --bucket private --from-manifest-group standards-page-image
 *                                                         # private バケットの、退避台帳に載る group の全キーを対象にする
 *                                                         # （Drive vault へ移した後の R2 側 purge。2026-09-05 追加）
 *
 * --bucket は public（既定・doboku-note）か private（doboku-note-archive）。
 * --from-manifest-group は manifest.json から {bucket, r2Key} を列挙し、--bucket と一致するものだけを対象にする。
 * byVisibility の group（ig-rendered-image）は両バケットに分かれるので、--bucket ごとに 2 回実行する。
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

const args = process.argv.slice(2);
const bucketArgIdx = args.indexOf('--bucket');
const BUCKET_KEY = bucketArgIdx !== -1 ? args[bucketArgIdx + 1] : 'public';
const BUCKETS = { public: 'doboku-note', private: 'doboku-note-archive' };
if (!BUCKETS[BUCKET_KEY]) {
  console.error(`Error: --bucket は public|private（指定: ${BUCKET_KEY}）`);
  process.exit(1);
}
const BUCKET = BUCKETS[BUCKET_KEY];

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

const commit = args.includes('--commit');
const listIdx = args.indexOf('--list');
const groupIdx = args.indexOf('--from-manifest-group');
const fromGroup = groupIdx !== -1 ? args[groupIdx + 1] : null;
const listPath = listIdx !== -1 ? args[listIdx + 1] : (fromGroup ? null : '.claude/config/r2-delete-list.txt');
const allowUnpreserved = args.includes('--allow-unpreserved');

let keys;
if (fromGroup) {
  // 退避台帳から対象を列挙する。台帳に載っている＝sha256 つきで別の場所に保全されている、が前提。
  // Drive vault へ移した後の purge では、drive-vault-sync --verify --cloud を先に通していること。
  let m;
  try { m = JSON.parse(fs.readFileSync(path.join(root, '.claude/state/assets/manifest.json'), 'utf8')); }
  catch (e) { console.error('Error: manifest.json を読めない: ' + e.message); process.exit(1); }
  const all = Object.values(m.entries || {}).filter((e) => e.group === fromGroup);
  keys = all.filter((e) => e.bucket === BUCKET_KEY && e.r2Key).map((e) => e.r2Key);
  const other = all.length - keys.length;
  console.log(`[delete-r2-objects] --from-manifest-group ${fromGroup}: 台帳 ${all.length} 件 / bucket=${BUCKET_KEY} ${keys.length} 件${other ? `（他バケット ${other} 件は --bucket を替えて別実行）` : ''}`);
  if (keys.length === 0) {
    console.error(`[delete-r2-objects] group ${fromGroup} に bucket=${BUCKET_KEY} のキーが 0 件。検査対象ゼロを成功として扱わないため exit 1。`);
    process.exit(1);
  }
} else {
  if (!fs.existsSync(listPath)) {
    console.error(`Error: リストが見つかりません: ${listPath}`);
    process.exit(1);
  }
  keys = fs
    .readFileSync(listPath, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  if (keys.length === 0) {
    console.error(`[delete-r2-objects] リストにキーが 1 件もありません: ${listPath}`);
    console.error('  検査対象ゼロを成功として扱わないため exit 1 とします。');
    process.exit(1);
  }
}

// リポジトリに同じパスのファイルが現存するキーは、差し替え後の実体を消してしまうため弾く。
const guarded = [];
const targets = [];
for (const key of keys) {
  const local = BUCKET_KEY === 'public' && key.startsWith('posts/') ? path.join(root, '.local/r2', key) : null;
  if (local && fs.existsSync(local)) guarded.push(key);
  else targets.push(key);
}

// ---- 退避の確認（2026-08-22 追加。詳細は冒頭のコメント） ----------------
const preserved = (() => {
  const set = new Set();
  let m;
  try { m = JSON.parse(fs.readFileSync(path.join(root, '.claude/state/assets/manifest.json'), 'utf8')); }
  catch { return set; }
  if (fromGroup) {
    // --from-manifest-group では対象そのものが R2 台帳のキーなので、「台帳に載っている」は保全の証明にならない
    // （循環）。保全と認めるのは Drive 台帳（drive-manifest.json）に同じ repo パス・同じ sha256 で載っているキーだけ。
    // 2026-09-05: video-render-artifact が R2 1,939 件 / Drive 215 件のまま purge に進めてしまう穴を塞ぐ。
    let d = { entries: {} };
    try { d = JSON.parse(fs.readFileSync(path.join(root, '.claude/state/assets/drive-manifest.json'), 'utf8')); } catch { /* 無ければ全件未保全 */ }
    for (const [logicalPath, e] of Object.entries(m.entries || {})) {
      if (e.group !== fromGroup || !e.sha256) continue;
      const de = d.entries?.[logicalPath] || d.entries?.[logicalPath.normalize('NFC')];
      if (de && de.sha256 === e.sha256) set.add(String(e.r2Key || '').normalize('NFC'));
    }
    return set;
  }
  // logicalPath は entries のキーそのもの（lean format では省略されうるので、
  // e.logicalPath ではなく Object.entries の key を使う。2026-08-29）。
  for (const [logicalPath, e] of Object.entries(m.entries || {})) {
    if (!e.sha256 || !e.bytes) continue;
    const k = String(e.r2Key || '').normalize('NFC');
    set.add(k);                                                   // 台帳に載っているキーそのもの
    if (k.startsWith('archive/legacy-r2/')) set.add(k.slice('archive/legacy-r2/'.length)); // 退避元のキー
    // リポジトリに実体が現存するなら、それも保全されているとみなす
    if (logicalPath && fs.existsSync(path.join(root, logicalPath))) set.add(k);
  }
  return set;
})();

const unpreserved = targets.filter((k) => !preserved.has(k.normalize('NFC')));
console.log(`[delete-r2-objects] 退避確認: ${targets.length - unpreserved.length} / ${targets.length} 件が台帳で保全済み`);
if (unpreserved.length) {
  console.error(`\n✗ 退避が確認できないキーが ${unpreserved.length} 件あります（消すと復元できません）:`);
  for (const k of unpreserved.slice(0, 20)) console.error(`    ${k}`);
  if (unpreserved.length > 20) console.error(`    ... ほか ${unpreserved.length - 20} 件`);
  if (fromGroup) {
    console.error('\n  先に Drive vault へ同期して drive-manifest に登録すること:');
    console.error(`    node scripts/drive-vault-sync.mjs --group ${fromGroup} --from-r2 --commit`);
    console.error(`    node scripts/drive-vault-sync.mjs --group ${fromGroup} --verify --deep --cloud`);
  } else {
    console.error('\n  先に private R2 へ退避して台帳へ登録すること:');
    console.error('    rclone copy doboku-r2:<bucket>/<prefix> doboku-r2:doboku-note-archive/archive/legacy-r2/<prefix>');
    console.error('  そのうえで sha256 つきで manifest へ登録する（asset-storage-policy.md §9 に手順）。');
  }
  console.error('  退避せずに消すと決めたなら --allow-unpreserved を付けること。');
  if (!allowUnpreserved) process.exit(1);
  console.error('  --allow-unpreserved が指定されているため続行します。\n');
}

console.log(`[delete-r2-objects] bucket=${BUCKET}（${BUCKET_KEY}）/ リスト ${keys.length} 件 / 削除対象 ${targets.length} 件 / 保護 ${guarded.length} 件`);
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
