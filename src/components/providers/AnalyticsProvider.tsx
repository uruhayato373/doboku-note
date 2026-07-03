"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import * as gtag from "@/lib/gtag";

/**
 * Analytics tracker — standalone component (does NOT wrap children).
 * Must be inside a <Suspense> boundary because useSearchParams() triggers
 * BAILOUT_TO_CLIENT_SIDE_RENDERING for all wrapped children.
 */
export default function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + searchParams.toString();
    gtag.pageview(url);
  }, [pathname, searchParams]);

  // 収益 CTA（note 有料マガジン / アフィリエイト）と note 無料記事への送客リンクの
  // クリックを 1 つのデリゲートリスナーで計測する。各コンポーネントを client 化せず、
  // サーバー描画の <a> に data-cta="note" | "affiliate" | "note-article"（+ data-cta-label）
  // を付けるだけで拾える設計。GA4 はイベントに pagePath を自動付与するため、
  // eventName × pagePath でページ別クリック数が取れる。
  // note（有料マガジン購入 CTA）と note-article（無料記事ナビ）は別イベントに分離し、
  // 収益ファネルの分母（note_cta_click）を無料記事クリックで汚染しない。
  useEffect(() => {
    const ACTION: Record<string, string> = {
      note: "note_cta_click",
      affiliate: "affiliate_cta_click",
      "note-article": "note_article_click",
    };
    const CATEGORY: Record<string, string> = {
      note: "note-magazine",
      affiliate: "affiliate",
      "note-article": "note-article",
    };
    const onClick = (e: MouseEvent) => {
      const start = e.target as Element | null;
      const el = start?.closest?.("[data-cta]") as HTMLElement | null;
      const kind = el?.dataset.cta;
      if (!el || !kind) return;
      const action = ACTION[kind];
      const category = CATEGORY[kind];
      if (!action || !category) return;
      gtag.event({
        action,
        category,
        label: el.dataset.ctaLabel || el.getAttribute("href") || "(unknown)",
      });
    };
    // capture フェーズ: 子要素が stopPropagation しても確実に拾う。
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
