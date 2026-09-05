#!/usr/bin/env node
// asset-inbox-push.mjs — ローカルのアセットを GitHub Release（inbox）へ置いて、
// **R2 への書き込みを CI に代行させる**。このスクリプトは R2 credential を要求しない。
//
// なぜ要るか:
//   退避対象（note カバー / 納品 PDF / 教材画像 …）は .gitignore 済みなので、
//   CI は checkout でその実体を得られない。つまり「CI が R2 へ上げる」には
//   ファイルを CI まで運ぶ橋が要る。ここでは GitHub Release を橋にする
//   （gh はこの PC から常用できており、R2 credential をローカルへ置かずに済む）。
//
//   流れ: [ローカル] asset-inbox-push --commit
//           → GitHub Release `asset-inbox-<UTCts>`（prerelease）に tar.gz を添付
//           → [CI] .github/workflows/asset-inbox.yml が展開して asset-offload --commit
//           → manifest 差分が develop へ返る → release は削除される
//
// 使い方:
//   node scripts/asset-inbox-push.mjs --path 'content/note/技術士建設部門/…/R03/'   # dry-run（既定）
//   node scripts/asset-inbox-push.mjs --group note-delivery-pdf --commit            # 実送信
//   node scripts/asset-inbox-push.mjs --group note-cover-png --all --commit         # 未変更も含める
//
// 既定は **manifest と sha256 が違うもの（新規 or 更新）だけ**を送る。
// R2 と同じ中身を上げ直しても転送量が増えるだけなので、--all を付けたときだけ全件送る。
//
// exit 0 = 成功（dry-run 含む） / exit 1 = 対象ゼロ・前提不足・送信失敗
//
// 設定: .claude/config/asset-storage.json / 台帳: .claude/state/assets/manifest.json

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, loadManifest, groupFor, sha256Stream, toPosix } from './lib/asset-storage.mjs';
import { loadDriveConfig, driveGroupFor } from './lib/drive-vault.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const GROUP_ID = val('--group');
const PATH_PREFIX = val('--path');
const COMMIT = flag('--commit');
const SEND_ALL = flag('--all');

const NAME = 'asset-inbox-push';
const mib = (b) => (b / 1048576).toFixed(2);
// core.quotepath=false は必須。既定だと git は非 ASCII のパスを 8 進エスケープした
// "content/note/\346\212\200..." の形で返し、groupFor も existsSync も外れて**黙って 0 件**になる。
// この repo の退避対象はほぼ全て日本語パス配下なので、無いと選択が常に空＝
// check-asset-storage が案内する復旧コマンドが何もしない（2026-08-30 実測）。
const git = (args) =>
  execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
    cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024,
  });

/**
 * 退避 group に属するローカル実体を列挙する。
 * asset-offload.mjs:149-153 と同じ二本立て（追跡ファイル ＋ content 配下の ignore 済み）。
 * manifest には載っていない新規アセットも拾いたいので、manifest ではなくワークツリーを見る。
 */
function listLocalAssets(cfg) {
  const seen = new Set();
  const out = [];
  // Drive vault 管轄（audience=human・active）は CI に運ばない。CI は Drive を持たず、
  // asset-inbox-ingest も同じ判定で拒否する（ここで省くのは無駄な転送を避けるため）。
  let dcfg = null;
  try { dcfg = loadDriveConfig(); } catch { /* 設定が無ければ判定なし */ }
  let skippedDrive = 0;
  const add = (rel) => {
    const p = toPosix(rel);
    if (!p || seen.has(p)) return;
    seen.add(p);
    if (dcfg && driveGroupFor(p, dcfg, { includePending: false })) { skippedDrive++; return; }
    const g = groupFor(p, cfg);
    if (!g) return;
    const abs = join(REPO_ROOT, p);
    if (!existsSync(abs) || !statSync(abs).isFile()) return;
    out.push({ path: p, group: g.id, abs });
  };
  for (const l of git(['ls-files']).split('\n')) add(l);
  // pathspec は付けない。'content' 固定だと content/ 外の group（coconala-asset 等）を
  // 取りこぼす（asset-offload.mjs では 2026-08-29 に同じ理由で外した）。
  for (const l of git(['ls-files', '--others', '--ignored', '--exclude-standard']).split('\n')) add(l);
  if (skippedDrive) console.log(`[${NAME}] Drive vault 管轄のため CI へ運ばないファイル: ${skippedDrive} 件（drive-vault-sync で vault へ）`);
  return out;
}

