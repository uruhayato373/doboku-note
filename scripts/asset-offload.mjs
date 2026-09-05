#!/usr/bin/env node
// asset-offload.mjs — 追跡中アセットを R2 へ退避する（DN-0111 Phase 3）。
//
// **このスクリプトはローカルファイルを消さないし、git の追跡も外さない。** やるのは
// 「R2 へ上げて、上がったことを確かめて、manifest に記録する」までの 3 つだけ。
// ローカル削除と untrack は別の操作（別コマンド・別 commit・別承認）にしてある——
// 1 コマンドで upload と削除を兼ねると、upload が半分成功した状態で削除が走る。
//
// 検証は 2 段階:
//   1. HeadObject で bytes 一致
//   2. GetObject で本体を読み直して sha256 一致
// どちらか通らなければ manifest へ載せない（載っていない＝まだ退避できていない、が読める）。
//
// 使い方:
//   node scripts/asset-offload.mjs --group note-cover-png                 # dry-run（既定）
//   node scripts/asset-offload.mjs --group textbook-page-image --limit 20 # 件数を絞る
//   node scripts/asset-offload.mjs --group note-cover-png --commit        # 実アップロード
//   node scripts/asset-offload.mjs --group note-cover-png --skip-existing # R2 に同 sha256 があれば省く
//   node scripts/asset-offload.mjs --forget-group textbook-page-image [--commit]
//       # Drive vault へ移し R2 側を purge した後、その group の manifest エントリを外す。
//       # **各キーが drive-manifest.json に同じ sha256 で載っているときだけ**外す（fail-closed）。
//       # 載っていないものがあれば 1 件も外さない（--allow-unpreserved で強行できるが、それは
//       # 「復元の確認手段を自分で捨てる」操作なので理由を残すこと）。2026-09-05 追加
//
// exit 0 = 成功（dry-run 含む） / exit 1 = 検証失敗・設定不備・対象ゼロで意図不明
//
// 設定: .claude/config/asset-storage.json / 台帳: .claude/state/assets/manifest.json

import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadConfig, loadEnvLocal, makeS3, hasR2Credentials,
  groupFor, r2KeyFor, mimeFor, visibilityFor, bucketForFile, sha256Stream, fileBytes, imageSize,
  loadManifest, writeManifestAtomic, sanitizeEntry, toPosix,
} from './lib/asset-storage.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { loadDriveManifest } from './lib/drive-vault.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const COMMIT = flag('--commit');
// --verify: 追跡解除の前に「ローカル実体・manifest・R2 の 3 者が一致しているか」を全件確認する。
// カードが各グループで求めている手順（候補一覧 → dry-run → 承認 → upload → hash 照合 → untrack）の
// 「hash 照合」がこれ。1 件でも欠ければ exit 1 で、そのグループの untrack を止める。
const VERIFY = flag('--verify');
const OUT_LIST = val('--out');
const SKIP_EXISTING = flag('--skip-existing');
// --include-untracked: gitignore 済みのファイルも対象にする。
// 既定が「追跡ファイルだけ」なのは、追跡外を R2 へ上げても Git は軽くならないから。
// だが reels の wav/mp4 のように **最初から gitignore されている group** があり、
// そこでは既定のままだと対象 0 件で exit 1 になる（check-asset-storage が案内する
// コマンドが動かない、という状態を 2026-08-22 に作ってしまった）。
const INCLUDE_UNTRACKED = flag('--include-untracked');
const GROUP_ID = val('--group');
const FORGET_GROUP = val('--forget-group');
const ALLOW_UNPRESERVED = flag('--allow-unpreserved');
const LIMIT = Number(val('--limit', '0')) || 0;
// 直列だと 868 件で約 12 分かかった（571 MiB の up と、sha256 検証のための down で往復 1.1 GB）。
// 既存の upload-sns-r2 も同じ理由で 20 並列。既定 8 は R2 のレート制限に対して控えめな値。
const CONCURRENCY = Math.max(1, Number(val('--concurrency', '8')) || 8);

const mib = (b) => (b / 1048576).toFixed(1);

const git = (args) =>
  execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
    cwd: REPO_ROOT, encoding: 'utf-8', maxBuffer: 512 * 1024 * 1024,
  });

/**
 * 追跡解除の前の全件照合。ローカル実体 → manifest → R2 の順に、
 * sha256 / bytes / bucket / visibility が食い違っていないかを見る。
 *
 * 「確認できないものは Git からもローカルからも外さない」が退避運用の芯なので、
 * ここは 1 件でも欠けたら exit 1 にする（部分的に通す道を作らない）。
 */
