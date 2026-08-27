"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * コンクリート 単位水量・水和水 計算ツール（クライアント）。
 *
 * W = C × (W/C)。水和反応に必要な水はセメント質量の25〜30%（concrete-finishing-curing
 * 記事で検証済み）で、範囲のまま上限・下限の両方を示す。原本HTMLは上限側（0.30）だけを
 * 引いて余剰水を出し、下限（0.25）は表示だけで計算に使っていない不整合があったため、
 * ここでは幅を持たせた形で一貫させている。
 */

const HYDRATION_RATIO_MIN = 0.25;
const HYDRATION_RATIO_MAX = 0.3;

// 一般的な目安（concrete-mix-acceptance 記事で検証済み・粗骨材最大寸法20mmの場合）
const UNIT_WATER_GUIDE_MAX = 175; // kg/m³
const WC_GUIDE_MAX = 65; // %

function toNum(s: string): number | null {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function WaterContentClient() {
  const [wcRatio, setWcRatio] = useState("55");
  const [cementUnit, setCementUnit] = useState("320");

  const wc = toNum(wcRatio);
  const cement = toNum(cementUnit);

  const unitWater = wc && cement ? cement * (wc / 100) : null;
  const hydrationMin = cement ? cement * HYDRATION_RATIO_MIN : null;
  const hydrationMax = cement ? cement * HYDRATION_RATIO_MAX : null;
  const surplusMin = unitWater !== null && hydrationMax !== null ? unitWater - hydrationMax : null;
  const surplusMax = unitWater !== null && hydrationMin !== null ? unitWater - hydrationMin : null;

  const overWaterGuide = unitWater !== null && unitWater > UNIT_WATER_GUIDE_MAX;
  const overWcGuide = wc !== null && wc > WC_GUIDE_MAX;

  const inputBase =
    "focus-ring w-full rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] px-3 py-2 text-[15px] text-[var(--ink)] focus:border-[var(--accent)]";
  const labelBase =
    "block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2";

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* 入力 */}
      <div className="card-surface-section p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="wc-ratio" className={labelBase}>
              水セメント比 W/C（%）
            </label>
            <input
              id="wc-ratio"
              type="number"
              inputMode="decimal"
              step="1"
              value={wcRatio}
              onChange={(e) => setWcRatio(e.target.value)}
              className={inputBase}
            />
            {overWcGuide && (
              <p className="mt-1.5 text-xs leading-5 text-[var(--color-warn)]">
                一般的な条件の目安（{WC_GUIDE_MAX}%以下）を超えています
              </p>
            )}
          </div>
          <div>
            <label htmlFor="cement-unit" className={labelBase}>
              単位セメント量（kg/m³）
            </label>
            <input
              id="cement-unit"
              type="number"
              inputMode="decimal"
              step="5"
              value={cementUnit}
              onChange={(e) => setCementUnit(e.target.value)}
              className={inputBase}
            />
          </div>
        </div>
      </div>

      {/* 結果 */}
      <div className="card-surface-section mt-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              単位水量 W = C × W/C
            </div>
            <div className="font-serif font-black text-[24px] sm:text-[28px] leading-tight mt-1 text-[var(--ink)] tabular-nums">
              {unitWater !== null ? `${unitWater.toFixed(0)} kg/m³` : "—"}
            </div>
          </div>
          {overWaterGuide && (
            <div className="inline-flex items-center rounded-full border border-[var(--color-warn)] px-3 py-1 text-sm font-bold text-[var(--color-warn)]">
              目安（{UNIT_WATER_GUIDE_MAX}kg/m³以下）超過
            </div>
          )}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--rule)]">
                <th className="py-2 pr-3 text-left font-bold text-[var(--ink)]">内訳</th>
                <th className="py-2 pl-3 text-right font-bold text-[var(--ink)] whitespace-nowrap">
                  量
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--rule-soft)]">
                <td className="py-2 pr-3 text-[var(--ink-body)]">
                  水和反応に必要な水（セメント質量の{HYDRATION_RATIO_MIN * 100}〜{HYDRATION_RATIO_MAX * 100}%）
                </td>
                <td className="py-2 pl-3 text-right tabular-nums text-[var(--ink-body)] whitespace-nowrap">
                  {hydrationMin !== null && hydrationMax !== null
                    ? `${hydrationMin.toFixed(0)}〜${hydrationMax.toFixed(0)} kg/m³`
                    : "—"}
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-3">
                  <span className="font-bold text-[var(--ink)]">余剰水（ブリーディング水として排出）</span>
                </td>
                <td className="py-2 pl-3 text-right tabular-nums font-bold text-[var(--ink)] whitespace-nowrap">
                  {surplusMin !== null && surplusMax !== null
                    ? `${surplusMin.toFixed(0)}〜${surplusMax.toFixed(0)} kg/m³`
                    : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 根拠 */}
      <div className="mt-6 rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] p-5 text-sm leading-7 text-[var(--ink-body)]">
        <p className="font-bold text-[var(--ink)] mb-2">数値の根拠</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-[var(--ink)]">単位水量 W = C × W/C</strong>は配合設計の基本式です。単位セメント量Cに水セメント比を掛けて求めます。
          </li>
          <li>
            <strong className="text-[var(--ink)]">水和反応に必要な水（セメント質量の25〜30%）</strong>は理論上の必要量で、実際にはこの水だけでは打込み後の表面からの蒸発を補えないため、別途、湿潤養生が必要になります。
          </li>
          <li>
            <strong className="text-[var(--ink)]">単位水量175kg/m³以下・水セメント比65%以下</strong>は、施工性を確保できる範囲でできるだけ少なくするという原則のもとでの一般的な目安です（粗骨材最大寸法20mmの場合）。環境条件によって上限は変わります。
          </li>
          <li className="text-[var(--ink-muted)]">
            ※ 余剰水が排出されなければ空隙となり耐久性・強度が落ち、不足すれば打込みが困難になります。現場での加水は水セメント比を上げ、この鎖を後から壊す行為になるため避けてください。特記仕様書・配合計画書の値が優先します。
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
            href="/docs/civil-practice-concrete-mix-acceptance"
            className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
          >
            <div className="font-bold text-[var(--ink)]">配合と受入れ検査で何を見るか</div>
            <div className="text-sm text-[var(--ink-body)] mt-1">
              スランプ・空気量・強度の合否判定を解説した記事
            </div>
          </Link>
          <Link
            href="/tools"
            className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
          >
            <div className="font-bold text-[var(--ink)]">無料ツール一覧</div>
            <div className="text-sm text-[var(--ink-body)] mt-1">
              現場管理値の計算ツールをまとめて見る
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
