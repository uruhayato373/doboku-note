/**
 * drive-vault.mjs — 「人か手元のスクリプトだけが使う」アセットの置き場＝Google Drive vault の共通基盤。
 *
 * R2 系（asset-storage.mjs）とは**独立した系**にしてある。R2 側の upload/hydrate/verify は
 * fail-closed に作り込まれており、そこへ第 3 の行き先の分岐を足すと 6 か所以上の
 * `cfg.buckets[e.bucket].name` が壊れる。Drive の通常の同期復元は OS マウントを使い、CI には無い。
 * コネクター経由の転送は全バイト読み戻し後に drive-connector-register で同じ台帳へ登録する。
 * 構造が違うものは別の系にして、重なり（同じパスが両方に一致する）を検査で止める。
 *
 * 設定: config/drive-vault.json / 台帳: .claude/state/assets/drive-manifest.json
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
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, sep } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { REPO_ROOT } from './repository-paths.mjs';
import { datasetPath } from './datasets.mjs';
import { loadReferenceSources, transcriptDirsForSource } from './reference-sources.mjs';

export const DRIVE_CONFIG_PATH = join(REPO_ROOT, datasetPath('config.drive-vault'));
export const DRIVE_MANIFEST_PATH = join(REPO_ROOT, '.claude/state/assets/drive-manifest.json');

/** vault 相対パスは常に '/' 区切り・NFC。Windows の '\\' と macOS の NFD を寄せる。 */
export const toVaultRel = (p) => p.split(sep).join('/').split('\\').join('/').normalize('NFC');

