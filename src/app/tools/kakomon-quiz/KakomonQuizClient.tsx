"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { QuizDataset, QuizQuestion } from "@/lib/quiz/types";

/**
 * 1級土木 第一次検定 過去問 フル演習エンジン（v1・オンライン先行）。
 * 問題データは public/quiz/civil-1.json（scripts/build-quiz-data.mjs が
 * src/config/civil-1-exam-questions.json を正規化・トリムして生成、全1,098問/12年）を
 * 実行時 fetch で読み込む（クライアント JS バンドルを軽く保つため）。
 *
 * モード: 年度別 / ランダム20問 / 間違い復習（localStorage）。
 * 収益導線: 結果画面に note「一次 出る順」への UTM 付き CTA。
 * PWA 共通エンジン化の Phase 0 = 本ファイル。総監・2級は同じ型で後から追加する。
 */

const DATA_URL = "/quiz/civil-1.json";
const WRONG_KEY = "dnq:civil-1:wrong";
const TALLY_KEY = "dnq:civil-1:tally";
const RANDOM_COUNT = 20;

const NOTE_ICHIJI =
  "https://note.com/dobokunote/n/nec34238ca6d6?utm_source=doboku-note&utm_medium=quiz&utm_campaign=civil-1-kakomon";

const OK = "var(--color-positive)";
const NG = "var(--color-danger)";

