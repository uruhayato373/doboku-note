'use client';

import { createContext, useContext } from 'react';
import AdSlot from '@/components/ads/AdSlot';

/**
 * 検索ページの右の欄の AdSense の枠。右の欄はサーバーで組み（src/app/search/page.tsx）、
 * 広告を出すかどうかだけを検索の状態（SearchPageClient が Provider で渡す）から決める。
 * 出すのは検索語があり結果が 1 件以上のときだけ（検索語なし・0 件の画面は入口のリンクだけで中身が薄い）。
 * 出さないときは null を返し、RailStack の包み（[data-rail-kind]:empty）ごと畳む。
 */
export const SearchRailAdContext = createContext(false);

export default function SearchRailAd() {
  return useContext(SearchRailAdContext) ? <AdSlot slot="rail" /> : null;
}
