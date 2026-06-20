"use client";

import { useEffect } from "react";
import affiliateBooks from "@/config/affiliate-books.json";
import { AFFILIATE_LINKS_ENABLED } from "@/config/affiliate-flags";

interface BookCardProps {
  /** 書籍の ASIN。src/config/affiliate-books.json のキーと一致させる。 */
  readonly asin: string;
}

/**
 * もしもアフィリエイト「かんたんリンク」（cardlink）公式 JS を
 * Next.js 上で正しく描画する書籍カード。
 *
 * payload（msmaflink の引数 JSON）は src/config/affiliate-books.json で
 * ASIN ごとに一元管理し、本コンポーネントは asin で参照する。
 *
 * 公式 bundle.js をそのまま読み込んで msmaflink(payload) を呼ぶため、
 * クリック URL の成果計測ロジックはもしも公式どおりに保たれる。
 * （payload 内の u_url は素の商品 URL であり、自前で <a> 化すると
 * 成果が計上されないため、必ず公式 JS に描画させる。）
 *
 * ステマ規制（2023-10〜）対応として「PR」表示を付与する。
 * 配置原則: 記事末・hub 末の補完導線。ファーストビュー禁止。
 *
 * 実装メモ:
 * - 旧実装は `next/script strategy="lazyOnload"` でローダを発火していたが、
 *   moshimo bundle.js は IIFE 内で `window.addEventListener("DOMContentLoaded"|"load", F)`
 *   としてキュー処理関数 F をリスナ登録するだけで即時呼ばない。
 *   lazyOnload は window.load 後に発火するため両イベントが既に通過済みで、
 *   F が永遠に呼ばれず `window.msmaflink.q` が処理されない不具合があった。
 *   useEffect 内で手動ロード後に load イベントを再ディスパッチして F を起動する。
 */

const BUNDLE_URL = "https://dn.msmstatic.com/site/cardlink/bundle.js?20220329";
const SCRIPT_ID = "msmaflink";

type MsmaflinkWindow = typeof window & {
  MoshimoAffiliateObject?: string;
  msmaflink?: {
    (payload: unknown): void;
    q?: unknown[];
  };
};

function ensureLoaderQueue(): void {
  const w = window as MsmaflinkWindow;
  if (w.msmaflink) return;
  w.MoshimoAffiliateObject = "msmaflink";
  const fn = function (this: unknown) {
    // eslint-disable-next-line prefer-rest-params
    const args = arguments as unknown as { currentScript?: Element | null };
    args.currentScript = document.currentScript;
    // eslint-disable-next-line prefer-rest-params
    (fn.q = fn.q || []).push(arguments);
  } as MsmaflinkWindow["msmaflink"] & { q?: unknown[] };
  w.msmaflink = fn;
}

function triggerQueueProcess(): void {
  // bundle.js の F は DOMContentLoaded / load のリスナとして登録されるだけで、
  // 自前では即時実行しない。load が既に通過済みなら手動でディスパッチして起動する。
  if (document.readyState === "complete") {
    window.dispatchEvent(new Event("load"));
  }
}

function loadBundleOnce(): void {
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    // 既にロード済み（同ページの別 BookCard が先に注入）→ キュー追記後すぐ起動
    if (existing.dataset.loaded === "true") {
      triggerQueueProcess();
    } else {
      existing.addEventListener("load", triggerQueueProcess, { once: true });
    }
    return;
  }
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = BUNDLE_URL;
  script.async = true;
  script.addEventListener(
    "load",
    () => {
      script.dataset.loaded = "true";
      triggerQueueProcess();
    },
    { once: true },
  );
  document.body.appendChild(script);
}

export default function BookCard({ asin }: BookCardProps) {
  const books = affiliateBooks as Record<string, unknown>;
  const payload = books[asin];
  const eid =
    payload && typeof payload === "object"
      ? (payload as { eid?: string }).eid
      : undefined;

  useEffect(() => {
    if (!AFFILIATE_LINKS_ENABLED) return;
    if (!payload || !eid) return;
    ensureLoaderQueue();
    (window as MsmaflinkWindow).msmaflink?.(payload);
    loadBundleOnce();
  }, [eid, payload]);

  if (!AFFILIATE_LINKS_ENABLED) {
    return null;
  }

  if (!payload || typeof payload !== "object" || !eid) {
    return null;
  }

  return (
    <div className="not-prose">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white"
          style={{ background: "var(--color-ink-muted)" }}
          aria-label="広告"
        >
          PR
        </span>
        <span className="text-[11px] text-ink-muted dark:text-gray-500">
          アフィリエイトリンクを含みます
        </span>
      </div>

      <div id={`msmaflink-${eid}`}>リンク</div>
    </div>
  );
}
