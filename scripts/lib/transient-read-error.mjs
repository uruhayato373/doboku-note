// Drive のマウント（Google Drive の File Provider）からの読み出しで、時間をおけば通る失敗かどうか。
// 2026-10-11 3:00 の週次（launchd）で河川砂防の配布 PDF 10 本が errno -11（macOS の EDEADLK＝File Provider が
// その場でダウンロードできない）で落ち、同じファイルは日中の手動実行で通った。2026-10-04 は Drive 本体が止まっていて
// ETIMEDOUT だった（DN-0567）。Node は darwin の -11 を名前に引けず code が "Unknown system error -11" になるので errno でも見る。
export function isTransientReadError(err) {
  return err?.errno === -11 || ['EDEADLK', 'ETIMEDOUT', 'EAGAIN', 'EBUSY', 'EIO'].includes(err?.code);
}
