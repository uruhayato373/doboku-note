#!/usr/bin/env node
// asset-hydrate.mjs — 退避したアセットを手元へ取り戻す（DN-0111 Phase 3）。
//
// 解決順は 4 段。**上から順に試して、取れた時点で止める。**
//   1. ローカル実体      — 既にある。何もしない（退避前・退避後どちらでも動く）
//   2. cache             — 前回 R2 から取ったもの（.local/cache/assets・Git 非追跡）
//   3. R2                — manifest の r2Key と sha256 を使って取得し、検証してから置く
//   4. generator         — regenerable なグループだけ。コマンドを提示する（勝手には実行しない）
//
// --offline は 3 を飛ばす。会社 PC はプロキシで外部 API が遮断されるので、
// 「ネットが無い前提で、cache にあるものだけで作業できるか」を確かめられるようにしてある。
//
// 取得したものは **sha256 が manifest と一致したときだけ** 配置する。一致しなければ
// 一時ファイルのまま捨てる（壊れたファイルを正しい名前で置かない）。
//
// 使い方:
//   node scripts/asset-hydrate.mjs --group note-cover-png                 # group 全部（人 tier の group は drive-vault-sync --pull）
//   node scripts/asset-hydrate.mjs --path 'content/sources/textbook/コンクリート主任技師2022/'  # 前方一致で部分取得
//   node scripts/asset-hydrate.mjs --group note-cover-png --offline       # cache のみ
//   node scripts/asset-hydrate.mjs --group note-cover-png --dry-run       # 何をどこから取るかだけ出す
//
// exit 0 = 全件解決 / exit 1 = 解決できないものがある or 検査不成立

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  loadConfig, loadManifest, loadEnvLocal, makeS3, hasR2Credentials,
  cachePathFor, cacheDirFor, sha256File, fileBytes, toPosix,
} from './lib/asset-storage.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const GROUP_ID = val('--group');
const PATH_PREFIX = val('--path');
const OFFLINE = flag('--offline');
const DRY = flag('--dry-run');

const mib = (b) => (b / 1048576).toFixed(1);

async function main() {
  const cfg = loadConfig();
  const manifest = loadManifest();
  const all = Object.entries(manifest.entries || {});

  if (!GROUP_ID && !PATH_PREFIX) {
    console.error('[asset-hydrate] --group か --path のどちらかが要る（全件 hydrate は容量が読めないので既定にしない）');
    console.error('  group: ' + cfg.groups.map((g) => g.id).join(' / '));
    process.exit(1);
  }

  let targets = all;
  if (GROUP_ID) targets = targets.filter(([, e]) => e.group === GROUP_ID);
  if (PATH_PREFIX) targets = targets.filter(([p]) => p.startsWith(toPosix(PATH_PREFIX)));

  if (all.length === 0) {
    console.error('[asset-hydrate] manifest が空。まだ 1 件も退避されていないので hydrate する対象が無い。');
    console.error('  「異常なし」ではなく「未実施」。退避は scripts/asset-offload.mjs。');
    process.exit(1);
  }
  if (targets.length === 0) {
    console.error('[asset-hydrate] 条件に一致する manifest エントリが 0 件（manifest 全体は ' + all.length + ' 件）。');
    console.error('  --group / --path の指定が実体と合っていない。検査不成立として exit 1 にする。');
    process.exit(1);
  }

  console.log('[asset-hydrate] 対象 ' + targets.length + ' 件 / mode=' + (DRY ? 'DRY-RUN' : OFFLINE ? 'OFFLINE（cache のみ）' : 'ONLINE'));

  const plan = { local: [], cache: [], r2: [], generator: [], unresolved: [] };
  for (const [logical, e] of targets) {
    const abs = join(REPO_ROOT, logical);
    if (existsSync(abs)) { plan.local.push([logical, e]); continue; }
    if (existsSync(cachePathFor(cfg, e.r2Key))) { plan.cache.push([logical, e]); continue; }
    if (!OFFLINE) { plan.r2.push([logical, e]); continue; }
    const g = cfg.groups.find((x) => x.id === e.group);
    if (g?.regenerable) plan.generator.push([logical, e, g]);
    else plan.unresolved.push([logical, e]);
  }

  console.log('  ローカルに既にある: ' + plan.local.length);
  console.log('  cache から復元    : ' + plan.cache.length);
  console.log('  R2 から取得       : ' + plan.r2.length + (OFFLINE ? '（--offline のため実行しない）' : ''));
  console.log('  再生成が要る      : ' + plan.generator.length);
  console.log('  解決不能          : ' + plan.unresolved.length);

  if (DRY) {
    for (const [p, e] of [...plan.cache, ...plan.r2].slice(0, 10)) {
      console.log('  ' + String(mib(e.bytes)).padStart(7) + ' MiB  ' + p);
    }
    console.log('[asset-hydrate] DRY-RUN のため何も書いていない。');
    return;
  }

  let restored = 0;
  const failures = [];

  // 2. cache から
  for (const [logical, e] of plan.cache) {
    const src = cachePathFor(cfg, e.r2Key);
    const ok = placeVerified(src, join(REPO_ROOT, logical), e, failures, logical, 'cache');
    if (ok) { restored++; touch(src); }
  }

  // 3. R2 から
  if (!OFFLINE && plan.r2.length) {
    loadEnvLocal();
    if (!hasR2Credentials()) {
      console.error('[asset-hydrate] FAIL: R2 credential が無いので ' + plan.r2.length + ' 件を取得できない。');
      console.error('  cache だけで作業するなら --offline を付けること（何が足りないかが分かる）。');
      process.exit(1);
    }
    const s3 = await makeS3();
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    for (const [logical, e] of plan.r2) {
      const bucketName = cfg.buckets[e.bucket]?.name;
      if (!bucketName) { failures.push({ logical, why: 'manifest の bucket "' + e.bucket + '" が設定に無い' }); continue; }
      const cachePath = cachePathFor(cfg, e.r2Key);
      const tmp = cachePath + '.tmp';
      try {
        const got = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: e.r2Key }));
        const chunks = [];
        for await (const c of got.Body) chunks.push(c);
        mkdirSync(dirname(cachePath), { recursive: true });
        writeFileSync(tmp, Buffer.concat(chunks));
      } catch (err) {
        failures.push({ logical, why: 'R2 取得に失敗: ' + String(err.name || err.message).slice(0, 80) });
        continue;
      }
      // 検証してから cache へ確定、さらに配置。壊れたものを正しい名前で置かない。
      if (sha256File(tmp) !== e.sha256) {
        unlinkSync(tmp);
        failures.push({ logical, why: 'R2 から取ったが sha256 が manifest と違う（破損 or 差し替え）' });
        continue;
      }
      renameSync(tmp, cachePath);
      if (placeVerified(cachePath, join(REPO_ROOT, logical), e, failures, logical, 'r2')) restored++;
    }
  }

  // 4. generator の提示（勝手に実行しない。再生成は byte が変わりうる＝別の判断）
  if (plan.generator.length) {
    console.log('\n  --- 再生成で復元できるもの（コマンドは自動実行しない） ---');
    const byGen = new Map();
    for (const [, , g] of plan.generator) byGen.set(g.id, g);
    for (const g of byGen.values()) console.log('  [' + g.id + '] ' + (g.generator || '(generator 未記載)'));
    console.log('  再生成は byte が変わりうる（cover PNG で実測済み）。同一性が要る用途では R2 から取ること。');
  }

  if (plan.unresolved.length) {
    console.error('\n  --- 解決不能（--offline かつ cache に無く再生成もできない） ---');
    for (const [p] of plan.unresolved.slice(0, 10)) console.error('  ' + p);
  }

  pruneCache(cfg);

  console.log('\n[asset-hydrate] 復元 ' + restored + ' 件 / 失敗 ' + failures.length + ' 件 / 解決不能 ' + plan.unresolved.length + ' 件');
  for (const f of failures.slice(0, 15)) console.error('  ' + f.logical + ' — ' + f.why);
  if (failures.length || plan.unresolved.length) process.exit(1);
  console.log('  ✓ 対象はすべて手元にある');
}

