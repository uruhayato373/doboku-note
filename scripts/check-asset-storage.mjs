#!/usr/bin/env node
// check-asset-storage.mjs — アセット退避の整合ゲート（DN-0111 Phase 3）。オフラインで完結する。
//
// 守りたい事故は 1 つ: **どこにも実体が無いのに、誰も気づかない。**
// Git から外し、ローカルからも消し、R2 へは上がっていなかった——という状態は、
// 次に必要になるまで表面化しない。それを機械で先に見つける。
//
// 検査するもの:
//   1. 設定の妥当性（regex がコンパイルできる / bucket が実在 / keyFrom が既知）
//   2. manifest ↔ 設定の整合（group 実在・r2Key が設定から導ける値と一致・bucket が routing と一致）
//   3. 公開範囲の誤配置（public バケットに非公開判定が載っていないか）
//   4. r2Key の衝突（別の logicalPath が同じキーを指していないか＝上書き事故）
//   5. **復元不能**（追跡外・ローカル実体なし・manifest なし・再生成不能）
//   6. manifest への秘密混入（credential / 署名 URL / Cookie / 絶対パス / R2 エンドポイント）
//   7. **未退避かつ未追跡**（ワークツリーにだけ在る）——退避対象を .gitignore したので、
//      作ったまま offload し忘れるとディスク障害 1 回で消える。Git にも R2 にも無い状態を止める
//
// R2 へはアクセスしない。実体が R2 にあるかは offload 時に sha256 で確認済みで、
// ここは「台帳と設定とワークツリーの間の辻褄」だけを見る（会社 PC でも動く）。
//
// 使い方:
//   node scripts/check-asset-storage.mjs
//   node scripts/check-asset-storage.mjs --json
//
// exit 0 = 整合 / exit 1 = 不整合 or 検査不成立

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import {
  loadConfig, loadManifest, r2KeyFor, visibilityFor, bucketForFile,
  findSecrets, cachePathFor, toPosix, MANIFEST_PATH,
} from './lib/asset-storage.mjs';
import { loadDriveConfig, driveGroupFor, loadDriveManifest } from './lib/drive-vault.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const JSON_OUT = process.argv.includes('--json');

/** ローカル実体 ↔ manifest の sha256 照合を打ち切る件数。超えた分は件数で報告する。 */
const HASH_LIMIT = 500;

const git = (args) =>
  execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
    cwd: REPO_ROOT, encoding: 'utf-8', maxBuffer: 512 * 1024 * 1024,
  });

const problems = [];
const fail = (kind, detail, path = null) => problems.push({ severity: 'FAIL', kind, detail, path });
const warn = (kind, detail, path = null) => problems.push({ severity: 'WARN', kind, detail, path });

