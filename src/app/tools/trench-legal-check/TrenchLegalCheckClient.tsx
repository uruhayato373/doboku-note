"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * 溝掘削 法令チェッカー（クライアント）。
 *
 * 「安全な深さ」は存在しない、というのが記事側の結論。このツールも同じ立場を取る。
 * 深さから出せるのは①作業主任者の選任義務（施行令6条9号・規則359条・2m基準）と
 * ②土留めを設けない場合の法面勾配の基準（規則356条・地山の種類別）だけであり、
 * 掘削そのものの可否・土留めの要否は規則361条の「危険のおそれ」で決まるため
 * 深さでは判定できない。この区別を常に画面に出す。
 */

type GroundType = "rock_or_hard_clay" | "other";

// 労働安全衛生規則 第356条 別表（掘削面の勾配の基準）
function gradientDeg(ground: GroundType, height: number): number {
  if (ground === "rock_or_hard_clay") {
    return height < 5 ? 90 : 75;
  }
  if (height < 2) return 90;
  if (height < 5) return 75;
  return 60;
}

// 土止め先行工法ガイドラインの想定範囲（厚生労働省）
const GL_MIN_DEPTH = 1.5;
const GL_MAX_DEPTH = 4;
const GL_MAX_WIDTH = 3;
const SHORING_PRE_INSTALL_DEPTH = 1.0;

