"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/**
 * 土木施工管理技士 受験資格チェッカー（クライアント）。
 *
 * データ出典（すべて公式・全国建設研修センター 令和8年度 受検の手引 PDF）:
 * - 第一次検定: 1級=19歳以上 / 2級=17歳以上（受検年度中の年齢）。
 * - 第二次検定 新受検資格（合格後の実務経験年数）:
 *   1級: 1級一次合格後5年（特定実務経験1年含み3年／監理技術者補佐1年は1年）/
 *        2級二次合格後5年（特定実務経験含み3年）/ 技術士二次合格後5年（含み3年）
 *   2級: 2級一次合格後3年 / 1級一次合格後1年 / 技術士二次合格後1年
 * - 経過措置: 令和10年度まで旧受検資格（学歴別）も選択可。
 *   旧学歴別・特定実務経験の詳細判定は誤判定回避のため本ツールでは計算せず、公式手引へ誘導する。
 */

type Grade = "civil-1" | "civil-2";
type Exam = "first" | "second";

const FIRST_AGE: Record<Grade, number> = { "civil-1": 19, "civil-2": 17 };
const GRADE_LABEL: Record<Grade, string> = { "civil-1": "1級", "civil-2": "2級" };

type Condition = { label: string; years: number; note?: string };
type Route = { key: string; label: string; conditions: Condition[] };

const SECOND_ROUTES: Record<Grade, Route[]> = {
  "civil-1": [
    {
      key: "c1-1st",
      label: "1級 第一次検定 合格",
      conditions: [
        { label: "1級一次合格後の実務経験", years: 5 },
        { label: "うち特定実務経験1年以上を含む場合", years: 3, note: "特定実務経験＝請負4,500万円以上の工事での施工管理経験" },
        { label: "監理技術者補佐としての実務経験", years: 1, note: "1級一次合格後・施工体制台帳で専任配置を証明" },
      ],
    },
    {
      key: "c2-2nd",
      label: "2級 第二次検定（旧実地）合格",
      conditions: [
        { label: "2級二次合格後の実務経験", years: 5 },
        { label: "うち特定実務経験1年以上を含む場合", years: 3, note: "特定実務経験＝請負4,500万円以上の工事での施工管理経験" },
      ],
    },
    {
      key: "pe",
      label: "技術士 第二次試験 合格",
      conditions: [
        { label: "技術士二次合格後の実務経験", years: 5 },
        { label: "うち特定実務経験1年以上を含む場合", years: 3 },
      ],
    },
  ],
  "civil-2": [
    {
      key: "c2-1st",
      label: "2級 第一次検定 合格",
      conditions: [{ label: "2級一次合格後の実務経験", years: 3 }],
    },
    {
      key: "c1-1st",
      label: "1級 第一次検定 合格",
      conditions: [{ label: "1級一次合格後の実務経験", years: 1 }],
    },
    {
      key: "pe",
      label: "技術士 第二次試験 合格",
      conditions: [{ label: "技術士二次合格後の実務経験", years: 1 }],
    },
  ],
};

const OK = "var(--color-positive)";
const NG = "var(--color-danger)";

