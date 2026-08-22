/**
 * 記事本文の中間地点に CTA スロット（<midslot>）を挿入する rehype プラグイン。
 *
 * MDX を 1 文字も書き換えず、render-time で hast に <midslot> 要素を挿入する
 * （rehype-exam-references と同型の非破壊注入）。<midslot> は page.tsx の components マップで
 * MidArticleCta（データ解決済み）へ resolve される。挿入は h2 セクションの境界に限定するため、
 * コードブロック内や段落途中には決して入らない（h2 は root 直下のブロック要素）。
 *
 * 2026-07-28: 1 記事 1 枠から**記事長に応じた複数枠**へ拡張（長文記事では note と転職カードが
 * 枠を奪い合っていたため）。どの枠に何を出すかは page.tsx が決め、ここは位置に slot を置くだけ。
 * 各 slot は data-mid-index を持ち、page.tsx 側がそれで中身を引く。
 *
 * TOC アンカー（見出し id）は extractHeadings が markdown 文字列から別途生成するため、
 * この hast 変換の影響を受けない（単一コンパイルで id 衝突なし）。
 */
import type { Root, Element } from 'hast';

interface Options {
  /**
   * 挿入する h2 セクション番号（0-based）の配列。
   * 各要素 n について「n 番目のセクション末＝ n+1 番目の h2 の直前」に slot を置く。
   */
  readonly positions: readonly number[];
}

export default function rehypeMidCta(options: Options) {
  const { positions } = options;
  return (tree: Root) => {
    if (positions.length === 0) return;

    // root 直下の h2 要素の位置（children index）を収集
    const h2ChildIndexes: number[] = [];
    tree.children.forEach((node, i) => {
      if (node.type === 'element' && (node as Element).tagName === 'h2') {
        h2ChildIndexes.push(i);
      }
    });

    // 挿入で children index がずれるので、後ろの位置から順に処理する。
    // 重複位置は 1 つに畳む（同じ境界に 2 枚並べない）。
    const targets = [...new Set(positions)]
      .map((n) => ({ slotIndex: positions.indexOf(n), h2: n + 1 }))
      .filter((t) => t.h2 < h2ChildIndexes.length)
      .sort((a, b) => b.h2 - a.h2);

    for (const t of targets) {
      const insertBefore = h2ChildIndexes[t.h2]!;
      const midslot: Element = {
        type: 'element',
        tagName: 'midslot',
        properties: { 'data-mid-index': String(t.slotIndex) },
        children: [],
      };
      tree.children.splice(insertBefore, 0, midslot);
    }
  };
}
