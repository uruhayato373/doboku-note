import Link from 'next/link';
import { type DocMeta } from '@/lib/docs';

// カテゴリページの「過去問（年度 × 問題種別リンク）」を全資格共通で描画する。
// デスクトップ=現行様式の table、モバイル=1年度1行のチップリスト（4列テーブルの折り返し崩れを回避）。
// 資格ごとの年度グルーピング・ソートは呼び出し側（CategorySections の各 *ExamTable）が担い、
// ここは整形済みの columns / rows を受け取って見た目だけを担当する（デザインの単一実装）。

/** 1セル = 1リンク（該当年度に doc が無ければ undefined → デスクトップは "—"、モバイルは非表示）。 */
export type ExamMatrixCell = { label: string; doc?: DocMeta | undefined };
/** 1行 = 年度（label）＋ 各列のセル。cells は columns と同じ並び・同じ個数。 */
export type ExamMatrixRow = { key: string; label: string; cells: ExamMatrixCell[] };

/**
 * 過去問リンクのチップ（全資格共通の見た目）。デスクトップ表のセル内リンク／モバイルのチップで共用。
 * 見た目の真実源はこの1箇所（旧 PeConstruction モバイルのチップ様式を踏襲）。
 */
export function ExamChipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="focus-ring inline-flex items-center rounded-card-inline border border-[var(--rule-soft)] bg-[var(--accent-fill)] px-3 py-2 text-sm font-medium text-[var(--accent)] transition-colors hover:border-[var(--accent)]"
    >
      {children}
    </Link>
  );
}

export default function ExamMatrix({ columns, rows }: { columns: string[]; rows: ExamMatrixRow[] }) {
  return (
    <>
      {/* モバイル（<993px）: 1年度=1行。年度ラベル＋存在するリンクだけチップ横並び（"—" は出さない）。 */}
      <ul className="flex flex-col zenn-desktop:hidden">
        {rows.map((row) => {
          const available = row.cells.filter((c) => c.doc);
          return (
            <li
              key={row.key}
              className="flex flex-wrap items-center gap-2 border-b border-[var(--rule-soft)] py-3 last:border-b-0"
            >
              <span className="min-w-[5.5rem] shrink-0 whitespace-nowrap font-medium text-[var(--ink)]">
                {row.label}
              </span>
              {available.map((c) => (
                <ExamChipLink key={c.label} href={`/docs/${c.doc!.slug}`}>
                  {c.label}
                </ExamChipLink>
              ))}
            </li>
          );
        })}
      </ul>

      {/* デスクトップ（≥993px）: 現行様式の table（年度＋各種別列・行 hover・リンク/"—"）。 */}
      <div className="hidden overflow-x-auto zenn-desktop:block">
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="border-b-2 border-[var(--rule-soft)]">
              <th className="px-4 py-3 text-left font-semibold text-[var(--ink-body)]">年度</th>
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 text-center font-semibold text-[var(--ink-body)]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className="border-b border-[var(--rule-soft)] transition-colors hover:bg-[var(--accent-fill)]"
              >
                <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--ink)]">{row.label}</td>
                {row.cells.map((c, i) => (
                  <td key={i} className="px-4 py-3 text-center">
                    {c.doc ? (
                      <Link href={`/docs/${c.doc.slug}`} className="text-[var(--accent)] hover:underline">
                        {c.label}
                      </Link>
                    ) : (
                      <span className="text-[var(--ink-muted)] opacity-50">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
