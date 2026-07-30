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

/**
 * @param rowHeader 行ラベル列の見出し。既定 '年度'（過去問）。キーワード節は '選択科目' を渡す。
 * @param rowLabelWidth モバイルの行ラベル最小幅。長い科目名を扱う面は 'wide' で改行を許す。
 */
export default function ExamMatrix({
  columns,
  rows,
  rowHeader = '年度',
  rowLabelWidth = 'default',
}: {
  columns: string[];
  rows: ExamMatrixRow[];
  rowHeader?: string;
  rowLabelWidth?: 'default' | 'wide';
}) {
  // 年度ラベル（"令和7年度"）は nowrap で 1 行に収まるが、科目名（"施工計画、施工設備及び積算"）は
  // モバイル幅で溢れるため wide では nowrap を外して全幅の行見出しにする（チップは次行へ）。
  const rowLabelClass =
    rowLabelWidth === 'wide'
      ? 'w-full font-medium text-[var(--ink)]'
      : 'min-w-[5.5rem] shrink-0 whitespace-nowrap font-medium text-[var(--ink)]';
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
              <span className={rowLabelClass}>{row.label}</span>
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
              <th className="px-4 py-3 text-left font-semibold text-[var(--ink-body)]">{rowHeader}</th>
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
