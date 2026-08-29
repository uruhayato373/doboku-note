"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * 鉄筋継手 判定ツール（クライアント）。
 *
 * ①千鳥配置のずらし量＝継手長さ+25d（B6記事で検証済み）
 * ②ガス圧接部のふくらみ検査＝JIS Z 3120の判定基準（径1.4d以上・長さ1.1d以上・
 *   ずれ1/4以下・偏心1/5以下・折れ曲がり2°以下・片ふくらみ1/5以下）に実測値を
 *   照らして項目別に判定する。
 * 原本の重ね継手長さ係数表（45d〜50d等）は建築系の告示由来の疑いがありB6記事の
 * 一次資料照合結果と整合しないため採用せず、継手長さは設計図書の値を利用者が
 * 入力する設計にしている。
 */

const STAGGER_MULTIPLIER = 25; // 千鳥配置：継手長さ+25d（d=鉄筋径）
const MANUAL_GAS_WELD_MAX_DIFF_MM = 7; // 手動ガス圧接：径差7mm超は不可（D41-D51の組合せを除く）

// JIS Z 3120 ガス圧接部の判定基準
const BULGE_DIAMETER_MIN = 1.4; // ×d 以上
const BULGE_LENGTH_MIN = 1.1; // ×d 以上
const OFFSET_MAX = 1 / 4; // ×d 以下（圧接面のずれ）
const ECCENTRICITY_MAX = 1 / 5; // ×d 以下（中心軸の偏心量）
const BEND_MAX_DEG = 2; // 度以下（折れ曲がり）
const ONE_SIDE_BULGE_MAX = 1 / 5; // ×d 以下（片ふくらみ）

