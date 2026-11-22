/**
 * x-tweets-md.mjs — tweets.md の「制作メモを落とす」規則を持つ唯一の場所
 * ---------------------------------------------------------------------------
 * 背景（2026-08-13 → 2026-08-18）:
 *   tweets.md は制作メモを HTML コメントで書く運用（例: 082「転用した勝ち型」）。
 *   これを落とさずにカード画像へ流し、**内部メモを載せた画像を公開しかけた**（2026-08-13 実見）。
 *   そのとき gen-x-card.mjs にだけ除去を足したため、**同じファイルを読む他のツールが持っていない**
 *   非対称が残った。
 *
 * 2026-08-18 の実測:
 *   - 除去あり: gen-x-card.mjs（画像描画） / publish-x.ts（実投稿）
 *   - 除去なし: check-x-length.mjs / check-x-utm.mjs / x-queue-lib.mjs
 *   「投稿する側は正しく落とすのに、検査する側は落とさない」ので、検査が実体と違うものを見ていた。
 *
 *   実害の大きさは正直に測った: tweets.md 65 本中 14 本がコメントを持ち、本文として数えられて
 *   いたツイートは 145 件（うち 15 件は偽の 280 字超）。ただし**その全部が
 *   `_archive-old-account/` 配下**で、check-x-length の走査対象（`^\d{3}-` の 29 ドラフト）では
 *   水増し 0 件だった。つまりこれは「いま出ている誤りを直す」修正ではなく、
 *   **同じ非対称が現役ドラフトへ再発するのを止める**予防にあたる。
 *
 * 注意: 閉じ忘れた `<!--` にも耐える必要がある（書きかけのメモが残る運用のため）。
 *   ブロック単位の除去に加えて、行頭 `<!--` 以降を末尾まで落とす。
 * ---------------------------------------------------------------------------
 */

import { stripHtmlComments } from './strip-markup.mjs';

/** コメント部分の中身だけ落として改行は残す（行番号を保つため）。 */
const blankKeepingLines = (m) => m.replace(/[^\r\n]/g, '');

/**
 * tweets.md の本文から制作メモ（HTML コメント）を落とす。
 * 文字数を数える・本文を描画する用途はこちら。
 * @param {string} text tweets.md 全体 or ツイートブロック
 * @returns {string}
 */
export function stripTweetMemos(text) {
  return String(text ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^[ \t]*<!--[\s\S]*$/m, '');
}

/**
 * 同じ除去を**行数を保ったまま**行う（コメント部分を空白化する）。
 * 行番号を報告する検査（check-x-utm 等）は、単純に除去すると報告行がずれるためこちらを使う。
 * @param {string} text
 * @returns {string} 元と同じ行数の文字列
 */
export function blankTweetMemos(text) {
  return String(text ?? '')
    .replace(/<!--[\s\S]*?-->/g, blankKeepingLines)
    .replace(/^[ \t]*<!--[\s\S]*$/m, blankKeepingLines);
}

/**
 * tweets.md を「## Tweet NN: 見出し」ごとのブロックに分ける（投稿する本文の正本・DN-0612 P7）。
 * 本文の作り方は publish-x.ts の parseTweetMd と同じ: 見出し行を落とし、HTML コメントと末尾の `---` を除き、
 * 見出しに [thread] があれば `--- リプライ ---` で 2 本目以降を分ける。無ければリプライ部を捨てる。
 * 最初の見出しより前（題・x-stock の印）は捨てる。
 * @param {string} raw tweets.md 全体
 * @returns {{ key: string, title: string, text: string, threadParts: string[] }[]} key は "1"…（先頭の 0 を落とす）
 */
export function parseTweetBlocks(raw) {
  const out = [];
  for (const block of String(raw ?? '').split(/^(?=## Tweet \d+:)/m)) {
    const head = block.match(/^## Tweet (\d+):\s*(.+)/);
    if (!head) continue;
    const isThread = /\[thread\]/i.test(head[2]);
    const body = stripHtmlComments(block.replace(/^## Tweet \d+:.*\r?\n/, ''))
      .replace(/\n---\s*$/, '')
      .replace(/^\n+/, '')
      .trim();
    let text = body;
    let threadParts = [];
    if (isThread) {
      const parts = body.split(/^--- リプライ ---$/m).map((p) => p.trim()).filter(Boolean);
      text = parts[0] ?? '';
      threadParts = parts.slice(1);
    } else {
      text = body.replace(/\n--- リプライ ---[\s\S]*/, '').trim();
    }
    out.push({ key: String(Number(head[1])), title: head[2].trim(), text, threadParts });
  }
  return out;
}
