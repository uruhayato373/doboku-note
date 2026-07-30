import Link from 'next/link';
import { type DocMeta } from '@/lib/docs';

// カテゴリページの「過去問（年度 × 問題種別リンク）」を全資格共通で描画する。
// デスクトップ=現行様式の table、モバイル=1年度1行のチップリスト（4列テーブルの折り返し崩れを回避）。
// 資格ごとの年度グルーピング・ソートは呼び出し側（CategorySections の各 *ExamTable）が担い、
// ここは整形済みの columns / rows を受け取って見た目だけを担当する（デザインの単一実装）。

/**
 * 1セル = 1リンク（該当年度に doc が無ければ undefined → デスクトップは "—"、モバイルは非表示）。
 * `chipLabel` はモバイルチップの表示だけを差し替える。デスクトップは列見出しが文脈を与えるので
 * セル文字は "問題" 等で足りるが、モバイルは見出しが無いためチップ側が年度を名乗る必要がある
 * （行ラベルが科目になる建設部門の過去問マトリクスで必要・省略時は label）。
 */
export type ExamMatrixCell = { label: string; chipLabel?: string | undefined; doc?: DocMeta | undefined };
/**
 * 1行 = 年度 or 科目（label）＋ 各列のセル。cells は columns と同じ並び・同じ個数。
 * `labelTitle` は label を短縮表示したときの正式名（title / aria-label に載せる）。
 */
export type ExamMatrixRow = { key: string; label: string; labelTitle?: string | undefined; cells: ExamMatrixCell[] };

/**
 * 過去問リンクのチップ（全資格共通の見た目）。デスクトップ表のセル内リンク／モバイルのチップで共用。
 * 見た目の真実源はこの1箇所（旧 PeConstruction モバイルのチップ様式を踏襲）。
 *
 * dense は 1 行に多数（建設部門は 7 年度）並ぶ面用。**縦の余白 py-2 は詰めない**＝タップ標的の高さを
 * 保ったまま横だけを詰める（文字を mono・tabular にして年度が縦に揃うようにもする）。
 */