async function verifyGroup(cfg, group, targets) {
  const manifest = loadManifest();
  console.log('[asset-offload --verify] group=' + group.id + ' / 対象 ' + targets.length + ' 件');

  loadEnvLocal();
  if (!hasR2Credentials()) {
    console.error('  FAIL: R2 credential が無い。照合できないので exit 1（「異常なし」ではない）。');
    process.exit(1);
  }
  const s3 = await makeS3();
  const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
  const listed = new Map();
  for (const bucketKey of ['public', 'private']) {
    const name = cfg.buckets[bucketKey]?.name;
    if (!name) continue;
    const table = new Map();
    let token;
    do {
      const r = await s3.send(new ListObjectsV2Command({
        Bucket: name, Prefix: group.keyPrefix || undefined, ContinuationToken: token, MaxKeys: 1000,
      }));
      for (const o of r.Contents || []) table.set(o.Key.normalize('NFC'), o.Size);
      token = r.IsTruncated ? r.NextContinuationToken : undefined;
    } while (token);
    listed.set(bucketKey, table);
    console.log('  R2 ' + name + ' の ' + (group.keyPrefix || '(全体)') + ' : ' + table.size + ' オブジェクト');
  }

  const ok = [];
  const bad = [];
  let bytes = 0;
  for (const p of targets) {
    const e = manifest.entries?.[toPosix(p)];
    if (!e) { bad.push([p, 'manifest に無い（未退避）']); continue; }
    const abs = join(REPO_ROOT, p);
    if (!existsSync(abs)) { bad.push([p, 'ローカル実体が無い']); continue; }
    const localBytes = fileBytes(abs);
    if (localBytes !== e.bytes) { bad.push([p, 'ローカル bytes が manifest と違う']); continue; }
    if (await sha256Stream(abs) !== e.sha256) { bad.push([p, 'ローカル sha256 が manifest と違う']); continue; }
    if (e.bucket === 'public' && e.visibility !== 'public') { bad.push([p, '公開バケットに非公開判定']); continue; }
    const size = listed.get(e.bucket)?.get(e.r2Key.normalize('NFC'));
    if (size === undefined) { bad.push([p, 'R2 (' + e.bucket + ') に key が無い']); continue; }
    if (size !== e.bytes) { bad.push([p, 'R2 の bytes が manifest と違う']); continue; }
    ok.push(toPosix(p));
    bytes += e.bytes;
  }

  console.log('  照合 OK : ' + ok.length + ' 件（' + mib(bytes) + ' MiB）');
  console.log('  不一致  : ' + bad.length + ' 件');
  for (const [p, why] of bad.slice(0, 15)) console.error('    ' + why + ' — ' + p);
  if (bad.length > 15) console.error('    ... ほか ' + (bad.length - 15) + ' 件');

  if (OUT_LIST) {
    writeFileSync(OUT_LIST, ok.join('\n') + '\n');
    console.log('  追跡解除できる一覧 → ' + OUT_LIST);
  }
  if (bad.length) {
    console.error('[asset-offload --verify] FAIL: 1 件でも欠けたらこのグループの untrack はしない。');
    process.exitCode = 1;
    return;
  }
  console.log('[asset-offload --verify] ✓ 全件がローカル・manifest・R2 で一致した。untrack してよい。');
}

/**
 * Drive vault へ移した group の manifest エントリを外す。
 * 「台帳から消す」は「R2 に無くても気づけなくなる」操作なので、drive-manifest.json に
 * 同じ sha256 で載っている＝別の場所で保全が確認できるキーだけを外す。
 */
