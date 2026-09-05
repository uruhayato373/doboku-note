#!/usr/bin/env node
// check-drive-vault.mjs — アセット置き場ルール（audience）と Drive vault 台帳の整合ゲート。
//
// 守りたい事故は 2 つ:
//   A. **誤った tier に置く**。人しか読まないものを R2 へ上げる／CI が読むものを Drive へ置く。
//      2026-09-05 に共通仕様書のページ画像 3.4GB を private R2 へ上げかけた再発防止。
//   B. **どこにも実体が無いのに誰も気づかない**（R2 系の check-asset-storage と同じ芯を Drive にも）。
//
// 検査:
//   (a) drive-vault.json の妥当性
//   (b) drive-manifest ↔ 設定（group 実在・vaultPath が導出値と一致・衝突なし・秘密混入なし）
//   (c) **ルーティング衝突** — 各ファイルが asset-storage.json ∪ drive-vault.json(active) の高々 1 group に一致
//   (d) **audience ゲート** — asset-storage.json の全 group に audience。site⇒public / ci⇒private|byVisibility /
//       human は audienceException（20 字以上）が無ければ FAIL（＝Drive へ移すべきもの）
//   (e) マウントあり: vault の実在＋sha256 サンプル（--deep で全件）
//   (f) 未同期 — active な Drive group に一致するローカル実体が台帳に無い → FAIL＋実行コマンド
//
// **マウント無し（CI・別端末）では (e)(f) を「実体検査 0 件」と明示して (a)〜(d) だけで判定する。**
// 無言の緑を作らない（CLAUDE.md §9）。
//
// 使い方:
//   node scripts/check-drive-vault.mjs                # 全部
//   node scripts/check-drive-vault.mjs --deep         # (e) を全件
//   node scripts/check-drive-vault.mjs --staged-only  # pre-commit 用。staged パスだけで (a)(c)(d)＋Drive 管轄の再追跡検知
//   node scripts/check-drive-vault.mjs --json
//
// exit 0 = 整合 / exit 1 = 不整合 / exit 2 = 検査不成立（設定が読めない）

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadDriveConfig, resolveVaultRoot, loadDriveManifest, vaultRelFor, vaultAbsFor, realBytesAndHashes, routingFor, toVaultRel,
} from './lib/drive-vault.mjs';
import { loadConfig as loadR2Config, findSecrets, AUDIENCES, AUDIENCE_RULES } from './lib/asset-storage.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const argv = process.argv.slice(2);
const DEEP = argv.includes('--deep');
const STAGED_ONLY = argv.includes('--staged-only');
const JSON_OUT = argv.includes('--json');
const SAMPLE = 30;
const NAME = 'check-drive-vault';

/** 走査するローカルの根。ここ以外に退避対象は置かない設計（asset-storage.json / drive-vault.json の regex が指す範囲）。 */
const SCAN_ROOTS = ['content/', '.tmp/video-render/', 'scripts/kindle-dist/', '.claude/config/coconala/assets/', '.claude/state/ocr-audit/', 'scripts/kindle-published/cover-designs/', '.local/archive/'];

const git = (args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: REPO_ROOT, encoding: 'utf-8', maxBuffer: 512 * 1024 * 1024 });

const problems = [];
const fail = (kind, detail, path = null) => problems.push({ severity: 'FAIL', kind, detail, path });
const warn = (kind, detail, path = null) => problems.push({ severity: 'WARN', kind, detail, path });

