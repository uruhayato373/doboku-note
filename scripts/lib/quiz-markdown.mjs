// 過去問演習データの本文（Markdown・KaTeX・記事画像）を表示用 HTML とプレーンテキストにする。
// Web 演習（scripts/build-quiz-data.mjs）と iOS アプリの書き出し（scripts/build-ios-quiz-bundle.mjs）が同じ変換を使う。
import katex from 'katex';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

export function stripMarkdown(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*\*|__|`/g, '')
    .replace(/\$+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 問題文の空欄（「より ア な構造体」のように空白で挟んだア〜コ 1 文字。段落の先頭も含む）。空白だけでは空欄に見えないので枠を付ける。
// 括弧の中（「（ ア ）」）は空欄のことも記述の記号のこともあり、括弧で見分けられるので付けない。「ア → イ」の並びと表の見出し（<th>ア</th>）も外す
const BLANK_PATTERN = /(?<![→⇒（(][ \u3000]+)(?<=[ \u3000]|<p>)([ア-コ])(?=[ \u3000])(?![ \u3000]+[→⇒）)])/gu;
// 記号のない空欄（「次の記述の、　　　　に入る語句」のように全角空白が 3 つ以上続き「に入る」「に当てはまる」が続くもの）
const EMPTY_BLANK_PATTERN = /(?<![（(])\u3000{3,}(?=に(?:入|当て|あて))/gu;

/** @param {string} value @param {{ blanks?: boolean }} [options] blanks: 問題文の空欄を枠（span.quiz-blank）にする */
export function renderQuizMarkdown(value, { blanks = false } = {}) {
  const htmlTokens = [];
  const token = (html) => {
    const key = `QUIZHTMLTOKEN${htmlTokens.length}END`;
    htmlTokens.push(html);
    return key;
  };

  let source = String(value || '').trim();
  source = source.replace(/<ArticleImage\s+([\s\S]*?)\/>/g, (_, props) => {
    const src = (props.match(/src="([^"]+)"/) || [])[1] || '';
    const alt = (props.match(/alt="([^"]*)"/) || [])[1] || '';
    if (!src.startsWith('/posts/')) return '';
    return token(
      `<figure class="quiz-figure"><img src="${src}" alt="${alt.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" loading="lazy" /></figure>`,
    );
  });
  source = source.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) =>
    token(katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })),
  );
  source = source.replace(/\$([^$\n]+?)\$/g, (_, math) =>
    token(katex.renderToString(math.trim(), { displayMode: false, throwOnError: false })),
  );

  let html = String(
    remark()
      .use(remarkGfm)
      .use(remarkHtml, { sanitize: false })
      .processSync(source),
  ).trim();
  if (blanks) {
    html = html
      .replace(BLANK_PATTERN, '<span class="quiz-blank">$1</span>')
      .replace(EMPTY_BLANK_PATTERN, '<span class="quiz-blank">\u3000</span>');
  }
  html = html.replace(/QUIZHTMLTOKEN(\d+)END/g, (_, i) => htmlTokens[Number(i)] || '');
  return html;
}
