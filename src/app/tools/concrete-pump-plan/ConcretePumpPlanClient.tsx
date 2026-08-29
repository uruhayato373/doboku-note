"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * ポンプ車・アジテータ車 配車計算ツール（クライアント）。
 *
 * 3つの独立した計算を1画面にまとめている。
 * ①ポンプ車台数＝総打込み量と作業時間から出した目標速度を、現場実質速度で割る
 * ②アジテータ車台数＝N=Q×T/V（Qは目標速度、Tは往復時間、Vは積載量）
 * ③水平換算長＝圧送ルートが100mの目安に収まるかを、125Aの実測係数で確認
 * 係数は125A（粗骨材最大寸法40mm）のみを検証済みとして採用し、他径は埋め込まない。
 * 出典は下部「根拠」に明記。
 */

// 125A・水平換算係数（土木学会 コンクリートのポンプ施工指針）
const VERTICAL_COEF_125A = 4; // m 換算 / m（垂直管）
const BEND90_LENGTH_125A = 6; // m 換算 / か所（90°ベント管）
const HOSE_LENGTH = 20; // m 換算 / 本（フレキシブルホース、長さ5〜8m）
const HORIZONTAL_LIMIT_M = 100; // 水平圧送可能距離の目安

// 現場実質の打込み速度（スランプ18cm程度・ポンプ工法の目安）
const REAL_SPEED_MIN = 20;
const REAL_SPEED_MAX = 30;
const REAL_SPEED_DEFAULT = 25;

