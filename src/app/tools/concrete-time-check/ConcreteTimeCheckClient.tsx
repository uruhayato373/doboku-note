"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/**
 * コンクリート打込み 時間管理チェッカー（クライアント）。
 *
 * 時間の限度は「外気温」で切り替わり、暑中／寒中の区分は「日平均気温」で決まる。
 * 実務では別の温度を見ているので入力を分けている（同じ25℃でも指す量が違う）。
 * 各値の出典は下部「根拠」に file 外の一次資料として明記。
 */

// 練混ぜ〜荷卸しの限度。外気温に依らず一定（JIS A 5308・購入者との協議で変更可）。
const UNLOAD_LIMIT_H = 1.5;

// 外気温 25℃ を境に切り替わる限度（土木学会 コンクリート標準示方書 施工編）
const TEMP_BOUNDARY_C = 25;
const LIMITS = {
  normal: { placeEnd: 2.0, lap: 2.5 },
  hot: { placeEnd: 1.5, lap: 2.0 },
} as const;

// 暑中／寒中の区分は日平均気温で判定（同示方書）
const HOT_DAILY_MEAN_C = 25;
const COLD_DAILY_MEAN_C = 4;

type Season = "normal" | "hot" | "cold";

// borderClass は Tailwind が生成できるようリテラルで持つ（インライン borderColor は
// dark: の指定を上書きしてしまうため lint-ui が禁止している）
const SEASON_META: Record<
  Season,
  { label: string; color: string; borderClass: string; note: string | null }
> = {
  normal: {
    label: "通常のコンクリート",
    color: "var(--color-positive)",
    borderClass: "border-[var(--color-positive)]",
    note: null,
  },
  hot: {
    label: "暑中コンクリート",
    color: "var(--color-danger)",
    borderClass: "border-[var(--color-danger)]",
    note: "打込み時のコンクリート温度は原則 35℃ 以下。運搬・打込み・締固めを迅速に行い、打込み直後から乾燥を防ぐ養生に入る。",
  },
  cold: {
    label: "寒中コンクリート",
    color: "var(--color-warn)",
    borderClass: "border-[var(--color-warn)]",
    note: "打込み時のコンクリート温度は 5〜20℃ を確保し、初期凍害を受けない強度が出るまで 5℃ 以上に保つ。凝結が遅れるため、時間の限度は余裕側で運用する。",
  },
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** HH:MM に hours を足した HH:MM を返す（日跨ぎは翌日として扱う） */
function addHours(base: string, hours: number): { time: string; nextDay: boolean } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(base);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const total = h * 60 + min + Math.round(hours * 60);
  const day = Math.floor(total / (24 * 60));
  const rest = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return { time: `${pad2(Math.floor(rest / 60))}:${pad2(rest % 60)}`, nextDay: day > 0 };
}

type Row = {
  key: string;
  label: string;
  limit: number;
  source: string;
  emphasis?: boolean;
};

