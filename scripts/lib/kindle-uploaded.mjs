/**
 * kindle-uploaded.mjs — KDP に上げた版（EPUB・表紙）の記録と、手元の版とのずれの判定（DN-0438 の Kindle 版）。
 *
 * なぜ要るか: KDP・Amazon の公開ページは機械で照合できない（bot 検知・公開 API 無し）。note やココナラのように
 * 公開先を見て「ずれ」を出せないので、代わりに「上げたときのファイルのハッシュ」を catalog.json に記録し、
 * 手元で今ビルドしてある EPUB・表紙のハッシュと比べる。記録するのは kdp-publish が保存（下書き保存・再出版）に
 * 成功したときだけ（押せたログではなく、処理が完了した地点）。
 *
 * catalog.json の各冊: uploaded = { epub: { sha256, at, via }, cover: { sha256, at, via } }
 *   via: 'new-draft' | 'publish' | 'update-manuscript' | 'update-cover' | 'baseline'
 *   baseline は 2026-09-29 に「公開中・審査中の本は、その時点の手元の版が上がっている」とみなして一度だけ入れたもの
 *   （ユーザー決定）。手元と KDP が実はずれていた本は、この時点の分は見えない。
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

/** ファイルの sha256。無ければ null。 */
export function fileSha256(path) {
  if (!path || !existsSync(path)) return null
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

/** 純粋: 冊に「上げた版」を記録する（book を書き換えて返す）。 */
export function recordUploaded(book, part, sha256, { at, via }) {
  if (!sha256) return book
  book.uploaded ||= {}
  book.uploaded[part] = { sha256, at, via }
  return book
}

/**
 * 純粋: 手元の版と上げた版のずれ。
 * @param {{ uploaded?: { epub?: {sha256:string}, cover?: {sha256:string} } }} book
 * @param {{ epub: string|null, cover: string|null }} local 手元の sha256（ファイルが無ければ null）
 * @returns {{ epub: 'ok'|'drift'|'unknown'|'missing', cover: 'ok'|'drift'|'unknown'|'missing' }}
 *   unknown＝上げた版の記録が無い／missing＝手元にファイルが無い（ビルドしていない）
 */
export function kindleDrift(book, local) {
  const one = (part) => {
    const up = book.uploaded?.[part]?.sha256
    if (!local[part]) return 'missing'
    if (!up) return 'unknown'
    return up === local[part] ? 'ok' : 'drift'
  }
  return { epub: one('epub'), cover: one('cover') }
}

/** KDP に上がっている（上げた版を比べる意味がある）状態か。 */
export const isOnKdp = (book) => book.status === 'live' || book.status === 'in_review'