export const KNOWN_KEY_FROM = ['repoRelative', 'standards-beside-pdf', 'reference-transcript'];

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
    if (exists(toVaultRel(join(root, marker)))) return { root, source: 'env:' + envName };
    return { root: null, reason: envName + '=' + root + ' が指す先に ' + marker + ' が無い（env は最優先なので候補へは落ちない）' };
  }

  for (const c of vr.candidates || []) {
    if (c.platform && c.platform !== platform) continue;
    const raw = c.glob || c.path;
    if (!raw) continue;
    const expanded = expandStarOnce(expandHome(raw.split('\\').join('/'), { homeDir, env }), { listDir });
    for (const root of expanded) {
      tried.push(root);
      if (exists(toVaultRel(join(root, marker)))) return { root: root.replace(/\/+$/, ''), source: 'candidate:' + raw };
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
 *   reference-transcript  → 新旧の論理キーを参考文献台帳から各原資料の ocr/ へ解決する
 */
export function vaultRelFor(repoRelPath, group, { readManifest = defaultStandardsManifestReader, sources = null } = {}) {
  const p = toVaultRel(repoRelPath);
  const kf = group.keyFrom || 'repoRelative';
  const dir = toVaultRel(group.vaultDir).replace(/\/+$/, '');
  if (kf === 'reference-transcript') {
    if (p.split('/').some(segment => !segment || segment === '.' || segment === '..')) throw new Error('drive-vault: unsafe transcript path: ' + p);
    const routes = (sources || referenceSourcesMemo()).flatMap(source => transcriptDirsForSource(source).map(prefix => ({ source, prefix })));
    const match = routes.filter(r => p.startsWith(r.prefix + '/')).sort((a,b) => b.prefix.length-a.prefix.length)[0];
    const target = match?.source.transcriptVaultDir || (match?.source.origin?.vaultDir ? match.source.origin.vaultDir + '/ocr' : null);
    if (!target) throw new Error('drive-vault: 文字起こしの参考文献と保管先が未登録: ' + p);
    if (!target.startsWith('原資料PDF/') || target.includes('\\') || target.split('/').some(s => !s || s === '.' || s === '..')) throw new Error('drive-vault: unsafe transcript destination: ' + target);
    return target + p.slice(match.prefix.length);
  }
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
 * vaultRelFor の逆。vault にだけある原本（白書など）を台帳へ登録するとき、repo 側のキーを導く。
 * 逆に引けるのは stripPrefix と repoRelative だけ。導いたキーが同じ group に戻らなければ null。
 */
export function repoRelForVault(vaultRel, group, cfg) {
  const v = toVaultRel(vaultRel);
  const dir = toVaultRel(group.vaultDir).replace(/\/+$/, '');
  if (!v.startsWith(dir + '/')) return null;
  const rest = v.slice(dir.length + 1);
  const kf = group.keyFrom || 'repoRelative';
  let rel = null;
  if (kf === 'repoRelative') rel = rest;
  else if (kf.startsWith('stripPrefix:')) rel = kf.slice('stripPrefix:'.length) + rest;
  if (!rel) return null;
  return driveGroupFor(rel, cfg, { includePending: false })?.id === group.id ? rel : null;
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

// 台帳 2 万件の読み時補完（vaultPath の導出）で同じ manifest.json を何千回も読まないためのメモ。
// 1 プロセス内でだけ有効（ファイルが変わる運用はビルド 1 回＝1 プロセス）。
const standardsManifestMemo = new Map();
let referenceMemo;
function referenceSourcesMemo() {
  return referenceMemo ||= loadReferenceSources().sources;
}
function defaultStandardsManifestReader(agencyId, documentId) {
  const k = agencyId + '/' + documentId;
  if (standardsManifestMemo.has(k)) return standardsManifestMemo.get(k);
  const p = join(REPO_ROOT, 'content/sources/standards', agencyId, documentId, 'manifest.json');
  let v = null;
  if (existsSync(p)) { try { v = JSON.parse(readFileSync(p, 'utf-8')); } catch { v = null; } }
  standardsManifestMemo.set(k, v);
  return v;
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
    note: 'Drive vault 台帳（lean format）。キーは repo 相対パス、vaultPath は vault 相対で、group 定義から導出できるとき（adopted でない）は省く。regenerable も group 既定と同じなら省く。読むときは loadDriveManifest が補う。絶対パス・秘密値を書かない。マウント先は実行時に resolveVaultRoot が解決する。',
    entries: {},
  };
}

/**
 * 台帳の lean format（2026-09-06・DN-0172）。
 *
 * ディスク上の台帳は **group 定義から今まさに導出できる値を持たない**:
 *   - vaultPath  … adopted でないエントリは vaultRelFor(rel, group) と一致するので省く
 *   - regenerable … group.regenerable と一致するなら省く
 * sha256 / md5 / bytes / width / height / syncedAt / verifiedAt / adopted は導出できないので常に持つ。
 * 読み出し側（loadDriveManifest）は hydrateDriveEntry で省いた値を補うので、台帳を使うコードは
 * 常に完全なエントリを見る。**台帳 JSON を直読みするコードは vaultPath / regenerable を当てにしない**
 * （必要なら loadDriveManifest か expandDriveManifest を通す）。
 *
 * 間引くのは「導出値と一致するとき」だけ。導出値とずれたエントリ（過去の設定変更・手で置いた原本の adopt）
 * は明示のまま残す。R2 側 manifest.json の lean format（asset-storage.mjs）と同じ判断。
 */
export function hydrateDriveEntry(rel, entry, cfg = loadDriveConfig()) {
  const out = { ...entry };
  const g = (cfg.groups || []).find((x) => x.id === entry.group);
  if (!g) return out;
  if (out.vaultPath === undefined) {
    try { out.vaultPath = vaultRelFor(rel, g); } catch { /* 導出不能は undefined のまま。check-drive-vault (b) が拾う */ }
  }
  if (out.regenerable === undefined && g.regenerable !== undefined) out.regenerable = g.regenerable;
  return out;
}

export function expandDriveManifest(manifest, cfg = loadDriveConfig()) {
  const out = { ...manifest, entries: {} };
  for (const [rel, e] of Object.entries(manifest.entries || {})) out.entries[rel] = hydrateDriveEntry(rel, e, cfg);
  return out;
}

export function toLeanDriveManifest(manifest, cfg = loadDriveConfig()) {
  const out = { ...manifest, entries: {} };
  for (const [rel, e] of Object.entries(manifest.entries || {})) {
    const lean = sanitizeDriveEntry(e);
    const g = (cfg.groups || []).find((x) => x.id === e.group);
    if (g) {
      if (lean.vaultPath !== undefined && !lean.adopted) {
        let derived = null;
        try { derived = vaultRelFor(rel, g); } catch { derived = null; }
        if (derived !== null && derived === lean.vaultPath) delete lean.vaultPath;
      }
      if (lean.regenerable !== undefined && g.regenerable !== undefined && lean.regenerable === g.regenerable) delete lean.regenerable;
    }
    out.entries[rel] = lean;
  }
  return out;
}

/** ヘッダは読みやすく、entries は 1 エントリ 1 行（2 万件で 12 行/件の pretty print は diff も容量も無駄）。妥当な JSON。 */
export function serializeDriveManifest(manifest) {
  const { entries, ...head } = manifest;
  const headJson = JSON.stringify(head, null, 2).replace(/\n\}$/, '');
  const lines = Object.entries(entries || {}).map(([k, v]) => '    ' + JSON.stringify(k) + ': ' + JSON.stringify(v));
  return headJson + (Object.keys(head).length ? ',\n' : '') + '  "entries": {' + (lines.length ? '\n' + lines.join(',\n') + '\n  ' : '') + '}\n}\n';
}

/** 台帳を読む。ディスク上は lean format なので、省かれた vaultPath / regenerable を group 定義から補って返す。 */
export function loadDriveManifest({ hydrate = true, path = DRIVE_MANIFEST_PATH } = {}) {
  if (!existsSync(path)) return withBase(emptyDriveManifest());
  let m;
  try { m = JSON.parse(readFileSync(path, 'utf-8')); }
  catch (e) { throw new Error('drive-vault: 台帳が壊れている（' + path + '）: ' + e.message); }
  if (!m.entries) m.entries = {};
  return withBase(hydrate ? expandDriveManifest(m) : m);
}

/**
 * 読んだ時点の entries の写し。writeDriveManifestAtomic はこれと比べて「この書き手が変えた行」だけを、書く直前に
 * 読み直した台帳へ重ねる。なぜ: 台帳を読んでから長く処理して丸ごと書き戻す作りなので、drive-vault-sync を 2 本
 * 同時に回すと後から書いた側が先の側の登録を消していた（2026-10-10・DN-0656）。列挙されない Symbol に置くので
 * JSON にも `{ ...manifest }` にも乗らない。
 */
const BASE = Symbol('driveManifestBase');
function withBase(m) {
  Object.defineProperty(m, BASE, { value: structuredClone(m.entries || {}), writable: true, enumerable: false });
  return m;
}

/** 台帳の書き込みを排他する（mkdir は原子的）。取れなければ待ち、10 分より古い lock は落ちた書き手の残骸として外す */
function withManifestLock(path, fn) {
  const lock = path + '.lock';
  const deadline = Date.now() + 120_000;
  for (;;) {
    try { mkdirSync(lock); break; } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try {
        const age = Date.now() - Number(readFileSync(join(lock, 'at'), 'utf-8'));
        if (age > 600_000) { rmSync(lock, { recursive: true, force: true }); continue; }
      } catch { /* at を書く前の一瞬。待つ */ }
      if (Date.now() > deadline) throw new Error('drive-vault: 台帳の lock が 2 分取れない（' + lock + '）。別の drive-vault-sync が動いていないか確かめる');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
    }
  }
  try { writeFileSync(join(lock, 'at'), String(Date.now())); return fn(); }
  finally { rmSync(lock, { recursive: true, force: true }); }
}

/** 台帳に載せてよいキーだけを通す。絶対パスやローカル固有の値の混入経路を塞ぐ。 */
const ENTRY_KEYS = ['group', 'vaultPath', 'sha256', 'md5', 'bytes', 'width', 'height', 'regenerable', 'syncedAt', 'verifiedAt', 'adopted', 'driveFileId'];
export function sanitizeDriveEntry(e) {
  const out = {};
  for (const k of ENTRY_KEYS) if (e[k] !== undefined) out[k] = e[k];
  if (out.vaultPath !== undefined) out.vaultPath = toVaultRel(String(out.vaultPath));
  return out;
}

/**
 * 台帳を lean format で書く。一時ファイルへ書いて読み直し、**補完すると元のエントリへ戻ること**を
 * 全件 deep-equal で確かめてから置換する（戻らないなら 1 件も書かない・fail-closed）。
 * 途中で落ちても既存台帳を壊さない。
 */
export function writeDriveManifestAtomic(manifest, cfg = loadDriveConfig(), { path = DRIVE_MANIFEST_PATH } = {}) {
  mkdirSync(dirname(path), { recursive: true });
  return withManifestLock(path, () => writeMerged(manifest, cfg, path));
}

function writeMerged(manifest, cfg, path) {
  // 読み直した台帳に、この書き手が読んだ後に足した・変えた・消した行だけを重ねる（他の書き手の行は残す）
  const base = manifest[BASE];
  let entries = manifest.entries || {};
  if (base) {
    const disk = existsSync(path) ? loadDriveManifest({ path }).entries : {};
    const merged = { ...disk };
    for (const [rel, e] of Object.entries(entries)) if (!isDeepStrictEqual(e, base[rel])) merged[rel] = e;
    for (const rel of Object.keys(base)) if (!(rel in entries)) delete merged[rel];
    entries = merged;
  }
  const full = { ...manifest, entries: {} };
  for (const [rel, e] of Object.entries(entries)) full.entries[rel] = hydrateDriveEntry(rel, sanitizeDriveEntry(e), cfg);
  const lean = toLeanDriveManifest(full, cfg);
  const tmp = path + '.tmp';
  writeFileSync(tmp, serializeDriveManifest(lean));
  let back;
  try { back = JSON.parse(readFileSync(tmp, 'utf-8')); } catch (e) { unlinkSync(tmp); throw new Error('drive-vault: 台帳の書き出しが JSON として読めないので置換しない: ' + e.message); }
  if (!back.entries || typeof back.entries !== 'object') { unlinkSync(tmp); throw new Error('drive-vault: 台帳の書き出し検証に失敗したので置換しない'); }
  const restored = expandDriveManifest(back, cfg);
  if (!isDeepStrictEqual(restored.entries, full.entries)) {
    unlinkSync(tmp);
    throw new Error('drive-vault: lean 化した台帳を補完しても元に戻らないので置換しない（group 定義と台帳の導出がずれている）');
  }
  renameSync(tmp, path);
  // 次の書き込みの基準を今の台帳にそろえ、他の書き手の行も手元の entries に入れる（入れないと次回「消した」と読む）
  if (base) {
    for (const [rel, e] of Object.entries(entries)) if (!(rel in (manifest.entries || {}))) manifest.entries[rel] = e;
    manifest[BASE] = structuredClone(full.entries);
  }
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
  const r = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/drive-vault-sync.mjs'), '--pull', '--path', rel, '--commit'], {
    cwd: REPO_ROOT, stdio: 'inherit',
  });
  return r.status === 0 && existsSync(absPath);
}

/**
 * 書き換えない group（immutable）で、置こうとしている中身が許されないときの理由（無ければ null）。
 * 名前の sha8 が中身と違う・台帳に同じ名前で別の中身がある、のどちらも別名（sha 入り）で置き直す（DN-0589 の再発防止）。
 */
export function immutableConflict(group, rel, sha256, cur) {
  if (!group?.immutable) return null;
  const named = /\.([0-9a-f]{8})\.[a-z0-9]+$/.exec(rel)?.[1];
  if (named && named !== String(sha256).slice(0, 8)) return '名前の sha8（' + named + '）が中身の sha256 と違う';
  if (cur && cur.sha256 !== sha256) return '書き換えない group で台帳と中身が違う（別名で置く）';
  return null;
}
