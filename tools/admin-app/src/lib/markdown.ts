import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';
import type { Root, RootContent } from 'mdast';

/**
 * markdown.ts — admin 内で .md を HTML にする**唯一のパイプライン**。
 *
 * ナレッジタブ（knowledge.ts）・TODO の詳細展開（todo/page.tsx）・Project 詳細
 * （project.ts）が同じ関数を通る。ここを 2 実装に分けると「ナレッジでは表が出るのに
 * TODO では出ない」のような見え方のドリフトが起きるので、プラグイン構成を変えるときは
 * 必ずここだけを触る。
 *
 * `sanitize: true` は remark-html の既定サニタイズ（生 HTML を落とす）。
 * 入力は自リポジトリ内の .md に限られるが、`dangerouslySetInnerHTML` へ渡す以上
 * サニタイズ無しにはしない。
 *
 * 見出し目次は**同じ AST から**採る（正規表現で本文を二度読みしない）。id の採番も
 * その 1 回の走査が持つ順序に従って行うので、目次と本文の id がずれることがない。
 */

export interface DocumentHeading {
  depth: 2 | 3;
  text: string;
  id: string;
}

/** 見出しノードの可視テキスト（インラインコード・リンクの中身も拾う）。 */
function headingText(node: RootContent): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((child) => headingText(child as RootContent)).join('');
  }
  return '';
}

/**
 * 日本語見出しは英数 slug にならないので、可視テキストをそのまま id に使い、
 * 衝突したときだけ連番を足す（同一文書内で一意・仕様 §7.4）。
 */
function toId(text: string, used: Map<string, number>): string {
  const base =
    text
      .trim()
      .replace(/\s+/g, '-')
      .replace(/["'`<>&#?%\\/]/g, '')
      .slice(0, 80) || 'section';
  const seen = used.get(base) ?? 0;
  used.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen + 1}`;
}

/** AST を 1 回だけ走査して H2/H3 を拾う。HTML への id 付与もこの順序を使う。 */
function collectHeadings(tree: Root): DocumentHeading[] {
  const used = new Map<string, number>();
  const out: DocumentHeading[] = [];
  for (const node of tree.children) {
    if (node.type !== 'heading') continue;
    if (node.depth !== 2 && node.depth !== 3) continue;
    const text = headingText(node as RootContent).trim();
    if (!text) continue;
    out.push({ depth: node.depth, text, id: toId(text, used) });
  }
  return out;
}

const processor = () => remark().use(remarkGfm).use(remarkHtml, { sanitize: true });

/** HTML だけが要る呼び出し側（TODO カード本文など）向け。 */
export function renderMarkdown(markdown: string): string {
  return String(processor().processSync(markdown));
}

/**
 * HTML と見出し目次を同時に返す。
 *
 * sanitize が属性を落とすため id は AST では埋め込めない。代わりに **collectHeadings が
 * 返した順序**で出力 HTML の `<h2>`/`<h3>` に順番に id を差し込む（抽出元は AST 1 つ）。
 */
export function renderDocument(markdown: string): { html: string; headings: DocumentHeading[] } {
  const proc = processor();
  const tree = proc.parse(markdown) as Root;
  const headings = collectHeadings(tree);
  let html = String(proc.processSync(markdown));

  let i = 0;
  html = html.replace(/<(h2|h3)>/g, (match, tag: string) => {
    const depth = tag === 'h2' ? 2 : 3;
    while (i < headings.length && headings[i]!.depth !== depth) i += 1;
    const heading = headings[i];
    if (!heading) return match;
    i += 1;
    return `<${tag} id="${heading.id}">`;
  });

  return { html, headings };
}
