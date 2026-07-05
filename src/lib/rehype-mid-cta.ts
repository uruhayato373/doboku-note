/**
 * 記事本文の中間地点に CTA スロット（<midslot>）を挿入する rehype プラグイン。
 *
 * MDX を 1 文字も書き換えず、render-time で hast に <midslot> 要素を 1 個だけ挿入する
 * （rehype-exam-references と同型の非破壊注入）。<midslot> は page.tsx の components マップで
 * MidArticleCta（データ解決済み）へ resolve される。挿入は h2 セクションの境界に限定するため、
 * コードブロック内や段落途中には決して入らない（h2 は root 直下のブロック要素）。
 *
 * TOC アンカー（見出し id）は extractHeadings が markdown 文字列から別途生成するため、
 * この hast 変換の影響を受けない（単一コンパイルで id 衝突なし）。
 */
import type { Root, Element } from 'hast';

interface Options {
  /** 何番目（0-based）の h2 セクションの直後に挿入するか。次の h2 の直前に置く。 */
  readonly afterH2Index: number;
}

export default function rehypeMidCta(options: Options) {
  const { afterH2Index } = options;
  return (tree: Root) => {
    // root 直下の h2 要素の位置（children index）を収集
    const h2ChildIndexes: number[] = [];
    tree.children.forEach((node, i) => {
      if (node.type === 'element' && (node as Element).tagName === 'h2') {
        h2ChildIndexes.push(i);
      }
    });

    // afterH2Index 番目のセクション末（= 次の h2 の直前）に挿入するには、その次の h2 が必要。
    const targetH2 = afterH2Index + 1;
    if (h2ChildIndexes.length <= targetH2) return;

    const insertBefore = h2ChildIndexes[targetH2]!;
    const midslot: Element = {
      type: 'element',
      tagName: 'midslot',
      properties: {},
      children: [],
    };
    tree.children.splice(insertBefore, 0, midslot);
  };
}