function forgetGroup(groupId) {
  const manifest = loadManifest();
  const drive = loadDriveManifest();
  const targets = Object.entries(manifest.entries || {}).filter(([, e]) => e.group === groupId);
  if (targets.length === 0) {
    console.error('[asset-offload --forget-group] group "' + groupId + '" のエントリが manifest に 0 件。検査不成立として exit 1。');
    process.exit(1);
  }
  const ok = [];
  const bad = [];
  for (const [rel, e] of targets) {
    const d = drive.entries?.[toPosix(rel)];
    if (!d) { bad.push([rel, 'drive-manifest に無い']); continue; }
    if (d.sha256 !== e.sha256) { bad.push([rel, 'drive-manifest の sha256 が違う']); continue; }
    ok.push(rel);
  }
  console.log('[asset-offload --forget-group] group=' + groupId + ' / manifest ' + targets.length + ' 件 / Drive 側で保全確認 ' + ok.length + ' 件 / 未確認 ' + bad.length + ' 件 / mode=' + (COMMIT ? 'COMMIT' : 'DRY-RUN'));
  for (const [p, why] of bad.slice(0, 15)) console.error('    ' + why + ' — ' + p);
  if (bad.length > 15) console.error('    ... ほか ' + (bad.length - 15) + ' 件');
  if (bad.length && !ALLOW_UNPRESERVED) {
    console.error('  FAIL: Drive 側で保全を確認できないキーがあるので 1 件も外さない。先に drive-vault-sync --group ' + groupId + ' --commit → --verify --cloud。');
    process.exit(1);
  }
  if (!COMMIT) { console.log('  DRY-RUN のため manifest は変更していない。実行は --commit。'); return; }
  for (const rel of ok) delete manifest.entries[rel];
  if (ALLOW_UNPRESERVED) for (const [rel] of bad) delete manifest.entries[rel];
  const total = writeManifestAtomic(manifest);
  console.log('  ✓ ' + (ok.length + (ALLOW_UNPRESERVED ? bad.length : 0)) + ' 件を manifest から外した（残 ' + total + ' エントリ）。R2 のオブジェクト自体は消していない（delete-r2-objects --bucket private --from-manifest-group を先に）。');
}

