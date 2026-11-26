/**
 * 過去問の「解答・解説」の開閉に目印を付ける rehype プラグイン（2026-11-26）。
 *
 * 本文の <details><summary>解答・解説</summary> と、中の「**正答：3**」の段落を CSS で見分けられるようにする
 * （MDX は書き換えない。summary の文言は AnalyticsProvider の answer_reveal の判定に使っているので変えない）。
 *   - summary が「解答」で始まる details に data-answer を付ける → 押せるボタンの見た目（globals.css）
 *   - その中の、太字の「正答：」で始まる段落に data-answer-key を付ける → 正答のバッジの見た目
 *
 * MDX の <details> は JSX（mdxJsxFlowElement）として届くので、hast の element と両方を見る。
 */
import { visit } from 'unist-util-visit';
import type { Root, Properties } from 'hast';

type JsxAttribute = { type: 'mdxJsxAttribute'; name: string; value?: unknown };
type AnyNode = {
  type: string;
  tagName?: string;
  name?: string | null;
  value?: string;
  properties?: Properties;
  attributes?: JsxAttribute[];
  children?: AnyNode[];
};

const ANSWER_SUMMARY = /^解答/;
const ANSWER_KEY = /^正答\s*[：:]/;

function tagOf(node: AnyNode): string | null {
  if (node.type === 'element') return node.tagName ?? null;
  if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') return node.name ?? null;
  return null;
}

function textOf(node: AnyNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textOf).join('');
}

function mark(node: AnyNode, name: 'data-answer' | 'data-answer-key'): void {
  if (node.type === 'element') {
    node.properties = { ...(node.properties ?? {}), [name === 'data-answer' ? 'dataAnswer' : 'dataAnswerKey']: '' };
    return;
  }
  node.attributes = [...(node.attributes ?? []), { type: 'mdxJsxAttribute', name, value: '' }];
}

export default function rehypeAnswerReveal() {
  return (tree: Root) => {
    visit(tree, (raw) => {
      const node = raw as unknown as AnyNode;
      if (tagOf(node) !== 'details') return;
      const children = node.children ?? [];
      const summary = children.find((c) => tagOf(c) === 'summary');
      if (!summary || !ANSWER_SUMMARY.test(textOf(summary).trim())) return;
      mark(node, 'data-answer');
      const key = children.find((c) => tagOf(c) === 'p' && ANSWER_KEY.test(textOf(c).trim()));
      if (key) mark(key, 'data-answer-key');
    });
  };
}

