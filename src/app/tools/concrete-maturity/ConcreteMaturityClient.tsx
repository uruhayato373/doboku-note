"use client";

import { useState } from "react";
import { TOOL_INPUT, TOOL_LABEL, ToolLayout, ToolPanel, ToolResultValue, ToolStatus, ToolNotice, ToolSources } from '@/components/tools/ToolParts';

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

export default function ConcreteMaturityClient({ related }: { related?: React.ReactNode }) {
  const [avgTemp, setAvgTemp] = useState("10");
  const [days, setDays] = useState("14");
  const [dailyMean, setDailyMean] = useState("6");

  const temp = toNum(avgTemp);
  const d = toNum(days);
  const mean = toNum(dailyMean);

  const maturity = temp !== null && d !== null && d >= 0 ? (temp + MATURITY_OFFSET) * d : null;
  const ratio = maturity !== null ? maturity / STANDARD_28D_MATURITY : null;

  const isCold = mean !== null && mean <= COLD_DAILY_MEAN_C;

  return (
    <ToolLayout>
      {/* 入力 */}
      <ToolPanel>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="avg-temp" className={`${TOOL_LABEL} mb-2`}>
              養生期間中の平均気温（℃）
            </label>
            <input
              id="avg-temp"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={avgTemp}
              onChange={(e) => setAvgTemp(e.target.value)}
              className={TOOL_INPUT}
            />
          </div>
          <div>
            <label htmlFor="days" className={`${TOOL_LABEL} mb-2`}>
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
              className={TOOL_INPUT}
            />
          </div>
          <div>
            <label htmlFor="daily-mean" className={`${TOOL_LABEL} mb-2`}>
              日平均気温（℃）
            </label>
            <input
              id="daily-mean"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={dailyMean}
              onChange={(e) => setDailyMean(e.target.value)}
              className={TOOL_INPUT}
            />
            <p className="mt-1.5 text-xs leading-5 text-(--ink-muted)">
              寒中コンクリートの区分を決める
            </p>
          </div>
        </div>
      </ToolPanel>

      {/* 結果 */}
      <ToolPanel spaced>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <ToolResultValue label={<>積算温度 M = Σ(θ+{MATURITY_OFFSET})Δt</>}>
            {maturity !== null ? `${maturity.toFixed(0)} ℃・D` : "—"}
          </ToolResultValue>
          {isCold && (
            <ToolStatus toneClass="border border-(--color-warn) text-(--warn-text-emphasis)">
              寒中コンクリートの区分
            </ToolStatus>
          )}
        </div>

        {ratio !== null && (
          <div className="mt-5 rounded-card-content bg-(--accent-fill) p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-(--ink-body)">
              標準養生28日相当（{STANDARD_28D_MATURITY}℃・D）との比
            </div>
            <ToolResultValue size="sm" className="mt-1">
              {(ratio * 100).toFixed(0)}%
            </ToolResultValue>
            <p className="mt-2 text-sm leading-6 text-(--ink-body)">
              比が100%を超えても、標準養生28日と同じ強度が出ているとは限りません。強度への換算は配合ごとに事前に把握した関係式が必要です。
            </p>
          </div>
        )}

        {isCold && (
          <ToolNotice className="mt-4">
            日平均気温が4℃以下のため、寒中コンクリートとして扱う区分に該当します。打込み時のコンクリート温度は5〜20℃を確保し、初期凍害を受けない強度が出るまで5℃以上に保つ必要があります。
          </ToolNotice>
        )}
      </ToolPanel>

      {/* 根拠 */}
      <ToolSources>
          <li>
            <strong className="text-(--ink)">積算温度 M = Σ(θ+10)Δt</strong>は、コンクリートの強度発現を温度と時間の積み重ねで捉えるマチュリティ（Saul の積算温度式）です。θは養生期間中の平均気温、Δtは日数を表します。
          </li>
          <li>
            <strong className="text-(--ink)">標準養生28日相当 840℃・D</strong>は、標準養生（20℃）で材齢28日の積算温度（20+10）×28から求めた値です。
          </li>
          <li>
            <strong className="text-(--ink)">寒中コンクリートの区分（日平均気温4℃以下）</strong>は、打込み後91日間の積算温度が840℃・D未満となる場合も対象になります。
          </li>
          <li className="text-(--ink-muted)">
            ※ 積算温度と圧縮強度の関係（σ=A logM+Bの形）は、使用する材料・配合・養生条件によって異なる実験定数A・Bを必要とします。<strong className="text-(--ink-body)">本ツールは強度を推定・判定するものではありません。</strong>重要部材では供試体の試験による確認と併用してください。
          </li>
      </ToolSources>

      {related}
    </ToolLayout>
  );
}