export default function JukenShikakuClient() {
  const [grade, setGrade] = useState<Grade>("civil-1");
  const [exam, setExam] = useState<Exam>("second");
  const [age, setAge] = useState("");
  const [routeKey, setRouteKey] = useState("c1-1st");
  const [years, setYears] = useState("");

  const routes = SECOND_ROUTES[grade];
  const route = routes.find((r) => r.key === routeKey) ?? routes[0]!;

  const ageNum = age === "" ? null : Number(age);
  const yearsNum = years === "" ? null : Number(years);

  const firstOk = ageNum != null && ageNum >= FIRST_AGE[grade];

  const condResults = useMemo(
    () =>
      route.conditions.map((c) => ({
        ...c,
        met: yearsNum != null && yearsNum >= c.years,
      })),
    [route, yearsNum],
  );
  const secondAnyMet = condResults.some((c) => c.met);

  const btn = "focus-ring px-3 py-1.5 rounded-card-content text-sm font-bold border transition-colors";
  const on = "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-fill)]";
  const off = "border-[var(--rule-soft)] text-[var(--ink-body)] hover:border-[var(--accent)]";

  // 級を変えたらルートを既定へ
  function changeGrade(g: Grade) {
    setGrade(g);
    setRouteKey(SECOND_ROUTES[g][0]!.key);
  }

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="card-surface-section p-5 sm:p-6">
        {/* 級 */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2">級</div>
          <div className="flex gap-2">
            {(["civil-1", "civil-2"] as Grade[]).map((g) => (
              <button key={g} type="button" onClick={() => changeGrade(g)} className={`${btn} ${grade === g ? on : off}`} aria-pressed={grade === g}>
                {GRADE_LABEL[g]}土木
              </button>
            ))}
          </div>
        </div>

        {/* 検定区分 */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2">検定区分</div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setExam("first")} className={`${btn} ${exam === "first" ? on : off}`} aria-pressed={exam === "first"}>
              第一次検定
            </button>
            <button type="button" onClick={() => setExam("second")} className={`${btn} ${exam === "second" ? on : off}`} aria-pressed={exam === "second"}>
              第二次検定
            </button>
          </div>
        </div>

        {exam === "first" ? (
          <div>
            <label htmlFor="age" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2">
              受検年度中の年齢
            </label>
            <input
              id="age"
              type="number"
              inputMode="numeric"
              min={0}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder={`例: ${FIRST_AGE[grade]}`}
              className="focus-ring w-32 rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] px-3 py-2 text-[15px] text-[var(--ink)] focus:border-[var(--accent)]"
            />
            <span className="ml-2 text-sm text-[var(--ink-body)]">歳</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2">保有資格（受検ルート）</div>
              <div className="flex flex-col gap-2">
                {routes.map((r) => (
                  <button key={r.key} type="button" onClick={() => setRouteKey(r.key)} className={`${btn} text-left ${routeKey === r.key ? on : off}`} aria-pressed={routeKey === r.key}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="years" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2">
                合格後の実務経験年数
              </label>
              <input
                id="years"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.5}
                value={years}
                onChange={(e) => setYears(e.target.value)}
                placeholder="例: 5"
                className="focus-ring w-32 rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] px-3 py-2 text-[15px] text-[var(--ink)] focus:border-[var(--accent)]"
              />
              <span className="ml-2 text-sm text-[var(--ink-body)]">年</span>
            </div>
          </div>
        )}
      </div>

      {/* 結果 */}
      <div className="card-surface-section mt-4 p-5 sm:p-6">
        {exam === "first" ? (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-1">第一次検定 受験可否</div>
            {ageNum == null ? (
              <p className="text-sm text-[var(--ink-body)]">年齢を入力してください。{GRADE_LABEL[grade]}土木の第一次検定は <strong className="text-[var(--ink)]">{FIRST_AGE[grade]}歳以上</strong>（受検年度中の年齢）で、学歴・実務経験を問わず受検できます。</p>
            ) : (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: firstOk ? OK : NG }}>
                  {firstOk ? "受験できます" : "受験できません"}
                </span>
                <span className="text-sm text-[var(--ink-body)]">
                  {firstOk ? `${FIRST_AGE[grade]}歳以上の要件を満たします。` : `${FIRST_AGE[grade]}歳以上が必要です（あと${FIRST_AGE[grade] - ageNum}歳）。`}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">第二次検定 受験可否（新受検資格）</div>
              {yearsNum != null && (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: secondAnyMet ? OK : NG }}>
                  {secondAnyMet ? "いずれかの要件を満たします" : "まだ要件を満たしません"}
                </span>
              )}
            </div>
            <ul className="flex flex-col gap-2">
              {condResults.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 shrink-0 font-bold" style={{ color: yearsNum == null ? "var(--ink-muted)" : c.met ? OK : NG }}>
                    {yearsNum == null ? "—" : c.met ? "✓" : "×"}
                  </span>
                  <span className="text-[var(--ink-body)]">
                    <strong className="text-[var(--ink)]">{c.label} {c.years}年以上</strong>
                    {yearsNum != null && !c.met && <span className="text-[var(--ink-muted)]">（あと{Math.max(0, c.years - yearsNum)}年）</span>}
                    {c.note && <span className="block text-[12px] text-[var(--ink-muted)] mt-0.5">{c.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-[var(--ink-muted)]">
              ※「特定実務経験を含む」短縮や「監理技術者補佐」要件は、該当する実務・証明が必要です。自身がどの条件に当てはまるかは公式手引で確認してください。
            </p>
          </div>
        )}
      </div>

      {/* 注記・出典 */}
      <div className="mt-6 rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] p-5 text-sm leading-7 text-[var(--ink-body)]">
        <p className="font-bold text-[var(--ink)] mb-2">補足（重要）</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>本ツールは <strong className="text-[var(--ink)]">令和6年度〜の新受検資格</strong>に基づきます（第一次＝年齢、第二次＝第一次検定等合格後の実務経験）。</li>
          <li><strong className="text-[var(--ink)]">経過措置（令和10年度まで）</strong>として、改正前の<strong className="text-[var(--ink)]">旧受検資格（学歴別の実務経験年数）</strong>でも受検できます。学歴によっては旧資格の方が早く受検できる場合があります（旧資格の年数判定は公式手引を参照）。</li>
          <li><strong className="text-[var(--ink)]">実務経験</strong>とは、施工計画の作成や工程・品質・安全管理など、工事の施工管理に直接関わる職務経験です（単純な労務・測量・設計のみ等は対象外）。</li>
          <li className="text-[var(--ink-muted)]">※ 最終的な受験可否は、必ず<a className="text-[var(--accent)] underline" href="https://www.jctc.jp/" target="_blank" rel="noopener noreferrer">全国建設研修センター（公式）</a>の最新の受検の手引でご確認ください。</li>
        </ul>
      </div>

      {/* 関連（内部リンク・funnel） */}
      <div className="mt-6">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-3">試験の全体像を知る</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/exam/civil-construction-1/guide/exam-overview" className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]">
            <div className="font-bold text-[var(--ink)]">1級土木 試験概要</div>
            <div className="text-sm text-[var(--ink-body)] mt-1">受験資格・科目・合格率・日程をまとめて解説</div>
          </Link>
          <Link href="/exam/civil-construction-2/guide/exam-overview" className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]">
            <div className="font-bold text-[var(--ink)]">2級土木 試験概要</div>
            <div className="text-sm text-[var(--ink-body)] mt-1">受験資格・科目・合格率・日程をまとめて解説</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
