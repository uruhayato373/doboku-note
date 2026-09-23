/**
 * note-public-view.mjs — note 公開記事を「未ログインの読者にどう見えるか」で判定する純関数群。
 *
 * 公開 API（/api/v3/notes/{id}）には、画面の有料エリア見出し「ここから先は N字 / Mファイル」と
 * 同じ数字（remained_char_num / remained_file_num）・価格・会員限定（is_limited）・カバー（eyecatch）が
 * 入っている。未ログインで取れるので CI で回せる（2026-09-23 に公開 906 本で取得失敗 0 を確認）。
 * ブラウザでしか分からない「画像が読み込めるか・カードが描画されるか・スマホ幅ではみ出すか」は
 * evaluateRendered で判定する（DOM 計測値を受け取るだけで、ブラウザには依存しない）。
 *
 * 実行側: scripts/check-note-public-view.mjs（週次 .github/workflows/note-public-view.yml）。
 */
import { stripTags } from './note-live-check.mjs';

/** リンクカードの描画高さの下限。正常は 139〜210px（2026-09-23・40 本実測）。空の枠だけならこれを下回る。 */
export const MIN_CARD_HEIGHT = 60;

/**
 * 公開 API の値から、読者に見えている状態の不整合を返す。
 * @param {{ pricing: string|null, price: number, expectedPdfs: number, lockPolicy: 'intentional'|'pending'|null, pendingRef?: string }} src
 * @param {{ price: number|null, is_limited: boolean|null, eyecatch: string|null, remained_file_num: number|null, body: string }} live
 * @returns {{ bad: string[], warn: string[] }}
 */
export function evaluateApi(src, live) {
  const bad = [];
  const warn = [];
  const body = live.body || '';
  const bodyFiles = (body.match(/api\/v2\/attachments\/download/g) || []).length;
  const liveFiles = (live.remained_file_num || 0) + bodyFiles;

  // 添付 PDF の欠落。会員限定は未ログインで中身も件数も見えないので判定しない（計測不能を OK と呼ばない＝件数は呼び出し側で数える）
  if (src.expectedPdfs > 0 && live.is_limited !== true && liveFiles < src.expectedPdfs) {
    bad.push(`PDF 不足（ライブ ${liveFiles} / 原稿 ${src.expectedPdfs}）`);
  }
  if (src.pricing === 'paid' && src.price > 0 && live.price !== src.price) {
    bad.push(`価格が違う（ライブ ¥${live.price} / 原稿 ¥${src.price}）`);
  }
  if (!live.eyecatch) bad.push('カバー画像なし');

  // 無料設定の記事が全文会員限定（未ログインで本文 0 字）。試し読みラインで本文が読めるなら正常。
  if (src.pricing === 'free' && live.is_limited === true && !stripTags(body).trim()) {
    if (src.lockPolicy === 'intentional') {
      // 意図した全文ロック（設定ファイルに理由つきで登録）
    } else if (src.lockPolicy === 'pending') {
      warn.push(`無料設定なのに全文会員限定（判断待ち: ${src.pendingRef || '要確認'}）`);
    } else {
      bad.push('無料設定なのに全文会員限定（未ログインで本文 0 字）');
    }
  }
  return { bad, warn };
}

/**
 * ブラウザで計測した DOM の値から不整合を返す。
 * @param {{ status: number, bodyFound: boolean, locked: boolean, imgs: number, imgBroken: number, imgPending: number, cardHeights: number[], overflow: string[] }} m
 */
export function evaluateRendered(m) {
  const bad = [];
  const warn = [];
  if (m.status >= 400) bad.push(`HTTP ${m.status}`);
  // 会員限定は未ログインで本文の要素自体が出ないことがある（2026-09-23 実測）。限定かどうかは API 層で判定済み
  else if (!m.bodyFound && !m.locked) bad.push('本文の要素が見つからない（非公開・削除・レイアウト変更の可能性）');
  if (m.imgBroken > 0) bad.push(`画像が読み込めない ${m.imgBroken} 枚`);
  if (m.imgPending > 0) warn.push(`画像の読み込みが終わらない ${m.imgPending} 枚`);
  const small = (m.cardHeights || []).filter((h) => h < MIN_CARD_HEIGHT);
  if (small.length) bad.push(`リンクカードが描画されていない ${small.length} 件（高さ ${small.join('/')}px）`);
  if ((m.overflow || []).length) bad.push(`スマホ幅で横にはみ出す（${m.overflow.slice(0, 2).join(', ')}）`);
  return { bad, warn };
}
