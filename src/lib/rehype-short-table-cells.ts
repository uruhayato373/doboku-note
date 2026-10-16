import { visit } from 'unist-util-visit';

/** これ以下の文字数のセルは折り返さない（`85～100`・`S－80(1号)`・`106㎜` など規格値・記号の長さ） */
const SHORT_CELL_CHARS = 12;

// hast の型は package.json に無い依存なので import せず、ここで使う形だけを書く
type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function textLength(nodes: HastNode[] = []): number {
  let length = 0;
  for (const node of nodes) {
    if (node.type === 'text') length += [...(node.value ?? '').trim()].length;
    else if (node.type === 'element') length += textLength(node.children);
  }
  return length;
}

/**
 * 公的基準の章・節ページの表で、短いセルに `standards-cell-short` を付ける（CSS で折り返しを止める）。
 * 17 列の粒度表などはセルが細り、規格値が 1〜2 文字ずつ縦に折れて読めなかった。表の自動レイアウトでは
 * セルの min-width が効かないため、短い値だけ折り返さないことで列幅を確保し、横スクロールで読ませる。
 * 長い説明文のセルは従来どおり折り返す。
 */
export default function rehypeShortTableCells() {
  return (tree: HastNode) => {
    visit(tree as Parameters<typeof visit>[0], 'element', (node) => {
      const element = node as HastNode;
      if (element.tagName !== 'td' && element.tagName !== 'th') return;
      const length = textLength(element.children);
      if (length > SHORT_CELL_CHARS) return; // 空欄も短いセル（長いセル用の最小幅を付けない）
      element.properties = element.properties || {};
      const className = element.properties.className;
      const classes = Array.isArray(className) ? className.map(String) : typeof className === 'string' ? className.split(/\s+/) : [];
      element.properties.className = [...classes, 'standards-cell-short'];
    });
  };
}
