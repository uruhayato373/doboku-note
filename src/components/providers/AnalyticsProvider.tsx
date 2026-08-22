"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import * as gtag from "@/lib/gtag";

/**
 * Analytics tracker — standalone component (does NOT wrap children).
 * Must be inside a <Suspense> boundary because useSearchParams() triggers
 * BAILOUT_TO_CLIENT_SIDE_RENDERING for all wrapped children.
 */
export default function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialPageView = useRef(true);

  useEffect(() => {
    // GoogleAnalytics の gtag('config') が初回 page_view を送るため、ここでは
    // App Router のクライアント遷移だけを送る。初回まで送ると二重計上になる。
    if (isInitialPageView.current) {
      isInitialPageView.current = false;
      return;
    }
    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    gtag.pageview(url);
  }, [pathname, searchParams]);

  // 収益 CTA（note 有料マガジン / アフィリエイト）・note 無料記事への送客・サイト内回遊ナビの
  // クリックを 1 つのデリゲートリスナーで計測する。各コンポーネントを client 化せず、
  // サーバー描画の <a> に data-cta="note" | "affiliate" | "note-article" | "nav" | "coconala" | "brain"（+ data-cta-label）
  // を付けるだけで拾える設計。GA4 はイベントに pagePath を自動付与するため、
  // eventName × pagePath × label でページ別・ナビ別クリック数が取れる。
  // note（有料マガジン購入 CTA）と note-article（無料記事ナビ）は別イベントに分離し、
  // 収益ファネルの分母（note_cta_click）を無料記事クリックで汚染しない。
  // nav（内部回遊ナビ）は data-cta をコンポーネント root に付けてよい（配下リンクの
  // クリックだけを数えるため「実リンク（<a>）クリック時のみ発火」ガードを敷く。見出し等の
  // 非リンククリックは計上しない）。
  useEffect(() => {
    const ACTION: Record<string, string> = {
      note: "note_cta_click",
      affiliate: "affiliate_cta_click",
      "note-article": "note_article_click",
      nav: "internal_nav_click",
      coconala: "coconala_cta_click",
      brain: "brain_cta_click",
      // キャリア hub / 診断ツールで読者が悩みを選んだ遷移（2026-08-21 新設）。
      // label は need キーのみを送る（氏名・会社名・年収などは送らない）。
      "career-need": "career_need_select",
    };
    const CATEGORY: Record<string, string> = {
      note: "note-magazine",
      affiliate: "affiliate",
      "note-article": "note-article",
      nav: "internal-nav",
      coconala: "coconala",
      brain: "brain",
      "career-need": "career-need",
    };
    const onClick = (e: MouseEvent) => {
      const start = e.target as Element | null;
      // 実リンク（<a>）のクリックのみ計上（root に data-cta を付けた nav で見出しクリックを除外）。
      const anchor = start?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const el = start?.closest?.("[data-cta]") as HTMLElement | null;
      const kind = el?.dataset.cta;
      if (!el || !kind) return;
      const action = ACTION[kind];
      const category = CATEGORY[kind];
      if (!action || !category) return;
      gtag.event({
        action,
        category,
        label: el.dataset.ctaLabel || anchor.getAttribute("href") || "(unknown)",
        params: {
          cta_placement: el.dataset.ctaPlacement || "(unknown)",
        },
      });
    };
    // capture フェーズ: 子要素が stopPropagation しても確実に拾う。
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // アフィリエイト枠が「DOM に存在した」だけでなく、50%以上が画面内に入った時点を
  // visible impression として送る。A8 の 1px ピクセル（ページ読込ベース）とは役割を分け、
  // GA4 で placement 別 CTR = affiliate_cta_click / affiliate_cta_impression を算出する。
  // 同じ要素はページ滞在中 1 回だけ。クライアント遷移で新しく描画された要素は別途観測する。
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observed = new WeakSet<Element>();
    const sent = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
          const el = entry.target as HTMLElement;
          if (sent.has(el)) continue;
          sent.add(el);
          observer.unobserve(el);
          gtag.event({
            action: "affiliate_cta_impression",
            category: "affiliate",
            label: el.dataset.ctaLabel || "(unknown)",
            params: {
              cta_placement: el.dataset.ctaPlacement || "(unknown)",
            },
          });
        }
      },
      { threshold: 0.5 },
    );

    const observeAffiliateCtas = () => {
      document.querySelectorAll('[data-cta="affiliate"]').forEach((el) => {
        if (observed.has(el)) return;
        observed.add(el);
        observer.observe(el);
      });
    };

    observeAffiliateCtas();
    const mutationObserver = new MutationObserver(observeAffiliateCtas);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