async function main() {
  const cfg = loadConfig();
  if (FORGET_GROUP) { forgetGroup(FORGET_GROUP); return; }
  if (!GROUP_ID) {
    console.error('[asset-offload] --group が要る。指定できる group: ' + cfg.groups.map((g) => g.id).join(' / '));
    process.exit(1);
  }
  const group = cfg.groups.find((g) => g.id === GROUP_ID);
  if (!group) {
    console.error('[asset-offload] 未知の group "' + GROUP_ID + '"。指定できる group: ' + cfg.groups.map((g) => g.id).join(' / '));
    process.exit(1);
  }

  // 対象は「追跡中のファイル」だけ。追跡外のものを R2 へ上げても Git は軽くならないし、
  // 手元にしか無いものを外部へ出すのは別の判断（承認の範囲が違う）。
  const tracked = git(['ls-files']).split('\n').filter(Boolean);
  let candidates = tracked;
  if (INCLUDE_UNTRACKED) {
    // gitignore 済みも含めて列挙する（--others --ignored）。pathspec は repo 全体（'content' 固定
    // だと content/ 外の group = coconala-asset・repo-archive・kindle-dist 等で untracked を
    // 拾えず --include-untracked が機能しなかった。直後の groupFor() regex フィルタが絞るので
    // 全体列挙しても過剰対象にはならない。2026-08-29 修正）。
    const others = git(['ls-files', '--others', '--ignored', '--exclude-standard']).split('\n').filter(Boolean);
    candidates = [...new Set([...tracked, ...others])];
  }
  let targets = candidates.filter((p) => groupFor(p, cfg)?.id === group.id);
  const totalCount = targets.length;
  if (LIMIT > 0) targets = targets.slice(0, LIMIT);

  // 「対象 0 件で何もしなかった」と「全部失敗して何もできなかった」を区別する（CLAUDE.md §9）
  if (totalCount === 0) {
    console.error('[asset-offload] group "' + group.id + '" に該当する追跡ファイルが 0 件。');
    console.error('  pathRegex: ' + group.match.pathRegex);
    console.error('  既に退避済みか、regex が実体と合っていない。検査不成立として exit 1 にする。');
    if (!INCLUDE_UNTRACKED) console.error('  gitignore 済みのファイルが対象の group なら --include-untracked を付けること。');
    process.exit(1);
  }

  if (VERIFY) {
    await verifyGroup(cfg, group, targets);
    return;
  }

  const routing = group.bucket === 'byVisibility'
    ? 'byVisibility（公開済み→' + cfg.buckets.public.name + ' / それ以外→' + cfg.buckets.private.name + '）'
    : cfg.buckets[group.bucket].name + '（' + group.bucket + '）';
  console.log('[asset-offload] group=' + group.id + ' / bucket=' + routing);
  console.log('  該当 ' + totalCount + ' 件' + (LIMIT ? '（--limit で ' + targets.length + ' 件に絞り込み）' : '') + ' / mode=' + (COMMIT ? 'COMMIT（実アップロード）' : 'DRY-RUN'));

  // 公開範囲の内訳を先に出す。public バケット行きに private 判定が混ざっていないかを人が見る。
  const rows = [];
  let bytes = 0;
  for (const p of targets) {
    const abs = join(REPO_ROOT, p);
    if (!existsSync(abs)) { console.warn('  warn: 追跡されているが実体が無い: ' + p); continue; }
    const vis = visibilityFor(p, group);
    const size = fileBytes(abs) || 0;
    bytes += size;
    const bkt = bucketForFile(p, group);
    rows.push({ path: p, key: r2KeyFor(p, group), visibility: vis, bucket: bkt, bucketName: cfg.buckets[bkt].name, bytes: size, abs });
  }
  const pub = rows.filter((r) => r.visibility === 'public').length;
  const pri = rows.length - pub;
  const toPublic = rows.filter((r) => r.bucket === 'public').length;
  console.log('  合計 ' + mib(bytes) + ' MiB / 公開判定 ' + pub + ' 件・非公開判定 ' + pri + ' 件');
  console.log('  行き先: ' + cfg.buckets.public.name + ' ' + toPublic + ' 件 / ' + cfg.buckets.private.name + ' ' + (rows.length - toPublic) + ' 件');

  // **公開バケットへ private 判定を上げない。** 判定不能は private へ倒してあるので、
  // ここで弾かれるものは「公開して良いと確認できていないもの」。
  const misplaced = rows.filter((r) => r.bucket === 'public' && r.visibility !== 'public');
  if (misplaced.length) {
    console.error('[asset-offload] FAIL: 公開バケット行きに非公開判定が ' + misplaced.length + ' 件混ざっている。');
    for (const m of misplaced.slice(0, 10)) console.error('  ' + m.path);
    console.error('  公開バケットへの誤配置は URL で取得可能になり取り返しがつかない。');
    console.error('  group.bucket を byVisibility にすれば公開判定でファイル単位に振り分けられる。');
    process.exit(1);
  }

  if (!COMMIT) {
    console.log('\n  --- 上位 10 件のマッピング（dry-run） ---');
    for (const r of rows.slice(0, 10)) {
      console.log('  ' + String(mib(r.bytes)).padStart(7) + ' MiB  ' + r.path);
      console.log('              → ' + r.bucketName + ':' + r.key + '  [' + r.visibility + ']');
    }
    if (rows.length > 10) console.log('  ... ほか ' + (rows.length - 10) + ' 件');
    console.log('\n[asset-offload] DRY-RUN のため R2 へは 1 バイトも書いていない。実行は --commit。');
    console.log('  なお --commit してもローカル削除と git 追跡解除は行わない（別操作・別承認）。');
    return;
  }

  loadEnvLocal();
  if (!hasR2Credentials()) {
    console.error('[asset-offload] FAIL: R2 credential が無いので COMMIT できない。');
    console.error('  .env.local か CI env に CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_R2_ACCESS_KEY_ID / CLOUDFLARE_R2_SECRET_ACCESS_KEY を供給すること。');
    process.exit(1);
  }
  const s3 = await makeS3();
  const { PutObjectCommand, HeadObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { createHash } = await import('node:crypto');

  const manifest = loadManifest();
  let uploaded = 0, skipped = 0, verified = 0;
  const failures = [];

  // 途中経過を定期的に manifest へ落とす。全件終わってから一度だけ書くと、868 件の
  // 途中で落ちたときに検証済みの分まで記録が消え、再実行で --skip-existing が効かず
  // 全件を上げ直すことになる（転送量が二重になる）。writeManifestAtomic は一時ファイル
  // 経由なので、チェックポイント自体が既存 manifest を壊すことはない。
  const CHECKPOINT_EVERY = 50;
  let sinceCheckpoint = 0;
  const checkpoint = () => {
    if (sinceCheckpoint === 0) return;
    writeManifestAtomic(manifest);
    sinceCheckpoint = 0;
  };

  /** 1 ファイルの upload → bytes 検証 → sha256 検証 → manifest 記録。失敗は failures へ積む。 */
  async function processOne(r) {
    const localSha = await sha256Stream(r.abs);
    const prev = manifest.entries[toPosix(r.path)];
    // r2Key（パス文字列）だけの比較だと、byVisibility ルーティングで
    // 「同じ相対パス・違うバケット」（public⇄private の切替）を見逃す
    // （2026-08-26 DN-0138 実測: 20 件のドリフトのうち 18 件を誤ってスキップした）。
    // bucket 名（実際に PUT した先）も一致条件に加える。
    if (SKIP_EXISTING && prev && prev.sha256 === localSha && prev.r2Key === r.key && prev.bucket === r.bucket) { skipped++; return; }

    try {
      const { readFileSync } = await import('node:fs');
      await s3.send(new PutObjectCommand({
        Bucket: r.bucketName, Key: r.key, Body: readFileSync(r.abs), ContentType: mimeFor(r.path),
      }));
      uploaded++;
    } catch (e) {
      failures.push({ path: r.path, stage: 'put', msg: String(e.name || e.message).slice(0, 120) });
      return;
    }

    // 検証1: bytes
    let head;
    try {
      head = await s3.send(new HeadObjectCommand({ Bucket: r.bucketName, Key: r.key }));
    } catch (e) {
      failures.push({ path: r.path, stage: 'head', msg: String(e.name || e.message).slice(0, 120) });
      return;
    }
    if (Number(head.ContentLength) !== r.bytes) {
      failures.push({ path: r.path, stage: 'bytes', msg: 'local ' + r.bytes + ' != r2 ' + head.ContentLength });
      return;
    }

    // 検証2: sha256（本体を読み直す。ETag は多パートで MD5 にならないので当てにしない）
    let remoteSha;
    try {
      const got = await s3.send(new GetObjectCommand({ Bucket: r.bucketName, Key: r.key }));
      const h = createHash('sha256');
      for await (const chunk of got.Body) h.update(chunk);
      remoteSha = h.digest('hex');
    } catch (e) {
      failures.push({ path: r.path, stage: 'get', msg: String(e.name || e.message).slice(0, 120) });
      return;
    }
    if (remoteSha !== localSha) {
      failures.push({ path: r.path, stage: 'sha256', msg: 'local ' + localSha.slice(0, 12) + ' != r2 ' + remoteSha.slice(0, 12) });
      return;
    }

    verified++;
    sinceCheckpoint++;
    manifest.entries[toPosix(r.path)] = sanitizeEntry({
      logicalPath: toPosix(r.path),
      group: group.id,
      bucket: r.bucket,
      r2Key: r.key,
      sha256: localSha,
      bytes: r.bytes,
      mime: mimeFor(r.path),
      visibility: r.visibility,
      regenerable: Boolean(group.regenerable),
      generator: group.generator || null,
      requiredBy: group.requiredBy || [],
      verifiedAt: new Date().toISOString(),
      // 画像は寸法も記録する。退避後は CI から実体が見えなくなるので、
      // ここで実バイトから測っておかないと寸法の検査が 0 件の緑に化ける。
      ...(imageSize(r.abs) || {}),
    });

    if (sinceCheckpoint >= CHECKPOINT_EVERY) {
      checkpoint();
      console.log('  ... 検証通過 ' + verified + '/' + rows.length + '（manifest へ中間保存）');
    }
  }

  // 並列プール。JS は単一スレッドなので、manifest への書き込みは await 境界の間で
  // 完結し競合しない。並列度を上げすぎると R2 のレート制限に当たるので既定は控えめ。
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, async () => {
    while (cursor < rows.length) {
      const r = rows[cursor++];
      await processOne(r);
    }
  }));
  checkpoint();

  // 検証を通ったものだけを manifest へ残す。失敗があっても、通った分は記録して再実行を軽くする。
  const total = writeManifestAtomic(manifest);

  console.log('\n[asset-offload] upload ' + uploaded + ' / 検証通過 ' + verified + ' / skip ' + skipped + ' / 失敗 ' + failures.length);
  console.log('  manifest 総エントリ: ' + total + '（' + '.claude/state/assets/manifest.json' + '）');
  if (failures.length) {
    console.error('  --- 失敗（manifest へ載せていない＝まだ退避できていない） ---');
    for (const f of failures.slice(0, 15)) console.error('  [' + f.stage + '] ' + f.path + ' — ' + f.msg);
    if (failures.length > 15) console.error('  ... ほか ' + (failures.length - 15) + ' 件');
    console.error('  失敗したファイルはローカルからも Git からも消さないこと。');
    process.exit(1);
  }
  console.log('  ✓ 全件が bytes と sha256 の両方で一致した。');
  console.log('  次: ローカル削除と git 追跡解除は別操作。manifest と R2 を確認してから行うこと。');
}

main().catch((e) => {
  // credential や endpoint が例外メッセージへ混ざらないよう、name とメッセージ先頭だけ出す
  console.error('[asset-offload] FAIL: ' + String(e.message || e).slice(0, 300));
  process.exit(1);
});