export function ExamChipLink({
  href,
  dense = false,
  children,
}: {
  href: string;
  dense?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`focus-ring inline-flex items-center rounded-card-inline border border-[var(--rule-soft)] bg-[var(--accent-fill)] py-2 font-medium text-[var(--accent)] transition-colors hover:border-[var(--accent)] ${
        dense ? 'px-2.5 font-mono text-[13px] tabular-nums' : 'px-3 text-sm'
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * @param rowHeader 行ラベル列の見出し。既定 '年度'（過去問）。キーワード節は '選択科目' を渡す。
 * @param rowLabelWidth モバイルの行ラベル最小幅。長い科目名を扱う面は 'wide' で改行を許す。
 * @param dense 列が多い面（建設部門の 7 年度＝8 列）でセル左右余白を詰める。狭いカラムでの横溢れを抑える。
 * @param tableFrom table に切り替える最小幅。既定 `desktop`(993px)。`wide`(1280px) は列が多く 993px 帯では
 *   表が記事カラムに収まらない面（建設部門 8 列＝自然幅 600px に対し内容幅は 1,116px 未満で 600px 割れ）。
 *   収まらない帯域では table を出さずチップリストにするため、**どの幅でも横スクロールが起きない**。
 */
export default function ExamMatrix({
  columns,
  rows,
  rowHeader = '年度',
  rowLabelWidth = 'default',
  dense = false,
  tableFrom = 'desktop',
}: {
  columns: string[];
  rows: ExamMatrixRow[];
  rowHeader?: string;
  rowLabelWidth?: 'default' | 'wide';
  dense?: boolean;
  tableFrom?: 'desktop' | 'wide';
}) {
  // Tailwind は動的な variant 接頭辞を解決できないため、両方の完全なクラス文字列を静的に持つ。
  const listHiddenClass = tableFrom === 'wide' ? 'xl:hidden' : 'zenn-desktop:hidden';
  const tableShownClass = tableFrom === 'wide' ? 'hidden xl:block' : 'hidden zenn-desktop:block';
  // 年度ラベル（"令和7年度"）は nowrap で 1 行に収まるが、科目名（"施工計画、施工設備及び積算"）は
  // モバイル幅で溢れるため wide では全幅の行見出しにする（チップは次行へ）。
  // ただし ≥769px は横に並べても収まる（科目 192px ＋ 年度チップ 7 個 300px）ので inline に戻し、
  // 1 科目 1 行に圧縮する（tableFrom='wide' の 993〜1279px 帯もこの経路で描かれるため効く）。
  const rowLabelClass =
    rowLabelWidth === 'wide'
      // min-w-[10rem] は「最長の行ラベル（鋼構造・コンクリート＝160px）」に合わせた floor。
      // これ以上広げるとチップ 7 個（258px）＋gap（56px）が 1024px 幅の記事カラム（498px）に収まらず
      // 2 行に折返して行高が 118px に膨らむ（実測）。狭めても各行のチップ開始位置は揃う。
      ? 'w-full font-medium text-[var(--ink)] zenn-tablet:w-auto zenn-tablet:min-w-[10rem] zenn-tablet:shrink-0 zenn-tablet:whitespace-nowrap'
      : 'min-w-[5.5rem] shrink-0 whitespace-nowrap font-medium text-[var(--ink)]';
  const cellX = dense ? 'px-2' : 'px-4';
  // 行ラベル列は横スクロール中も左に貼り付けて「どの科目の行か」を失わせない。
  // 背景は不透明（--paper）でないとスクロールした年度セルが透けるため、行 hover は group-hover で追従させる。
  const stickyLabel = 'sticky left-0 z-10 border-r border-[var(--rule-soft)] bg-[var(--paper)]';
  return (
    <>
      {/* table 未満の幅（既定 <993px・tableFrom='wide' なら <1280px）: 1 レコード=1行。
          行ラベル＋存在するリンクだけチップ横並び（"—" は出さない）。 */}
      <ul className={`flex flex-col ${listHiddenClass}`}>
        {rows.map((row) => {
          const available = row.cells.filter((c) => c.doc);
          return (
            <li
              key={row.key}
              className="flex flex-wrap items-center gap-2 border-b border-[var(--rule-soft)] py-3 last:border-b-0"
            >
              <span className={rowLabelClass} title={row.labelTitle}>{row.label}</span>
              {available.map((c) => (
                <ExamChipLink key={c.label} href={`/docs/${c.doc!.slug}`} dense={dense}>
                  {c.chipLabel ?? c.label}
                </ExamChipLink>
              ))}
            </li>
          );
        })}
      </ul>

      {/* table（既定 ≥993px・tableFrom='wide' なら ≥1280px）: 行ラベル＋各種別列・行 hover・リンク/"—"。
          `min-w-full`（旧 `w-full`）が要点: `w-full` は表を枠内へ縮めるため、縮まない値セルに押された
          行ラベル列が潰れて折返す（建設部門 8 列・記事カラム 527px で科目列 64px・行高 193px の崩れが発生）。
          `min-w-full` なら内容が狭いときは全幅・広いときは自然幅。tableFrom で「収まる幅でしか table を
          出さない」ようにしているので実際には横スクロールは発生しないが、想定外の狭さでも切れないよう
          overflow-x-auto と sticky 行ラベルは保険として残す。 */}
      <div className={`overflow-x-auto ${tableShownClass}`}>
        <table className="min-w-full border-collapse text-base">
          <thead>
            <tr className="border-b-2 border-[var(--rule-soft)]">
              <th className={`${stickyLabel} px-4 py-3 text-left font-semibold text-[var(--ink-body)]`}>{rowHeader}</th>
              {columns.map((col) => (
                <th key={col} className={`${cellX} whitespace-nowrap py-3 text-center font-semibold text-[var(--ink-body)]`}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className="group border-b border-[var(--rule-soft)] transition-colors hover:bg-[var(--accent-fill)]"
              >
                <td
                  className={`${stickyLabel} whitespace-nowrap px-4 py-3 font-medium text-[var(--ink)] transition-colors group-hover:bg-[var(--accent-fill)]`}
                  title={row.labelTitle}
                >
                  {row.label}
                </td>
                {row.cells.map((c, i) => (
                  <td key={i} className={`${cellX} whitespace-nowrap py-3 text-center`}>
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
