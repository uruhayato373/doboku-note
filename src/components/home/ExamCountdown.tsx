'use client';

import { useEffect, useState } from 'react';

// 資格カードの「次の試験」行。日付と名称は exam-calendar（SSOT）由来で静的に描画し、
// 「あと N 日」だけ閲覧時に再計算する（静的エクスポートはビルド時刻で固まるため）。
// 初期描画の N はサーバ側（ビルド時）の値。日付が跨いだ場合の差分は suppressHydrationWarning で吸収する。

function formatJaDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

function daysUntilJst(date: string): number | null {
  const target = Date.parse(`${date}T00:00:00+09:00`);
  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayJst = Date.parse(`${nowJst.toISOString().slice(0, 10)}T00:00:00+09:00`);
  if (!Number.isFinite(target) || !Number.isFinite(todayJst)) return null;
  return Math.round((target - todayJst) / 86_400_000);
}

export default function ExamCountdown({ date, label }: { date: string; label: string }) {
  const [days, setDays] = useState<number | null>(() => daysUntilJst(date));
  useEffect(() => {
    setDays(daysUntilJst(date));
  }, [date]);
  return (
    <span className="flex items-center justify-between gap-2">
      <span>
        次回 {formatJaDate(date)} {label}
      </span>
      {days !== null && days >= 0 && (
        <span suppressHydrationWarning className="shrink-0 tabular-nums normal-case tracking-normal">
          {days === 0 ? '本日' : (
            <>
              あと<span className="mx-0.5 text-[13px] font-bold">{days}</span>日
            </>
          )}
        </span>
      )}
    </span>
  );
}