function toNum(s: string): number | null {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function ConcretePumpPlanClient() {
  // ① ポンプ車
  const [totalVolume, setTotalVolume] = useState("400");
  const [workHours, setWorkHours] = useState("8");
  const [unitSpeed, setUnitSpeed] = useState(String(REAL_SPEED_DEFAULT));

  // ② アジテータ車
  const [truckCapacity, setTruckCapacity] = useState("4");
  const [roundTripMin, setRoundTripMin] = useState("45");

  // ③ 水平換算長（125A）
  const [horizDist, setHorizDist] = useState("60");
  const [vertRise, setVertRise] = useState("8");
  const [bendCount, setBendCount] = useState("2");
  const [hoseCount, setHoseCount] = useState("1");

  const volume = toNum(totalVolume);
  const hours = toNum(workHours);
  const speed = toNum(unitSpeed);

  const targetRate = volume && hours ? volume / hours : null;
  const pumpCount = targetRate && speed ? Math.ceil(targetRate / speed) : null;

  const capacity = toNum(truckCapacity);
  const tripMin = toNum(roundTripMin);
  const tripHour = tripMin ? tripMin / 60 : null;
  const truckCount =
    targetRate && capacity && tripHour ? Math.ceil((targetRate * tripHour) / capacity) : null;

  const hd = toNum(horizDist) ?? 0;
  const vr = toNum(vertRise) ?? 0;
  const bc = toNum(bendCount) ?? 0;
  const hc = toNum(hoseCount) ?? 0;
  const vertEq = vr * VERTICAL_COEF_125A;
  const bendEq = bc * BEND90_LENGTH_125A;
  const hoseEq = hc * HOSE_LENGTH;
  const totalEq = hd + vertEq + bendEq + hoseEq;
  const withinLimit = totalEq <= HORIZONTAL_LIMIT_M;

  const inputBase =
    "focus-ring w-full rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] px-3 py-2 text-[15px] text-[var(--ink)] focus:border-[var(--accent)]";
  const labelBase =
    "block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2";

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* ① ポンプ車台数 */}
      <div className="card-surface-section p-5 sm:p-6">
        <div className="font-bold text-[var(--ink)] mb-4">① ポンプ車の必要台数</div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="total-volume" className={labelBase}>
              総打込み量（m³）
            </label>
            <input
              id="total-volume"
              type="number"
              inputMode="decimal"
              step="1"
              value={totalVolume}
              onChange={(e) => setTotalVolume(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="work-hours" className={labelBase}>
              実質作業時間（h）
            </label>
            <input
              id="work-hours"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={workHours}
              onChange={(e) => setWorkHours(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="unit-speed" className={labelBase}>
              1台の実質速度（m³/h）
            </label>
            <input
              id="unit-speed"
              type="number"
              inputMode="decimal"
              step="1"
              value={unitSpeed}
              onChange={(e) => setUnitSpeed(e.target.value)}
              className={inputBase}
            />
            <p className="mt-1.5 text-xs leading-5 text-[var(--ink-muted)]">
              目安は{REAL_SPEED_MIN}〜{REAL_SPEED_MAX}（カタログ最大値ではない）
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-card-content bg-[var(--accent-fill)] p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            目標の時間当たり打込み量
          </div>
          <div className="font-serif font-black text-[22px] text-[var(--ink)] mt-1 tabular-nums">
            {targetRate ? `${targetRate.toFixed(1)} m³/h` : "—"}
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--rule-soft)] flex items-baseline justify-between">
            <span className="text-sm text-[var(--ink-body)]">必要台数</span>
            <span className="font-serif font-black text-[28px] text-[var(--ink)] tabular-nums">
              {pumpCount ?? "—"}
              {pumpCount && <span className="text-base font-bold ml-1">台</span>}
            </span>
          </div>
        </div>
      </div>

      {/* ② アジテータ車台数 */}
      <div className="card-surface-section mt-4 p-5 sm:p-6">
        <div className="font-bold text-[var(--ink)] mb-4">② アジテータ車の必要台数</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="truck-capacity" className={labelBase}>
              1台の積載量（m³）
            </label>
            <input
              id="truck-capacity"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={truckCapacity}
              onChange={(e) => setTruckCapacity(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="round-trip" className={labelBase}>
              往復（積込〜返送）の実測時間（分）
            </label>
            <input
              id="round-trip"
              type="number"
              inputMode="decimal"
              step="1"
              value={roundTripMin}
              onChange={(e) => setRoundTripMin(e.target.value)}
              className={inputBase}
            />
          </div>
        </div>

        <div className="mt-5 rounded-card-content bg-[var(--accent-fill)] p-4 flex items-baseline justify-between">
          <span className="text-sm text-[var(--ink-body)]">
            必要台数（N = 目標速度 × 往復時間 ÷ 積載量）
          </span>
          <span className="font-serif font-black text-[28px] text-[var(--ink)] tabular-nums">
            {truckCount ?? "—"}
            {truckCount && <span className="text-base font-bold ml-1">台</span>}
          </span>
        </div>
        {!targetRate && (
          <p className="mt-3 text-sm text-[var(--color-warn)]">
            ①の総打込み量・作業時間を入力すると目標速度が決まり、この計算が動きます。
          </p>
        )}
      </div>

      {/* ③ 水平換算長 */}
      <div className="card-surface-section mt-4 p-5 sm:p-6">
        <div className="font-bold text-[var(--ink)] mb-1">③ 圧送距離は届くか（125A配管）</div>
        <p className="text-xs leading-5 text-[var(--ink-muted)] mb-4">
          粗骨材最大寸法40mm・125A配管を前提にした換算係数です。100A・150Aなど他径は係数が変わるため、圧送指針の該当表を確認してください。
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="horiz-dist" className={labelBase}>
              水平距離（m）
            </label>
            <input
              id="horiz-dist"
              type="number"
              inputMode="decimal"
              step="1"
              value={horizDist}
              onChange={(e) => setHorizDist(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="vert-rise" className={labelBase}>
              垂直立上り（m）
            </label>
            <input
              id="vert-rise"
              type="number"
              inputMode="decimal"
              step="1"
              value={vertRise}
              onChange={(e) => setVertRise(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="bend-count" className={labelBase}>
              90°ベント管（か所）
            </label>
            <input
              id="bend-count"
              type="number"
              inputMode="numeric"
              step="1"
              value={bendCount}
              onChange={(e) => setBendCount(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="hose-count" className={labelBase}>
              フレキシブルホース（本）
            </label>
            <input
              id="hose-count"
              type="number"
              inputMode="numeric"
              step="1"
              value={hoseCount}
              onChange={(e) => setHoseCount(e.target.value)}
              className={inputBase}
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b border-[var(--rule-soft)]">
                <td className="py-2 pr-3 text-[var(--ink-body)]">水平距離</td>
                <td className="py-2 pl-3 text-right tabular-nums">{hd.toFixed(1)} m</td>
              </tr>
              <tr className="border-b border-[var(--rule-soft)]">
                <td className="py-2 pr-3 text-[var(--ink-body)]">垂直管換算（×{VERTICAL_COEF_125A}）</td>
                <td className="py-2 pl-3 text-right tabular-nums">{vertEq.toFixed(1)} m</td>
              </tr>
              <tr className="border-b border-[var(--rule-soft)]">
                <td className="py-2 pr-3 text-[var(--ink-body)]">ベント管換算（×{BEND90_LENGTH_125A}）</td>
                <td className="py-2 pl-3 text-right tabular-nums">{bendEq.toFixed(1)} m</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 text-[var(--ink-body)]">ホース換算（×{HOSE_LENGTH}）</td>
                <td className="py-2 pl-3 text-right tabular-nums">{hoseEq.toFixed(1)} m</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          className={`mt-4 rounded-card-content border-l-4 p-4 flex items-baseline justify-between ${
            withinLimit ? "border-[var(--color-positive)]" : "border-[var(--color-danger)]"
          }`}
          style={{ background: "var(--bg)" }}
        >
          <span className="text-sm text-[var(--ink-body)]">水平換算距離の合計</span>
          <span className="font-serif font-black text-[24px] text-[var(--ink)] tabular-nums">
            {totalEq.toFixed(1)} m
          </span>
        </div>
        <p
          className={`mt-2 text-sm font-bold ${
            withinLimit ? "text-[var(--color-positive)]" : "text-[var(--color-danger)]"
          }`}
        >
          {withinLimit
            ? `100mの目安以内です（残り ${(HORIZONTAL_LIMIT_M - totalEq).toFixed(1)} m）`
            : `100mの目安を ${(totalEq - HORIZONTAL_LIMIT_M).toFixed(1)} m 超えています。ルートを見直すか機種を変更してください`}
        </p>
      </div>

      {/* 根拠 */}
      <div className="mt-6 rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] p-5 text-sm leading-7 text-[var(--ink-body)]">
        <p className="font-bold text-[var(--ink)] mb-2">数値の根拠</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-[var(--ink)]">現場実質の打込み速度 {REAL_SPEED_MIN}〜{REAL_SPEED_MAX} m³/h</strong>は、スランプ18cm程度のコンクリートをポンプ工法で打ち込む場合の目安です。ポンプ車のカタログ上の最大吐出量（スクイズ式50m³/h程度・ピストン式100m³/h超）とは別の値で、台数計算にはこちらを使います。
          </li>
          <li>
            <strong className="text-[var(--ink)]">水平換算長の係数（125A）</strong>は土木学会「コンクリートのポンプ施工指針」に基づく目安です。垂直管は1mにつき{VERTICAL_COEF_125A}m、90°ベント管は1か所につき{BEND90_LENGTH_125A}m、フレキシブルホース（長さ5〜8m）は1本につき{HOSE_LENGTH}mとして換算します。配管径が変わると係数も変わるため、100A・150Aなどは指針の該当表を直接確認してください。
          </li>
          <li>
            <strong className="text-[var(--ink)]">水平圧送可能距離の目安 {HORIZONTAL_LIMIT_M}m</strong>は一般的な目安であり、機種・配合・気温によって実際の限界は変動します。
          </li>
          <li className="text-[var(--ink-muted)]">
            ※ 配管径は粗骨材の最大寸法から選定します（20・25mmは100A以上、40mmは125A以上が目安）。特記仕様書・施工計画書の値が優先します。本ツールは標準的な考え方の早見であり、現場の判断を代替するものではありません。
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
            href="/practice/concrete-pump-capacity"
            className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
          >
            <div className="font-bold text-[var(--ink)]">ポンプ車・ミキサ車は何台必要か</div>
            <div className="text-sm text-[var(--ink-body)] mt-1">
              配車計算の考え方を解説した記事
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
