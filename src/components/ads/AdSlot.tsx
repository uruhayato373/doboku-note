"use client";

import { useEffect, useRef } from "react";

/**
 * AdSense 表示ユニット（レスポンシブ）。ライブラリ本体の読み込みは AdSenseScript.tsx が担う。
 *
 * スロット ID は環境変数から注入する（`NEXT_PUBLIC_ADSENSE_SLOT_QUIZ` 等）。
 * 未設定なら何も描画しない — 実在しないスロット ID を埋め込んで空枠や規約違反を出さないため。
 * 実運用時は AdSense 管理画面で広告ユニットを作成し、その data-ad-slot を env に設定する。
 */
export default function AdSlot({
  slot,
  className,
  label = "スポンサーリンク",
}: {
  slot?: string;
  className?: string;
  label?: string;
}) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!slot || pushed.current) return;
    pushed.current = true;
    try {
      // adsbygoogle はスクリプト読込後に window に生える
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      // 広告ブロッカー等で push が失敗しても演習体験は壊さない
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <div className={className}>
      <div className="text-[10px] uppercase tracking-wider text-[var(--ink-muted)] mb-1 text-center">
        {label}
      </div>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-7995274743017484"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