function toNum(s: string): number | null {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

type CheckRow = {
  label: string;
  criterion: string;
  pass: boolean | null;
};

export default function RebarSpliceCheckClient() {
  // ① ずらし量
  const [diameter, setDiameter] = useState("22");
  const [spliceLength, setSpliceLength] = useState("880");

  // ② ガス圧接検査
  const [gasDiameter, setGasDiameter] = useState("22");
  const [otherDiameter, setOtherDiameter] = useState("22");
  const [bulgeDiameter, setBulgeDiameter] = useState("33");
  const [bulgeLength, setBulgeLength] = useState("26");
  const [offset, setOffset] = useState("3");
  const [eccentricity, setEccentricity] = useState("2");
  const [bendAngle, setBendAngle] = useState("1");
  const [oneSideBulge, setOneSideBulge] = useState("3");

  const d = toNum(diameter);
  const sl = toNum(spliceLength);
  const staggerDistance = d !== null && sl !== null ? sl + STAGGER_MULTIPLIER * d : null;

  const gd = toNum(gasDiameter);
  const od = toNum(otherDiameter);
  const diffOk = gd !== null && od !== null ? Math.abs(gd - od) <= MANUAL_GAS_WELD_MAX_DIFF_MM : null;
  const isD41D51 =
    (gd === 41 && od === 51) || (gd === 51 && od === 41);

  const bd = toNum(bulgeDiameter);
  const bl = toNum(bulgeLength);
  const off = toNum(offset);
  const ecc = toNum(eccentricity);
  const bend = toNum(bendAngle);
  const osb = toNum(oneSideBulge);

  const rows: CheckRow[] =
    gd === null
      ? []
      : [
          {
            label: "ふくらみの直径",
            criterion: `${(gd * BULGE_DIAMETER_MIN).toFixed(1)} mm 以上`,
            pass: bd !== null ? bd >= gd * BULGE_DIAMETER_MIN : null,
          },
          {
            label: "ふくらみの長さ",
            criterion: `${(gd * BULGE_LENGTH_MIN).toFixed(1)} mm 以上`,
            pass: bl !== null ? bl >= gd * BULGE_LENGTH_MIN : null,
          },
          {
            label: "圧接面のずれ",
            criterion: `${(gd * OFFSET_MAX).toFixed(1)} mm 以下`,
            pass: off !== null ? off <= gd * OFFSET_MAX : null,
          },
          {
            label: "中心軸の偏心量",
            criterion: `${(gd * ECCENTRICITY_MAX).toFixed(1)} mm 以下`,
            pass: ecc !== null ? ecc <= gd * ECCENTRICITY_MAX : null,
          },
          {
            label: "圧接部の折れ曲がり",
            criterion: `${BEND_MAX_DEG}度 以下`,
            pass: bend !== null ? bend <= BEND_MAX_DEG : null,
          },
          {
            label: "片ふくらみ",
            criterion: `${(gd * ONE_SIDE_BULGE_MAX).toFixed(1)} mm 以下`,
            pass: osb !== null ? osb <= gd * ONE_SIDE_BULGE_MAX : null,
          },
        ];

  const allEntered = rows.every((r) => r.pass !== null);
  const allPass = allEntered && rows.every((r) => r.pass === true);

  const inputBase =
    "focus-ring w-full rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] px-3 py-2 text-[15px] text-[var(--ink)] focus:border-[var(--accent)]";
  const labelBase =
    "block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2";

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* ① ずらし量 */}
      <div className="card-surface-section p-5 sm:p-6">
        <div className="font-bold text-[var(--ink)] mb-4">① 千鳥配置のずらし量</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="diameter" className={labelBase}>
              鉄筋径 d（mm）
            </label>
            <input
              id="diameter"
              type="number"
              inputMode="decimal"
              step="1"
              value={diameter}
              onChange={(e) => setDiameter(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="splice-length" className={labelBase}>
              継手の長さ（mm・設計図書の値）
            </label>
            <input
              id="splice-length"
              type="number"
              inputMode="decimal"
              step="1"
              value={spliceLength}
              onChange={(e) => setSpliceLength(e.target.value)}
              className={inputBase}
            />
          </div>
        </div>
        <div className="mt-5 rounded-card-content bg-[var(--accent-fill)] p-4 flex items-baseline justify-between">
          <span className="text-sm text-[var(--ink-body)]">
            隣り合う継手間の必要距離（継手の長さ + {STAGGER_MULTIPLIER}d）
          </span>
          <span className="font-serif font-black text-[24px] text-[var(--ink)] tabular-nums">
            {staggerDistance !== null ? `${staggerDistance.toFixed(0)} mm` : "—"}
          </span>
        </div>
      </div>

      {/* ② ガス圧接ふくらみ検査 */}
      <div className="card-surface-section mt-4 p-5 sm:p-6">
        <div className="font-bold text-[var(--ink)] mb-4">② ガス圧接部の検査（JIS Z 3120）</div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="gas-diameter" className={labelBase}>
              鉄筋径 d（mm）
            </label>
            <input
              id="gas-diameter"
              type="number"
              inputMode="decimal"
              step="1"
              value={gasDiameter}
              onChange={(e) => setGasDiameter(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="other-diameter" className={labelBase}>
              相手側の鉄筋径（mm）
            </label>
            <input
              id="other-diameter"
              type="number"
              inputMode="decimal"
              step="1"
              value={otherDiameter}
              onChange={(e) => setOtherDiameter(e.target.value)}
              className={inputBase}
            />
          </div>
        </div>

        {diffOk === false && !isD41D51 && (
          <p className="mt-3 rounded-card-content border-l-4 border-[var(--color-danger)] bg-[var(--bg)] p-3 text-sm leading-6 text-[var(--ink-body)]">
            径の差が{MANUAL_GAS_WELD_MAX_DIFF_MM}mmを超えています。D41とD51の組合せを除き、手動ガス圧接そのものが認められません。
          </p>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="bulge-diameter" className={labelBase}>
              ふくらみ直径 実測（mm）
            </label>
            <input
              id="bulge-diameter"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={bulgeDiameter}
              onChange={(e) => setBulgeDiameter(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="bulge-length" className={labelBase}>
              ふくらみ長さ 実測（mm）
            </label>
            <input
              id="bulge-length"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={bulgeLength}
              onChange={(e) => setBulgeLength(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="offset" className={labelBase}>
              圧接面のずれ 実測（mm）
            </label>
            <input
              id="offset"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={offset}
              onChange={(e) => setOffset(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="eccentricity" className={labelBase}>
              中心軸偏心量 実測（mm）
            </label>
            <input
              id="eccentricity"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={eccentricity}
              onChange={(e) => setEccentricity(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="bend-angle" className={labelBase}>
              折れ曲がり 実測（度）
            </label>
            <input
              id="bend-angle"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={bendAngle}
              onChange={(e) => setBendAngle(e.target.value)}
              className={inputBase}
            />
          </div>
          <div>
            <label htmlFor="one-side-bulge" className={labelBase}>
              片ふくらみ 実測（mm）
            </label>
            <input
              id="one-side-bulge"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={oneSideBulge}
              onChange={(e) => setOneSideBulge(e.target.value)}
              className={inputBase}
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--rule)]">
                <th className="py-2 pr-3 text-left font-bold text-[var(--ink)]">項目</th>
                <th className="py-2 px-3 text-left font-bold text-[var(--ink)] whitespace-nowrap">
                  基準
                </th>
                <th className="py-2 pl-3 text-right font-bold text-[var(--ink)] whitespace-nowrap">
                  判定
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-[var(--rule-soft)] last:border-0">
                  <td className="py-2 pr-3 text-[var(--ink-body)]">{r.label}</td>
                  <td className="py-2 px-3 text-[var(--ink-muted)] whitespace-nowrap">{r.criterion}</td>
                  <td className="py-2 pl-3 text-right whitespace-nowrap">
                    {r.pass === null ? (
                      <span className="text-[var(--ink-muted)]">—</span>
                    ) : r.pass ? (
                      <span className="font-bold text-[var(--color-positive)]">合格</span>
                    ) : (
                      <span className="font-bold text-[var(--color-danger)]">不合格</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {allEntered && (
          <div
            className={`mt-4 rounded-card-content border-l-4 p-4 text-center font-bold ${
              allPass
                ? "border-[var(--color-positive)] text-[var(--color-positive)]"
                : "border-[var(--color-danger)] text-[var(--color-danger)]"
            }`}
            style={{ background: "var(--bg)" }}
          >
            {allPass ? "全項目 合格" : "1項目以上が基準を満たしていません"}
          </div>
        )}
      </div>

      {/* 根拠 */}
      <div className="mt-6 rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] p-5 text-sm leading-7 text-[var(--ink-body)]">
        <p className="font-bold text-[var(--ink)] mb-2">数値の根拠</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-[var(--ink)]">千鳥配置のずらし量</strong>は、隣り合う継手同士の間隔を継手の長さに鉄筋直径の25倍を加えた長さ以上とする考え方です。継手の長さそのものは設計図書で決まるため、本ツールでは入力値として扱います。
          </li>
          <li>
            <strong className="text-[var(--ink)]">ガス圧接部の判定基準</strong>はJIS Z 3120。ふくらみの直径は鉄筋径の1.4倍以上・長さは1.1倍以上、圧接面のずれは1/4以下、中心軸の偏心量は1/5以下、折れ曲がりは2°以下、片ふくらみは1/5以下です。
          </li>
          <li>
            <strong className="text-[var(--ink)]">径差{MANUAL_GAS_WELD_MAX_DIFF_MM}mm超の手動ガス圧接禁止</strong>は、D41とD51の組合せを除いて適用されます。作業は鉄筋のガス圧接技術検定（JIS Z 3881）の有資格者に限られます。
          </li>
          <li className="text-[var(--ink-muted)]">
            ※ 本ツールは入力値をJIS Z 3120の基準と照らすだけで、外観検査・引張試験そのものを代替しません。外観検査は全数、引張試験は1日1組の作業班が完了した箇所を1ロットとして抜き取るのが基本です。
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
            href="/practice/rebar-splice-selection"
            className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
          >
            <div className="font-bold text-[var(--ink)]">継手を3方式から選ぶ</div>
            <div className="text-sm text-[var(--ink-body)] mt-1">
              重ね継手・ガス圧接・機械式継手の選定基準を解説
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
