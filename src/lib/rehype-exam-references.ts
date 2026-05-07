/**
 * 過去問本文中の政府ガイドライン・技術基準への自動リンク化 rehype プラグイン。
 *
 * `src/config/exam-references.json` を citation DB として読み、テキストノード
 * 内の文書名にマッチした部分を `<a target="_blank">` で wrap する。
 *
 * MDX を 1 文字も書き換えず、render-time で挿入される。
 *
 * 設計:
 *   - コードブロック / 既存リンク内は visit で skip
 *   - 長い key を先にマッチさせて partial match を防ぐ
 *   - URL は WebSearch + WebFetch で検証済みのものだけが JSON に登録される前提
 */

import { visit, SKIP } from 'unist-util-visit';
import type { Root, Element, Text, ElementContent } from 'hast';
import references from '@/config/exam-references.json';

const SKIP_PARENT_TAGS = new Set(['a', 'code', 'pre']);

interface ReferenceEntry {
  url: string;
  issuer: string;
  version?: string;
  verifiedAt: string;
  _aliasOf?: string;
}

const refs = references as Record<string, ReferenceEntry>;

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function rehypeExamReferences() {
  // 長い key を先にマッチさせる（"事業継続ガイドライン（令和5年3月）" を "事業継続ガイドライン" より優先）
  const keys = Object.keys(refs).sort((a, b) => b.length - a.length);

  if (keys.length === 0) {
    return () => {};
  }

  const pattern = new RegExp(keys.map(escapeRegExp).join('|'), 'g');

  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || parent.type !== 'element') return;
      if (SKIP_PARENT_TAGS.has((parent as Element).tagName)) return;
      if (typeof index !== 'number') return;

      const value = node.value;
      const matches = [...value.matchAll(pattern)];
      if (matches.length === 0) return;

      const newChildren: ElementContent[] = [];
      let lastIdx = 0;

      for (const m of matches) {
        const matchText = m[0];
        const matchIdx = m.index ?? 0;

        if (matchIdx > lastIdx) {
          newChildren.push({ type: 'text', value: value.slice(lastIdx, matchIdx) });
        }

        const ref = refs[matchText];
        if (!ref) continue;

        newChildren.push({
          type: 'element',
          tagName: 'a',
          properties: {
            href: ref.url,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: ['exam-ref'],
            'data-issuer': ref.issuer,
          },
          children: [{ type: 'text', value: matchText }],
        });

        lastIdx = matchIdx + matchText.length;
      }

      if (lastIdx < value.length) {
        newChildren.push({ type: 'text', value: value.slice(lastIdx) });
      }

      (parent as Element).children.splice(index, 1, ...newChildren);
      return [SKIP, index + newChildren.length];
    });
  };
}
