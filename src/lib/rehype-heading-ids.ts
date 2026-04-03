import { visit } from 'unist-util-visit';
import { generateHeadingId } from './toc';
import type { Root, Element, Text } from 'hast';

/**
 * Extract plain text from a HAST node tree.
 */
function extractText(node: Element | Text): string {
  if (node.type === 'text') return (node as Text).value;
  if ('children' in node) {
    return (node as Element).children
      .map((child) => extractText(child as Element | Text))
      .join('');
  }
  return '';
}

const headingTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/**
 * Rehype plugin that adds `id` attributes to heading elements.
 * Uses the same ID generation as toc.ts to ensure consistency.
 */
export default function rehypeHeadingIds() {
  return (tree: Root) => {
    const usedIds = new Map<string, number>();

    visit(tree, 'element', (node: Element) => {
      if (!headingTags.has(node.tagName)) return;

      const text = extractText(node);
      let id = generateHeadingId(text);
      const count = usedIds.get(id) ?? 0;
      if (count > 0) {
        id = `${id}-${count}`;
      }
      usedIds.set(generateHeadingId(text), count + 1);

      node.properties = node.properties || {};
      node.properties.id = id;
    });
  };
}
