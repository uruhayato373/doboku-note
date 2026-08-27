/**
 * asset-storage.mjs — Git の外へ出すアセットの共通基盤（DN-0111 Phase 3）。
 *
 * asset-offload / asset-hydrate / check-asset-storage の 3 本が共有する。
 * 設定の真実源は .claude/config/asset-storage.json、台帳は .claude/state/assets/manifest.json。
 *
 * 設計の芯は 3 つ:
 *   1. **確認できないものは消さない。** upload 後に bytes と sha256 を R2 側から読み直して
 *      一致を確かめる。確かめられなければ manifest へ載せず、当然ローカルも消さない。
 *   2. **manifest は原子的に置換する。** 一時ファイルへ書いて検証が通ってから rename。
 *      途中で落ちても既存 manifest が壊れない。
 *   3. **秘密を持たない。** manifest に載るのは logicalPath / bucket / r2Key / sha256 /
 *      bytes / mime / visibility / regenerable / generator / requiredBy だけ。
 *      credential・署名 URL・Cookie・ローカル絶対パスは載せない。
 *
 * 会社 PC はプロキシで外部 API が遮断される（measurement-incidents.md）。R2 を触る操作は
 * 自宅端末か CI で行い、ローカルでは --dry-run / --offline で完結できるようにしてある。
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, createReadStream, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { REPO_ROOT } from './repository-paths.mjs';

export const CONFIG_PATH = join(REPO_ROOT, '.claude/config/asset-storage.json');
export const MANIFEST_PATH = join(REPO_ROOT, '.claude/state/assets/manifest.json');

/** R2 のキーは常に '/' 区切り。Windows の path.sep が '\\' なので正規化する。 */
export const toPosix = (p) => p.split(sep).join('/');

export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error('asset-storage: 設定が無い（' + CONFIG_PATH + '）。検査不成立。');
  }
  const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  for (const g of cfg.groups || []) {
    if (g.bucket === 'byVisibility') continue; // ファイル単位で解決する（bucketForFile）
    if (!cfg.buckets?.[g.bucket]) throw new Error('asset-storage: group ' + g.id + ' が未定義の bucket "' + g.bucket + '" を指している');
  }
  for (const need of ['public', 'private']) {
    if (!cfg.buckets?.[need]) throw new Error('asset-storage: buckets.' + need + ' が無い');
  }
  return cfg;
}

/**
 * .env.local を読む。CI では env 直供給なので上書きしない。
 * 値は返さず process.env へ載せるだけ（呼び出し側がログへ出さないようにするため）。
 */
export function loadEnvLocal() {
  const p = join(REPO_ROOT, '.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

/** credential が揃っているか。値そのものは返さない（ログ・例外メッセージへ漏らさない）。 */
export function hasR2Credentials() {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  );
}

/**
 * S3 クライアントを作る。@aws-sdk/client-s3 は動的 import にしてあるので、
 * dry-run / offline のときは依存を読み込まずに済む（プロキシ環境で無駄に失敗しない）。
 */
export async function makeS3() {
  if (!hasR2Credentials()) {
    throw new Error(
      'asset-storage: R2 credential が無い。.env.local に CLOUDFLARE_ACCOUNT_ID / '
      + 'CLOUDFLARE_R2_ACCESS_KEY_ID / CLOUDFLARE_R2_SECRET_ACCESS_KEY を置くか、CI の env で供給すること。'
      + '（credential をローカルへ置かない運用なら scripts/asset-inbox-push.mjs で CI へ渡す。'
      + '--dry-run / --offline なら credential 不要）',
    );
  }
  const { S3Client } = await import('@aws-sdk/client-s3');
  return new S3Client({
    region: 'auto',
    endpoint: 'https://' + process.env.CLOUDFLARE_ACCOUNT_ID + '.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
    requestHandler: await proxyRequestHandler(),
  });
}

/**
 * `HTTPS_PROXY` があればそれを通す requestHandler を返す（無ければ undefined = SDK 既定）。
 *
 * なぜ要るか（2026-08-25 実測）: 会社 PC のプロキシは R2 を**通す**。
 * `curl` で S3 エンドポイントを叩くと CONNECT トンネルが張られ、本物の R2 が
 * `Server: cloudflare` と S3 形式の `InvalidArgument: Authorization` を返す。
 * にもかかわらず SDK 経由だけ失敗するのは、**AWS SDK v3 が HTTPS_PROXY を自動で見ない**ため。
 * 直接 egress が塞がれた環境では SDK のリクエストだけが落ちる。
 * 「会社 PC は外部 API が遮断される」と記録されていたものの中には、この形が混ざっていた可能性が高い。
 *
 * `https-proxy-agent` は直接依存ではなく GA 系からの推移依存なので、**消えても壊れないように**
 * 動的 import を try/catch で包む。取れなければプロキシ無しで続行し、理由を一度だけ出す
 * （黙って素の接続に落ちると「なぜか繋がらない」に戻る）。
 */
let proxyHandlerCache;
async function proxyRequestHandler() {
  if (proxyHandlerCache !== undefined) return proxyHandlerCache;
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxyUrl) {
    proxyHandlerCache = undefined;
    return undefined;
  }
  try {
    const [{ NodeHttpHandler }, { HttpsProxyAgent }] = await Promise.all([
      import('@smithy/node-http-handler'),
      import('https-proxy-agent'),
    ]);
    proxyHandlerCache = new NodeHttpHandler({ httpsAgent: new HttpsProxyAgent(proxyUrl) });
  } catch (e) {
    console.warn(
      '[asset-storage] HTTPS_PROXY があるがプロキシ agent を読み込めなかった（' + e.message + '）。'
      + 'プロキシ無しで続行する。直接 egress が塞がれている環境では接続に失敗する。',
    );
    proxyHandlerCache = undefined;
  }
  return proxyHandlerCache;
}

