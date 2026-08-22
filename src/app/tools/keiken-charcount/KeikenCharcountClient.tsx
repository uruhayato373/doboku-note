"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/**
 * 施工経験記述 文字数チェッカー（クライアント）。
 *
 * 解答欄しきい値の真実源は .claude/config/keiken-answer-sheet-limits.json
 * （scripts/keiken-charcount.mjs と同値）。本ツールは静的ページのため当該値を埋め込み、
 * カウント規則（markdown 装飾・タグ・空白を除いた実文字数、プレースホルダ〇は算入）も
 * スクリプトと一致させている。値の根拠（公式解答欄の行数×字/行）は下部「出典」を参照。
 */

type Grade = "civil-1" | "civil-2";
type Format = "current2" | "legacy3";
type QKey = "q1" | "q2" | "q3";

// 解答欄しきい値（confirmed / provisional:false）。単位=実文字数。
const LIMITS: Record<Grade, Record<string, number>> = {
  "civil-1": {
    current2_q1: 200,
    current2_q2: 200,
    legacy3_q1: 225,
    legacy3_q2: 275,
    legacy3_q3: 175,
  },
  "civil-2": {
    current2_q1: 250,
    current2_q2: 250,
    legacy3_q1: 250,
    legacy3_q2: 250,
    legacy3_q3: 250,
  },
};

const QUESTIONS: Record<Format, { key: QKey; label: string }[]> = {
  current2: [
    { key: "q1", label: "設問(1)" },
    { key: "q2", label: "設問(2)" },
  ],
  legacy3: [
    { key: "q1", label: "設問(1) 技術的課題" },
    { key: "q2", label: "設問(2) 検討項目" },
    { key: "q3", label: "設問(3) 対応処置" },
  ],
};

const GRADE_LABEL: Record<Grade, string> = {
  "civil-1": "1級",
  "civil-2": "2級",
};

