/**
 * coconala-dm-parse.mjs — DM スレッド画面のテキストをメッセージ単位に分ける（純関数）
 * ---------------------------------------------------------------------------
 * DM 画面（/mypage/direct_message/{id}）の innerText は、各メッセージが
 *   送信者名
 *   YYYY-MM-DD HH:MM:SS
 *   （空行）
 *   本文…
 *   （既読表示「開封済み …」・添付ファイル名）
 * の並びで出る。先頭はマイページのメニュー等、末尾は入力欄（「0/2000」以降）。
 * 送信者名＋日時の 2 行を区切りにして、本文から既読表示と入力欄を落とす。
 * ---------------------------------------------------------------------------
 */

const RE_STAMP = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/;
// 入力欄の文字数カウンタ（例: 0/2000）。ここから先は画面の入力欄で、メッセージではない。
const RE_COMPOSER = /^\d+\/\d{3,5}$/;
const RE_READ_MARK = /^(開封済み|既読)\s/;

/**
 * @param {string} text DM スレッド画面の innerText
 * @param {{ self?: string }} [opts] self: 自分のアカウント名（from が一致すれば mine: true）
 * @returns {{ messages: Array<{ from: string, at: string, mine: boolean, body: string }>, composerFound: boolean }}
 */
export function parseDmThread(text, { self = 'dobokunote' } = {}) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const end = lines.findIndex((l) => RE_COMPOSER.test(l.trim()));
  const body = end >= 0 ? lines.slice(0, end) : lines;

  const heads = [];
  for (let i = 1; i < body.length; i++) {
    const m = RE_STAMP.exec(body[i].trim());
    if (m && body[i - 1].trim()) heads.push({ i, from: body[i - 1].trim(), at: `${m[1]}T${m[2]}+09:00` });
  }

  const messages = heads.map((h, k) => {
    // 次のメッセージの送信者名の行（日時の 1 行前）までが本文
    const stop = k + 1 < heads.length ? heads[k + 1].i - 1 : body.length;
    const chunk = body.slice(h.i + 1, stop).filter((l) => !RE_READ_MARK.test(l.trim()));
    while (chunk.length && !chunk[0].trim()) chunk.shift();
    while (chunk.length && !chunk[chunk.length - 1].trim()) chunk.pop();
    return { from: h.from, at: h.at, mine: h.from === self, body: chunk.join('\n') };
  });
  return { messages, composerFound: end >= 0 };
}
