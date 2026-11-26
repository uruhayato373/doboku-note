/**
 * 本文の「年度の過去問一覧」の箇条書きに目印（data-year-links）を付け、CSS で 1 行に並ぶチップに見せる rehype プラグイン（2026-11-26）。
 *
 * 技術士一次の科目ガイドなどは 16 年度分の過去問へのリンクを縦に並べていて、スマホで 1 画面を超えていた。
 * MDX は書き換えない。項目がすべて「サイトの過去問へのリンク 1 本（年度・回を含む文字）＋任意の短い補足（「（30問）」など）」で、
 * 5 項目以上の箇条書きだけに付ける。ほかの箇条書きの見た目は変えない。
 */
import { visit } from 'unist-util-visit';
import type { Element, ElementContent, Root } from 'hast';

const MIN_ITEMS = 5;
const YEAR_TEXT = /(年度|年|回)/;
const NOTE_TEXT = /^[\s（(]*[0-9０-９]+問[)）\s]*$/;

function textOf(node: ElementContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textOf).join('');
  return '';
}

/** li の中身が「年度のリンク 1 本＋任意の『（N問）』」か。段落で包まれた loose list も見る */
function isYearLinkItem(li: Element): boolean {
  const inner = li.children.length === 1 && li.children[0]?.type === 'element' && li.children[0].tagName === 'p' ? li.children[0].children : li.children;
  const parts = inner.filter((c) => !(c.type === 'text' && !c.value.trim()));
  const [link, ...rest] = parts;
  if (!link || link.type !== 'element' || link.tagName !== 'a') return false;
  const href = String(link.properties?.href ?? '');
  if (!href.startsWith('/exam/') || !YEAR_TEXT.test(textOf(link))) return false;
  return rest.every((c) => c.type === 'text' && NOTE_TEXT.test(c.value));
}

export default function rehypeYearLinks() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'ul') return;
      const items = node.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'li');
      if (items.length < MIN_ITEMS || !items.every(isYearLinkItem)) return;
      node.properties = { ...(node.properties ?? {}), dataYearLinks: '' };
    });
  };
}
