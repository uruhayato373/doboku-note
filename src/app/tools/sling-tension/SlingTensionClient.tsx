"use client";

import { eyebrowClass } from '@/components/ui/Eyebrow/Eyebrow';
import { useState } from "react";
import { TOOL_INPUT, TOOL_LABEL, ToolLayout, ToolPanel, ToolResultValue, ToolStatus, ToolNotice, ToolSources } from '@/components/tools/ToolParts';

/**
 * 玉掛け 吊り角度・張力計算ツール（クライアント）。
 *
 * T = (W / n) × 1/cos(θ/2)。θは2本のワイヤーがなす開き角、nは本数、Wは吊り荷重。
 * 安全係数6（クレーン等安全規則第213条）を満たす必要破断荷重も同時に出す。
 * 原本のロープ容量表（径別の破断荷重）は構成種別（6×24等）が不明で埋め込まず、
 * 「必要な破断荷重」だけを示し、実際のロープは成績書の値と比較する設計にしている。
 */

// クレーン等安全規則第213条：玉掛用ワイヤロープの安全係数は6以上
const SAFETY_FACTOR = 6;

// 玉掛け技能講習テキストが推奨する角度の目安（法令の数値基準ではない）
const RECOMMENDED_MAX_DEG = 60;
const CAUTION_MAX_DEG = 90;

