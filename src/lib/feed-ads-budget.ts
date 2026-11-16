import 'server-only';
import { cache } from 'react';
import { FEED_ADS_PAGE_MAX } from './feed-ads';

/**
 * 1 ページのインフィード広告の残り枠（サーバーの描画 1 回ごとに 1 つ・React の cache）。
 * /practice のように一覧が 14 区画あるページでも、ページ全体で FEED_ADS_PAGE_MAX 枠までにする。withFeedAds の budget に渡す。
 */
export const feedAdBudget = cache((): { left: number } => ({ left: FEED_ADS_PAGE_MAX }));
