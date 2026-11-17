"use client";

import { useState } from "react";
import { TOOL_INPUT, ToolLayout, ToolPanel, ToolField, ToolResultValue, ToolStatus, ToolSources } from '@/components/tools/ToolParts';

/**
 * コンクリート 単位水量・水和水 計算ツール（クライアント）。
 *
 * W = C × (W/C)。完全に水和したときに水和物へ取り込まれる水は、結合水がセメント質量の
 * 約23%、ゲル水を含めて約44%（日本コンクリート工学会 年次論文集 Vol.26。
 * concrete-hydration-basics 記事と同じ値）。余剰水は W − 0.44C で、取り込まれない水を示す。
 */

const BOUND_WATER_RATIO = 0.23;
const HYDRATION_WATER_RATIO = 0.44;

// 単位水量は concrete-mix-acceptance 記事で検証済み（粗骨材最大寸法20mmの場合）。
// 水セメント比の上限は土木工事共通仕様書（令和8年3月）1-3-3・一般の環境条件。
const UNIT_WATER_GUIDE_MAX = 175; // kg/m³
const WC_MAX_REINFORCED = 55; // %
const WC_MAX_PLAIN = 60; // %

function toNum(s: string): number | null {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function WaterContentClient({ related }: { related?: React.ReactNode }) {
  const [wcRatio, setWcRatio] = useState("55");
  const [cementUnit, setCementUnit] = useState("320");

  const wc = toNum(wcRatio);
  const cement = toNum(cementUnit);

  const unitWater = wc && cement ? cement * (wc / 100) : null;
  const boundWater = cement ? cement * BOUND_WATER_RATIO : null;
  const hydrationWater = cement ? cement * HYDRATION_WATER_RATIO : null;
  const surplus = unitWater !== null && hydrationWater !== null ? unitWater - hydrationWater : null;

  const overWaterGuide = unitWater !== null && unitWater > UNIT_WATER_GUIDE_MAX;
  const wcWarning =
    wc === null || wc <= WC_MAX_REINFORCED
      ? null
      : wc <= WC_MAX_PLAIN
        ? `鉄筋コンクリートの上限（${WC_MAX_REINFORCED}%以下）を超えています（無筋は${WC_MAX_PLAIN}%以下）`
        : `一般の環境条件の上限（鉄筋${WC_MAX_REINFORCED}%・無筋${WC_MAX_PLAIN}%以下）を超えています`;

  return (
    <ToolLayout>
      {/* 入力 */}
      <ToolPanel>
        <div className="grid gap-4 sm:grid-cols-2">
          <ToolField id="wc-ratio" label="水セメント比 W/C（%）">
          <input
            id="wc-ratio"
            type="number"
            inputMode="decimal"
            step="1"
            value={wcRatio}
            onChange={(e) => setWcRatio(e.target.value)}
            className={TOOL_INPUT}
          />
          {wcWarning && (
            <p className="mt-1.5 text-xs leading-5 text-(--warn-text-emphasis)">{wcWarning}</p>
          )}
          </ToolField>
          <ToolField id="cement-unit" label="単位セメント量（kg/m³）">
          <input
            id="cement-unit"
            type="number"
            inputMode="decimal"
            step="5"
            value={cementUnit}
            onChange={(e) => setCementUnit(e.target.value)}
            className={TOOL_INPUT}
          />
          </ToolField>
        </div>
      </ToolPanel>

      {/* 結果 */}
      <ToolPanel spaced>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <ToolResultValue label="単位水量 W = C × W/C">
            {unitWater !== null ? `${unitWater.toFixed(0)} kg/m³` : "—"}
          </ToolResultValue>
          {overWaterGuide && (
            <ToolStatus toneClass="border border-(--color-warn) text-(--warn-text-emphasis)">
              目安（{UNIT_WATER_GUIDE_MAX}kg/m³以下）超過
            </ToolStatus>
          )}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-(--rule)">
                <th className="py-2 pr-3 text-left font-bold text-(--ink)">内訳</th>
                <th className="py-2 pl-3 text-right font-bold text-(--ink) whitespace-nowrap">
                  量
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-(--rule-soft)">
                <td className="py-2 pr-3 text-(--ink-body)">
                  結合水（セメント質量の約{Math.round(BOUND_WATER_RATIO * 100)}%）
                </td>
                <td className="py-2 pl-3 text-right tabular-nums text-(--ink-body) whitespace-nowrap">
                  {boundWater !== null ? `${boundWater.toFixed(0)} kg/m³` : "—"}
                </td>
              </tr>
              <tr className="border-b border-(--rule-soft)">
                <td className="py-2 pr-3 text-(--ink-body)">
                  水和で取り込まれる水の合計（ゲル水を含む・約{Math.round(HYDRATION_WATER_RATIO * 100)}%）
                </td>
                <td className="py-2 pl-3 text-right tabular-nums text-(--ink-body) whitespace-nowrap">
                  {hydrationWater !== null ? `${hydrationWater.toFixed(0)} kg/m³` : "—"}
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-3">
                  <span className="font-bold text-(--ink)">余剰水（水和物に取り込まれない水）</span>
                </td>
                <td className="py-2 pl-3 text-right tabular-nums font-bold text-(--ink) whitespace-nowrap">
                  {surplus === null
                    ? "—"
                    : surplus > 0
                      ? `${surplus.toFixed(0)} kg/m³`
                      : "0 kg/m³（水が足りず完全には水和しない）"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ToolPanel>

      {/* 根拠 */}
      <ToolSources>
          <li>
            <strong className="text-(--ink)">単位水量 W = C × W/C</strong>は配合設計の基本式です。単位セメント量Cに水セメント比を掛けて求めます。
          </li>
          <li>
            <strong className="text-(--ink)">結合水 約23%・ゲル水を含む合計 約44%</strong>は、セメントが完全に水和したときに取り込まれる水の量です（<a href="https://data.jci-net.or.jp/data_pdf/26/026-01-1211.pdf" className="underline" target="_blank" rel="noopener noreferrer">日本コンクリート工学会 年次論文集 Vol.26</a>）。「25〜30%」という言い方は結合水だけを指す概数です。表面からの蒸発は別に起きるため、湿潤養生が必要になります。
          </li>
          <li>
            <strong className="text-(--ink)">単位水量175kg/m³以下</strong>は、施工性を確保できる範囲でできるだけ少なくするという原則のもとでの目安です（粗骨材最大寸法20mmの場合）。<strong className="text-(--ink)">水セメント比の上限</strong>は、一般の環境条件で鉄筋コンクリート55%以下・無筋コンクリート60%以下です（<a href="https://www.mlit.go.jp/tec/r08dobokukoujikyoutsuusiyousyo/honbun01_syo03_setsu03.html" className="underline" target="_blank" rel="noopener noreferrer">土木工事共通仕様書 令和8年3月 1-3-3</a>）。環境条件によって上限は変わります。
          </li>
          <li className="text-(--ink-muted)">
            ※ 余剰水は硬化後に空隙となり耐久性・強度を下げ、不足すれば打込みが困難になります。現場での加水は水セメント比を上げ、この鎖を後から壊す行為になるため避けてください。特記仕様書・配合計画書の値が優先します。
          </li>
      </ToolSources>

      {related}
    </ToolLayout>
  );
}
