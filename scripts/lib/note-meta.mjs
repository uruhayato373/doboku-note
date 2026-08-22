/**
 * note-meta.mjs — note マガジン掲載文（note掲載文.txt）の共有パーサ／ジェネレータ。
 *
 * note掲載文.txt が note マガジン設定の単一 SoT（タイトル/価格/説明/アピールポイント
 * ＋機械用ブロック）。`note-meta-lint`・`note-meta-to-txt`・`note-edit-magazine` が共用。
 *
 * 構造:
 *   ━(28)
 *   note マガジン掲載文（コピペ用）
 *   <subtitle>
 *   ━(28)
 *   ■ マガジンタイトル（30字以内） → title
 *   ■ 価格                       → price（散文）
 *   ■ 説明（400字以内）           → description
 *   ■ アピールポイント（250字以内）→ appealPoint
 *   ■ 機械用（編集しない・自動同期）→ setPrice / articlePrice（数値）
 *
 * note 側の文字数制限（超過すると更新ボタンが無効＝保存不可）:
 *   タイトル 30 / 説明 400 / アピールポイント 250。
 */
export const LIMITS = { title: 30, description: 400, appealPoint: 250 };
const BAR = '━'.repeat(28);

/** note掲載文.txt のテキストを構造化して返す。 */
export function parseNoteText(txt) {
  const norm = (txt || '').replace(/\r\n/g, '\n');
  const out = { subtitle: '', title: '', price: '', description: '', appealPoint: '', setPrice: null, articlePrice: null };
  const head = norm.match(/^━+\nnote[^\n]*\n([^\n]*)\n━+/);
  if (head) out.subtitle = head[1].trim();
  const blocks = norm.split(/\n■ /).slice(1);
  for (const b of blocks) {
    const nl = b.indexOf('\n');
    const label = (nl < 0 ? b : b.slice(0, nl)).trim();
    const body = (nl < 0 ? '' : b.slice(nl + 1)).trim();
    if (/タイトル/.test(label)) out.title = body.split('\n')[0].trim();
    else if (/^価格/.test(label)) out.price = body;
    else if (/説明/.test(label)) out.description = body;
    else if (/アピール/.test(label)) out.appealPoint = body;
    else if (/機械用/.test(label)) {
      out.setPrice = (body.match(/セット価格:\s*(\d+)/) || [])[1] || null;
      out.articlePrice = (body.match(/単品価格:\s*(\d+)/) || [])[1] || null;
    }
  }
  // 機械ブロックが無い旧 txt は価格散文から推定
  if (out.setPrice == null) { const m = out.price.match(/セット\s*¥?([\d,]+)/); if (m) out.setPrice = m[1].replace(/,/g, ''); }
  if (out.articlePrice == null) { const m = out.price.match(/単品\s*¥?([\d,]+)/); if (m) out.articlePrice = m[1].replace(/,/g, ''); }
  return out;
}

/** 構造化データから note掲載文.txt のテキストを生成（機械ブロック付き・正準形）。 */
export function generateNoteText(m) {
  const art = m.articlePrice && String(m.articlePrice) !== 'なし' ? String(m.articlePrice) : 'なし';
  return [
    BAR,
    'note マガジン掲載文（コピペ用）',
    m.subtitle || '',
    BAR,
    '',
    '■ マガジンタイトル（30字以内）',
    '',
    (m.title || '').trim(),
    '',
    '',
    '■ 価格',
    '',
    (m.price || '').trim(),
    '',
    '',
    '■ 説明（400字以内）',
    '',
    (m.description || '').trim(),
    '',
    '',
    '■ アピールポイント（250字以内）',
    '',
    (m.appealPoint || '').trim(),
    '',
    '',
    '■ 機械用（編集しない・自動同期）',
    '',
    `セット価格: ${m.setPrice || ''}`,
    `単品価格: ${art}`,
    '',
  ].join('\n');
}

/** 文字数制限の違反を配列で返す（[] なら適合）。 */
export function checkLimits(m) {
  const v = [];
  if ((m.title || '').length > LIMITS.title) v.push(`タイトル ${m.title.length}字 > ${LIMITS.title}`);
  if ((m.description || '').length > LIMITS.description) v.push(`説明 ${m.description.length}字 > ${LIMITS.description}`);
  if ((m.appealPoint || '').length > LIMITS.appealPoint) v.push(`アピール ${m.appealPoint.length}字 > ${LIMITS.appealPoint}`);
  return v;
}