// markdown 装飾・タグ・空白を除いた実文字数（scripts/keiken-charcount.mjs と一致）
function countChars(s: string): number {
  const clean = s
    .replace(/<[^>]+>/g, "")
    .replace(/`/g, "")
    .replace(/\*/g, "")
    .replace(/\s/g, "");
  return [...clean].length;
}

type Severity = "ok" | "borderline" | "over" | "severe";

function severityOf(chars: number, max: number): Severity {
  if (chars === 0) return "ok";
  if (chars <= max) return "ok";
  if (chars <= Math.round(max * 1.1)) return "borderline";
  if (chars <= Math.round(max * 1.3)) return "over";
  return "severe";
}

const SEV_META: Record<
  Severity,
  { label: string; color: string; note: string }
> = {
  ok: { label: "解答欄に収まる", color: "var(--color-positive)", note: "上限以内です。" },
  borderline: {
    label: "ぎりぎり",
    color: "var(--color-warn)",
    note: "上限+10%以内。1行字数の幅で収まる可能性はありますが、余裕を持って圧縮推奨。",
  },
  over: {
    label: "要圧縮",
    color: "var(--color-danger)",
    note: "上限を超えています。解答欄に収まるよう圧縮してください。",
  },
  severe: {
    label: "大幅超過",
    color: "var(--color-danger)",
    note: "上限の1.3倍超。物理的に解答欄へ収まりません。大幅な圧縮が必要です。",
  },
};

export default function KeikenCharcountClient() {
  const [grade, setGrade] = useState<Grade>("civil-1");
  const [format, setFormat] = useState<Format>("current2");
  const [qkey, setQkey] = useState<QKey>("q1");
  const [text, setText] = useState("");

  const questions = QUESTIONS[format];
  // 形式切替で設問(3)が消える場合に q3 を補正
  const activeQ = questions.some((q) => q.key === qkey) ? qkey : "q1";
  const category = `${format}_${activeQ}`;
  const max = LIMITS[grade][category] ?? 200;

  const chars = useMemo(() => countChars(text), [text]);
  const sev = severityOf(chars, max);
  const meta = SEV_META[sev];
  const remaining = max - chars;
  const pct = Math.min(100, Math.round((chars / max) * 100));

  const btnBase =
    "focus-ring px-3 py-1.5 rounded-card-content text-sm font-bold border transition-colors";
  const on =
    "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-fill)]";
  const off =
    "border-[var(--rule-soft)] text-[var(--ink-body)] hover:border-[var(--accent)]";

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* コントロール */}
      <div className="card-surface-section p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2">
              級
            </div>
            <div className="flex gap-2">
              {(["civil-1", "civil-2"] as Grade[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`${btnBase} ${grade === g ? on : off}`}
                  aria-pressed={grade === g}
                >
                  {GRADE_LABEL[g]}土木
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2">
              出題形式
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFormat("current2")}
                className={`${btnBase} ${format === "current2" ? on : off}`}
                aria-pressed={format === "current2"}
              >
                現行（令和6年度〜・2テーマ必答）
              </button>
              <button
                type="button"
                onClick={() => setFormat("legacy3")}
                className={`${btnBase} ${format === "legacy3" ? on : off}`}
                aria-pressed={format === "legacy3"}
              >
                旧形式（〜令和5年度・3項目）
              </button>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2">
              設問
            </div>
            <div className="flex flex-wrap gap-2">
              {questions.map((q) => (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => setQkey(q.key)}
                  className={`${btnBase} ${activeQ === q.key ? on : off}`}
                  aria-pressed={activeQ === q.key}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label htmlFor="answer" className="sr-only">
          施工経験記述の答案
        </label>
        <textarea
          id="answer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ここに施工経験記述の答案を貼り付け／入力してください。&#10;（数値プレースホルダ〇は受験時に同桁の数値へ置換される前提で1字として数えます）"
          rows={10}
          className="focus-ring mt-5 w-full resize-y rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] p-4 text-[15px] leading-[1.9] text-[var(--ink)] focus:border-[var(--accent)]"
        />
      </div>

      {/* 結果 */}
      <div className="card-surface-section mt-4 p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)]">
              実文字数
            </div>
            <div className="font-serif font-black text-[var(--ink)] leading-none mt-1">
              <span className="text-[40px] sm:text-[48px]">{chars}</span>
              <span className="text-[18px] text-[var(--ink-muted)]"> / {max} 字</span>
            </div>
          </div>
          <div
            className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold text-white"
            style={{ background: meta.color }}
          >
            {meta.label}
          </div>
        </div>

        {/* プログレスバー */}
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[var(--rule-soft)]">
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${pct}%`, background: meta.color }}
          />
        </div>

        <p className="mt-3 text-sm leading-6 text-[var(--ink-body)]">
          {remaining >= 0 ? (
            <>
              上限まであと <strong className="text-[var(--ink)]">{remaining}</strong> 字。{meta.note}
            </>
          ) : (
            <>
              上限を <strong style={{ color: meta.color }}>{-remaining}</strong> 字オーバー。{meta.note}
            </>
          )}
        </p>
      </div>

      {/* 注記・出典 */}
      <div className="mt-6 rounded-card-content border border-[var(--rule-soft)] bg-[var(--bg)] p-5 text-sm leading-7 text-[var(--ink-body)]">
        <p className="font-bold text-[var(--ink)] mb-2">カウント・しきい値について</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            文字数は <strong className="text-[var(--ink)]">空白・改行を除いた実文字数</strong>（マークダウン装飾やタグも除外）。数値プレースホルダ〇は受験時に数値へ置換される前提で1字として算入します。
          </li>
          <li>
            上限の根拠 — <strong className="text-[var(--ink)]">1級</strong>: 現行2テーマは各 8行×25字＝<strong>200字</strong>、旧形式は (1)9行・(2)11行・(3)7行（×25字）。<strong className="text-[var(--ink)]">2級</strong>: 問題文に字数規定はなく、通説目安の <strong>1項目約250字</strong>を採用。
          </li>
          <li>
            「ぎりぎり」は上限+10%以内（1行字数の幅で収まり得る帯）。確実を期すなら上限以内に圧縮してください。
          </li>
          <li className="text-[var(--ink-muted)]">
            ※ 経験記述は「自分が経験した工事」を書く問題です。模範答案の丸写しは失格につながります。必ず自分の現場に置き換えて使用してください。
          </li>
        </ul>
      </div>

      {/* 関連（内部リンク・funnel） */}
      <div className="mt-6">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-3">
          経験記述の書き方をもっと詳しく
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/docs/civil-construction-1-secondary-experience-writing-guide"
            className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
          >
            <div className="font-bold text-[var(--ink)]">1級土木 施工経験記述の書き方</div>
            <div className="text-sm text-[var(--ink-body)] mt-1">課題→検討→対応の型と頻出テーマを解説</div>
          </Link>
          <Link
            href="/docs/civil-construction-2-secondary-experience-writing-guide"
            className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
          >
            <div className="font-bold text-[var(--ink)]">2級土木 施工経験記述の書き方</div>
            <div className="text-sm text-[var(--ink-body)] mt-1">2級の解答欄・テーマ別の書き分けを解説</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
