"use client";

import { useState } from "react";
import Link from "next/link";

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

export default function SlingTensionClient() {
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
    ok: { label: "推奨範囲内", borderClass: "border-[var(--color-positive)]", textClass: "text-[var(--color-positive)]" },
    caution: {
      label: "60度を超えています",
      borderClass: "border-[var(--color-warn)]",
      textClass: "text-[var(--color-warn)]",
    },
    danger: {
      label: "90度を超えています",
      borderClass: "border-[var(--color-danger)]",
      textClass: "text-[var(--color-danger)]",
    },
  }[angleZone];

  const sampleAngles = [0, 30, 60, 90, 120];

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
            <label htmlFor="weight" className={labelBase}>
              吊り荷重（kg）
            </label>
            <input
              id="weight"
              type="number"
              inputMode="decimal"
              step="10"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="strands" className={labelBase}>
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
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="angle" className={labelBase}>
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
              className={inputBase}
            />
            <p className="mt-1.5 text-xs leading-5 text-[var(--ink-muted)]">
              2本のワイヤーがなす開き角
            </p>
          </div>
        </div>
      </div>

      {/* 結果 */}
      <div className="card-surface-section mt-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              張力割増し係数 k = 1/cos(θ/2)
            </div>
            <div className="font-serif font-black text-[24px] sm:text-[28px] leading-tight mt-1 text-[var(--ink)] tabular-nums">
              {factor ? factor.toFixed(2) : "—"}
            </div>
          </div>
          <div
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${zoneMeta.borderClass} ${zoneMeta.textClass}`}
          >
            {zoneMeta.label}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-card-content bg-[var(--accent-fill)] p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              1本当たりの張力 T
            </div>
            <div className="font-serif font-black text-[22px] text-[var(--ink)] mt-1 tabular-nums">
              {tension ? `${tension.toFixed(0)} kgf` : "—"}
            </div>
          </div>
          <div className="rounded-card-content bg-[var(--accent-fill)] p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              必要な破断荷重（安全係数{SAFETY_FACTOR}）
            </div>
            <div className="font-serif font-black text-[22px] text-[var(--ink)] mt-1 tabular-nums">
              {requiredBreak ? `${requiredBreak.toFixed(0)} kgf 以上` : "—"}
            </div>
          </div>
        </div>

        {angleZone === "danger" && (
          <p className="mt-4 rounded-card-content border-l-4 border-[var(--color-danger)] bg-[var(--bg)] p-3 text-sm leading-6 text-[var(--ink-body)]">
            吊り角度が90度を超えています。玉掛け技能講習のテキストでは90度を超えないことが推奨されています。ワイヤーを長くする、掛け点を増やすなどで角度を狭くしてください。
          </p>
        )}
        {angleZone === "caution" && (
          <p className="mt-4 rounded-card-content border-l-4 border-[var(--color-warn)] bg-[var(--bg)] p-3 text-sm leading-6 text-[var(--ink-body)]">
            吊り角度が60度を超えています。玉掛け技能講習のテキストでは60度以内が推奨されています。
          </p>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--rule)]">
                <th className="py-2 pr-3 text-left font-bold text-[var(--ink)]">開き角θ</th>
                <th className="py-2 pl-3 text-right font-bold text-[var(--ink)] whitespace-nowrap">
                  係数 k
                </th>
              </tr>
            </thead>
            <tbody>
              {sampleAngles.map((a) => (
                <tr
                  key={a}
                  className={`border-b border-[var(--rule-soft)] last:border-0 ${
                    theta === a ? "bg-[var(--accent-fill)]" : ""
                  }`}
                >
                  <td className="py-2 pr-3 text-[var(--ink-body)]">{a}度</td>
                  <td className="py-2 pl-3 text-right tabular-nums text-[var(--ink)]">
                    {tensionFactor(a).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 根拠 */}
      <div className="mt-6 rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] p-5 text-sm leading-7 text-[var(--ink-body)]">
        <p className="font-bold text-[var(--ink)] mb-2">数値の根拠</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-[var(--ink)]">張力割増し係数 k = 1/cos(θ/2)</strong>は、開き角θのワイヤー2本で荷を吊るときの一般的な力学の関係です。1本当たりの張力は、吊り荷重を本数で割った値にこの係数を掛けて求めます。
          </li>
          <li>
            <strong className="text-[var(--ink)]">安全係数6</strong>は、クレーン等安全規則第213条が玉掛用ワイヤロープに定める最低値です。破断荷重を実際にかかる荷重の最大値で割った値が6以上でなければ使用できません。
          </li>
          <li>
            <strong className="text-[var(--ink)]">60度・90度の目安</strong>は法令の数値基準ではなく、日本クレーン協会などが監修する玉掛け技能講習のテキストが示す推奨値です。
          </li>
          <li className="text-[var(--ink-muted)]">
            ※ 使用するロープの破断荷重は、そのロープの成績書（ミルシート）に記載の値で確認してください。本ツールは必要な破断荷重を計算するもので、手元のロープが安全係数を満たすかどうかまでは判定しません。素線の断線・径の減少・キンク・形くずれなどの使用禁止基準（同規則第215条）は別途、現物で確認してください。
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
            href="/practice/sling-work-wire-rope"
            className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
          >
            <div className="font-bold text-[var(--ink)]">玉掛けとワイヤーロープの選定</div>
            <div className="text-sm text-[var(--ink-body)] mt-1">
              安全係数・使用禁止基準・1本吊りの考え方を解説
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
