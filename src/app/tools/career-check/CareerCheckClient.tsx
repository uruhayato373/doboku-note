"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import CareerAffiliate from "@/components/ui/CareerAffiliate/CareerAffiliate";
import * as gtag from "@/lib/gtag";
import {
  CHANGE_WANT_LABEL,
  EXPERIENCE_LABEL,
  QUALIFICATION_LABEL,
  ROLE_LABEL,
  SCALE_LABEL,
  WORK_TYPE_LABEL,
  type CareerCheckInput,
  type CareerCheckResult,
  type ChangeWant,
  type Concern,
  type ExperienceBand,
  type Qualification,
  type Role,
  type ScaleBand,
  type WorkType,
  evaluateCareerCheck,
  trackingPayload,
} from "@/lib/career-check";

/**
 * 土木施工管理キャリア整理ツール（クライアント）。
 *
 * 個人情報を持たない設計: 入力は**すべて選択式**で、氏名・会社名・連絡先・正確な年収・
 * 自由記述のフィールドを DOM に置かない。保存も送信もせず、判定はブラウザ内で完結する。
 * GA4 へ送るのは列挙値（need / qualification / experience / route）だけ。
 *
 * 判定ロジックは src/lib/career-check.ts の純関数。ここには分岐を書かない。
 */

const CONCERNS: ReadonlyArray<{ value: Concern; label: string }> = [
  { value: "quit-or-stay", label: "辞めたい気持ちがある" },
  { value: "pay", label: "年収が上がらない" },
  { value: "workstyle", label: "休日・残業がつらい" },
  { value: "location", label: "勤務地・転勤・出張" },
  { value: "market-value", label: "自分の市場価値を知りたい" },
  { value: "application", label: "応募のしかたが分からない" },
  { value: "urgent", label: "体調やハラスメントで限界に近い" },
];

function Choice<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  hint,
}: {
  legend: string;
  name: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  hint?: string;
}) {
  const hintId = useId();
  return (
    <fieldset className="mt-6">
      <legend className="text-[15px] font-bold text-[var(--ink)]">{legend}</legend>
      {hint && (
        <p id={hintId} className="mt-1 text-[13px] text-[var(--ink-muted)]">
          {hint}
        </p>
      )}
      <div
        className="mt-2 flex flex-wrap gap-2"
        {...(hint ? { "aria-describedby": hintId } : {})}
      >
        {options.map((o) => {
          const id = `${name}-${o.value}`;
          const checked = value === o.value;
          return (
            <span key={o.value}>
              <input
                type="radio"
                id={id}
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className={`focus-ring-within inline-block cursor-pointer rounded-card-content border px-3 py-2 text-[14px] transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)] ${
                  checked
                    ? "border-brand bg-[var(--accent-fill)] font-medium text-[var(--ink)]"
                    : "border-[var(--rule-soft)] text-[var(--ink-body)] hover:border-brand dark:border-[var(--rule-soft)]"
                }`}
              >
                {o.label}
              </label>
            </span>
          );
        })}
      </div>
    </fieldset>
  );
}

const toOptions = <T extends string>(rec: Readonly<Record<T, string>>) =>
  (Object.entries(rec) as Array<[T, string]>).map(([value, label]) => ({ value, label }));

