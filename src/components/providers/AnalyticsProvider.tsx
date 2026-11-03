"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import * as gtag from "@/lib/gtag";
import { AFFILIATE_EXPERIMENT_ID, affiliateExperimentLabel } from "@/lib/affiliate-experiment.mjs";
import {
  PRODUCT_CLICK_EVENT,
  PRODUCT_IMPRESSION_DWELL_MS,
  PRODUCT_IMPRESSION_EVENT,
  PRODUCT_IMPRESSION_RATIO,
  productReferralOf,
  productReferralParams,
} from "@/lib/product-referral.mjs";

// 販売先へ出ていくリンク（productReferralOf が読めるホストだけ）。querySelectorAll の候補を絞るための粗い条件。
const PRODUCT_LINK_SELECTOR = ["note.com/", "coconala.com/", "amazon.co.jp/", "px.a8.net/", "af.moshimo.com/"]
  .map((host) => `a[href*="${host}"]`)
  .join(", ");

const placementOf = (el: Element) =>
  el.closest<HTMLElement>("[data-cta-placement]")?.dataset.ctaPlacement || "(unknown)";

function experimentContext(el: HTMLElement): { variant: string; program: string } | null {
  const owner = el.dataset.cta === "affiliate" ? el : document.querySelector<HTMLElement>(`[data-cta-experiment="${AFFILIATE_EXPERIMENT_ID}"][data-cta-variant]`);
  if (owner?.dataset.ctaExperiment !== AFFILIATE_EXPERIMENT_ID || !owner.dataset.ctaVariant) return null;
  return { variant: owner.dataset.ctaVariant, program: el.dataset.cta === "note" ? "note" : owner.dataset.ctaProgram || "(unknown)" };
}

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
  // サーバー描画の <a> に data-cta="note" | "affiliate" | "note-article" | "nav" |
  // "coconala" | "standards-data"（+ data-cta-label）
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
      "standards-data": "standards_data_download",
      // キャリア hub / 診断ツールで読者が悩みを選んだ遷移（2026-08-21 新設）。
      // label は need キーのみを送る（氏名・会社名・年収などは送らない）。
      "career-need": "career_need_select",
      // 実務記事・共通仕様書の章末「業務経験 → 資格」カード（2026-09-25 新設・EXP-012）。
      // label はリンク側の data-cta-label（立場: orderer / contractor / qualification-map）。
      "qualification-bridge": "qualification_bridge_click",
    };
    const CATEGORY: Record<string, string> = {
      note: "note-magazine",
      affiliate: "affiliate",
      "note-article": "note-article",
      nav: "internal-nav",
      coconala: "coconala",
      "standards-data": "standards-data",
      "career-need": "career-need",
      "qualification-bridge": "qualification-bridge",
    };
    const onClick = (e: MouseEvent) => {
      // 中クリック（新しいタブで開く）は click ではなく auxclick だけが飛ぶ。右ボタン等は数えない。
      if (e.type === "auxclick" && e.button !== 1) return;
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
        // リンク自身の data-cta-label を優先（root に面全体のラベル、各リンクに分岐のラベルを持つ
        // qualification-bridge 用。リンクにラベルが無い既存の面は従来どおり root → href）。
        label: anchor.dataset.ctaLabel || el.dataset.ctaLabel || anchor.getAttribute("href") || "(unknown)",
        params: {
          cta_placement: el.dataset.ctaPlacement || "(unknown)",
        },
      });
      const experiment = ["affiliate", "note"].includes(kind) ? experimentContext(el) : null;
      if (experiment) gtag.event({
        action: kind === "note" ? "note_experiment_click" : "affiliate_experiment_click",
        category: "affiliate-design-experiment",
        label: affiliateExperimentLabel(experiment.variant, experiment.program, el.dataset.ctaPlacement || "(unknown)"),
        params: { cta_placement: el.dataset.ctaPlacement || "(unknown)" },
      });
    };
    // capture フェーズ: 子要素が stopPropagation しても確実に拾う。
    // auxclick: PC で中クリックして開いたリンクは click が飛ばず GA4 に残らない。2026-10-05 のビルドジョブ成果は
    // A8 にクリックがあるのに GA4 では 0 件で、その取りこぼし経路の 1 つ（measurement-incidents.md 2026-10-07）。
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("auxclick", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("auxclick", onClick, { capture: true });
    };
  }, []);

  // 過去問ページの「解答・解説」（MDX の素の <details>）を開いた回数（2026-10-02 新設）。
  // 解説がどれだけ読まれているか＝解説を有料側へ移した場合に影響する読者数を測る。
  // label＝ページ slug（URL 末尾）、cta_placement＝直前の H2（問題番号 Ⅲ-1 等）。同じ要素はページ滞在中 1 回だけ。
  useEffect(() => {
    const sent = new WeakSet<Element>();
    const onToggle = (e: Event) => {
      const details = e.target as HTMLDetailsElement | null;
      if (!(details instanceof HTMLDetailsElement) || !details.open || sent.has(details)) return;
      const summary = details.querySelector(":scope > summary")?.textContent?.trim();
      if (summary !== "解答・解説") return;
      sent.add(details);
      let heading: Element | null = details.previousElementSibling;
      while (heading && heading.tagName !== "H2") heading = heading.previousElementSibling;
      gtag.event({
        action: "answer_reveal",
        category: "past-exam",
        label: pathname.split("/").filter(Boolean).pop() || "(unknown)",
        params: {
          cta_placement: heading?.textContent?.replace(/#$/, "").trim() || "(unknown)",
        },
      });
    };
    // toggle はバブリングしないため capture で拾う。
    document.addEventListener("toggle", onToggle, { capture: true });
    return () => document.removeEventListener("toggle", onToggle, { capture: true });
  }, [pathname]);

  // CTA の50%以上が見えた時点を計測。アフィリの意匠実験（EXP-043）は案でカードの高さが違うため、
  // 案ごとの見出し領域（B は見出し、C はバナー）を観測する。案の確定前の SSR 表示は数えない。
  // visible impression として送る。配置ごとのクリック数をページ訪問数で割るのではなく、
  // 実際に見えた回数を分母にして CTR を比較する。同じ要素はページ滞在中 1 回だけ。
  // A8 の 1px ピクセル（ページ読込ベース）とは役割を分ける。
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const IMPRESSION: Record<string, { action: string; category: string }> = {
      note: { action: "note_cta_impression", category: "note-magazine" },
      affiliate: { action: "affiliate_cta_impression", category: "affiliate" },
      // ココナラ（A8 経由の自社出品）もクリック率の分母を配置別に取る（2026-09-25〜）。
      coconala: { action: "coconala_cta_impression", category: "coconala" },
      // 業務経験 → 資格カード。クリック率の分母（表示回数）を面別に取る（EXP-012）。
      "qualification-bridge": { action: "qualification_bridge_impression", category: "qualification-bridge" },
    };

    const observed = new WeakSet<Element>();
    const sent = new WeakSet<Element>();
    const owners = new WeakMap<Element, HTMLElement>();
    let assignmentSent = false;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
          const el = owners.get(entry.target) ?? entry.target as HTMLElement;
          if (sent.has(el)) continue;
          const kind = el.dataset.cta;
          const event = kind ? IMPRESSION[kind] : undefined;
          if (!event) continue;
          sent.add(el);
          observer.unobserve(entry.target);
          gtag.event({
            action: event.action,
            category: event.category,
            label: el.dataset.ctaLabel || "(unknown)",
            params: {
              cta_placement: el.dataset.ctaPlacement || "(unknown)",
            },
          });
          const experiment = ["affiliate", "note"].includes(kind || "") ? experimentContext(el) : null;
          if (experiment) gtag.event({
            action: kind === "note" ? "note_experiment_impression" : "affiliate_experiment_impression",
            category: "affiliate-design-experiment",
            label: affiliateExperimentLabel(experiment.variant, experiment.program, el.dataset.ctaPlacement || "(unknown)"),
            params: { cta_placement: el.dataset.ctaPlacement || "(unknown)" },
          });
        }
      },
      { threshold: 0.5 },
    );

    const observeRevenueCtas = () => {
      const assigned = document.querySelector<HTMLElement>(`[data-cta-experiment="${AFFILIATE_EXPERIMENT_ID}"][data-cta-variant]`);
      if (assigned && !assignmentSent) {
        assignmentSent = true;
        gtag.event({ action: "affiliate_experiment_page_view", category: "affiliate-design-experiment", label: affiliateExperimentLabel(assigned.dataset.ctaVariant!, "page", "all") });
      }
      document.querySelectorAll('[data-cta="note"], [data-cta="affiliate"], [data-cta="coconala"], [data-cta="qualification-bridge"]').forEach((el) => {
        if (observed.has(el)) return;
        const root = el as HTMLElement;
        if (root.dataset.ctaExperiment && !root.dataset.ctaVariant) return;
        if (root.dataset.cta === "note" && !assigned && document.querySelector('[data-cta-experiment]')) return;
        observed.add(el);
        const target = el.querySelector('[data-cta-exposure="heading"]') ?? el;
        owners.set(target, root);
        observer.observe(target);
      });
    };

    observeRevenueCtas();
    const mutationObserver = new MutationObserver(observeRevenueCtas);
    mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-cta-variant"] });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  // 商品への送客（DN-0947）。販売先（note / ココナラ / Amazon / A8 / もしも）へ出ていくリンクを、data-cta の有無に
  // かかわらず href から拾い、販売先・販売先での商品 ID・置き場所（cta_placement）で送る。上の note_cta_click などは
  // 時系列を切らないため並行して送る（同じクリックが 2 イベントに出るので足し合わせない）。
  // 表示はリンクの 50% 以上が 1 秒続けて見えたとき、同じリンクはページ滞在中 1 回だけ。product_click はキーイベント
  // （config/ga4-admin-desired-state.json）。注文は GA4 では取らず、販売台帳（npm run product-sales）が同じ ID で突き合わせる。
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.type === "auxclick" && e.button !== 1) return;
      const anchor = (e.target as Element | null)?.closest?.("a") as HTMLAnchorElement | null;
      const referral = anchor ? productReferralOf(anchor.href) : null;
      if (!anchor || !referral) return;
      gtag.event({
        action: PRODUCT_CLICK_EVENT,
        category: "product-referral",
        label: `${referral.destination}:${referral.productId}`,
        params: productReferralParams(referral, placementOf(anchor)),
      });
    };
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("auxclick", onClick, { capture: true });
    if (typeof IntersectionObserver === "undefined") {
      return () => {
        document.removeEventListener("click", onClick, { capture: true });
        document.removeEventListener("auxclick", onClick, { capture: true });
      };
    }

    const observed = new WeakSet<Element>();
    const timers = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const anchor = entry.target as HTMLAnchorElement;
          if (!entry.isIntersecting || entry.intersectionRatio < PRODUCT_IMPRESSION_RATIO) {
            window.clearTimeout(timers.get(anchor));
            timers.delete(anchor);
            continue;
          }
          if (timers.has(anchor)) continue;
          timers.set(anchor, window.setTimeout(() => {
            timers.delete(anchor);
            observer.unobserve(anchor);
            const referral = productReferralOf(anchor.href);
            if (!referral) return;
            gtag.event({
              action: PRODUCT_IMPRESSION_EVENT,
              category: "product-referral",
              label: `${referral.destination}:${referral.productId}`,
              params: productReferralParams(referral, placementOf(anchor)),
            });
          }, PRODUCT_IMPRESSION_DWELL_MS));
        }
      },
      { threshold: PRODUCT_IMPRESSION_RATIO },
    );
    const observeProductLinks = () => {
      document.querySelectorAll<HTMLAnchorElement>(PRODUCT_LINK_SELECTOR).forEach((anchor) => {
        if (observed.has(anchor) || !productReferralOf(anchor.href)) return;
        observed.add(anchor);
        observer.observe(anchor);
      });
    };
    observeProductLinks();
    const mutationObserver = new MutationObserver(observeProductLinks);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("auxclick", onClick, { capture: true });
      mutationObserver.disconnect();
      observer.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [pathname]);

  return null;
}
