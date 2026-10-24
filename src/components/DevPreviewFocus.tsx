"use client";

import { useEffect } from "react";

/**
 * 開発サーバーだけで描く（layout が NODE_ENV で分岐）。?previewFocus=<cta_placement> のとき、その面の最初に見えている要素まで
 * スクロールする。管理画面の広告の見本（tools/admin-app の /affiliate/preview）が実ページを iframe で開いて使う。
 * 開発サーバーは CSS・画像が遅れて届き、面の位置や見える／見えないが後から変わるので、時間をおいて何度か合わせ直す。
 */
export default function DevPreviewFocus() {
  useEffect(() => {
    const placement = new URLSearchParams(window.location.search).get("previewFocus");
    if (!placement) return;
    const focus = () => {
      // 同じ面の別リンク（診断ツールの「次に読むページ」等）より広告を先に探す
      const visible = [...document.querySelectorAll<HTMLElement>(`[data-cta-placement="${CSS.escape(placement)}"]`)].filter((e) => e.getClientRects().length > 0);
      const el = visible.find((e) => e.dataset.cta === "affiliate") ?? visible[0];
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 24, behavior: "instant" });
    };
    const timers = [0, 800, 2000, 4000].map((ms) => window.setTimeout(focus, ms));
    window.addEventListener("load", focus);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("load", focus);
    };
  }, []);
  return null;
}
