/**
 * drive-vault.mjs — 「人か手元のスクリプトだけが使う」アセットの置き場＝Google Drive vault の共通基盤。
 *
 * R2 系（asset-storage.mjs）とは**独立した系**にしてある。R2 側の upload/hydrate/verify は
 * fail-closed に作り込まれており、そこへ第 3 の行き先の分岐を足すと 6 か所以上の
 * `cfg.buckets[e.bucket].name` が壊れる。Drive は S3 ではなく OS のマウントで、CI には無い。
 * 構造が違うものは別の系にして、重なり（同じパスが両方に一致する）を検査で止める。
 *
 * 設定: .claude/config/drive-vault.json / 台帳: .claude/state/assets/drive-manifest.json
 *
 * 設計の芯:
 *   1. **マウント先は実行時に解決し、台帳には vault 相対パスだけを書く。** 絶対パス
 *      （/Users/… や G:\…）は端末ごとに違い、public repo の台帳に載せるものでもない。
 *   2. **サイズとハッシュは必ず読んで測る。** Drive のストリーミングマウントは cloud-only の
 *      ファイルに対して stat で 16MiB のプレースホルダを返す（2026-09-05 実測: 実 58MB の PDF が 16,777,216）。
 *   3. **resolveVaultRoot は例外を投げない。** 無ければ { root: null, reason } を返す。
 *      呼び出し側が「マウント無し」を明示して止まるか、実体検査 0 件と出力するかを決める。
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, sep } from 'node:path';
import { REPO_ROOT } from './repository-paths.mjs';

export const DRIVE_CONFIG_PATH = join(REPO_ROOT, '.claude/config/drive-vault.json');
export const DRIVE_MANIFEST_PATH = join(REPO_ROOT, '.claude/state/assets/drive-manifest.json');

/** vault 相対パスは常に '/' 区切り・NFC。Windows の '\\' と macOS の NFD を寄せる。 */
export const toVaultRel = (p) => p.split(sep).join('/').split('\\').join('/').normalize('NFC');

export const KNOWN_KEY_FROM = ['repoRelative', 'standards-beside-pdf'];

export function loadDriveConfig() {
  if (!existsSync(DRIVE_CONFIG_PATH)) {
    throw new Error('drive-vault: 設定が無い（' + DRIVE_CONFIG_PATH + '）。検査不成立。');
  }
  const cfg = JSON.parse(readFileSync(DRIVE_CONFIG_PATH, 'utf-8'));
  for (const g of cfg.groups || []) {
    if (!g.id) throw new Error('drive-vault: id の無い group がある');
    if (g.audience !== 'human') throw new Error('drive-vault: group ' + g.id + ' の audience は human でなければならない（' + g.audience + '）');
    if (!['pending', 'active'].includes(g.status)) throw new Error('drive-vault: group ' + g.id + ' の status "' + g.status + '" が未知（pending|active）');
    if (!g.vaultDir || g.vaultDir.startsWith('/') || /^[A-Za-z]:/.test(g.vaultDir)) throw new Error('drive-vault: group ' + g.id + ' の vaultDir は vault 相対でなければならない');
    try { new RegExp(g.match.pathRegex); } catch (e) { throw new Error('drive-vault: group ' + g.id + ' の pathRegex が壊れている: ' + e.message); }
    const kf = g.keyFrom || 'repoRelative';
    if (!KNOWN_KEY_FROM.includes(kf) && !kf.startsWith('stripPrefix:')) throw new Error('drive-vault: group ' + g.id + ' の keyFrom "' + kf + '" が未知');
    if (!g.reason || g.reason.length < 20) throw new Error('drive-vault: group ' + g.id + ' に「なぜ Drive か」の reason（20 字以上）が要る');
  }
  return cfg;
}

// ------------------------------------------------------------------ マウント先の解決

/**
 * `~` と `%VAR%` を展開する。テストのために homeDir / env を注入できる。
 */
function expandHome(p, { homeDir, env }) {
  let out = p;
  if (out.startsWith('~')) out = homeDir + out.slice(1);
  out = out.replace(/%([A-Za-z_][A-Za-z0-9_]*)%/g, (_, k) => env[k] ?? (k === 'USERPROFILE' ? homeDir : ''));
  return out;
}

/**
 * 1 セグメントに `*` を 1 つだけ含む glob を展開する（`GoogleDrive-*` の形だけを想定）。
 * 汎用 glob ライブラリを持ち込まないため。複数候補が当たれば全部返す。
 */
function expandStarOnce(p, { listDir }) {
  const parts = p.split('/');
  const i = parts.findIndex((s) => s.includes('*'));
  if (i === -1) return [p];
  const base = parts.slice(0, i).join('/') || '/';
  const [pre, post] = parts[i].split('*');
  let names = [];
  try { names = listDir(base); } catch { return []; }
  return names
    .filter((n) => n.startsWith(pre) && n.endsWith(post))
    .map((n) => [...parts.slice(0, i), n, ...parts.slice(i + 1)].join('/'));
}

