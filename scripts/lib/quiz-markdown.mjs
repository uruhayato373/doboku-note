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

export function renderQuizMarkdown(value) {
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
  html = html.replace(/QUIZHTMLTOKEN(\d+)END/g, (_, i) => htmlTokens[Number(i)] || '');
  return html;
}
