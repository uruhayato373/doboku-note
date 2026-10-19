#!/usr/bin/env node
/**
 * 公開バケット（doboku-note）に、残す理由の無いオブジェクト（孤児）が溜まっていないかを数える。
 *
 * r2-sync は R2 へ足すだけで消さないので、記事や画像をリポジトリから消しても R2 に残り続ける
 * （2026-10-20 の棚卸しで 3,092 件・うち公開状態の MDX 735 件）。月次レビューの点検
 * （review-wiring.json の monthly.checks）で実行し、孤児を削除リストへ回すかを人が決める。
 * 判定は scripts/lib/r2-orphans.mjs。
 *
 * Usage:
 *   npm run check-r2-orphans                # 数えて結果を出す
 *   npm run check-r2-orphans -- --write     # 削除候補を .tmp/r2-orphans.txt（削除リストの書式）へ書く
 *
 * exit: 0 孤児・削除待ち 0 件 / 1 孤児か削除待ちあり（削除リストへ回す・参照ありはリポジトリへ戻す・削除を実行する）/ 2 検査不成立（認証なし・一覧 0 件）
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadConfig, loadManifest, loadEnvLocal, hasR2Credentials, makeS3 } from './lib/asset-storage.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { classifyPublicKeys, parseDeleteList } from './lib/r2-orphans.mjs';

const args = parseCliArgs({ write: { type: 'boolean' } });
const IMAGE_NAME = '[A-Za-z0-9_.-]+\\.(png|webp|svg|jpg|jpeg|gif)';
// 参照を探す範囲（削除リスト・台帳・記録・計画は「参照」ではないので含めない）
const REF_PATHS = ['content', 'src', 'config', 'public', 'scripts', '.claude/scripts', 'tools'];

loadEnvLocal();
if (!hasR2Credentials()) {
  console.error('[check-r2-orphans] 検査不成立: R2 の認証情報が無い（.env.local の CLOUDFLARE_R2_*）');
  process.exit(2);
}
const bucket = loadConfig().buckets.public.name;
const s3 = await makeS3();
const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
const keys = [];
let token;
let calls = 0;
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
  calls++;
  for (const o of r.Contents ?? []) keys.push(o.Key);
  token = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (token);
if (keys.length === 0) {
  console.error(`[check-r2-orphans] 検査不成立: ${bucket} の一覧が 0 件（List ${calls} 回）`);
  process.exit(2);
}

const git = (a) => execFileSync('git', ['-C', REPO_ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const manifestPublicKeys = Object.values(loadManifest().entries ?? {}).filter((e) => e.bucket === 'public' && e.r2Key).map((e) => e.r2Key);
const trackedSitePaths = git(['ls-files', '--', 'content/site']).split('\n').filter(Boolean);
const pendingDeleteKeys = parseDeleteList(readFileSync(join(REPO_ROOT, datasetPath('r2.delete-list')), 'utf8'));
let refOut = '';
try { refOut = git(['grep', '-h', '-o', '-E', IMAGE_NAME, '--', ...REF_PATHS]); } catch (e) { if (e.status !== 1) throw e; }
const referencedBasenames = refOut.split('\n').filter(Boolean);

const r = classifyPublicKeys({ keys, manifestPublicKeys, trackedSitePaths, pendingDeleteKeys, referencedBasenames });
console.log(`[check-r2-orphans] ${bucket}: ${keys.length} 件を実検査（List ${calls} 回）/ 残す理由あり ${r.kept} / 削除リストに載り未削除 ${r.pending.length} / 孤児 ${r.orphans.length} / 孤児だが参照あり ${r.referencedOrphans.length}`);
const show = (label, arr) => { if (arr.length) console.log(`  ${label}（先頭 10 件）:\n${arr.slice(0, 10).map((k) => `    ${k}`).join('\n')}`); };
show('孤児＝削除候補', r.orphans);
show('孤児だが参照あり（消さずにリポジトリへ戻す）', r.referencedOrphans);
if (r.pending.length) console.log('  削除リストに載っているキーが残っている → Actions「R2 Delete Objects」を実行する');

if (args.write && r.orphans.length) {
  const out = join(REPO_ROOT, '.tmp', 'r2-orphans.txt');
  mkdirSync(join(REPO_ROOT, '.tmp'), { recursive: true });
  writeFileSync(out, `${r.orphans.join('\n')}\n`);
  console.log(`  削除候補 ${r.orphans.length} 件を .tmp/r2-orphans.txt へ書いた（中身を確かめ、根拠の見出しを付けて削除リストへ足す）`);
}
if (r.orphans.length || r.referencedOrphans.length || r.pending.length) {
  console.log(`✗ 要対応: 削除候補は根拠（git 履歴・private への退避）を確かめて ${datasetPath('r2.delete-list')} へ。手順は .claude/rules/assets-images.md`);
  process.exitCode = 1;
} else {
  console.log('✓ 孤児 0 件');
}