type Mode = { kind: "year"; year: string } | { kind: "random" } | { kind: "review" };
type Tally = { answered: number; correct: number };

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export default function KakomonQuizClient() {
  const [data, setData] = useState<QuizDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [tally, setTally] = useState<Tally>({ answered: 0, correct: 0 });
  const dataRef = useRef<QuizDataset | null>(null);

  // localStorage 読み出しは mount 後（SSR/hydration 安全）
  useEffect(() => {
    try {
      const w = JSON.parse(localStorage.getItem(WRONG_KEY) || "[]");
      if (Array.isArray(w)) setWrong(new Set(w));
      const t = JSON.parse(localStorage.getItem(TALLY_KEY) || "null");
      if (t && typeof t.answered === "number") setTally(t);
    } catch {
      /* 破損時は無視 */
    }
  }, []);

  const ensureData = useCallback(async (): Promise<QuizDataset | null> => {
    if (dataRef.current) return dataRef.current;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(DATA_URL, { cache: "force-cache" });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as QuizDataset;
      dataRef.current = json;
      setData(json);
      return json;
    } catch {
      setLoadError(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const start = useCallback(
    async (m: Mode) => {
      const d = await ensureData();
      if (d) setMode(m);
    },
    [ensureData],
  );

  const recordAnswer = useCallback((id: string, isCorrect: boolean) => {
    setWrong((prev) => {
      const nextSet = new Set(prev);
      if (isCorrect) nextSet.delete(id);
      else nextSet.add(id);
      try {
        localStorage.setItem(WRONG_KEY, JSON.stringify([...nextSet]));
      } catch {
        /* 保存不可でも演習は継続 */
      }
      return nextSet;
    });
    setTally((prev) => {
      const next = { answered: prev.answered + 1, correct: prev.correct + (isCorrect ? 1 : 0) };
      try {
        localStorage.setItem(TALLY_KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  const questions = useMemo<QuizQuestion[]>(() => {
    if (!data || !mode) return [];
    if (mode.kind === "year") {
      return data.questions
        .filter((q) => q.year === mode.year)
        .sort((a, b) => a.id.localeCompare(b.id));
    }
    if (mode.kind === "random") {
      return shuffle(data.questions).slice(0, RANDOM_COUNT);
    }
    // review
    return data.questions.filter((q) => wrong.has(q.id));
    // wrong を依存に入れると復習中に集合が縮んで問題が消えるため、開始時点で固定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mode]);

  if (mode && questions.length > 0) {
    return (
      <QuizRunner
        title={modeTitle(mode, data)}
        questions={questions}
        onRecord={recordAnswer}
        onExit={() => setMode(null)}
      />
    );
  }

  return (
    <MenuScreen
      data={data}
      loading={loading}
      loadError={loadError}
      wrongCount={wrong.size}
      tally={tally}
      onStart={start}
      onRetry={ensureData}
    />
  );
}

function modeTitle(mode: Mode, data: QuizDataset | null): string {
  if (mode.kind === "year") {
    const y = data?.years.find((yr) => yr.year === mode.year);
    return `${y?.yearLabel ?? mode.year}・第一次検定`;
  }
  if (mode.kind === "random") return "ランダム20問";
  return "間違い復習";
}

/* ---------------- メニュー ---------------- */

function MenuScreen({
  data,
  loading,
  loadError,
  wrongCount,
  tally,
  onStart,
  onRetry,
}: {
  data: QuizDataset | null;
  loading: boolean;
  loadError: boolean;
  wrongCount: number;
  tally: Tally;
  onStart: (m: Mode) => void;
  onRetry: () => void;
}) {
  const totalPct = tally.answered > 0 ? Math.round((tally.correct / tally.answered) * 100) : null;
  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <p className="text-[14px] sm:text-[15px] leading-[1.9] text-[var(--ink-body)] mb-6">
        1級土木施工管理技士 第一次検定の過去問を、その場で解ける4択演習。1問ずつ即採点＋
        <strong className="text-[var(--ink)]">全選択肢の解説</strong>つき。平成26〜令和7年度の
        <strong className="text-[var(--ink)]">全1,098問</strong>を無料で演習できます。
      </p>

      {totalPct !== null && (
        <div className="card-surface-content p-4 mb-6 flex items-center justify-between">
          <div className="text-[13px] text-[var(--ink-body)]">
            これまでの累計 <strong className="text-[var(--ink)]">{tally.answered}</strong> 問・正答率{" "}
            <strong className="text-[var(--ink)]">{totalPct}%</strong>
          </div>
          {wrongCount > 0 && (
            <span className="text-[12px] text-[var(--ink-muted)]">要復習 {wrongCount} 問</span>
          )}
        </div>
      )}

      {loadError && (
        <div className="card-surface-content p-4 mb-6 text-center">
          <p className="text-sm text-[var(--color-danger)] font-bold mb-2">問題データの読み込みに失敗しました</p>
          <button
            type="button"
            onClick={onRetry}
            className="focus-ring rounded-card-content border border-[var(--accent)] bg-[var(--accent-fill)] px-4 py-1.5 text-sm font-bold text-[var(--accent)]"
          >
            再読み込み
          </button>
        </div>
      )}

      {/* クイックスタート */}
      <div className="grid gap-3 sm:grid-cols-2 mb-8">
        <button
          type="button"
          disabled={loading}
          onClick={() => onStart({ kind: "random" })}
          className="focus-ring card-surface-content block p-4 text-left shadow-none transition-colors hover:border-[var(--accent)] disabled:opacity-60"
        >
          <div className="font-bold text-[var(--ink)]">ランダム20問に挑戦</div>
          <div className="text-sm text-[var(--ink-body)] mt-1">全年度からランダム出題。腕試しに最適</div>
        </button>
        <button
          type="button"
          disabled={loading || wrongCount === 0}
          onClick={() => onStart({ kind: "review" })}
          className="focus-ring card-surface-content block p-4 text-left shadow-none transition-colors hover:border-[var(--accent)] disabled:opacity-50"
        >
          <div className="font-bold text-[var(--ink)]">間違いだけ復習{wrongCount > 0 ? `（${wrongCount}問）` : ""}</div>
          <div className="text-sm text-[var(--ink-body)] mt-1">
            {wrongCount > 0 ? "間違えた問題だけを解き直す" : "間違えた問題がここに溜まります"}
          </div>
        </button>
      </div>

      {/* 年度別 */}
      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-3">
        年度別に演習
      </div>
      {loading && !data ? (
        <div className="text-sm text-[var(--ink-muted)] py-6 text-center">読み込み中…</div>
      ) : (
        <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3">
          {(data?.years ?? PLACEHOLDER_YEARS).map((y) => (
            <button
              key={y.year}
              type="button"
              disabled={loading || !data}
              onClick={() => onStart({ kind: "year", year: y.year })}
              className="focus-ring card-surface-content p-3 text-left shadow-none transition-colors hover:border-[var(--accent)] disabled:opacity-60"
            >
              <div className="font-bold text-[var(--ink)] text-[14px]">{y.yearLabel}</div>
              <div className="text-[12px] text-[var(--ink-muted)] mt-0.5">{y.count}問</div>
            </button>
          ))}
        </div>
      )}

      <p className="mt-6 text-[12px] text-[var(--ink-muted)]">
        出典: 1級土木施工管理技術検定 第一次検定 過去問（各設問は原典で照合済み）。施工管理法（応用能力）等の
        図・記述系設問は4択演習の対象外です。
      </p>
    </div>
  );
}

const PLACEHOLDER_YEARS = [
  { year: "r07", yearLabel: "令和7年度", parts: ["A", "B"], count: 93 },
  { year: "r06", yearLabel: "令和6年度", parts: ["A", "B"], count: 92 },
  { year: "r05", yearLabel: "令和5年度", parts: ["A", "B"], count: 91 },
];

/* ---------------- 演習ランナー ---------------- */

function QuizRunner({
  title,
  questions,
  onRecord,
  onExit,
}: {
  title: string;
  questions: QuizQuestion[];
  onRecord: (id: string, isCorrect: boolean) => void;
  onExit: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[idx]!;
  const isLast = idx === questions.length - 1;

  function choose(num: number) {
    if (answered) return;
    const correct = num === q.correct;
    setSelected(num);
    setAnswered(true);
    if (correct) setScore((s) => s + 1);
    onRecord(q.id, correct);
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

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-10">
        <div className="card-surface-section p-6 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            結果 — {title}
          </div>
          <div className="font-serif font-black text-[var(--ink)] mt-2">
            <span className="text-[48px]">{score}</span>
            <span className="text-[20px] text-[var(--ink-muted)]"> / {questions.length} 問正解</span>
          </div>
          <div className="mt-2 text-[var(--ink-body)]">正答率 {pct}%</div>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onExit}
              className="focus-ring rounded-card-content border border-[var(--accent)] bg-[var(--accent-fill)] px-5 py-2 text-sm font-bold text-[var(--accent)]"
            >
              別のモードを選ぶ
            </button>
          </div>
        </div>

        <FunnelLinks />
      </div>
    );
  }

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex items-center justify-between text-[12px] text-[var(--ink-muted)] mb-3">
        <button type="button" onClick={onExit} className="focus-ring font-bold hover:text-[var(--accent)]">
          ← モード選択
        </button>
        <span>
          問 {idx + 1} / {questions.length}・{title}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--rule-soft)] mb-5">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width]"
          style={{ width: `${((idx + (answered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <div className="card-surface-section p-5 sm:p-6">
        <p className="text-[15px] sm:text-[16px] leading-[1.9] text-[var(--ink)] font-bold mb-4">{q.body}</p>
        <div className="flex flex-col gap-2.5">
          {q.options.map((o) => {
            const isCorrect = o.num === q.correct;
            const isPicked = selected === o.num;
            let borderClass = "border-[var(--rule-soft)]";
            let bg: CSSProperties | undefined;
            if (answered && isCorrect) {
              borderClass = "border-[var(--color-positive)]";
              bg = { background: "color-mix(in srgb, var(--color-positive) 12%, transparent)" };
            } else if (answered && isPicked && !isCorrect) {
              borderClass = "border-[var(--color-danger)]";
              bg = { background: "color-mix(in srgb, var(--color-danger) 12%, transparent)" };
            }
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
                {answered && isCorrect && (
                  <span className="shrink-0 font-bold" style={{ color: OK }}>
                    正解
                  </span>
                )}
                {answered && isPicked && !isCorrect && (
                  <span className="shrink-0 font-bold" style={{ color: NG }}>
                    あなたの解答
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="mt-5 rounded-card-content bg-[var(--bg)] p-4">
            <div className="text-sm font-bold mb-2" style={{ color: selected === q.correct ? OK : NG }}>
              {selected === q.correct ? "正解！" : `不正解（正解は ${q.correct}）`}
            </div>
            <ul className="flex flex-col gap-1.5">
              {q.explanations.map((e) => (
                <li key={e.num} className="flex items-start gap-2 text-[13px] leading-6 text-[var(--ink-body)]">
                  <span className="shrink-0 font-bold" style={{ color: e.correct ? OK : NG }}>
                    {e.num}
                  </span>
                  <span>{e.text || (e.correct ? "適当。" : "適当でない。")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {answered && (
          <button
            type="button"
            onClick={next}
            className="focus-ring mt-5 w-full rounded-card-content border border-[var(--accent)] bg-[var(--accent-fill)] px-5 py-2.5 text-sm font-bold text-[var(--accent)]"
          >
            {isLast ? "結果を見る" : "次の問題へ →"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- 送客導線 ---------------- */

function FunnelLinks() {
  return (
    <div className="mt-6">
      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-3">
        続けて合格へ
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={NOTE_ICHIJI}
          target="_blank"
          rel="noopener"
          className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
        >
          <div className="font-bold text-[var(--ink)]">1級土木 一次 出る順 合格ノート（note）</div>
          <div className="text-sm text-[var(--ink-body)] mt-1">頻出論点を出る順で総まとめ。直前の得点源に</div>
        </a>
        <Link
          href="/exam/civil-construction-1/primary/r07-a"
          className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
        >
          <div className="font-bold text-[var(--ink)]">令和7年度 問題A 全解説</div>
          <div className="text-sm text-[var(--ink-body)] mt-1">最新年度を引っかけ論点つきで無料解説</div>
        </Link>
      </div>
    </div>
  );
}
