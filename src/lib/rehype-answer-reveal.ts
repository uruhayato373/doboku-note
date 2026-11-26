/**
 * 過去問の「解答・解説」の開閉に目印を付ける rehype プラグイン（2026-11-26）。
 *
 * 本文の <details><summary>解答・解説</summary> と、中の「**正答：3**」の段落を CSS で見分けられるようにする
 * （MDX は書き換えない。summary の文言は AnalyticsProvider の answer_reveal の判定に使っているので変えない）。
 *   - summary が「解答」で始まる details に data-answer を付ける → 押せるボタンの見た目（globals.css）
 *   - その中の、太字の「正答：」で始まる段落に data-answer-key を付ける → 正答のバッジの見た目
 *
 * MDX の <details> は JSX（mdxJsxFlowElement）として届くので、hast の element と両方を見る。
 *
 * gate: true のページ（src/config/answer-gate.json・2026-11-26）は、解説を正答の選択肢の理由だけに絞る。
 *   解答の中の 5 項目の番号つきリストから正答の項目だけを残し（番号は start で保つ）、<ExamPoint> を外して
 *   <answerupsell> を置く（DocPage の components が導線の部品に解決する）。途中式などリスト以外の段落は残す。
 *   正答が番号で取れない・5 項目のリストが無い問題は何も消さない（正答の無い採点対象外の問題など）。
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

const ANSWER_NUMBER = /^正答\s*[：:]\s*(\d)/;

/** 正答の選択肢の理由だけを残し、ExamPoint を導線に替える。絞れたら true */
function gateAnswer(node: AnyNode, key: AnyNode | undefined): boolean {
  const correct = Number(ANSWER_NUMBER.exec(key ? textOf(key).trim() : '')?.[1] ?? 0);
  if (!correct) return false;
  const children = node.children ?? [];
  const list = children.find((c) => tagOf(c) === 'ol' && (c.children ?? []).filter((li) => tagOf(li) === 'li').length === 5);
  if (!list) return false;
  const items = (list.children ?? []).filter((li) => tagOf(li) === 'li');
  list.children = [items[correct - 1]!];
  if (list.type === 'element') list.properties = { ...(list.properties ?? {}), start: correct };
  else list.attributes = [...(list.attributes ?? []), { type: 'mdxJsxAttribute', name: 'start', value: String(correct) }];
  const upsell: AnyNode = { type: 'element', tagName: 'answerupsell', properties: {}, children: [] };
  const point = children.findIndex((c) => tagOf(c) === 'ExamPoint');
  if (point >= 0) children.splice(point, 1, upsell);
  else children.push(upsell);
  return true;
}

export default function rehypeAnswerReveal(options: { gate?: boolean } = {}) {
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
      if (options.gate) gateAnswer(node, key);
    });
  };
}

