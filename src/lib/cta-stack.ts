/**
 * 本文の列に縦に続けて置く商品導線（転職の横長バナー・note のカード・ココナラ・AdSense）の幅の正本。
 * 置かれた列の幅いっぱいにそろえ、導線の上に見出しは付けない（PR・広告の表記はカードの中）。
 * ばらばらの幅（300px の中央寄せ・2 列の片側）で記事末が統一されて見えなかった（2026-11-16 運営者指摘）。上限（740・760px）を付けると、本文の列（約 753〜844px）より内側に入って段差に見えた。
 * 当てる要素には data-cta-stack を付ける（検査が幅を測る箱）。検査: scripts/lib/cta-stack-inspect.mjs（site-visual-review の機械の検査と e2e/cta.spec.ts）。
 */
/** 幅だけ（not-prose を持つ部品に重ねて当てる）。置かれた列（記事カードの中・記事の下・読みものの列）と端がそろう */
export const CTA_STACK_WIDTH = 'mx-auto w-full';
/** 区画の左寄せで本文の幅に収める面（テーマのページ: ほかの区画が左寄せで最大 760px） */
export const CTA_STACK_START_CLASS = 'not-prose w-full max-w-[760px]';
export const CTA_STACK_CLASS = `not-prose ${CTA_STACK_WIDTH}`;