export default function CareerCheckClient() {
  const [concern, setConcern] = useState<Concern>("quit-or-stay");
  const [qualification, setQualification] = useState<Qualification>("civil-1");
  const [experience, setExperience] = useState<ExperienceBand>("7to15");
  const [workType, setWorkType] = useState<WorkType>("road");
  const [role, setRole] = useState<Role>("shunin");
  const [scale, setScale] = useState<ScaleBand>("unknown");
  const [changeWant, setChangeWant] = useState<ChangeWant>("pay");
  const [result, setResult] = useState<CareerCheckResult | null>(null);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const input: CareerCheckInput = { concern, qualification, experience, workType, role, scale, changeWant };

  const run = () => {
    const r = evaluateCareerCheck(input);
    setResult(r);
    setCopied(false);
    gtag.event({
      action: "career_tool_result",
      category: "career-tool",
      label: r.need ?? "urgent",
      params: { cta_placement: "career-tool", ...trackingPayload(input, r) },
    });
    // 結果へ移動する（キーボード操作でも結果に到達できるように focus を移す）。
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  const copyChecklist = async () => {
    if (!result) return;
    const text = [
      "【工事経歴の棚卸し】",
      ...result.inventory.map((s) => `- ${s}`),
      "",
      "【面談・求人票で確認する】",
      ...result.questions.map((s) => `- ${s}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      gtag.event({
        action: "career_checklist_copy",
        category: "career-tool",
        label: result.need ?? "urgent",
        params: { cta_placement: "career-tool" },
      });
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 sm:px-0">
      <section aria-labelledby="career-check-form" className="card-surface-section p-5 sm:p-6 print:hidden">
        <h2 id="career-check-form" className="text-lg font-bold text-[var(--ink)]">
          いまの状況を選ぶ
        </h2>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
          すべて選択式です。氏名・会社名・連絡先・年収の入力欄はありません。入力は保存も送信もされません。
        </p>

        <Choice legend="いちばんの悩み" name="concern" options={CONCERNS} value={concern} onChange={setConcern} />
        <Choice
          legend="保有資格"
          name="qualification"
          options={toOptions(QUALIFICATION_LABEL)}
          value={qualification}
          onChange={setQualification}
        />
        <Choice
          legend="施工管理の経験年数"
          name="experience"
          options={toOptions(EXPERIENCE_LABEL)}
          value={experience}
          onChange={setExperience}
        />
        <Choice
          legend="主な工種"
          name="workType"
          options={toOptions(WORK_TYPE_LABEL)}
          value={workType}
          onChange={setWorkType}
        />
        <Choice legend="立場" name="role" options={toOptions(ROLE_LABEL)} value={role} onChange={setRole} />
        <Choice
          legend="主に担当した工事の請負金額"
          name="scale"
          hint="覚えていなければ「わからない」で構いません。結果は変わりますが、判定はしません。"
          options={toOptions(SCALE_LABEL)}
          value={scale}
          onChange={setScale}
        />
        <Choice
          legend="いちばん変えたい条件"
          name="changeWant"
          options={toOptions(CHANGE_WANT_LABEL)}
          value={changeWant}
          onChange={setChangeWant}
        />

        <button
          type="button"
          onClick={run}
          className="focus-ring mt-8 w-full rounded-card-content bg-[var(--accent)] px-5 py-3 text-[15px] font-bold text-[var(--paper)] transition-opacity hover:opacity-90 sm:w-auto"
        >
          整理する
        </button>
      </section>

      <div ref={resultRef} tabIndex={-1} aria-live="polite" className="focus-ring">
        {result && (
          <section aria-labelledby="career-check-result" className="mt-8">
            <h2 id="career-check-result" className="text-xl font-bold text-[var(--ink)]">
              {result.headline}
            </h2>
            <p className="mt-2 text-[13px] text-[var(--ink-muted)]">
              このツールは転職の可否・想定年収・採用の可能性を判定しません。求人紹介や採用可能性を保証するものでもありません。
            </p>

            <h3 className="mt-6 text-[16px] font-bold text-[var(--ink)]">まず整理すべき論点</h3>
            <ul className="mt-2 space-y-2">
              {result.points.map((p) => (
                <li key={p} className="text-[15px] leading-relaxed text-[var(--ink-body)]">
                  {p}
                </li>
              ))}
            </ul>

            <h3 className="mt-6 text-[16px] font-bold text-[var(--ink)]">次に読むページ</h3>
            <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {result.reads.map((r) =>
                r.external ? (
                  <li key={r.href}>
                    <a
                      href={r.href}
                      target="_blank"
                      rel="noopener"
                      className="focus-ring block h-full rounded-card-content border border-[var(--rule-soft)] px-4 py-3 dark:border-[var(--rule-soft)]"
                    >
                      <span className="block text-[15px] font-medium text-[var(--ink)]">{r.title}</span>
                      <span className="mt-0.5 block text-[13px] text-[var(--ink-muted)]">{r.reason}</span>
                    </a>
                  </li>
                ) : (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      data-cta="career-need"
                      data-cta-label={result.need ?? "urgent"}
                      data-cta-placement="career-tool"
                      className="focus-ring block h-full rounded-card-content border border-[var(--rule-soft)] px-4 py-3 transition-colors hover:border-brand dark:border-[var(--rule-soft)]"
                    >
                      <span className="block text-[15px] font-medium text-[var(--ink)]">{r.title}</span>
                      <span className="mt-0.5 block text-[13px] text-[var(--ink-muted)]">{r.reason}</span>
                    </Link>
                  </li>
                ),
              )}
            </ul>

            {result.questions.length > 0 && (
              <>
                <h3 className="mt-6 text-[16px] font-bold text-[var(--ink)]">面談・求人票で確認する</h3>
                <ul className="mt-2 space-y-2">
                  {result.questions.map((q) => (
                    <li key={q} className="text-[15px] leading-relaxed text-[var(--ink-body)]">
                      {q}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {result.inventory.length > 0 && (
              <>
                <h3 className="mt-6 text-[16px] font-bold text-[var(--ink)]">工事経歴の棚卸し</h3>
                <ul className="mt-2 space-y-2">
                  {result.inventory.map((i) => (
                    <li key={i} className="text-[15px] leading-relaxed text-[var(--ink-body)]">
                      {i}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={copyChecklist}
                    className="focus-ring rounded-card-content border border-[var(--rule-soft)] px-4 py-2 text-[14px] text-[var(--ink-body)] transition-colors hover:border-brand dark:border-[var(--rule-soft)]"
                  >
                    {copied ? "コピーしました" : "チェックリストをコピー"}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="focus-ring rounded-card-content border border-[var(--rule-soft)] px-4 py-2 text-[14px] text-[var(--ink-body)] transition-colors hover:border-brand dark:border-[var(--rule-soft)]"
                  >
                    印刷する
                  </button>
                </div>
              </>
            )}

            {/* 転職サービス CTA は**結果を示した後にだけ**、1 枚だけ出す。緊急性のある悩みでは出さない。 */}
            {result.showAffiliate && (
              <div className="mt-8 print:hidden">
                <CareerAffiliate
                  service="施工管理の転職・求人サービス"
                  category="転職エージェント（建設・土木）"
                  program="gks"
                  placement="career-tool"
                  need={result.need}
                />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
