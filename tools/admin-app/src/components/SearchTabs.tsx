import SectionTabs from './SectionTabs';

/** 検索の画面内タブ（キーワード戦略 → 全体 → 改善中 → インデックス。16_検索キーワード戦略.md の改善サイクル順）。 */
export default function SearchTabs({ current }: { current: string }) {
  return <SectionTabs set="search" current={current} />;
}
