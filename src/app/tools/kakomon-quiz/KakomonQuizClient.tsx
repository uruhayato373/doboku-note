"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import QUESTIONS from "./questions.json";

/**
 * 過去問ミニ演習（クライアント）。
 * 問題データ src/app/tools/kakomon-quiz/questions.json は、PDF照合済みの IG過去問パック
 * (docs/sns/.../_exam-packs/1級土木) から curated 抽出（.tmp/extract-quiz.mjs）。
 * web=お試し（24問）→ 全問は過去問ページ／iOSアプリ（本番演習）への funnel。
 */

type Q = {
  id: string;
  yearLabel: string;
  question: string;
  options: { num: number; text: string }[];
  correctNum: number;
  explanations: { num: number; text: string; correct: boolean }[];
};

const QS = QUESTIONS as Q[];
const OK = "var(--color-positive)";
const NG = "var(--color-danger)";

export default function KakomonQuizClient() {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = QS[idx]!;
  const isLast = idx === QS.length - 1;

  function choose(num: number) {
    if (answered) return;
    setSelected(num);
    setAnswered(true);
    if (num === q.correctNum) setScore((s) => s + 1);
  }
  function next() {
    if (isLast) {
      setFinished(true);
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
    setAnswered(false);
  }
  function restart() {
    setIdx(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
  }

  if (finished) {
    const pct = Math.round((score / QS.length) * 100);
    return (
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-10">
        <div className="card-surface-section p-6 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">結果</div>
          <div className="font-serif font-black text-[var(--ink)] mt-2">
            <span className="text-[48px]">{score}</span>
            <span className="text-[20px] text-[var(--ink-muted)]"> / {QS.length} 問正解</span>
          </div>
          <div className="mt-2 text-[var(--ink-body)]">正答率 {pct}%</div>
          <button type="button" onClick={restart} className="focus-ring mt-5 rounded-card-content border border-[var(--accent)] bg-[var(--accent-fill)] px-5 py-2 text-sm font-bold text-[var(--accent)]">
            もう一度挑戦する
          </button>
        </div>
        <FunnelLinks />
      </div>
    );
  }

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* 進捗 */}
      <div className="flex items-center justify-between text-[12px] text-[var(--ink-muted)] mb-3">
        <span className="font-bold">問 {idx + 1} / {QS.length}</span>
        <span>{q.yearLabel}・第一次検定</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--rule-soft)] mb-5">
        <div className="h-full rounded-full bg-[var(--accent)] transition-[width]" style={{ width: `${((idx + (answered ? 1 : 0)) / QS.length) * 100}%` }} />
      </div>

      {/* 問題 */}
      <div className="card-surface-section p-5 sm:p-6">
        <p className="text-[15px] sm:text-[16px] leading-[1.9] text-[var(--ink)] font-bold mb-4">{q.question}</p>
        <div className="flex flex-col gap-2.5">
          {q.options.map((o) => {
            const isCorrect = o.num === q.correctNum;
            const isPicked = selected === o.num;
            let borderClass = "border-[var(--rule-soft)]";
            let bg: CSSProperties | undefined;
            if (answered && isCorrect) { borderClass = "border-[var(--color-positive)]"; bg = { background: "color-mix(in srgb, var(--color-positive) 12%, transparent)" }; }
            else if (answered && isPicked && !isCorrect) { borderClass = "border-[var(--color-danger)]"; bg = { background: "color-mix(in srgb, var(--color-danger) 12%, transparent)" }; }
            return (
              <button
                key={o.num}
                type="button"
                onClick={() => choose(o.num)}
                disabled={answered}
                style={bg}
                className={`focus-ring flex items-start gap-2.5 rounded-card-content border ${borderClass} p-3 text-left text-sm leading-6 text-[var(--ink-body)] transition-colors ${!answered ? "hover:border-[var(--accent)]" : ""}`}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[12px] font-bold text-[var(--ink-muted)]">
                  {o.num}
                </span>
                <span className="flex-1">{o.text}</span>
                {answered && isCorrect && <span className="shrink-0 font-bold" style={{ color: OK }}>正解</span>}
                {answered && isPicked && !isCorrect && <span className="shrink-0 font-bold" style={{ color: NG }}>あなたの解答</span>}
              </button>
            );
          })}
        </div>

        {/* 解説 */}
        {answered && (
          <div className="mt-5 rounded-card-content bg-[var(--bg)] p-4">
            <div className="text-sm font-bold mb-2" style={{ color: selected === q.correctNum ? OK : NG }}>
              {selected === q.correctNum ? "正解！" : `不正解（正解は ${q.correctNum}）`}
            </div>
            <ul className="flex flex-col gap-1.5">
              {q.explanations.map((e) => (
                <li key={e.num} className="flex items-start gap-2 text-[13px] leading-6 text-[var(--ink-body)]">
                  <span className="shrink-0 font-bold" style={{ color: e.correct ? OK : NG }}>{e.num}</span>
                  <span>{e.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {answered && (
          <button type="button" onClick={next} className="focus-ring mt-5 w-full rounded-card-content border border-[var(--accent)] bg-[var(--accent-fill)] px-5 py-2.5 text-sm font-bold text-[var(--accent)]">
            {isLast ? "結果を見る" : "次の問題へ →"}
          </button>
        )}
      </div>

      <p className="mt-4 text-[12px] text-[var(--ink-muted)] text-center">
        出典: 1級土木施工管理技術検定 第一次検定 過去問（各設問は原典で照合済み）。本ツールは抜粋24問のミニ演習です。
      </p>
    </div>
  );
}

function FunnelLinks() {
  return (
    <div className="mt-6">
      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-3">全問・解説で続けて学ぶ</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/docs/civil-construction-1-primary-r07-a" className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]">
          <div className="font-bold text-[var(--ink)]">令和7年度 第1次検定 問題A 全解説</div>
          <div className="text-sm text-[var(--ink-body)] mt-1">全61問を引っかけ論点つきで無料解説</div>
        </Link>
        <Link href="/tools/juken-shikaku" className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]">
          <div className="font-bold text-[var(--ink)]">受験資格チェッカー</div>
          <div className="text-sm text-[var(--ink-body)] mt-1">1級・2級の受験資格を年齢・実務経験で判定</div>
        </Link>
      </div>
    </div>
  );
}