/** src を dst へ置く。sha256 と bytes が manifest と一致したときだけ確定する。 */
function placeVerified(src, dst, entry, failures, logical, from) {
  const bytes = fileBytes(src);
  if (bytes !== entry.bytes) { failures.push({ logical, why: from + ' の bytes が manifest と違う（' + bytes + ' != ' + entry.bytes + '）' }); return false; }
  if (sha256File(src) !== entry.sha256) { failures.push({ logical, why: from + ' の sha256 が manifest と違う' }); return false; }
  mkdirSync(dirname(dst), { recursive: true });
  writeFileSync(dst, readFileSync(src));
  return true;
}

/** 最終アクセス時刻を更新（cache の LRU 判定に使う）。 */
function touch(p) {
  try { const now = new Date(); utimesSync(p, now, now); } catch { /* 失敗しても致命ではない */ }
}

/**
 * cache が上限を超えたら、最終アクセスが古いものから落とす。
 * **勝手に空にはしない**——プロキシ不調時に cache を消すと作業不能になる。
 */
function pruneCache(cfg) {
  const cap = cfg.cache?.maxBytes;
  if (!cap) return;
  const dir = cacheDirFor(cfg);
  if (!existsSync(dir)) return;
  const files = [];
  walk(dir, files);
  let total = files.reduce((s, f) => s + f.size, 0);
  if (total <= cap) return;
  files.sort((a, b) => a.atime - b.atime);
  let removed = 0;
  for (const f of files) {
    if (total <= cap) break;
    try { unlinkSync(f.path); total -= f.size; removed++; } catch { /* 消せなければ次へ */ }
  }
  console.log('  cache が上限 ' + mib(cap) + ' MiB を超えたため、古い ' + removed + ' 件を落とした');
}

function walk(dir, out) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else {
      try { const st = statSync(p); out.push({ path: p, size: st.size, atime: st.atimeMs }); } catch { /* skip */ }
    }
  }
}
main().catch((e) => {
  console.error('[asset-hydrate] FAIL: ' + String(e.message || e).slice(0, 300));
  process.exit(1);
});