function toNum(s: string): number | null {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function tensionFactor(deg: number): number {
  const rad = (deg * Math.PI) / 180;
  return 1 / Math.cos(rad / 2);
}

export default function SlingTensionClient({ related }: { related?: React.ReactNode }) {
  const [weight, setWeight] = useState("2000");
  const [strands, setStrands] = useState("2");
  const [angle, setAngle] = useState("60");

  const w = toNum(weight);
  const n = toNum(strands);
  const theta = toNum(angle);

  const validAngle = theta !== null && theta >= 0 && theta < 180;
  const factor = validAngle ? tensionFactor(theta) : null;
  const perStrandLoad = w && n ? w / n : null;
  const tension = perStrandLoad && factor ? perStrandLoad * factor : null;
  const requiredBreak = tension ? tension * SAFETY_FACTOR : null;

  const angleZone: "ok" | "caution" | "danger" =
    theta === null ? "ok" : theta <= RECOMMENDED_MAX_DEG ? "ok" : theta <= CAUTION_MAX_DEG ? "caution" : "danger";

  const zoneMeta = {
    ok: { label: "推奨範囲内", borderClass: "border-(--color-positive)", textClass: "text-(--color-positive)" },
    caution: {
      label: "60度を超えています",
      borderClass: "border-(--color-warn)",
      textClass: "text-(--warn-text-emphasis)",
    },
    danger: {
      label: "90度を超えています",
      borderClass: "border-(--color-danger)",
      textClass: "text-(--color-danger)",
    },
  }[angleZone];

  const sampleAngles = [0, 30, 60, 90, 120];

  return (
    <ToolLayout>
      {/* 入力 */}
      <ToolPanel>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="weight" className={`${TOOL_LABEL} mb-2`}>
              吊り荷重（kg）
            </label>
            <input
              id="weight"
              type="number"
              inputMode="decimal"
              step="10"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={TOOL_INPUT}
            />
          </div>
          <div>
            <label htmlFor="strands" className={`${TOOL_LABEL} mb-2`}>
              ワイヤー本数
            </label>
            <input
              id="strands"
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              value={strands}
              onChange={(e) => setStrands(e.target.value)}
              className={TOOL_INPUT}
            />
          </div>
          <div>
            <label htmlFor="angle" className={`${TOOL_LABEL} mb-2`}>
              吊り角度θ（度）
            </label>
            <input
              id="angle"
              type="number"
              inputMode="decimal"
              step="5"
              min="0"
              max="179"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              className={TOOL_INPUT}
            />
            <p className="mt-1.5 text-xs leading-5 text-(--ink-muted)">
              2本のワイヤーがなす開き角
            </p>
          </div>
        </div>
      </ToolPanel>

      {/* 結果 */}
      <ToolPanel spaced>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <ToolResultValue label="張力割増し係数 k = 1/cos(θ/2)">
            {factor ? factor.toFixed(2) : "—"}
          </ToolResultValue>
          <ToolStatus toneClass={`border ${zoneMeta.borderClass} ${zoneMeta.textClass}`}>
            {zoneMeta.label}
          </ToolStatus>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-card-content bg-(--accent-fill) p-4">
            <div className={eyebrowClass('label', 'body')}>
              1本当たりの張力 T
            </div>
            <ToolResultValue size="sm" className="mt-1">
              {tension ? `${tension.toFixed(0)} kgf` : "—"}
            </ToolResultValue>
          </div>
          <div className="rounded-card-content bg-(--accent-fill) p-4">
            <div className={eyebrowClass('label', 'body')}>
              必要な破断荷重（安全係数{SAFETY_FACTOR}）
            </div>
            <ToolResultValue size="sm" className="mt-1">
              {requiredBreak ? `${requiredBreak.toFixed(0)} kgf 以上` : "—"}
            </ToolResultValue>
          </div>
        </div>

        {angleZone === "danger" && (
          <ToolNotice tone="danger" className="mt-4">
            吊り角度が90度を超えています。玉掛け技能講習のテキストでは90度を超えないことが推奨されています。ワイヤーを長くする、掛け点を増やすなどで角度を狭くしてください。
          </ToolNotice>
        )}
        {angleZone === "caution" && (
          <ToolNotice className="mt-4">
            吊り角度が60度を超えています。玉掛け技能講習のテキストでは60度以内が推奨されています。
          </ToolNotice>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-(--rule)">
                <th className="py-2 pr-3 text-left font-bold text-(--ink)">開き角θ</th>
                <th className="py-2 pl-3 text-right font-bold text-(--ink) whitespace-nowrap">
                  係数 k
                </th>
              </tr>
            </thead>
            <tbody>
              {sampleAngles.map((a) => (
                <tr
                  key={a}
                  className={`border-b border-(--rule-soft) last:border-0 ${
                    theta === a ? "bg-(--accent-fill)" : ""
                  }`}
                >
                  <td className="py-2 pr-3 text-(--ink-body)">{a}度</td>
                  <td className="py-2 pl-3 text-right tabular-nums text-(--ink)">
                    {tensionFactor(a).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ToolPanel>

      {/* 根拠 */}
      <ToolSources>
          <li>
            <strong className="text-(--ink)">張力割増し係数 k = 1/cos(θ/2)</strong>は、開き角θのワイヤー2本で荷を吊るときの一般的な力学の関係です。1本当たりの張力は、吊り荷重を本数で割った値にこの係数を掛けて求めます。
          </li>
          <li>
            <strong className="text-(--ink)">安全係数6</strong>は、クレーン等安全規則第213条が玉掛用ワイヤロープに定める最低値です。破断荷重を実際にかかる荷重の最大値で割った値が6以上でなければ使用できません。
          </li>
          <li>
            <strong className="text-(--ink)">60度・90度の目安</strong>は法令の数値基準ではなく、日本クレーン協会などが監修する玉掛け技能講習のテキストが示す推奨値です。
          </li>
          <li className="text-(--ink-muted)">
            ※ 使用するロープの破断荷重は、そのロープの成績書（ミルシート）に記載の値で確認してください。本ツールは必要な破断荷重を計算するもので、手元のロープが安全係数を満たすかどうかまでは判定しません。素線の断線・径の減少・キンク・形くずれなどの使用禁止基準（同規則第215条）は別途、現物で確認してください。
          </li>
      </ToolSources>

      {related}
    </ToolLayout>
  );
}
