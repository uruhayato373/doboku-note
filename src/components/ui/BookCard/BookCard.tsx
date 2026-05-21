"use client";

import Script from "next/script";
import affiliateBooks from "@/config/affiliate-books.json";

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
 */

// もしも かんたんリンク公式ローダ（bundle.js を1度だけ body に注入し、
// msmaflink 呼び出しをキューイングする IIFE）。
const MOSHIMO_LOADER =
  "(function(b,c,f,g,a,d,e){b.MoshimoAffiliateObject=a;" +
  "b[a]=b[a]||function(){arguments.currentScript=c.currentScript" +
  "||c.scripts[c.scripts.length-2];(b[a].q=b[a].q||[]).push(arguments)};" +
  "c.getElementById(a)||(d=c.createElement(f),d.src=g,d.id=a," +
  'e=c.getElementsByTagName("body")[0],e.appendChild(d))})' +
  '(window,document,"script",' +
  '"//dn.msmstatic.com/site/cardlink/bundle.js?20220329","msmaflink");';

export default function BookCard({ asin }: BookCardProps) {
  const books = affiliateBooks as Record<string, unknown>;
  const payload = books[asin];

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const eid = (payload as { eid?: string }).eid;
  if (!eid) return null;

  // </script> によるブレイクアウトを防ぐため < をエスケープ
  const payloadJson = JSON.stringify(payload).replace(/</g, "\\u003c");

  return (
    <div className="not-prose my-6">
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

      <Script id={`msmaf-${eid}`} strategy="lazyOnload">
        {`${MOSHIMO_LOADER}msmaflink(${payloadJson});`}
      </Script>

      <div id={`msmaflink-${eid}`}>リンク</div>
    </div>
  );
}