function main() {
  let cfg;
  try {
    cfg = loadConfig();
  } catch (e) {
    console.error('[check-asset-storage] FAIL: ' + e.message);
    process.exit(1);
  }

  // 1. 設定の妥当性
  const KNOWN_VISIBILITY = new Set(['fixed:public', 'fixed:private', 'noteFrontmatter', 'igPackStatus']);
  for (const g of cfg.groups || []) {
    try { new RegExp(g.match.pathRegex); } catch (e) { fail('config-regex', 'group ' + g.id + ' の pathRegex が壊れている: ' + e.message); }
    const kf = g.keyFrom || 'repoRelative';
    if (kf !== 'repoRelative' && !kf.startsWith('stripPrefix:')) fail('config-keyfrom', 'group ' + g.id + ' の keyFrom "' + kf + '" が未知');
    if (!KNOWN_VISIBILITY.has(g.visibilityFrom || 'fixed:private')) fail('config-visibility', 'group ' + g.id + ' の visibilityFrom "' + g.visibilityFrom + '" が未知');
    if (!['public', 'private', 'byVisibility'].includes(g.bucket)) fail('config-bucket', 'group ' + g.id + ' の bucket "' + g.bucket + '" が未知');
    if (!g.reason) warn('config-reason', 'group ' + g.id + ' に reason が無い（なぜその置き場かが読めない）');
  }

  const manifest = loadManifest();
  const entries = Object.entries(manifest.entries || {});

  // 6. 秘密の混入（manifest が空でも走らせる意味があるので先に）
  for (const h of findSecrets(manifest)) {
    fail('manifest-secret', 'manifest に秘密らしき値が混ざっている（パターン: ' + h.pattern + '）', h.key);
  }

  // 2〜4. manifest ↔ 設定
  const byKey = new Map();
  for (const [logical, e] of entries) {
    const g = (cfg.groups || []).find((x) => x.id === e.group);
    if (!g) { fail('manifest-group', 'manifest の group "' + e.group + '" が設定に無い', logical); continue; }

    let expectKey;
    try { expectKey = r2KeyFor(logical, g); } catch (err) { fail('manifest-key', err.message, logical); continue; }
    if (e.r2Key !== expectKey) fail('manifest-key', 'r2Key が設定から導ける値と違う（manifest ' + e.r2Key + ' / 期待 ' + expectKey + '）', logical);

    // ワークツリーに実体があるときだけ公開判定を再計算できる（消した後は manifest の記録を信じる）
    if (existsSync(join(REPO_ROOT, logical))) {
      const expectBucket = bucketForFile(logical, g);
      if (e.bucket !== expectBucket) {
        fail('manifest-bucket', 'bucket が routing と違う（manifest ' + e.bucket + ' / 期待 ' + expectBucket + '）', logical);
      }
      const expectVis = visibilityFor(logical, g);
      if (e.visibility !== expectVis) {
        warn('manifest-visibility', '公開判定が変わっている（manifest ' + e.visibility + ' / 現在 ' + expectVis + '）。公開→非公開へ変わったなら public バケットから消す必要がある', logical);
      }
    }

    if (e.bucket === 'public' && e.visibility !== 'public') {
      fail('misplaced-public', '公開バケットに非公開判定のものが載っている', logical);
    }

    const dup = byKey.get(e.r2Key);
    if (dup) fail('key-collision', 'r2Key が ' + dup + ' と衝突している（後勝ちで上書きされる）', logical);
    else byKey.set(e.r2Key, logical);
  }

  // 5. 復元不能の検出（この検査の主目的）
  const tracked = new Set(git(['ls-files']).split('\n').filter(Boolean).map(toPosix));
  let checkedRecoverable = 0;
  for (const g of cfg.groups || []) {
    const re = new RegExp(g.match.pathRegex);
    // manifest に載っているもののうち、追跡外かつローカル実体なしのものを見る
    for (const [logical, e] of entries) {
      if (e.group !== g.id) continue;
      if (!re.test(logical)) continue;
      checkedRecoverable++;
      const localExists = existsSync(join(REPO_ROOT, logical));
      const inGit = tracked.has(logical);
      const inCache = existsSync(cachePathFor(cfg, e.r2Key));
      if (localExists || inGit || inCache) continue;
      // 実体はどこにも無い。R2 にあるはず（offload が sha256 で確認済み）なので manifest が命綱。
      if (!e.sha256 || !e.bytes) {
        fail('unrecoverable', 'ローカルにも Git にも cache にも無く、manifest の sha256/bytes も欠けている＝復元の確認手段が無い', logical);
      }
    }
  }

  // 7. 未退避かつ未追跡の検出
  //
  // 退避対象は .gitignore してあるので `git status` に出ない。offload を忘れると
  // ローカルにしか実体が無い状態が無言で続き、次に気づくのはそのマシンを失ったときになる。
  // ここは**ワークツリーを走査する**唯一の検査で、CI（追跡ファイルしか無い）では
  // 走査 0 件になる。0 件を「異常なし」と読ませないため件数を必ず出す。
  const scan = { walked: 0, matched: 0, tracked: 0, offloaded: 0, orphan: 0, hashed: 0, hashSkipped: 0, stale: 0, drive: 0 };
  const groups = (cfg.groups || []).map((g) => ({ g, re: new RegExp(g.match.pathRegex) }));
  // Drive vault 管轄（audience=human・active）のファイルは R2 の「未退避」ではない。
  // 台帳は drive-manifest.json 側で、検査は check-drive-vault が担う。ここで数えると
  // 移行が済んだグループのファイルが not-offloaded として偽の赤を出す。
  // 「Drive に居場所がある」＝ active な Drive group に一致する、または drive-manifest に既に登録済み
  // （移行中 pending の group でも、同期が済んだものは R2 未退避ではない）。
  let dcfg = null;
  let driveEntries = new Set();
  try { dcfg = loadDriveConfig(); driveEntries = new Set(Object.keys(loadDriveManifest().entries || {})); }
  catch { /* 設定が無ければ Drive 判定なしで続ける（check-drive-vault が別途落とす） */ }
  const isDriveManaged = (rel) => driveEntries.has(rel) || Boolean(dcfg && driveGroupFor(rel, dcfg, { includePending: false }));
  if (groups.length) {
    // 通常の制作物は content/、16:9動画の重い生成物だけは .tmp/video-render/ に置く。
    // 後者を走査しないと video-render-artifact group を追加しても、offload 忘れが
    // ローカル限定のまま無言で残るため、明示的に監視対象へ含める。
    const stack = [
      join(REPO_ROOT, 'content'),
      join(REPO_ROOT, '.tmp', 'video-render'),
    ];
    while (stack.length) {
      const dir = stack.pop();
      let ents = [];
      try { ents = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const ent of ents) {
        const abs = join(dir, ent.name);
        if (ent.isDirectory()) { if (ent.name !== '.git' && ent.name !== 'node_modules') stack.push(abs); continue; }
        scan.walked++;
        const rel = toPosix(abs.slice(REPO_ROOT.length + 1));
        if (isDriveManaged(rel)) { scan.drive++; continue; }
        const hit = groups.find(({ re }) => re.test(rel));
        if (!hit) continue;
        scan.matched++;
        if (tracked.has(rel)) { scan.tracked++; continue; }
        if (manifest.entries?.[rel]) {
          scan.offloaded++;
          // **ローカルが R2 より新しい状態を検出する**（2026-08-25 追加）。
          // それまでは manifest に載っているだけで緑にしていたので、
          // 「ローカルで作り直したのに R2 は旧版のまま」が見えなかった。
          // 実例: BK-01_道路/R03 の納品 PDF を再生成して note へ貼り直したが R2 は 1 世代前だった。
          //
          // 手元に実体がある退避対象は普通ごく少数（hydrate したものだけ）なので全件 hash する。
          // 多い端末で走ったときのために上限を置き、**打ち切ったら件数を必ず出す**
          // （黙って一部だけ見て緑にしない）。
          if (scan.hashed < HASH_LIMIT) {
            scan.hashed++;
            const local = createHash('sha256').update(readFileSync(abs)).digest('hex');
            if (local !== manifest.entries[rel].sha256) {
              scan.stale++;
              warn('local-newer', 'ローカルの実体が manifest（＝R2）と違う。作り直したものが R2 へ反映されていない: '
                + 'node scripts/asset-inbox-push.mjs --path "' + rel + '" --commit', rel);
            }
          } else {
            scan.hashSkipped++;
          }
          continue;
        }
        scan.orphan++;
        // 移行中（Drive 側が pending）の group は、置き場ルール上は既に人 tier。R2 へ上げる案内を出すと
        // 誤った tier へ誘導するので、drive-vault-sync を案内する（未同期であること自体は FAIL のまま）。
        const pendingDrive = dcfg ? driveGroupFor(rel, dcfg) : null;
        if (pendingDrive) {
          fail('not-offloaded', 'ワークツリーにしか無い（Git 非追跡・Drive 台帳未登録）。'
            + '人 tier（audience=human）なので Drive vault へ: '
            + 'node scripts/drive-vault-sync.mjs --group ' + pendingDrive.id + ' --commit', rel);
        } else {
          fail('not-offloaded', 'ワークツリーにしか無い（Git 非追跡・manifest 未登録）。'
            + 'offload しないとこのマシンを失った時点で復元不能: '
            + 'node scripts/asset-offload.mjs --group ' + hit.g.id + ' --commit --include-untracked', rel);
        }
      }
    }
  }

  // 出力
  const fails = problems.filter((p) => p.severity === 'FAIL');
  const warns = problems.filter((p) => p.severity === 'WARN');

  if (JSON_OUT) {
    console.log(JSON.stringify({
      groups: (cfg.groups || []).length,
      manifestEntries: entries.length,
      checkedRecoverable,
      fails: fails.length,
      warns: warns.length,
      problems,
    }, null, 2));
  } else {
    console.log('[check-asset-storage] group ' + (cfg.groups || []).length + ' 種 / manifest ' + entries.length + ' エントリを実検査');
    console.log('  ワークツリー走査 ' + scan.walked + ' ファイル / R2 退避対象に該当 ' + scan.matched
      + '（Git 追跡 ' + scan.tracked + ' / 退避済み ' + scan.offloaded + ' / どちらでもない ' + scan.orphan + '）'
      + (scan.drive ? ' / Drive vault 管轄 ' + scan.drive + '（check-drive-vault が検査）' : ''));
    if (scan.matched === 0) console.log('  ※ 該当 0 件。追跡ファイルしか無いツリー（CI・新規 clone）では正常。');
    // 「何件 hash を照合したか」を必ず出す。0 件照合の緑と、実際に一致している緑を区別する。
    console.log('  ローカル実体 ↔ R2 の sha256 照合 ' + scan.hashed + ' 件'
      + '（不一致 ' + scan.stale + '）'
      + (scan.hashSkipped ? ' ※ 上限 ' + HASH_LIMIT + ' 件を超えたため ' + scan.hashSkipped + ' 件は未照合' : ''));
    console.log('  manifest: ' + toPosix(MANIFEST_PATH.slice(REPO_ROOT.length + 1)));
    if (entries.length === 0) {
      // 退避がまだ 1 件も無いのは正常な初期状態。ただし「検査した結果 0 件」と明示する。
      console.log('  退避済みエントリはまだ 0 件（Phase 4 未着手の正常な状態。異常なしではなく未実施）');
    }
    for (const p of problems.slice(0, 40)) {
      console[p.severity === 'FAIL' ? 'error' : 'warn']('  [' + p.severity + '] ' + p.kind + ' ' + (p.path ? p.path + ' — ' : '') + p.detail);
    }
    if (problems.length > 40) console.log('  ... ほか ' + (problems.length - 40) + ' 件');
  }

  if (fails.length) {
    console.error('[check-asset-storage] FAIL: 不整合 ' + fails.length + ' 件（WARN ' + warns.length + ' 件）');
    process.exit(1);
  }
  console.log('[check-asset-storage] ✓ 台帳・設定・ワークツリーの辻褄は合っている' + (warns.length ? '（WARN ' + warns.length + ' 件）' : ''));
}

main();