// ------------------------------------------------------------------ 分類

/** repo 相対パスから所属 group を返す（最初に当たったもの）。無ければ null。 */
export function groupFor(repoRelPath, cfg) {
  const p = toPosix(repoRelPath);
  for (const g of cfg.groups || []) {
    if (new RegExp(g.match.pathRegex).test(p)) return g;
  }
  return null;
}

/**
 * repo 相対パス → R2 オブジェクトキー。
 * keyFrom:
 *   repoRelative                  → keyPrefix + そのままの相対パス
 *   stripPrefix:<prefix>          → keyPrefix + prefix を剥がした残り
 * キーは Windows / macOS で同一になる（toPosix 済み）。
 */
export function r2KeyFor(repoRelPath, group) {
  const p = toPosix(repoRelPath);
  const kf = group.keyFrom || 'repoRelative';
  let rest = p;
  if (kf.startsWith('stripPrefix:')) {
    const prefix = kf.slice('stripPrefix:'.length);
    if (!p.startsWith(prefix)) {
      throw new Error('asset-storage: ' + p + ' は group ' + group.id + ' の stripPrefix "' + prefix + '" で始まっていない');
    }
    rest = p.slice(prefix.length);
  } else if (kf !== 'repoRelative') {
    throw new Error('asset-storage: 未知の keyFrom "' + kf + '"（group ' + group.id + '）');
  }
  return (group.keyPrefix || '') + rest;
}

/**
 * ファイル単位の行き先バケット。
 * group.bucket が 'byVisibility' のときだけ公開判定で振り分ける（公開済み→public / それ以外→private）。
 * visibilityFor は判定不能を private へ倒すので、ここも自動的に安全側へ倒れる。
 */
export function bucketForFile(repoRelPath, group) {
  if (group.bucket !== 'byVisibility') return group.bucket;
  return visibilityFor(repoRelPath, group) === 'public' ? 'public' : 'private';
}

