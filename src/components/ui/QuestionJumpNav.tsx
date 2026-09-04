import Link from 'next/link';

// 年度別過去問（問題 No.1〜No.61 が H2 で並ぶ 1 ページ）の問題番号ジャンプ。
// 通常 TOC は「問番号の羅列」になるため出していない（DocPage.isQuestionSeries）が、
// その結果モバイルで 5 万 px 超のページを目的の問まで手スクロールするしかなかった（2026-09 監査）。
// 見出しテキストから番号だけを取り出しチップにする。番号が取れない見出しは無視する。

type Heading = { id: string; text: string; level: number };

function questionNumber(text: string): string | null {
  const m = text.match(/(?:問題|問|Q|No\.?)\s*([0-9０-９]{1,3})/i) ?? text.match(/^([0-9０-９]{1,3})[.．、 ]/);
  const raw = m?.[1];
  if (!raw) return null;
  return raw.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

export default function QuestionJumpNav({ headings }: { headings: Heading[] }) {
  const items = headings
    .filter((h) => h.level === 2)
    .map((h) => ({ id: h.id, n: questionNumber(h.text) }))
    .filter((x): x is { id: string; n: string } => !!x.n);
  if (items.length < 5) return null;
  return (
    <nav
      aria-label="問題番号へ移動"
      className="mb-6 rounded-card-section border border-[var(--rule-soft)] bg-[var(--paper)] p-3 dark:border-[var(--rule-soft)]"
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="font-sans text-[13px] font-bold text-[var(--ink)]">問題番号へ移動</span>
        <span className="font-mono text-[11px] text-[var(--ink-muted)]">全 {items.length} 問</span>
      </div>
      <ol className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <li key={it.id}>
            <Link
              href={`#${it.id}`}
              className="focus-ring inline-flex h-9 min-w-9 items-center justify-center rounded-card-inline border border-[var(--rule-soft)] px-2 font-mono text-[12px] tabular-nums text-[var(--ink-body)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-fill)] hover:text-[var(--accent)] dark:border-[var(--rule-soft)]"
            >
              {it.n}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
