#!/usr/bin/env node
// drive-vault-sync.mjs — 人か手元のスクリプトだけが使うアセットを Google Drive vault へ置く／取り戻す。
//
// R2 系の asset-offload / asset-hydrate と同じ契約を Drive 宛に移したもの:
//   - 既定は dry-run。書き込みは --commit。**ローカル削除も git 追跡解除もしない**（別操作・別承認）
//   - コピー後に vault 側から読み直し、sha256 が一致したものだけ台帳へ載せる
//   - 台帳（.claude/state/assets/drive-manifest.json）には vault 相対パスだけを書く
//
// 使い方:
//   node scripts/drive-vault-sync.mjs --group video-render-artifact                 # dry-run（ローカル → vault の計画）
//   node scripts/drive-vault-sync.mjs --group video-render-artifact --commit        # 実コピー
//   node scripts/drive-vault-sync.mjs --group textbook-source-pdf --from-r2 --dedupe-by-sha --commit
//                                                                                   # R2 にしか無いものを vault へ。既に vault にある同一 sha256 は採用（adopt）
//   node scripts/drive-vault-sync.mjs --group X --verify [--deep] [--cloud] --out .tmp/x-ok.txt
//                                                                                   # local ↔ 台帳 ↔ vault（--cloud で Drive API の md5 も）
//   node scripts/drive-vault-sync.mjs --pull --path 'content/note/技術士総監/x/pdf/'  # vault → repo
//
// exit 0 = 成功（dry-run 含む） / exit 1 = 検証失敗・対象 0 件・マウント無しで書けない・リモート未設定で --cloud
//
// 設定: .claude/config/drive-vault.json / 台帳: .claude/state/assets/drive-manifest.json

import { execFileSync, spawnSync } from 'node:child_process';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import {
  loadDriveConfig, resolveVaultRoot, driveGroupFor, vaultRelFor, vaultAbsFor,
  realBytesAndHashes, loadDriveManifest, writeDriveManifestAtomic, sanitizeDriveEntry, toVaultRel,
} from './lib/drive-vault.mjs';
import { loadManifest as loadR2Manifest, loadConfig as loadR2Config, loadEnvLocal, makeS3, hasR2Credentials, imageSize } from './lib/asset-storage.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const GROUP_ID = val('--group');
const PATH_PREFIX = val('--path');
const COMMIT = flag('--commit');
const FROM_R2 = flag('--from-r2');
const DEDUPE = flag('--dedupe-by-sha');
const VERIFY = flag('--verify');
const DEEP = flag('--deep');
const CLOUD = flag('--cloud');
const PULL = flag('--pull');
const FORCE = flag('--force');
const OUT_LIST = val('--out');
const SAMPLE = Number(val('--sample', '50')) || 50;
const CONCURRENCY = Math.max(1, Number(val('--concurrency', '4')) || 4);
const NAME = 'drive-vault-sync';
const mib = (b) => (b / 1048576).toFixed(1);

const git = (args) =>
  execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: REPO_ROOT, encoding: 'utf-8', maxBuffer: 512 * 1024 * 1024 });

const die = (msg, code = 1) => { console.error('[' + NAME + '] FAIL: ' + msg); process.exit(code); };

async function main() {
  const cfg = loadDriveConfig();
  if (!GROUP_ID && !PATH_PREFIX) {
    die('--group か --path のどちらかが要る。group: ' + cfg.groups.map((g) => g.id).join(' / '));
  }
  const group = GROUP_ID ? cfg.groups.find((g) => g.id === GROUP_ID) : null;
  if (GROUP_ID && !group) die('未知の group "' + GROUP_ID + '"。group: ' + cfg.groups.map((g) => g.id).join(' / '));

  const mount = resolveVaultRoot({ cfg });
  const manifest = loadDriveManifest();

  if (VERIFY) return await verify(cfg, group, mount, manifest);
  if (PULL) return await pull(cfg, group, mount, manifest);
  return await push(cfg, group, mount, manifest);
}

// ------------------------------------------------------------------ 対象の列挙

/** ローカルのワークツリー（追跡 ∪ ignore 済み）から Drive group に属するものを列挙する。 */
function listLocalTargets(cfg, group) {
  const tracked = git(['ls-files']).split('\n').filter(Boolean);
  const others = git(['ls-files', '--others', '--ignored', '--exclude-standard']).split('\n').filter(Boolean);
  const out = [];
  for (const raw of new Set([...tracked, ...others])) {
    const rel = toVaultRel(raw);
    if (PATH_PREFIX && !rel.startsWith(toVaultRel(PATH_PREFIX))) continue;
    const g = driveGroupFor(rel, cfg);
    if (!g) continue;
    if (group && g.id !== group.id) continue;
    const abs = join(REPO_ROOT, raw);
    if (!existsSync(abs)) continue;
    out.push({ rel, group: g, source: 'local', abs });
  }
  return out;
}