async function main() {
  // (a) 設定
  let dcfg, r2cfg;
  try { dcfg = loadDriveConfig(); } catch (e) { console.error('[' + NAME + '] 検査不成立: ' + e.message); process.exit(2); }
  try { r2cfg = loadR2Config(); } catch (e) {
    // asset-storage.json 側の audience 欠落は loadConfig が例外にする。ここでは FAIL として拾い、検査は続ける。
    fail('audience', e.message);
    r2cfg = null;
  }

  // (d) audience ゲート（loadConfig が通っていても、規則の意味をここで再確認する）
  let audienceChecked = 0;
  if (r2cfg) {
    for (const g of r2cfg.groups || []) {
      audienceChecked++;
      if (!AUDIENCES.includes(g.audience)) { fail('audience', 'group ' + g.id + ' に audience が無い'); continue; }
      if (g.audience === 'human') {
        if (!(typeof g.audienceException === 'string' && g.audienceException.length >= 20)) {
          fail('audience', 'group ' + g.id + ' は audience=human。R2 に置くなら audienceException（20 字以上の理由）、さもなければ drive-vault.json へ');
        } else {
          warn('audience-exception', 'group ' + g.id + ' は human なのに R2 に残っている（例外: ' + g.audienceException.slice(0, 60) + '…）');
        }
      } else if (!AUDIENCE_RULES[g.audience].includes(g.bucket)) {
        fail('audience', 'group ' + g.id + ' は audience=' + g.audience + ' だが bucket=' + g.bucket + '（許容: ' + AUDIENCE_RULES[g.audience].join('|') + '）');
      }
    }
  }

  const activeDrive = (dcfg.groups || []).filter((g) => g.status === 'active');
  const pendingDrive = (dcfg.groups || []).filter((g) => g.status !== 'active');

  // 対象パスの列挙
  let paths;
  if (STAGED_ONLY) {
    paths = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']).split('\n').filter(Boolean).map(toVaultRel);
  } else {
    const tracked = git(['ls-files']).split('\n').filter(Boolean);
    const others = git(['ls-files', '--others', '--ignored', '--exclude-standard']).split('\n').filter(Boolean);
    paths = [...new Set([...tracked, ...others].map(toVaultRel))].filter((p) => SCAN_ROOTS.some((r) => p.startsWith(r)));
  }

  // (c) ルーティング衝突 ＋ staged の Drive 管轄再追跡
  let conflicts = 0, pendingOverlap = 0, routed = 0;
  for (const p of paths) {
    const r = routingFor(p, r2cfg, dcfg);
    const n = r.r2.length + r.driveActive.length;
    if (n === 0 && r.drivePending.length === 0) continue;
    routed++;
    if (n > 1) { conflicts++; fail('routing-conflict', '複数 group に一致（R2: ' + r.r2.join(',') + ' / Drive: ' + r.driveActive.join(',') + '）。同じパスを両 tier に置かない', p); }
    if (r.drivePending.length && r.r2.length) pendingOverlap++;
    if (STAGED_ONLY && r.driveActive.length) {
      fail('drive-reentry', 'Drive 管轄（' + r.driveActive.join(',') + '）のファイルを Git に入れようとしている。実体は vault、Git には台帳だけ', p);
    }
  }

  // (b) 台帳 ↔ 設定
  const manifest = loadDriveManifest();
  const entries = Object.entries(manifest.entries || {});
  for (const h of findSecrets(manifest)) fail('manifest-secret', '台帳に秘密らしき値・絶対パスが混ざっている（' + h.pattern + '）', h.key);
  const byVaultPath = new Map();
  for (const [rel, e] of entries) {
    const g = (dcfg.groups || []).find((x) => x.id === e.group);
    if (!g) { fail('manifest-group', '台帳の group "' + e.group + '" が drive-vault.json に無い', rel); continue; }
    if (!e.adopted) {
      try {
        const expect = vaultRelFor(rel, g);
        if (toVaultRel(e.vaultPath) !== expect) fail('manifest-path', 'vaultPath が導出値と違う（台帳 ' + e.vaultPath + ' / 期待 ' + expect + '）', rel);
      } catch (err) { fail('manifest-path', err.message, rel); }
    }
    // bytes は 0 が正当（版面に文字の無いページの text/pNNNN.txt）。欠落だけを見る。
    if (!e.sha256 || typeof e.bytes !== 'number') fail('manifest-hash', '台帳に sha256/bytes が無い＝復元の確認手段が無い', rel);
    const dup = byVaultPath.get(e.vaultPath);
    if (dup && !e.adopted && !manifest.entries[dup]?.adopted) fail('vault-collision', 'vaultPath が ' + dup + ' と衝突（後勝ちで上書き）', rel);
    else if (!dup) byVaultPath.set(e.vaultPath, rel);
  }

  // (e)(f) マウントが要る検査
  const mount = STAGED_ONLY ? { root: null, reason: '--staged-only はマウントを見ない' } : resolveVaultRoot({ cfg: dcfg });
  let existence = 0, hashed = 0, unsynced = 0, localNewer = 0, pendingUnsynced = 0, unreadable = 0;
  if (mount.root) {
    const step = DEEP ? 1 : Math.max(1, Math.floor(entries.length / SAMPLE));
    for (let i = 0; i < entries.length; i++) {
      const [rel, e] = entries[i];
      const abs = vaultAbsFor(mount.root, e.vaultPath);
      existence++;
      if (!existsSync(abs)) { fail('vault-missing', '台帳にあるが vault に無い: ' + e.vaultPath, rel); continue; }
      if (i % step === 0) {
        hashed++;
        // ストリーミングマウントはアップロード中・退避中のファイルの read を ECANCELED/EBUSY で切ることがある
        // （2026-09-05 に 6GB 同期直後の検査で実測）。1 件の読み損ねで検査全体を「不成立」にせず、
        // その件を読めなかったと数える。全サンプルが読めなければ実体検査 0 件＝不成立。
        try {
          const h = await realBytesAndHashes(abs);
          if (h.sha256 !== e.sha256) fail('vault-mismatch', 'vault の実体が台帳の sha256 と違う', rel);
        } catch (err) {
          unreadable++;
          warn('vault-unreadable', 'vault の実体を読めなかった（' + (err.code || err.message) + '）。マウントが同期中なら後で再検査', rel);
        }
      }
    }
    if (hashed > 0 && unreadable === hashed) {
      console.error('[' + NAME + '] 検査不成立: サンプル ' + hashed + ' 件すべてを読めなかった（マウントが同期中か切断）。実体検査 0 件。');
      process.exit(2);
    }
    for (const p of paths) {
      const r = routingFor(p, r2cfg, dcfg);
      if (r.driveActive.length === 1) {
        const abs = join(REPO_ROOT, p);
        if (!existsSync(abs)) continue;
        const e = manifest.entries[p];
        if (!e) {
          unsynced++;
          fail('unsynced', 'ローカルにしか無い（台帳未登録）。このマシンを失うと復元不能: node scripts/drive-vault-sync.mjs --group ' + r.driveActive[0] + ' --commit', p);
        } else if (hashed < 500) {
          const l = await realBytesAndHashes(abs);
          if (l.sha256 !== e.sha256) { localNewer++; warn('local-newer', 'ローカルの実体が台帳（＝vault）と違う。作り直したものを反映する: node scripts/drive-vault-sync.mjs --path "' + p + '" --commit --force', p); }
        }
      } else if (r.drivePending.length && !manifest.entries[p]) {
        pendingUnsynced++;
      }
    }
  }

  const fails = problems.filter((p) => p.severity === 'FAIL');
  const warns = problems.filter((p) => p.severity === 'WARN');
  if (JSON_OUT) {
    console.log(JSON.stringify({ mount: mount.root ? mount.source : null, audienceChecked, paths: paths.length, routed, conflicts, pendingOverlap, manifestEntries: entries.length, existence, hashed, unsynced, localNewer, fails: fails.length, warns: warns.length, problems }, null, 2));
  } else {
    console.log('[' + NAME + '] ' + (STAGED_ONLY ? 'staged ' : '') + 'パス ' + paths.length + ' 件を実検査 / いずれかの group に一致 ' + routed + ' / 衝突 ' + conflicts + ' / 移行中(pending)の重なり ' + pendingOverlap);
    console.log('  audience 検査 ' + audienceChecked + ' group（asset-storage.json）/ Drive group active ' + activeDrive.length + '・pending ' + pendingDrive.length + ' / 台帳 ' + entries.length + ' エントリ');
    if (mount.root) {
      console.log('  mount: ' + mount.root + '（' + mount.source + '）— 実在確認 ' + existence + ' 件 / sha256 実照合 ' + hashed + ' 件' + (unreadable ? '（うち読めず ' + unreadable + '）' : '') + (DEEP ? '（全件）' : '（サンプル。全件は --deep）') + ' / 未同期 ' + unsynced + ' / ローカルが新しい ' + localNewer + (pendingUnsynced ? ' / 移行待ち(pending)の未同期 ' + pendingUnsynced : ''));
    } else {
      console.log('  mount 無し・実体検査 0 件（' + mount.reason + '）。(a)〜(d) だけで判定する。');
    }
    for (const p of problems.slice(0, 40)) console[p.severity === 'FAIL' ? 'error' : 'warn']('  [' + p.severity + '] ' + p.kind + ' ' + (p.path ? p.path + ' — ' : '') + p.detail);
    if (problems.length > 40) console.log('  ... ほか ' + (problems.length - 40) + ' 件');
  }
  if (fails.length) { console.error('[' + NAME + '] FAIL ' + fails.length + ' 件（WARN ' + warns.length + ' 件）'); process.exit(1); }
  console.log('[' + NAME + '] ✓ 置き場ルールと Drive 台帳は整合' + (warns.length ? '（WARN ' + warns.length + ' 件）' : '') + (mount.root ? '' : '。実体は未検査'));
}

main().catch((e) => { console.error('[' + NAME + '] 検査不成立: ' + String(e.message || e).slice(0, 300)); process.exit(2); });
