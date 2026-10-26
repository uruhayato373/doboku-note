// 右の目次（StandardsNavigation の DocumentTreeNav と StandardsTreeChapter）が共有する見た目。
// クライアント部品へ props で渡すと章の数だけ RSC ペイロードに複製されるので、両方がここから読む。
export const TREE_ROW = 'focus-ring flex min-h-8 items-baseline gap-2 py-1 pr-3 text-[13px] leading-[1.55] transition-colors';
export const TREE_SUMMARY = 'flex cursor-pointer list-none items-center gap-1 pr-3 marker:hidden';
export const TREE_SECTIONS = 'mb-1 ml-[22px] border-l border-(--rule-soft) pl-2';
export const TREE_SECTION_LINK = `${TREE_ROW} pl-1 text-(--ink-body) hover:text-(--accent)`;