function toNum(s: string): number | null {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export default function TrenchLegalCheckClient() {
  const [height, setHeight] = useState("2.0");
  const [width, setWidth] = useState("1.5");
  const [ground, setGround] = useState<GroundType>("other");

  const h = toNum(height);
  const w = toNum(width);

  const needsSupervisor = h !== null && h >= 2;
  const grad = h !== null ? gradientDeg(ground, h) : null;

  const glApplicable =
    h !== null &&
    w !== null &&
    h >= GL_MIN_DEPTH &&
    h <= GL_MAX_DEPTH &&
    w <= GL_MAX_WIDTH;

  const inputBase =
    "focus-ring w-full rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] px-3 py-2 text-[15px] text-[var(--ink)] focus:border-[var(--accent)]";
  const labelBase =
    "block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2";

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* 常設の警告 */}
      <div className="rounded-card-content border-l-4 border-[var(--color-danger)] bg-[var(--bg)] p-4 text-sm leading-6 text-[var(--ink-body)]">
        労働安全衛生規則第361条は、地山の崩壊または土石の落下により労働者に危険を及ぼす<strong className="text-[var(--ink)]">おそれがあるとき</strong>、深さにかかわらず土止め支保工の設置を義務づけています。
        このツールが出す結果は<strong className="text-[var(--ink)]">「作業主任者が要るか」「勾配の基準値」「ガイドラインの想定範囲」</strong>であり、「この深さなら土留めなしで安全」を意味しません。
      </div>

      {/* 入力 */}
      <div className="card-surface-section mt-4 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="height" className={labelBase}>
              掘削面の高さ（m）
            </label>
            <input
              id="height"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="width" className={labelBase}>
              掘削幅（m）
            </label>
            <input
              id="width"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="ground" className={labelBase}>
              地山の種類
            </label>
            <select
              id="ground"
              value={ground}
              onChange={(e) => setGround(e.target.value as GroundType)}
              className={inputBase}
            >
              <option value="other">その他の地山</option>
              <option value="rock_or_hard_clay">岩盤または堅い粘土からなる地山</option>
            </select>
          </div>
        </div>
      </div>

      {/* 結果① 作業主任者 */}
      <div className="card-surface-section mt-4 p-5 sm:p-6">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
          ① 作業主任者の選任義務（施行令第6条第9号・規則第359条）
        </div>
        <div
          className={`font-serif font-black text-[22px] mt-2 ${
            needsSupervisor ? "text-[var(--color-danger)]" : "text-[var(--ink)]"
          }`}
        >
          {h === null ? "—" : needsSupervisor ? "地山の掘削作業主任者が必要" : "選任義務の対象外（高さ2m未満）"}
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-body)]">
          掘削面の高さが2m以上になると、地山の掘削作業主任者の選任が義務になります。推進工事の立坑を掘り下げる作業にも同じ基準が及びます。
        </p>
      </div>

      {/* 結果② 勾配基準 */}
      <div className="card-surface-section mt-4 p-5 sm:p-6">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
          ② 土留めを設けない場合の法面勾配の基準（規則第356条）
        </div>
        <div className="font-serif font-black text-[28px] mt-2 text-[var(--ink)] tabular-nums">
          {grad !== null ? `${grad}度以下` : "—"}
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-body)]">
          この勾配は「土留めを設けずに法面を切って掘削してよい上限」を定めたものです。基準を満たしていても、地質が崩れやすい・地下水位が高い・振動を受けやすいといった条件があれば、①とは別に361条の土留め義務が生じます。
        </p>
      </div>

      {/* 結果③ 土止め先行工法ガイドライン */}
      <div className="card-surface-section mt-4 p-5 sm:p-6">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
          ③ 土止め先行工法ガイドラインの想定範囲
        </div>
        <div
          className={`font-serif font-black text-[22px] mt-2 ${
            h !== null && w !== null ? (glApplicable ? "text-[var(--color-positive)]" : "text-[var(--color-warn)]") : "text-[var(--ink)]"
          }`}
        >
          {h === null || w === null
            ? "—"
            : glApplicable
              ? "想定範囲内（簡易土留め工法が候補になる）"
              : "想定範囲外（本設の土留め工法を個別に検討）"}
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-body)]">
          想定範囲は深さおおむね{GL_MIN_DEPTH}〜{GL_MAX_DEPTH}m・幅おおむね{GL_MAX_WIDTH}m以下でほぼ鉛直に掘削する小規模な溝です。矢板・支保工は掘削深さが自立可能なおおむね{SHORING_PRE_INSTALL_DEPTH}mに達した段階で先行して設置します。地下水位が高い、軟弱地盤、埋設物が輻輳するといった条件が重なる場合は、範囲内でも本設の土留め工法への切り替えを検討してください。
        </p>
      </div>

      {/* 根拠 */}
      <div className="mt-6 rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] p-5 text-sm leading-7 text-[var(--ink-body)]">
        <p className="font-bold text-[var(--ink)] mb-2">数値の根拠</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-[var(--ink)]">作業主任者の選任義務（2m基準）</strong>は労働安全衛生法施行令第6条第9号・労働安全衛生規則第359条。
          </li>
          <li>
            <strong className="text-[var(--ink)]">法面勾配の基準</strong>は労働安全衛生規則第356条の別表（岩盤・堅い粘土からなる地山は5m未満90度／5m以上75度、その他の地山は2m未満90度／2m以上5m未満75度／5m以上60度）。
          </li>
          <li>
            <strong className="text-[var(--ink)]">土留め支保工の設置義務</strong>そのものは同規則第361条。数値基準はなく「危険を及ぼすおそれのあるとき」に生じます。①②③のいずれも、この義務の有無を判定するものではありません。
          </li>
          <li>
            <strong className="text-[var(--ink)]">土止め先行工法ガイドライン</strong>は厚生労働省策定。上水道・下水道・電気通信・ガス供給施設等の小規模な溝掘削を対象としています。
          </li>
          <li className="text-[var(--ink-muted)]">
            ※ 現場ごとの土質・地下水・周辺環境の調査結果が優先します。本ツールは条文の数値基準を整理する早見であり、土留めの要否そのものを判定するものではありません。
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
            href="/docs/civil-practice-trench-excavation-safety"
            className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
          >
            <div className="font-bold text-[var(--ink)]">溝掘削の土留めをいつ入れるか</div>
            <div className="text-sm text-[var(--ink-body)] mt-1">
              法令の構造と判断の考え方を解説した記事
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
