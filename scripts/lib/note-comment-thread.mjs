/**
 * note-comment-thread.mjs — note のコメントのスレッド返信（note-comment-reply.mjs）の判定を純粋関数で持つ（依存ゼロ）。
 *
 * 実機の形（2026-11-27 確認・記事 n4b679c8da64e のコメント nc4cd5cc7e131c）:
 *   - 個別のコメントは `li#note-comment-<コメントID>`。返信は同じ li の中にスレッドで並ぶ。
 *   - 吹き出しアイコン（data-id=ButtonIcon・aria-pressed も aria-haspopup も無いもの。aria-pressed はスキ、aria-haspopup は「…」メニュー）
 *     を押すと「@相手さんに返信」の下に `form[data-testid=comment-form]` が開き、その中の `textarea[placeholder="コメントする"]`
 *     （ページ全体では 2 つ目）が返信欄になる。フォームの button[type=button] が取消（×）、button[type=submit] が送信（↑）。
 *   - 返信があるコメントには「返信N件」が出る（無ければ 0 件）。スレッドの開閉ボタンは aria-label「返信N件を閉じる／開く」。
 *
 * 罠: 投稿の成否はページ全体の本文検索では決めない（2026-11-27、トップレベルの欄へ入れた送信が投稿されず FAIL した）。
 * 対象コメントの返信件数の増加と、返信の本文の一致の両方で決める。再送は返信件数を読み直して増えていないときだけ（二重投稿の防止）。
 */

/** 通知 URL（…?c=nc4cd5cc7e131c）か、コメント ID そのものから ID を取り出す。読めなければ null。 */
export function parseCommentId(arg) {
  if (!arg) return null;
  const s = String(arg).trim();
  let id = s;
  if (/^https?:\/\//.test(s)) {
    try { id = new URL(s).searchParams.get('c') || ''; } catch { return null; }
  }
  return /^nc[0-9a-f]{6,}$/i.test(id) ? id : null;
}

/** コメントの li の中の文から「返信N件」の N を読む。表示が無ければ 0。 */
export function parseReplyCount(text) {
  const m = String(text || '').match(/返信\s*(\d+)\s*件/);
  return m ? Number(m[1]) : 0;
}

const squash = (s) => String(s || '').replace(/\s+/g, '').replace(/…?もっとみる/g, '');

/** 返信の本文がスレッドの文に全文で載っているか（空白・改行・「もっとみる」を除いて比べる）。 */
export function bodyIncluded(threadText, body) {
  const b = squash(body);
  return b.length > 0 && squash(threadText).includes(b);
}

/**
 * 送信後の判定。before＝送信前の返信件数、after＝読み直した返信件数、bodyFound＝本文の全文一致。
 * @returns {'posted'|'count-only'|'body-only'|'not-posted'}
 *   posted＝件数が増え本文も一致。count-only＝件数は増えたが本文が一致しない（別の返信か本文の欠け＝再送しない）。
 *   body-only＝本文は在るが件数が増えない（以前に同じ本文を投稿済み＝再送しない）。not-posted＝どちらも無い。
 */
export function replyVerdict({ before, after, bodyFound }) {
  const grew = Number(after) > Number(before);
  if (grew && bodyFound) return 'posted';
  if (grew) return 'count-only';
  if (bodyFound) return 'body-only';
  return 'not-posted';
}

/** 再送してよいか: 判定が not-posted で、読み直した件数が送信前と同じで、試行の上限に達していないときだけ。 */
export function mayResend({ verdict, before, current, attempts, maxAttempts = 2 }) {
  return verdict === 'not-posted' && Number(current) === Number(before) && attempts < maxAttempts;
}