/** R2 台帳（asset-storage の manifest.json）から、同名 group のエントリを列挙する。 */
function listR2Targets(cfg, group) {
  const r2 = loadR2Manifest();
  const r2cfg = loadR2Config();
  const out = [];
  for (const [rel0, e] of Object.entries(r2.entries || {})) {
    const rel = toVaultRel(rel0);
    if (PATH_PREFIX && !rel.startsWith(toVaultRel(PATH_PREFIX))) continue;
    const g = driveGroupFor(rel, cfg);
    if (!g) continue;
    if (group && g.id !== group.id) continue;
    if (!e.sha256 || !e.bytes || !e.r2Key || !e.bucket) continue;
    const bucketName = r2cfg.buckets?.[e.bucket]?.name;
    if (!bucketName) continue;
    out.push({ rel, group: g, source: 'r2', r2: { bucketName, key: e.r2Key, sha256: e.sha256, bytes: e.bytes } });
  }
  return out;
}

// ------------------------------------------------------------------ push（repo/R2 → vault）

async function push(cfg, group, mount, manifest) {
  let targets = FROM_R2 ? listR2Targets(cfg, group) : listLocalTargets(cfg, group);
  const totalCount = targets.length;
  if (totalCount === 0) {
    console.error('[' + NAME + '] 対象 0 件（source=' + (FROM_R2 ? 'R2 台帳' : 'ローカル') + (group ? ' / group=' + group.id : '') + (PATH_PREFIX ? ' / path=' + PATH_PREFIX : '') + '）。');
    if (group) console.error('  pathRegex: ' + group.match.pathRegex);
    console.error('  既に同期済みか、指定が実体と合っていない。検査不成立として exit 1。' + (FROM_R2 ? '' : ' R2 にしか無いものは --from-r2。'));
    process.exit(1);
  }

  // 既に台帳にあり sha256 が一致するものは既定で省く（再実行で転送量を二重にしない）
  if (!FORCE) {
    const before = targets.length;
    targets = targets.filter((t) => {
      const cur = manifest.entries[t.rel];
      if (!cur) return true;
      if (t.source === 'r2') return cur.sha256 !== t.r2.sha256;
      return true; // ローカル源は後段で実測して比較する
    });
    if (before !== targets.length) console.log('  台帳と sha256 が一致するため省いた: ' + (before - targets.length) + ' 件（--force で作り直す）');
  }

  console.log('[' + NAME + '] source=' + (FROM_R2 ? 'R2 台帳' : 'ローカル') + ' / 対象 ' + totalCount + ' 件 / mode=' + (COMMIT ? 'COMMIT（vault へ書く）' : 'DRY-RUN'));
  console.log('  mount: ' + (mount.root ? mount.root + '（' + mount.source + '）' : '無し — ' + mount.reason));

  // 計画（vault 相対パス）を先に組む。keyFrom の導出に失敗するものはここで落ちる。
  const rows = [];
  const planErrors = [];
  for (const t of targets) {
    try { rows.push({ ...t, vaultRel: vaultRelFor(t.rel, t.group) }); }
    catch (e) { planErrors.push([t.rel, e.message]); }
  }
  if (planErrors.length) {
    console.error('  vault パスを導けないものが ' + planErrors.length + ' 件:');
    for (const [p, m] of planErrors.slice(0, 10)) console.error('    ' + p + ' — ' + m);
    process.exit(1);
  }

  if (!COMMIT) {
    for (const r of rows.slice(0, 10)) console.log('  ' + r.rel + '\n      → ' + r.vaultRel + (r.source === 'r2' ? '  [R2: ' + r.r2.bucketName + ':' + r.r2.key + ']' : ''));
    if (rows.length > 10) console.log('  ... ほか ' + (rows.length - 10) + ' 件');
    console.log('\n[' + NAME + '] DRY-RUN のため vault へは 1 バイトも書いていない。実行は --commit。');
    console.log('  なお --commit してもローカル削除・git 追跡解除・R2 側の削除は行わない（別操作・別承認）。');
    return;
  }
  if (!mount.root) die('vault のマウントが無いので書けない。' + mount.reason);

  // dedupe 索引: vault の dedupeScan 配下を全て読んで sha256 → vault 相対パス
  let dedupeIndex = null;
  if (DEDUPE) {
    dedupeIndex = new Map();
    for (const scanDir of cfg.dedupeScan || []) {
      const absDir = vaultAbsFor(mount.root, scanDir);
      if (!existsSync(absDir)) continue;
      const files = [];
      walk(absDir, files);
      console.log('  dedupe 索引: ' + scanDir + ' を ' + files.length + ' ファイル読んでハッシュ化 ...');
      for (const f of files) {
        const h = await realBytesAndHashes(f);
        const rel = toVaultRel(f.slice(mount.root.length + 1));
        if (!dedupeIndex.has(h.sha256)) dedupeIndex.set(h.sha256, rel);
      }
    }
  }

  let s3 = null;
  let GetObjectCommand = null;
  if (FROM_R2) {
    loadEnvLocal();
    if (!hasR2Credentials()) die('--from-r2 には R2 credential が要る（.env.local）。');
    s3 = await makeS3();
    ({ GetObjectCommand } = await import('@aws-sdk/client-s3'));
  }

  let copied = 0, adopted = 0, unchanged = 0;
  const failures = [];
  let sinceCheckpoint = 0;
  const checkpoint = () => { if (sinceCheckpoint) { writeDriveManifestAtomic(manifest); sinceCheckpoint = 0; } };
  const record = (r, h, extra) => {
    manifest.entries[r.rel] = sanitizeDriveEntry({
      group: r.group.id, vaultPath: extra.vaultPath, sha256: h.sha256, md5: h.md5, bytes: h.bytes,
      regenerable: Boolean(r.group.regenerable), syncedAt: new Date().toISOString(), verifiedAt: new Date().toISOString(),
      ...(extra.adopted ? { adopted: true } : {}),
      ...(extra.dims || {}),
    });
    sinceCheckpoint++;
    if (sinceCheckpoint >= 50) { checkpoint(); console.log('  ... ' + (copied + adopted + unchanged) + '/' + rows.length + '（台帳へ中間保存）'); }
  };

  async function processOne(r) {
    // 期待値（sha256/bytes）。ローカル源は実測、R2 源は R2 台帳の値。
    let expected;
    if (r.source === 'local') expected = await realBytesAndHashes(r.abs);
    else expected = { sha256: r.r2.sha256, bytes: r.r2.bytes };

    const cur = manifest.entries[r.rel];
    if (!FORCE && cur && cur.sha256 === expected.sha256 && existsSync(vaultAbsFor(mount.root, cur.vaultPath))) { unchanged++; return; }

    // dedupe: 同じ sha256 が vault のどこかに既にあれば、コピーせずその場所を採用する
    if (dedupeIndex && dedupeIndex.has(expected.sha256)) {
      const existing = dedupeIndex.get(expected.sha256);
      const h = await realBytesAndHashes(vaultAbsFor(mount.root, existing));
      if (h.sha256 === expected.sha256) {
        record(r, h, { vaultPath: existing, adopted: true, dims: r.source === 'local' ? imageSize(r.abs) : null });
        adopted++;
        return;
      }
    }

    const dst = vaultAbsFor(mount.root, r.vaultRel);
    // 既に同じものが置いてあれば書き直さない
    if (existsSync(dst)) {
      const h = await realBytesAndHashes(dst);
      if (h.sha256 === expected.sha256 && h.bytes === expected.bytes) {
        record(r, h, { vaultPath: r.vaultRel, dims: r.source === 'local' ? imageSize(r.abs) : imageSize(dst) });
        unchanged++;
        return;
      }
    }

    mkdirSync(dirname(dst), { recursive: true });
    const tmp = dst + '.tmp';
    try {
      if (r.source === 'local') {
        await pipeline(createReadStream(r.abs), createWriteStream(tmp));
      } else {
        const got = await s3.send(new GetObjectCommand({ Bucket: r.r2.bucketName, Key: r.r2.key }));
        await pipeline(got.Body, createWriteStream(tmp));
      }
    } catch (e) {
      try { unlinkSync(tmp); } catch { /* 無ければよい */ }
      failures.push({ rel: r.rel, stage: 'copy', msg: String(e.name || e.message).slice(0, 120) });
      return;
    }
    // 書いたものを読み直して照合。一致しなければ正しい名前で置かない。
    const h = await realBytesAndHashes(tmp);
    if (h.sha256 !== expected.sha256 || h.bytes !== expected.bytes) {
      try { unlinkSync(tmp); } catch { /* */ }
      failures.push({ rel: r.rel, stage: 'sha256', msg: 'expected ' + expected.sha256.slice(0, 12) + '/' + expected.bytes + ' != vault ' + h.sha256.slice(0, 12) + '/' + h.bytes });
      return;
    }
    renameSync(tmp, dst);
    record(r, h, { vaultPath: r.vaultRel, dims: imageSize(dst) });
    copied++;
  }

  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, async () => {
    while (cursor < rows.length) await processOne(rows[cursor++]);
  }));
  checkpoint();
  const total = writeDriveManifestAtomic(manifest);

  console.log('\n[' + NAME + '] コピー ' + copied + ' / 既存採用(adopt) ' + adopted + ' / 変更なし ' + unchanged + ' / 失敗 ' + failures.length + ' — 台帳 ' + total + ' エントリ');
  if (failures.length) {
    for (const f of failures.slice(0, 15)) console.error('  [' + f.stage + '] ' + f.rel + ' — ' + f.msg);
    if (failures.length > 15) console.error('  ... ほか ' + (failures.length - 15) + ' 件');
    console.error('  失敗したものは台帳に載せていない＝まだ vault に無い。ローカルも R2 も消さないこと。');
    process.exit(1);
  }
  console.log('  ✓ 全件が vault 側の読み直しで sha256 一致。');
  console.log('  次: R2 側を消す前に `--verify --cloud`（Drive API の md5 照合）を通すこと。マウントへ書けた＝クラウドに上がった、ではない。');
}

