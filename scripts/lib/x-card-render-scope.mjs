/**
 * x-card-render-scope.mjs — check-x-card-render が検査する X カード PNG の範囲を決める。
 *
 * 範囲は「Git が管理しうる PNG」＝追跡済み＋未追跡だが .gitignore されていないもの。
 * .gitignore 済みの PNG（`*-diagrams/img/tweet-*.png` など Drive vault 側の再生成物）は対象外。
 * ディスク上を歩くと、ignore 済み PNG があるローカルだけ「台帳に無い」で赤くなり、
 * PNG の無い CI は緑になる（DN-0259）。範囲を Git 側で決めてローカルと CI の結果を揃える。
 */
import { execFileSync } from 'node:child_process';

const X_CARD_DIR = 'content/sns/x';

/** `git ls-files -z` の出力を POSIX 相対パスの配列にする。 */
export function parseLsFilesZ(out) {
  return String(out).split('\0').filter(Boolean);
}

/**
 * X カード PNG として検査対象になるパスか。
 * `_archive*` は旧アカウント時代の保管物なので除く（2026-08-25: 78 枚が「台帳に無い」で error になっていた）。
 */
export function isXCardPng(rel) {
  if (!rel.startsWith(`${X_CARD_DIR}/`) || !rel.endsWith('.png')) return false;
  const segs = rel.split('/');
  if (segs.slice(0, -1).some((s) => s.startsWith('_archive'))) return false;
  return segs.includes('img');
}

/**
 * Git が管理しうる X カード PNG を列挙する。git が使えなければ ok:false（呼び出し側は検査不成立として扱う）。
 * @returns {{ok:true, pngs:string[]} | {ok:false, error:string}}
 */
export function listScopedXCardPngs(root, run = (args) => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 })) {
  let out;
  try {
    out = run(['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', X_CARD_DIR]);
  } catch (error) {
    return { ok: false, error: `git ls-files に失敗: ${error.message}` };
  }
  return { ok: true, pngs: [...new Set(parseLsFilesZ(out).filter(isXCardPng))].sort() };
}
