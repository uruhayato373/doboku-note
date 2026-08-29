"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * 工事原価 構成比計算ツール（クライアント）。
 *
 * 土木工事積算基準の費目区分（直接工事費・共通仮設費・現場管理費・一般管理費等）に
 * 沿って構成比を計算するだけで、判定（赤字/黒字の閾値）は一切行わない。
 * 原本HTMLの判定しきい値（直接工事費67%以上・工事原価92%以上等）は、J4記事の
 * 一次資料照合で「公的な積算基準に無い経営指標」と結論づけて不採用にしており、
 * このツールでも同じ判断を踏襲する。
 */

type Item = { key: string; label: string; colorClass: string };

const ITEMS: Item[] = [
  { key: "direct", label: "直接工事費", colorClass: "bg-[var(--accent)]" },
  { key: "commonTemp", label: "共通仮設費", colorClass: "bg-[var(--color-positive)]" },
  { key: "siteMgmt", label: "現場管理費", colorClass: "bg-[var(--color-warn)]" },
  { key: "generalMgmt", label: "一般管理費等", colorClass: "bg-[var(--ink-muted)]" },
];

function toNum(s: string | undefined): number {
  if (!s) return 0;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function CostStructureClient() {
  const [values, setValues] = useState<Record<string, string>>({
    direct: "24000",
    commonTemp: "2500",
    siteMgmt: "2200",
    generalMgmt: "1300",
  });

  const nums = ITEMS.map((i) => toNum(values[i.key]));
  const total = nums.reduce((a, b) => a + b, 0);
  const indirect = toNum(values.commonTemp) + toNum(values.siteMgmt);
  const workCost = toNum(values.direct) + indirect; // 工事原価 = 直接工事費 + 間接工事費

  const inputBase =
    "focus-ring w-full rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] px-3 py-2 text-[15px] text-[var(--ink)] focus:border-[var(--accent)]";
  const labelBase =
    "block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2";

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* 入力 */}
      <div className="card-surface-section p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {ITEMS.map((item) => (
            <div key={item.key}>
              <label htmlFor={item.key} className={labelBase}>
                {item.label}（千円）
              </label>
              <input
                id={item.key}
                type="number"
                inputMode="decimal"
                step="10"
                value={values[item.key]}
                onChange={(e) => setValues((v) => ({ ...v, [item.key]: e.target.value }))}
                className={inputBase}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 結果 */}
      <div className="card-surface-section mt-4 p-5 sm:p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            請負工事費 合計
          </span>
          <span className="font-serif font-black text-[24px] text-[var(--ink)] tabular-nums">
            {total.toLocaleString()} 千円
          </span>
        </div>

        {total > 0 && (
          <>
            {/* 積み上げバー */}
            <div className="mt-4 h-8 w-full flex rounded-card-content overflow-hidden border border-[var(--rule-soft)]">
              {ITEMS.map((item, i) => {
                const pct = ((nums[i] ?? 0) / total) * 100;
                return pct > 0 ? (
                  <div
                    key={item.key}
                    className={item.colorClass}
                    style={{ width: `${pct}%` }}
                    title={`${item.label} ${pct.toFixed(1)}%`}
                  />
                ) : null;
              })}
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--rule)]">
                    <th className="py-2 pr-3 text-left font-bold text-[var(--ink)]">費目</th>
                    <th className="py-2 px-3 text-right font-bold text-[var(--ink)] whitespace-nowrap">
                      金額
                    </th>
                    <th className="py-2 pl-3 text-right font-bold text-[var(--ink)] whitespace-nowrap">
                      構成比
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ITEMS.map((item, i) => {
                    const value = nums[i] ?? 0;
                    return (
                      <tr key={item.key} className="border-b border-[var(--rule-soft)] last:border-0">
                        <td className="py-2 pr-3">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${item.colorClass}`} />
                          <span className="text-[var(--ink-body)]">{item.label}</span>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-[var(--ink-body)]">
                          {value.toLocaleString()}
                        </td>
                        <td className="py-2 pl-3 text-right tabular-nums font-bold text-[var(--ink)]">
                          {((value / total) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--rule-soft)] grid gap-3 sm:grid-cols-2">
              <div className="rounded-card-content bg-[var(--accent-fill)] p-3">
                <div className="text-xs text-[var(--ink-muted)]">工事原価（直接工事費＋間接工事費）</div>
                <div className="font-bold text-[var(--ink)] mt-0.5 tabular-nums">
                  {workCost.toLocaleString()} 千円（{((workCost / total) * 100).toFixed(1)}%）
                </div>
              </div>
              <div className="rounded-card-content bg-[var(--accent-fill)] p-3">
                <div className="text-xs text-[var(--ink-muted)]">間接工事費（共通仮設費＋現場管理費）</div>
                <div className="font-bold text-[var(--ink)] mt-0.5 tabular-nums">
                  {indirect.toLocaleString()} 千円（{((indirect / total) * 100).toFixed(1)}%）
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 根拠 */}
      <div className="mt-6 rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] p-5 text-sm leading-7 text-[var(--ink-body)]">
        <p className="font-bold text-[var(--ink)] mb-2">数値の根拠と注意</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-[var(--ink)]">費目区分</strong>は土木工事の積算基準に基づきます。請負代金額は工事価格と消費税相当額に分かれ、工事価格はさらに工事原価（直接工事費＋間接工事費）と一般管理費等に分かれます。
          </li>
          <li>
            <strong className="text-[var(--ink)]">直接工事費・間接工事費は現場の裁量で動かせる部分が大きく、一般管理費等は会社側で決まる固定的な部分</strong>という性格の違いがあります。
          </li>
          <li className="text-[var(--ink-muted)]">
            ※ <strong className="text-[var(--ink-body)]">本ツールは構成比を計算するだけで、「何%を超えたら赤字」という判定は行いません。</strong>そうした閾値を示す公的な積算基準は存在しません。差異を見るときは絶対額ではなく、自社の実行予算・過去実績との比較で計画からの伸び方を確認してください。
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
            href="/practice/cost-and-design-change"
            className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
          >
            <div className="font-bold text-[var(--ink)]">原価と設計変更</div>
            <div className="text-sm text-[var(--ink-body)] mt-1">
              費目構成と差異の見方、設計変更の協議記録を解説
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