// ------------------------------------------------------------------ verify（local ↔ 台帳 ↔ vault [↔ cloud]）

async function verify(cfg, group, mount, manifest) {
  let entries = Object.entries(manifest.entries || {});
  if (group) entries = entries.filter(([, e]) => e.group === group.id);
  if (PATH_PREFIX) entries = entries.filter(([k]) => k.startsWith(toVaultRel(PATH_PREFIX)));
  if (entries.length === 0) die('台帳に該当エントリが 0 件（台帳全体 ' + Object.keys(manifest.entries || {}).length + ' 件）。検査不成立。');
  if (!mount.root) die('vault のマウントが無いので照合できない（「異常なし」ではない）。' + mount.reason);

  console.log('[' + NAME + ' --verify] 対象 ' + entries.length + ' 件 / mount=' + mount.root + (DEEP ? ' / 全件' : ' / サンプル約 ' + SAMPLE + ' 件（全件は --deep）') + (CLOUD ? ' / cloud md5 照合あり' : ''));

  // cloud: rclone で Drive API 側のハッシュを取る。無ければ fail-closed。
  let cloudMd5 = null;
  if (CLOUD) {
    const remote = cfg.cloud?.rcloneRemote;
    const remoteRoot = cfg.cloud?.remoteRoot;
    const which = spawnSync('rclone', ['version'], { encoding: 'utf-8' });
    if (which.status !== 0) die('--cloud には rclone が要る（brew install rclone）。照合できないので exit 1。');
    const remotes = spawnSync('rclone', ['listremotes'], { encoding: 'utf-8' }).stdout || '';
    if (!remotes.split('\n').includes(remote + ':')) {
      die('rclone リモート "' + remote + '" が未設定。`rclone config` で Google Drive バックエンドを ' + remote + ' の名で作る（ブラウザ OAuth・1 回）。未設定のまま R2 側を消してはいけない。');
    }
    cloudMd5 = new Map();
    const dirs = [...new Set(entries.map(([, e]) => toVaultRel(e.vaultPath).split('/').slice(0, 2).join('/')))];
    for (const d of dirs) {
      const r = spawnSync('rclone', ['lsjson', '--hash', '--recursive', '--files-only', remote + ':' + remoteRoot + '/' + d], { encoding: 'utf-8', maxBuffer: 512 * 1024 * 1024 });
      if (r.status !== 0) die('rclone lsjson が失敗: ' + d + ' — ' + String(r.stderr).slice(0, 200));
      for (const o of JSON.parse(r.stdout || '[]')) {
        const md5 = o.Hashes?.md5 || o.Hashes?.MD5;
        if (md5) cloudMd5.set(toVaultRel(d + '/' + o.Path), { md5, size: o.Size });
      }
      console.log('  cloud: ' + d + ' — ' + cloudMd5.size + ' オブジェクトのハッシュを取得（累計）');
    }
  }

  const step = DEEP ? 1 : Math.max(1, Math.floor(entries.length / SAMPLE));
  const ok = [];
  const bad = [];
  let hashed = 0;
  for (let i = 0; i < entries.length; i++) {
    const [rel, e] = entries[i];
    const abs = vaultAbsFor(mount.root, e.vaultPath);
    if (!existsSync(abs)) { bad.push([rel, 'vault に無い: ' + e.vaultPath]); continue; }
    if (cloudMd5) {
      const c = cloudMd5.get(toVaultRel(e.vaultPath));
      if (!c) { bad.push([rel, 'クラウド側に無い（まだ同期されていない）: ' + e.vaultPath]); continue; }
      if (c.md5 !== e.md5) { bad.push([rel, 'クラウド側の md5 が台帳と違う']); continue; }
      if (c.size !== e.bytes) { bad.push([rel, 'クラウド側の bytes が台帳と違う']); continue; }
    }
    if (i % step === 0) {
      hashed++;
      const h = await realBytesAndHashes(abs);
      if (h.sha256 !== e.sha256 || h.bytes !== e.bytes) { bad.push([rel, 'vault の実体が台帳と違う']); continue; }
      const local = join(REPO_ROOT, rel);
      if (existsSync(local)) {
        const l = await realBytesAndHashes(local);
        if (l.sha256 !== e.sha256) { bad.push([rel, 'ローカル実体が台帳と違う（作り直したものが vault へ反映されていない）']); continue; }
      }
    }
    ok.push(rel);
  }
  console.log('  存在確認 ' + entries.length + ' 件 / sha256 実照合 ' + hashed + ' 件' + (cloudMd5 ? ' / cloud md5 照合 ' + entries.length + ' 件' : '') + ' / 不一致 ' + bad.length);
  for (const [p, why] of bad.slice(0, 15)) console.error('    ' + why + ' — ' + p);
  if (bad.length > 15) console.error('    ... ほか ' + (bad.length - 15) + ' 件');
  if (OUT_LIST) { writeFileSync(OUT_LIST, ok.join('\n') + '\n'); console.log('  一致した一覧 → ' + OUT_LIST); }
  if (bad.length) { console.error('[' + NAME + ' --verify] FAIL: 1 件でも欠けたら R2 側の削除もローカル削除もしない。'); process.exit(1); }
  console.log('[' + NAME + ' --verify] ✓ ' + (cloudMd5 ? '台帳・vault・クラウドの 3 者が一致' : '台帳と vault が一致（クラウド到達は --cloud で確認）'));
}

