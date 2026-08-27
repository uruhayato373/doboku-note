"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * コンクリート 積算温度（マチュリティ）計算ツール（クライアント）。
 *
 * M = Σ(θ+10)Δt（マチュリティ、Saul の積算温度式）。標準養生20℃・材齢28日相当は
 * (20+10)×28 = 840℃・D。原本HTMLの基準値「560℃・D」はこの式では導けない値で、
 * 「θ×日数」という別の積算方式（+10のオフセットなし）と混同していた疑いがある。
 * 原本の強度推定比率表（80-90/55/20/5-9%）は出典不明・刻み不揃いのため一切採用せず、
 * マチュリティの値そのものと、寒中コンクリートの区分（日平均気温4℃以下）のみを示す。
 * 強度への換算は配合ごとの実験関係（σ=A logM+B）が必要で、現場での試験と併用する
 * ことを根拠ブロックで明記する。
 */

const MATURITY_OFFSET = 10; // ℃（Saul の積算温度式のオフセット）
const STANDARD_28D_MATURITY = 840; // ℃・D（標準養生20℃×28日相当）
const COLD_DAILY_MEAN_C = 4; // 寒中コンクリートの区分（日平均気温）

function toNum(s: string): number | null {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export default function ConcreteMaturityClient() {
  const [avgTemp, setAvgTemp] = useState("10");
  const [days, setDays] = useState("14");
  const [dailyMean, setDailyMean] = useState("6");

  const temp = toNum(avgTemp);
  const d = toNum(days);
  const mean = toNum(dailyMean);

  const maturity = temp !== null && d !== null && d >= 0 ? (temp + MATURITY_OFFSET) * d : null;
  const ratio = maturity !== null ? maturity / STANDARD_28D_MATURITY : null;

  const isCold = mean !== null && mean <= COLD_DAILY_MEAN_C;

  const inputBase =
    "focus-ring w-full rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] px-3 py-2 text-[15px] text-[var(--ink)] focus:border-[var(--accent)]";
  const labelBase =
    "block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2";

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* 入力 */}
      <div className="card-surface-section p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="avg-temp" className={labelBase}>
              養生期間中の平均気温（℃）
            </label>
            <input
              id="avg-temp"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={avgTemp}
              onChange={(e) => setAvgTemp(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="days" className={labelBase}>
              養生日数（日）
            </label>
            <input
              id="days"
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="daily-mean" className={labelBase}>
              日平均気温（℃）
            </label>
            <input
              id="daily-mean"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={dailyMean}
              onChange={(e) => setDailyMean(e.target.value)}
              className={inputBase}
            />
            <p className="mt-1.5 text-xs leading-5 text-[var(--ink-muted)]">
              寒中コンクリートの区分を決める
            </p>
          </div>
        </div>
      </div>

      {/* 結果 */}
      <div className="card-surface-section mt-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              積算温度 M = Σ(θ+{MATURITY_OFFSET})Δt
            </div>
            <div className="font-serif font-black text-[24px] sm:text-[28px] leading-tight mt-1 text-[var(--ink)] tabular-nums">
              {maturity !== null ? `${maturity.toFixed(0)} ℃・D` : "—"}
            </div>
          </div>
          {isCold && (
            <div className="inline-flex items-center rounded-full border border-[var(--color-warn)] px-3 py-1 text-sm font-bold text-[var(--color-warn)]">
              寒中コンクリートの区分
            </div>
          )}
        </div>

        {ratio !== null && (
          <div className="mt-5 rounded-card-content bg-[var(--accent-fill)] p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              標準養生28日相当（{STANDARD_28D_MATURITY}℃・D）との比
            </div>
            <div className="font-serif font-black text-[22px] text-[var(--ink)] mt-1 tabular-nums">
              {(ratio * 100).toFixed(0)}%
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-body)]">
              比が100%を超えても、標準養生28日と同じ強度が出ているとは限りません。強度への換算は配合ごとに事前に把握した関係式が必要です。
            </p>
          </div>
        )}

        {isCold && (
          <p className="mt-4 rounded-card-content border-l-4 border-[var(--color-warn)] bg-[var(--bg)] p-3 text-sm leading-6 text-[var(--ink-body)]">
            日平均気温が4℃以下のため、寒中コンクリートとして扱う区分に該当します。打込み時のコンクリート温度は5〜20℃を確保し、初期凍害を受けない強度が出るまで5℃以上に保つ必要があります。
          </p>
        )}
      </div>

      {/* 根拠 */}
      <div className="mt-6 rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] p-5 text-sm leading-7 text-[var(--ink-body)]">
        <p className="font-bold text-[var(--ink)] mb-2">数値の根拠</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-[var(--ink)]">積算温度 M = Σ(θ+10)Δt</strong>は、コンクリートの強度発現を温度と時間の積み重ねで捉えるマチュリティ（Saul の積算温度式）です。θは養生期間中の平均気温、Δtは日数を表します。
          </li>
          <li>
            <strong className="text-[var(--ink)]">標準養生28日相当 840℃・D</strong>は、標準養生（20℃）で材齢28日の積算温度（20+10）×28から求めた値です。
          </li>
          <li>
            <strong className="text-[var(--ink)]">寒中コンクリートの区分（日平均気温4℃以下）</strong>は、打込み後91日間の積算温度が840℃・D未満となる場合も対象になります。
          </li>
          <li className="text-[var(--ink-muted)]">
            ※ 積算温度と圧縮強度の関係（σ=A logM+Bの形）は、使用する材料・配合・養生条件によって異なる実験定数A・Bを必要とします。<strong className="text-[var(--ink-body)]">本ツールは強度を推定・判定するものではありません。</strong>重要部材では供試体の試験による確認と併用してください。
          </li>
        </ul>
      </div>

      {/* 関連 */}
      <div className="mt-6">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-3">
          関連するページ
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/docs/civil-practice-formwork-removal-timing"
            className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
          >
            <div className="font-bold text-[var(--ink)]">型枠・支保工はいつ外せるか</div>
            <div className="text-sm text-[var(--ink-body)] mt-1">
              積算温度による推定の位置づけを解説した記事
            </div>
          </Link>
          <Link
            href="/tools/concrete-time-check"
            className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
          >
            <div className="font-bold text-[var(--ink)]">打込み 時間管理チェッカー</div>
            <div className="text-sm text-[var(--ink-body)] mt-1">
              暑中／寒中の区分と当日の限度時刻を計算
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