export default function ConcreteTimeCheckClient() {
  const [airTemp, setAirTemp] = useState("28");
  const [dailyMean, setDailyMean] = useState("27");
  const [mixTime, setMixTime] = useState("09:00");

  const air = Number.parseFloat(airTemp);
  const mean = Number.parseFloat(dailyMean);
  const airValid = Number.isFinite(air);
  const meanValid = Number.isFinite(mean);

  const isHotAir = airValid && air > TEMP_BOUNDARY_C;
  const limits = isHotAir ? LIMITS.hot : LIMITS.normal;

  const season: Season = !meanValid
    ? "normal"
    : mean > HOT_DAILY_MEAN_C
      ? "hot"
      : mean <= COLD_DAILY_MEAN_C
        ? "cold"
        : "normal";
  const meta = SEASON_META[season];

  const rows: Row[] = useMemo(
    () => [
      {
        key: "unload",
        label: "練混ぜ〜荷卸し",
        limit: UNLOAD_LIMIT_H,
        source: "JIS A 5308",
      },
      {
        key: "placeEnd",
        label: "練混ぜ〜打込み終了",
        limit: limits.placeEnd,
        source: "示方書 施工編",
      },
      {
        key: "lap",
        label: "許容打重ね時間間隔",
        limit: limits.lap,
        source: "示方書 施工編",
        emphasis: true,
      },
    ],
    [limits]
  );

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
            <label htmlFor="air-temp" className={labelBase}>
              外気温（℃）
            </label>
            <input
              id="air-temp"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={airTemp}
              onChange={(e) => setAirTemp(e.target.value)}
              className={inputBase}
            />
            <p className="mt-1.5 text-xs leading-5 text-[var(--ink-muted)]">
              打込み当日の気温。時間の限度を決める
            </p>
          </div>
          <div>
            <label htmlFor="daily-mean" className={labelBase}>
              日平均気温（℃）
            </label>
            <input
              id="daily-mean"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={dailyMean}
              onChange={(e) => setDailyMean(e.target.value)}
              className={inputBase}
            />
            <p className="mt-1.5 text-xs leading-5 text-[var(--ink-muted)]">
              暑中／寒中の区分を決める
            </p>
          </div>
          <div>
            <label htmlFor="mix-time" className={labelBase}>
              練混ぜ完了時刻
            </label>
            <input
              id="mix-time"
              type="time"
              value={mixTime}
              onChange={(e) => setMixTime(e.target.value)}
              className={inputBase}
            />
            <p className="mt-1.5 text-xs leading-5 text-[var(--ink-muted)]">
              プラントでの練混ぜ開始時刻
            </p>
          </div>
        </div>
      </div>

      {/* 結果 */}
      <div className="card-surface-section mt-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              施工区分
            </div>
            <div
              className="font-serif font-black text-[24px] sm:text-[28px] leading-tight mt-1"
              style={{ color: meta.color }}
            >
              {meta.label}
            </div>
          </div>
          {/* バッジは「どちらの限度を採ったか」を示す。区分の色とは別軸なので配色も分ける */}
          <div className="inline-flex items-center rounded-full border border-[var(--rule)] px-3 py-1 text-sm font-bold text-[var(--ink-body)]">
            {isHotAir ? `外気温 ${TEMP_BOUNDARY_C}℃ 超` : `外気温 ${TEMP_BOUNDARY_C}℃ 以下`}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--rule)]">
                <th className="py-2 pr-3 text-left font-bold text-[var(--ink)]">項目</th>
                <th className="py-2 px-3 text-right font-bold text-[var(--ink)] whitespace-nowrap">
                  限度
                </th>
                <th className="py-2 pl-3 text-right font-bold text-[var(--ink)] whitespace-nowrap">
                  期限時刻
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const at = addHours(mixTime, r.limit);
                return (
                  <tr
                    key={r.key}
                    className="border-b border-[var(--rule-soft)] last:border-0"
                    style={r.emphasis ? { background: "var(--accent-fill)" } : undefined}
                  >
                    <td className="py-2.5 pr-3">
                      <span className={r.emphasis ? "font-bold text-[var(--ink)]" : "text-[var(--ink-body)]"}>
                        {r.label}
                      </span>
                      <span className="block text-xs text-[var(--ink-muted)] mt-0.5">{r.source}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-[var(--ink-body)]">
                      {r.limit.toFixed(1)} h
                    </td>
                    <td className="py-2.5 pl-3 text-right tabular-nums whitespace-nowrap">
                      {at ? (
                        <span className="font-bold text-[var(--ink)]">
                          {at.time}
                          {at.nextDay && (
                            <span className="ml-1 text-xs font-normal text-[var(--ink-muted)]">翌日</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[var(--ink-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {meta.note && (
          <p
            className={`mt-4 rounded-card-content border-l-4 ${meta.borderClass} bg-[var(--bg)] p-3 text-sm leading-6 text-[var(--ink-body)]`}
          >
            {meta.note}
          </p>
        )}

        {(!airValid || !meanValid) && (
          <p className="mt-4 text-sm text-[var(--color-warn)]">
            気温が未入力です。{!airValid && "外気温は 25℃ 以下として"} 計算しています。
          </p>
        )}
      </div>

      {/* 根拠 */}
      <div className="mt-6 rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] p-5 text-sm leading-7 text-[var(--ink-body)]">
        <p className="font-bold text-[var(--ink)] mb-2">数値の根拠</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-[var(--ink)]">練混ぜ〜打込み終了</strong>と<strong className="text-[var(--ink)]">許容打重ね時間間隔</strong>は、土木学会 コンクリート標準示方書 施工編。外気温 25℃ 以下で 2.0h / 2.5h、25℃ を超えると 1.5h / 2.0h。
          </li>
          <li>
            <strong className="text-[var(--ink)]">練混ぜ〜荷卸し 1.5 時間</strong>は JIS A 5308（レディーミクストコンクリート）。購入者と協議のうえ限度を変更できる規定があるため、特記仕様書を確認してください。
          </li>
          <li>
            <strong className="text-[var(--ink)]">暑中／寒中の区分</strong>は日平均気温で判定（暑中＝25℃ を超える時期、寒中＝4℃ 以下となる時期）。時間の限度を切り替える 25℃ は<strong className="text-[var(--ink)]">外気温</strong>で、同じ 25℃ でも指している量が違います。
          </li>
          <li className="text-[var(--ink-muted)]">
            ※ 発注者の特記仕様書や監督員の指示が示方書と異なる場合は、そちらが優先します。本ツールは標準値の早見であり、現場の管理値を代替するものではありません。
          </li>
        </ul>
      </div>

      {/* 関連 */}
      <div className="mt-6">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-3">
          関連する対策ページ
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/tools"
            className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
          >
            <div className="font-bold text-[var(--ink)]">無料ツール一覧</div>
            <div className="text-sm text-[var(--ink-body)] mt-1">
              経験記述の文字数チェック・受験資格判定・過去問演習
            </div>
          </Link>
          <Link
            href="/category/civil-construction-1"
            className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
          >
            <div className="font-bold text-[var(--ink)]">1級土木施工管理技士</div>
            <div className="text-sm text-[var(--ink-body)] mt-1">
              コンクリート工の出題ポイントと過去問解説
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