/**
 * vault のマウント先を解決する。**例外は投げない。**
 *   1. env（既定 DOBOKU_DRIVE_VAULT）
 *   2. 設定の candidates を platform で絞り、marker（README.md）が実在するもの
 * 返り値: { root, source } | { root: null, reason }
 *
 * platform / env / homeDir / exists / listDir は注入可能（tests/drive-vault.test.mjs が
 * darwin / win32 の両方を、実際のマウントが無い環境でも検査するため）。
 */
export function resolveVaultRoot(opts = {}) {
  const {
    cfg = loadDriveConfig(),
    platform = process.platform,
    env = process.env,
    homeDir = homedir(),
    exists = existsSync,
    listDir = (d) => readdirSync(d),
  } = opts;
  const vr = cfg.vaultRoot || {};
  const marker = vr.marker || 'README.md';
  const tried = [];

  const envName = vr.env || 'DOBOKU_DRIVE_VAULT';
  if (env[envName]) {
    const root = env[envName].split(sep).join('/').replace(/\/+$/, '');
    if (exists(join(root, marker))) return { root, source: 'env:' + envName };
    return { root: null, reason: envName + '=' + root + ' が指す先に ' + marker + ' が無い（env は最優先なので候補へは落ちない）' };
  }

  for (const c of vr.candidates || []) {
    if (c.platform && c.platform !== platform) continue;
    const raw = c.glob || c.path;
    if (!raw) continue;
    const expanded = expandStarOnce(expandHome(raw.split('\\').join('/'), { homeDir, env }), { listDir });
    for (const root of expanded) {
      tried.push(root);
      if (exists(join(root, marker))) return { root: root.replace(/\/+$/, ''), source: 'candidate:' + raw };
    }
    if (expanded.length === 0) tried.push(raw + '（展開結果なし）');
  }
  return {
    root: null,
    reason: 'Drive vault のマウントが見つからない（platform=' + platform + '）。試した候補: '
      + (tried.length ? tried.join(' / ') : '（なし）')
      + '。Google ドライブ アプリを起動して同期するか、' + envName + ' でマウント先を指定する。',
  };
}

// ------------------------------------------------------------------ 分類とパス導出

/** repo 相対パスから所属する Drive group を返す（最初に当たったもの）。無ければ null。 */
export function driveGroupFor(repoRelPath, cfg, { includePending = true } = {}) {
  const p = toVaultRel(repoRelPath);
  for (const g of cfg.groups || []) {
    if (!includePending && g.status !== 'active') continue;
    if (new RegExp(g.match.pathRegex).test(p)) return g;
  }
  return null;
}

/**
 * repo 相対パス → vault 相対パス（vaultDir を含む）。
 * keyFrom:
 *   repoRelative          → vaultDir/そのままの相対パス
 *   stripPrefix:<prefix>  → vaultDir/prefix を剥がした残り
 *   standards-beside-pdf  → 共通仕様書のページ画像専用。content/sources/standards/{a}/{d}/manifest.json の
 *                           sourceFile（例 東北地方整備局/common__xxx.pdf）から
 *                           vaultDir/東北地方整備局/common__xxx/pages/p0001.jpg を導く（原本 PDF と同名フォルダ＝隣）
 */
export function vaultRelFor(repoRelPath, group, { readManifest = defaultStandardsManifestReader } = {}) {
  const p = toVaultRel(repoRelPath);
  const kf = group.keyFrom || 'repoRelative';
  const dir = toVaultRel(group.vaultDir).replace(/\/+$/, '');
  if (kf === 'repoRelative') return dir + '/' + p;
  if (kf.startsWith('stripPrefix:')) {
    const prefix = kf.slice('stripPrefix:'.length);
    if (!p.startsWith(prefix)) throw new Error('drive-vault: ' + p + ' は group ' + group.id + ' の stripPrefix "' + prefix + '" で始まっていない');
    return dir + '/' + p.slice(prefix.length);
  }
  if (kf === 'standards-beside-pdf') {
    const m = /^content\/sources\/standards\/([^/]+)\/([^/]+)\/((?:pages|text)\/.+)$/.exec(p);
    if (!m) throw new Error('drive-vault: ' + p + ' は standards-beside-pdf の形（content/sources/standards/{a}/{d}/(pages|text)/…）ではない');
    const [, agencyId, documentId, tail] = m;
    const man = readManifest(agencyId, documentId);
    if (!man?.sourceFile) throw new Error('drive-vault: content/sources/standards/' + agencyId + '/' + documentId + '/manifest.json に sourceFile が無い（alias 文書には実体が無い）');
    const src = toVaultRel(man.sourceFile);
    const stem = src.replace(/\.pdf$/i, '');
    return dir + '/' + stem + '/' + tail;
  }
  throw new Error('drive-vault: 未知の keyFrom "' + kf + '"（group ' + group.id + '）');
}