const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  gif: 'image/gif', svg: 'image/svg+xml', pdf: 'application/pdf',
  mp4: 'video/mp4', wav: 'audio/wav', mp3: 'audio/mpeg', epub: 'application/epub+zip',
};
export function mimeFor(p) {
  const ext = toPosix(p).split('.').pop().toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

/**
 * 公開範囲の解決。**判定不能なら必ず private 側へ倒す**——公開バケットへの誤配置は
 * 取り返しがつかない（購入者限定 PDF や未公開ドラフトが URL で取れるようになる）。
 */
export function visibilityFor(repoRelPath, group) {
  const vf = group.visibilityFrom || 'fixed:private';
  if (vf.startsWith('fixed:')) return vf.slice('fixed:'.length);
  if (vf === 'noteFrontmatter') return noteVisibility(repoRelPath);
  if (vf === 'igPackStatus') return igPackVisibility(repoRelPath);
  return 'private';
}

/**
 * note 記事 dir の frontmatter に noteUrl / noteId があれば公開済み。
 * ただし noteStatus: reserved（予約投稿・まだ note 上で非公開）は noteId が
 * 投稿作成時点で先に払い出されるため、noteId 単独では判定しない
 * （2026-08-27、学科記述予想/03_品質管理で reserved なのに public 誤判定を確認）。
 */
function noteVisibility(imgRelPath) {
  const articleDir = join(REPO_ROOT, dirname(dirname(toPosix(imgRelPath))));
  try {
    const names = readdirSync(articleDir);
    for (const n of names) {
      if (!/^article(-[A-Za-z0-9][A-Za-z0-9-]*)?\.md$/.test(n)) continue;
      const head = readFileSync(join(articleDir, n), 'utf-8').slice(0, 4000);
      const fm = head.split('\n---')[0];
      if (/^noteStatus:\s*reserved\s*$/m.test(fm)) return 'private';
      if (/^note(Url|Id):\s*\S/m.test(fm)) return 'public';
    }
  } catch { /* 判定不能 */ }
  return 'private';
}

/**
 * IG パックの status.json が「投稿済み」なら公開扱い。判定不能・未投稿は private。
 *
 * スキーマは 1 種類ではない（2026-08-21 実査で 106 ファイル中）:
 *   { carousel: { status, posted_at, permalink } }        85 件
 *   { reel:     { status, posted_at } }                   15 件
 *   { reel, carousel }                                     5 件
 *   { keyword, label, management, carousel, reels, posted } 1 件（旧形式・トップレベル posted）
 * いずれも **チャネル名の下に status がネストする**。トップレベルの status/posted だけを
 * 見ると 106 件中ほぼ全部を読み落とす（実際に最初の実装がそれで 6 件しか拾えなかった）。
 *
 * 判定は「どれか 1 チャネルでも posted なら公開扱い」。scheduled は**まだ公開されていない**
 * ので private のまま（予約が実行される前に公開バケットへ置くと先出しになる）。
 */
function igPackVisibility(imgRelPath) {
  let dir = join(REPO_ROOT, dirname(toPosix(imgRelPath)));
  for (let i = 0; i < 5; i++) {
    const s = join(dir, 'status.json');
    if (existsSync(s)) {
      try {
        const j = JSON.parse(readFileSync(s, 'utf-8'));
        if (j.posted === true) return 'public'; // 旧形式のトップレベル
        for (const v of Object.values(j)) {
          if (!v || typeof v !== 'object') continue;
          if (v.status === 'posted' || Boolean(v.posted_at) || Boolean(v.postedAt)) return 'public';
        }
      } catch { /* 壊れていたら private へ倒す */ }
      return 'private';
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return 'private';
}

// ------------------------------------------------------------------ ハッシュ

export function sha256File(absPath) {
  const h = createHash('sha256');
  h.update(readFileSync(absPath));
  return h.digest('hex');
}

export async function sha256Stream(absPath) {
  return await new Promise((res, rej) => {
    const h = createHash('sha256');
    createReadStream(absPath).on('data', (c) => h.update(c)).on('end', () => res(h.digest('hex'))).on('error', rej);
  });
}

// ------------------------------------------------------------------ manifest

export function emptyManifest() {
  return { version: 1, note: 'DN-0111 Phase 3。秘密値・署名 URL・絶対パスを書かないこと。', entries: {} };
}

export function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return emptyManifest();
  try {
    const m = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
    if (!m.entries) m.entries = {};
    return m;
  } catch (e) {
    throw new Error('asset-storage: manifest が壊れている（' + MANIFEST_PATH + '）: ' + e.message);
  }
}

/** manifest に載せてよいキーだけを通す。想定外のキーは落として秘密の混入を防ぐ。 */
// width / height は画像だけに付く。値は退避時に**実バイトのヘッダから測ったもの**で、
// 手で書いた値ではない（下の imageSize を参照）。秘密になり得ない数値なので allowlist に入れてよい。
const ENTRY_KEYS = ['logicalPath', 'bucket', 'r2Key', 'sha256', 'bytes', 'mime', 'visibility', 'regenerable', 'generator', 'requiredBy', 'group', 'verifiedAt', 'width', 'height'];
export function sanitizeEntry(e) {
  const out = {};
  for (const k of ENTRY_KEYS) if (e[k] !== undefined) out[k] = e[k];
  return out;
}

/**
 * 一時ファイルへ書いて、読み直して JSON として妥当なことを確かめてから置換する。
 * 途中で落ちても既存 manifest を壊さない。
 */
export function writeManifestAtomic(manifest) {
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  const tmp = MANIFEST_PATH + '.tmp';
  const body = JSON.stringify(manifest, null, 2) + '\n';
  writeFileSync(tmp, body);
  const back = JSON.parse(readFileSync(tmp, 'utf-8'));
  if (!back.entries || typeof back.entries !== 'object') {
    unlinkSync(tmp);
    throw new Error('asset-storage: manifest の書き出し検証に失敗したので置換しない');
  }
  renameSync(tmp, MANIFEST_PATH);
  return Object.keys(back.entries).length;
}

/** 秘密値・絶対パスの混入検査（check-asset-storage と単体テストの両方で使う）。 */
const SECRET_PATTERNS = [
  { id: 'aws-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: 'long-hex-secret', re: /\b[0-9a-f]{40,}\b/ },
  { id: 'signed-url', re: /[?&]X-Amz-(Signature|Credential)=/i },
  { id: 'cookie', re: /\b(Set-Cookie|sessionid|_note_session)\b/i },
  { id: 'absolute-path', re: /(^|["'\s])(\/Users\/|\/home\/|[A-Za-z]:\\\\)/ },
  { id: 'r2-endpoint', re: /r2\.cloudflarestorage\.com/i },
];
export function findSecrets(manifest) {
  const hits = [];
  for (const [k, e] of Object.entries(manifest.entries || {})) {
    // sha256 は 64 桁 hex なので long-hex-secret から除外して検査する
    const probe = JSON.stringify({ ...e, sha256: undefined });
    for (const p of SECRET_PATTERNS) {
      if (p.re.test(probe)) hits.push({ key: k, pattern: p.id });
    }
  }
  return hits;
}

// ------------------------------------------------------------------ cache

export function cacheDirFor(cfg) {
  return join(REPO_ROOT, cfg.cache?.dir || '.local/cache/assets');
}

/** cache 内のパスは R2 キーと同じ相対構造にする（Windows / macOS で同一キー）。 */
export function cachePathFor(cfg, r2Key) {
  return join(cacheDirFor(cfg), ...r2Key.split('/'));
}

/**
 * 退避済みアセットを「使う直前に」手元へ用意する（DN-0111）。
 *
 * 外部（note / Instagram 等）へ書き込むスクリプトは、実体が無いまま進んではいけない。
 * ローカルに在れば何もしない no-op、無ければ台帳を見て R2 から取り、
 * それでも用意できなければ false を返す。**呼び出し側は false で必ず止めること**
 * （カバー無しで公開する・PDF 無しで添付を名乗る、が最悪の結果になる）。
 *
 * 台帳に無いものは「退避対象ではない」ので false を返す（勝手に生成もしない）。
 */
export function ensureLocal(absPath) {
  if (existsSync(absPath)) return true;
  const rel = toPosix(absPath.startsWith(REPO_ROOT) ? absPath.slice(REPO_ROOT.length + 1) : absPath);
  const entry = loadManifest().entries?.[rel];
  if (!entry) return false;
  const r = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/asset-hydrate.mjs'), '--path', rel], {
    cwd: REPO_ROOT, stdio: 'inherit',
  });
  return r.status === 0 && existsSync(absPath);
}

export function fileBytes(absPath) {
  try { return statSync(absPath).size; } catch { return null; }
}

/**
 * 画像の寸法をヘッダから読む（PNG の IHDR / JPEG の SOF。sharp 非依存）。
 *
 * なぜ manifest に寸法を持たせるか: 退避すると CI からは実体が見えなくなる。
 * 寸法の検査を「ローカルに在る分だけ」にすると、全件退避した瞬間に
 * **0 件検査の緑**になる（CLAUDE.md §9「検査ゼロを PASS と呼ばない」）。
 * 退避時に実バイトから測って記録しておけば、以後は記録を検査できる。
 * sha256 が同じである限り中身は同じなので、記録は実体の性質を指し続ける。
 *
 * 測れなければ null を返す。呼び出し側は「寸法なし」を無言で通さないこと。
 */
export function imageSize(absPath) {
  let fd;
  try { fd = openSync(absPath, 'r'); } catch { return null; }
  try {
    const head = Buffer.alloc(32);
    const n = readSync(fd, head, 0, 32, 0);
    if (n >= 24 && head.toString('hex', 0, 8) === '89504e470d0a1a0a' && head.toString('latin1', 12, 16) === 'IHDR') {
      return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
    }
    if (n >= 4 && head[0] === 0xff && head[1] === 0xd8) return jpegSize(fd);
    return null;
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}

/** JPEG のセグメントを辿って SOF から寸法を取る。 */
function jpegSize(fd) {
  const buf = Buffer.alloc(5);
  let off = 2;
  for (let guard = 0; guard < 4096; guard++) {
    if (readSync(fd, buf, 0, 4, off) < 4) return null;
    if (buf[0] !== 0xff) return null;
    const marker = buf[1];
    // SOF0..SOF15 のうち DHT(c4) / JPG(c8) / DAC(cc) を除いたものが寸法を持つ
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (readSync(fd, buf, 0, 5, off + 4) < 5) return null;
      return { height: buf.readUInt16BE(1), width: buf.readUInt16BE(3) };
    }
    if (marker === 0xd9 || marker === 0xda) return null; // EOI / SOS より先に寸法は無い
    off += 2 + buf.readUInt16BE(2);
  }
  return null;
}
