import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

/**
 * 横スクロールする領域（`<pre>` と KaTeX の `.katex-display`）に `tabindex="0"` を付ける。
 * overflow-x:auto の領域はキーボードだけではスクロールできず、axe の
 * scrollable-region-focusable（serious）に該当する。rehype-katex の後段に置く。
 */
export default function rehypeScrollableFocus() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const className = node.properties?.className;
      const classes = Array.isArray(className) ? className.map(String) : typeof className === 'string' ? className.split(/\s+/) : [];
      const scrollable = node.tagName === 'pre' || classes.includes('katex-display');
      if (!scrollable) return;
      node.properties = node.properties || {};
      if (node.properties.tabIndex === undefined && node.properties.tabindex === undefined) {
        node.properties.tabIndex = 0;
      }
    });
  };
}