/**
 * 1 つの repo パスがどの tier の group に一致するかを列挙する（衝突検査の純関数）。
 * R2 側（asset-storage.json）と Drive 側（drive-vault.json）を同時に見る。
 * 期待される正常形は「R2 1 件」か「Drive active 1 件」か「どれにも一致しない」のいずれか。
 * Drive pending は移行中の情報として別枠で返す（衝突には数えない）。
 */
export function routingFor(repoRelPath, r2Cfg, driveCfg) {
  const p = toVaultRel(repoRelPath);
  const r2 = (r2Cfg?.groups || []).filter((g) => new RegExp(g.match.pathRegex).test(p)).map((g) => g.id);
  const drive = (driveCfg?.groups || []).filter((g) => new RegExp(g.match.pathRegex).test(p));
  return {
    r2,
    driveActive: drive.filter((g) => g.status === 'active').map((g) => g.id),
    drivePending: drive.filter((g) => g.status !== 'active').map((g) => g.id),
  };
}

function defaultStandardsManifestReader(agencyId, documentId) {
  const p = join(REPO_ROOT, 'content/sources/standards', agencyId, documentId, 'manifest.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
}

/** vault 相対パス → 絶対パス（マウント先を付ける）。 */
export function vaultAbsFor(root, vaultRel) {
  return join(root, ...toVaultRel(vaultRel).split('/'));
}

// ------------------------------------------------------------------ 実測

/**
 * ストリーム 1 回で bytes / sha256 / md5 を測る。**statSync.size は使わない**
 * （ストリーミングマウントのプレースホルダを避ける）。md5 は Drive API の md5Checksum と
 * 突き合わせるためで、秘密ではない。
 */
export async function realBytesAndHashes(absPath) {
  return await new Promise((res, rej) => {
    const sha = createHash('sha256');
    const md5 = createHash('md5');
    let bytes = 0;
    createReadStream(absPath)
      .on('data', (c) => { sha.update(c); md5.update(c); bytes += c.length; })
      .on('end', () => res({ bytes, sha256: sha.digest('hex'), md5: md5.digest('hex') }))
      .on('error', rej);
  });
}

// ------------------------------------------------------------------ 台帳

export function emptyDriveManifest() {
  return {
    version: 1,
    note: 'Drive vault 台帳。キーは repo 相対パス、vaultPath は vault 相対。絶対パス・秘密値を書かない。マウント先は実行時に resolveVaultRoot が解決する。',
    entries: {},
  };
}

export function loadDriveManifest() {
  if (!existsSync(DRIVE_MANIFEST_PATH)) return emptyDriveManifest();
  let m;
  try { m = JSON.parse(readFileSync(DRIVE_MANIFEST_PATH, 'utf-8')); }
  catch (e) { throw new Error('drive-vault: 台帳が壊れている（' + DRIVE_MANIFEST_PATH + '）: ' + e.message); }
  if (!m.entries) m.entries = {};
  return m;
}

/** 台帳に載せてよいキーだけを通す。絶対パスやローカル固有の値の混入経路を塞ぐ。 */
const ENTRY_KEYS = ['group', 'vaultPath', 'sha256', 'md5', 'bytes', 'width', 'height', 'regenerable', 'syncedAt', 'verifiedAt', 'adopted'];
export function sanitizeDriveEntry(e) {
  const out = {};
  for (const k of ENTRY_KEYS) if (e[k] !== undefined) out[k] = e[k];
  if (out.vaultPath !== undefined) out.vaultPath = toVaultRel(String(out.vaultPath));
  return out;
}

/** 一時ファイルへ書いて読み直し、妥当なら置換する。途中で落ちても既存台帳を壊さない。 */
export function writeDriveManifestAtomic(manifest) {
  mkdirSync(dirname(DRIVE_MANIFEST_PATH), { recursive: true });
  const tmp = DRIVE_MANIFEST_PATH + '.tmp';
  writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n');
  const back = JSON.parse(readFileSync(tmp, 'utf-8'));
  if (!back.entries || typeof back.entries !== 'object') {
    unlinkSync(tmp);
    throw new Error('drive-vault: 台帳の書き出し検証に失敗したので置換しない');
  }
  renameSync(tmp, DRIVE_MANIFEST_PATH);
  return Object.keys(back.entries).length;
}

/**
 * 退避済みアセットを「使う直前に」手元へ用意する（R2 系の ensureLocal と同型）。
 * ローカルに在れば no-op。無ければ台帳を見て vault からコピーし、sha256 が一致したときだけ置く。
 * 台帳に無い・マウントが無い・一致しない → false。**呼び出し側は false で必ず止めること。**
 */
export function ensureLocalFromVault(absPath) {
  if (existsSync(absPath)) return true;
  const rel = toVaultRel(absPath.startsWith(REPO_ROOT) ? absPath.slice(REPO_ROOT.length + 1) : absPath);
  const entry = loadDriveManifest().entries?.[rel];
  if (!entry) return false;
  const r = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/drive-vault-sync.mjs'), '--pull', '--path', rel], {
    cwd: REPO_ROOT, stdio: 'inherit',
  });
  return r.status === 0 && existsSync(absPath);
}