async function main() {
  if (!GROUP_ID && !PATH_PREFIX) {
    const cfg0 = loadConfig();
    console.error(`[${NAME}] --group か --path のどちらかが要る（全件送信は転送量が読めないので既定にしない）`);
    console.error('  group: ' + cfg0.groups.map((g) => g.id).join(' / '));
    process.exit(1);
  }

  const cfg = loadConfig();
  const manifest = loadManifest();
  const entries = manifest.entries || {};

  let assets = listLocalAssets(cfg);
  const scanned = assets.length;
  if (GROUP_ID) assets = assets.filter((a) => a.group === GROUP_ID);
  if (PATH_PREFIX) assets = assets.filter((a) => a.path.startsWith(toPosix(PATH_PREFIX)));

  // sha256 で「R2 と同じか」を判定する。manifest に無い＝まだ一度も退避されていない。
  const rows = [];
  for (const a of assets) {
    const sha = await sha256Stream(a.abs);
    const prev = entries[a.path];
    const state = !prev ? 'new' : prev.sha256 === sha ? 'same' : 'changed';
    rows.push({ ...a, sha, state, bytes: statSync(a.abs).size });
  }

  const send = SEND_ALL ? rows : rows.filter((r) => r.state !== 'same');
  const bytes = send.reduce((s, r) => s + r.bytes, 0);

  console.log(`[${NAME}] ワークツリー走査 ${scanned} 件 → 選択 ${rows.length} 件`);
  console.log(`  新規 ${rows.filter((r) => r.state === 'new').length}`
    + ` / 更新 ${rows.filter((r) => r.state === 'changed').length}`
    + ` / R2 と同一 ${rows.filter((r) => r.state === 'same').length}`);
  console.log(`  送信対象 ${send.length} 件 / ${mib(bytes)} MiB${SEND_ALL ? '（--all: 同一も含む）' : ''}`);

  if (send.length === 0) {
    // 「0 件で成功」を緑にしない。何も送っていないのに「送った」と読める出力にはしない（CLAUDE.md §9）。
    console.error(`[${NAME}] 送信対象が 0 件。選択 ${rows.length} 件はすべて R2 と同一か、そもそも該当が無い。`);
    console.error('  同一のものも上げ直すなら --all。選択が 0 件なら --group / --path を見直すこと。');
    process.exit(1);
  }

  for (const r of send.slice(0, 20)) {
    console.log(`    [${r.state}] ${r.path}  ${mib(r.bytes)} MiB  ${r.sha.slice(0, 12)}…`);
  }
  if (send.length > 20) console.log(`    …ほか ${send.length - 20} 件`);

  if (!COMMIT) {
    console.log(`\n[${NAME}] dry-run（送信していない）。実行するなら --commit を付ける。`);
    return;
  }

  // ---- tar.gz を作る（repo 相対パスを保つ。CI 側は groupFor で再検証してから配置する）
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, 'Z');
  const tag = `asset-inbox-${stamp}`;
  const work = mkdtempSync(join(tmpdir(), 'asset-inbox-'));
  const listFile = join(work, 'files.txt');
  const metaFile = join(work, 'inbox.json');
  const tarball = join(work, 'inbox.tar.gz');

  writeFileSync(listFile, send.map((r) => r.path).join('\n') + '\n', 'utf8');
  writeFileSync(metaFile, JSON.stringify({
    version: 1,
    createdAt: new Date().toISOString(),
    selector: { group: GROUP_ID, path: PATH_PREFIX, all: SEND_ALL },
    groups: [...new Set(send.map((r) => r.group))],
    files: send.map((r) => ({ path: r.path, group: r.group, bytes: r.bytes, sha256: r.sha })),
  }, null, 2) + '\n', 'utf8');

  // -T で一覧渡し（日本語パスでも長い一覧でもコマンドラインが溢れない）。
  // inbox.json は tarball へ入れず **release の別アセット**として上げる。
  // gzip 済み tar には追記できず、二度圧縮するのも無駄なため。CI は先に inbox.json を
  // 読んでから tarball を展開する。
  //
  // --force-local: GNU tar は `C:\…` を `host:path`（リモート）と解釈して
  // 「Cannot connect to C: resolve failed」で落ちる。**Windows でだけ**必要。
  // macOS の tar は bsdtar でこのオプション自体が無く、付けると usage を吐いて必ず失敗する
  // （2026-08-30 実測。--commit がこの Mac で一度も通っていなかった）。
  const tarArgs = process.platform === 'win32' ? ['--force-local'] : [];
  // macOS の bsdtar は既定で Finder 拡張属性を AppleDouble（`._file`）として
  // tarball に混ぜる。inbox.json に宣言していない余計なファイルなので CI の
  // fail-closed ingest が拒否する。COPYFILE_DISABLE=1 でデータフォークだけを送る。
  execFileSync('tar', [...tarArgs, '-czf', tarball, '-C', REPO_ROOT, '-T', listFile], {
    stdio: 'inherit',
    env: process.platform === 'darwin' ? { ...process.env, COPYFILE_DISABLE: '1' } : process.env,
  });

  const tarBytes = statSync(tarball).size;
  console.log(`\n[${NAME}] tarball ${mib(tarBytes)} MiB → release ${tag}`);

  execFileSync('gh', [
    'release', 'create', tag,
    '--prerelease',
    '--title', `asset inbox ${stamp}`,
    '--notes', `R2 へ取り込む待ち行列。ファイル ${send.length} 件 / ${mib(bytes)} MiB。`
      + `\n\ngroup: ${[...new Set(send.map((r) => r.group))].join(', ')}`
      + '\n\n取り込みは .github/workflows/asset-inbox.yml。成功するとこの release は削除される。',
    tarball + '#inbox.tar.gz',
    metaFile + '#inbox.json',
  ], { cwd: REPO_ROOT, stdio: 'inherit' });

  rmSync(work, { recursive: true, force: true });

  console.log(`\n[${NAME}] ✓ 送信した。次に起きること:`);
  console.log('  1. .github/workflows/asset-inbox.yml が release published で発火（main に載っていれば）');
  console.log('  2. CI が展開 → asset-offload --commit で R2 へ upload → manifest 更新を develop へ push');
  console.log('  3. 成功したらこの release は削除される。残っていれば取り込めていない');
  console.log(`  手動で回すなら: gh workflow run asset-inbox.yml -f tag=${tag}`);
}

main().catch((e) => {
  console.error(`[${NAME}] FAIL: ${e.message}`);
  process.exit(1);
});
