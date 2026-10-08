/**
 * media-paths.mjs — コンテンツ台帳の素材の置き場（パス）の組み立て・分解・検査を 1 か所に集める（content-registry.md「素材の置き場」）。
 *
 *   手元  .tmp/media/{exam}/{work}/{channel}.{format}[.{variant}]/{role}.{sha8}.{ext}
 *         .tmp/media/{exam}/{work}/work/{role}.{sha8}.{ext}      作品で共有する素材
 *         .tmp/media/_brand/{design}/{role}.{sha8}.{ext}           ブランド共通
 *   Drive 制作物/コンテンツ/ の下に同じ相対パス（config/drive-vault.json の group content-media）
 *
 * {sha8} は中身の sha256 の先頭 8 桁。一度置いたら書き換えず、描き直すと別名になる。依存ゼロ（台帳の検査・管理画面からも読む）。
 */

export const MEDIA_ROOT = '.tmp/media';
const SEG = '[a-z0-9-]+';
const ROLE = '[a-z][a-z0-9-]*';
const EXT = '(?:png|jpe?g|webp|mp4|m4a|wav|ass|json)';
const PUB_DIR = '[a-z]+\\.[a-z]+(?:\\.[a-z0-9-]+)?';
const PATH_RE = new RegExp(`^\\.tmp/media/(?:(${SEG})/(${SEG})/(${PUB_DIR}|work)|_brand/(${SEG}))/(${ROLE})\\.([0-9a-f]{8})\\.(${EXT})$`);

export const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  mp4: 'video/mp4', m4a: 'audio/mp4', wav: 'audio/wav', ass: 'text/x-ssa', json: 'application/json',
};

/** 公開 ID（{exam}/{work}/{channel}.{format}[.{variant}]）の後ろの「channel.format[.variant]」 */
export function pubDirOf(pubId) {
  const parts = pubId.split('/');
  if (parts.length !== 3) throw new Error(`公開 ID の形が違う: ${pubId}`);
  return parts[2];
}

/**
 * 素材のパスを組み立てる。
 * @param {{ pubId?: string, exam?: string, work?: string, brand?: string, role: string, sha256: string, ext: string }} m
 */
export function mediaPath({ pubId, exam, work, brand, role, sha256, ext }) {
  if (!/^[0-9a-f]{64}$/.test(sha256 ?? '')) throw new Error(`sha256 が要る: ${role}`);
  const name = `${role}.${sha256.slice(0, 8)}.${ext}`;
  let dir;
  if (brand) dir = `_brand/${brand}`;
  else if (pubId) dir = pubId;
  else if (exam && work) dir = `${exam}/${work}/work`;
  else throw new Error('pubId か exam・work か brand が要る');
  const path = `${MEDIA_ROOT}/${dir}/${name}`;
  if (!PATH_RE.test(path)) throw new Error(`素材のパスの規則に合わない: ${path}`);
  return path;
}

/** 素材のパスを分解する。規則に合わなければ null */
export function parseMediaPath(path) {
  const m = PATH_RE.exec(path ?? '');
  if (!m) return null;
  const [, exam, work, pubDir, brand, role, sha8, ext] = m;
  if (brand) return { brand, role, sha8, ext };
  return { exam, work, pubDir: pubDir === 'work' ? null : pubDir, pubId: pubDir === 'work' ? null : `${exam}/${work}/${pubDir}`, role, sha8, ext };
}

/** パスの名前の sha8 が中身の sha256 と一致するか */
export function sha8Matches(path, sha256) {
  const parsed = parseMediaPath(path);
  return Boolean(parsed) && parsed.sha8 === String(sha256).slice(0, 8);
}

/** 拡張子 → MIME type（台帳の type 欄） */
export function mimeOf(ext) {
  const t = MIME[String(ext).toLowerCase()];
  if (!t) throw new Error(`素材の拡張子が対象外: ${ext}`);
  return t;
}