// ------------------------------------------------------------------ pull（vault → repo）

async function pull(cfg, group, mount, manifest) {
  let entries = Object.entries(manifest.entries || {});
  if (group) entries = entries.filter(([, e]) => e.group === group.id);
  if (PATH_PREFIX) entries = entries.filter(([k]) => k.startsWith(toVaultRel(PATH_PREFIX)));
  if (entries.length === 0) die('台帳に該当エントリが 0 件。検査不成立。');
  if (!mount.root) die('vault のマウントが無いので取り戻せない。' + mount.reason);
  console.log('[' + NAME + ' --pull] 対象 ' + entries.length + ' 件 / mode=' + (COMMIT || !flag('--dry-run') ? 'PULL' : 'DRY-RUN'));
  let restored = 0, present = 0;
  const failures = [];
  for (const [rel, e] of entries) {
    const dst = join(REPO_ROOT, rel);
    if (existsSync(dst)) {
      const l = await realBytesAndHashes(dst);
      if (l.sha256 === e.sha256) { present++; continue; }
    }
    if (flag('--dry-run')) { console.log('  would-pull ' + rel + ' ← ' + e.vaultPath); continue; }
    const src = vaultAbsFor(mount.root, e.vaultPath);
    if (!existsSync(src)) { failures.push([rel, 'vault に無い: ' + e.vaultPath]); continue; }
    mkdirSync(dirname(dst), { recursive: true });
    const tmp = dst + '.tmp';
    try { await pipeline(createReadStream(src), createWriteStream(tmp)); }
    catch (err) { try { unlinkSync(tmp); } catch { /* */ } failures.push([rel, 'コピー失敗: ' + String(err.message).slice(0, 80)]); continue; }
    const h = await realBytesAndHashes(tmp);
    if (h.sha256 !== e.sha256 || h.bytes !== e.bytes) { unlinkSync(tmp); failures.push([rel, 'vault の実体が台帳と違う（破損 or 差し替え）']); continue; }
    renameSync(tmp, dst);
    restored++;
  }
  console.log('[' + NAME + ' --pull] 取り戻し ' + restored + ' / 既に手元 ' + present + ' / 失敗 ' + failures.length);
  for (const [p, why] of failures.slice(0, 15)) console.error('    ' + why + ' — ' + p);
  if (failures.length) process.exit(1);
}

function walk(dir, out) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
}

main().catch((e) => { console.error('[' + NAME + '] FAIL: ' + String(e.message || e).slice(0, 300)); process.exit(1); });
