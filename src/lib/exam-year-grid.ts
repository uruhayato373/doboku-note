/**
 * exam-year-grid.ts — 過去問の記事を「年度 × 区分」にまとめる（資格トップの過去問の表と、記事の右の欄の過去問カードが共用）。
 *
 * slug の年度コードと区分の読み方はここだけに書く（以前は表と右の欄で同じ正規表現を別々に持っていた）。
 * 見出しの文言・セルのラベルは描く側が決める。ここは年度ごとに c1〜c3 の列へ記事を置くだけ。
 *
 * - pe（技術士総監）: `…-(r|h)NN-(primary|secondary)` → c1 択一・c2 記述（どちらも過去問の記事）
 * - civil-1（1級土木）: 第1次 `…-(r|h)NN-(a|b)` → c1 問題A・c2 問題B、第2次 `…secondary-(r|h)NN` → c3
 * - civil-2（2級土木）: 第1次 `…primary-(r|h)NN(-zenki|-kouki)?` → c1 前期・c2 後期、第2次 → c3。
 *   平成27年度までの年1回の学科試験は期が無い（`primary-h26`）ので c2 に置き、`single` で知らせる
 */
import { compareExamYearDesc } from './exam-year.mjs';

export type ExamGridKind = 'pe' | 'civil-1' | 'civil-2';
export type ExamYearCells<T> = { c1?: T | undefined; c2?: T | undefined; c3?: T | undefined; single?: boolean | undefined };
export type ExamYearGrid<T> = {
  /** 新しい年度から順 */
  readonly years: string[];
  readonly cells: ReadonlyMap<string, ExamYearCells<T>>;
  /** 第2次（c3）が 1 年度でもあるか */
  readonly hasSecondary: boolean;
};

const PRIMARY: Record<ExamGridKind, RegExp> = {
  pe: /(r|h)(\d+)-(primary|secondary)$/,
  'civil-1': /(r|h)(\d+)-(a|b)$/,
  'civil-2': /primary-(r|h)(\d+)(?:-(zenki|kouki))?$/,
};
const PART_TO_COLUMN: Record<string, 'c1' | 'c2'> = { primary: 'c1', secondary: 'c2', a: 'c1', b: 'c2', zenki: 'c1', kouki: 'c2' };
const SECONDARY = /secondary-(r|h)(\d+)$/;

/**
 * @param primary 第1次（総監は択一・記述の両方）の記事
 * @param secondary 第2次の年度別の記事（総監は使わない）
 * @param options.secondaryOnlyYears 第1次の無い年度でも第2次があれば行を作る（右の欄の過去問カード）。資格トップの表は作らない
 */
export function groupExamYears<T extends { slug?: string | undefined }>(
  kind: ExamGridKind,
  primary: readonly T[],
  secondary: readonly T[] = [],
  { secondaryOnlyYears = false }: { secondaryOnlyYears?: boolean } = {},
): ExamYearGrid<T> {
  const cells = new Map<string, ExamYearCells<T>>();
  const at = (code: string) => {
    if (!cells.has(code)) cells.set(code, {});
    return cells.get(code)!;
  };
  for (const doc of primary) {
    const m = doc.slug?.match(PRIMARY[kind]);
    if (!m) continue;
    const row = at(`${m[1]}${m[2]}`);
    if (kind === 'civil-2' && !m[3]) {
      row.c2 = doc;
      row.single = true;
    } else {
      row[PART_TO_COLUMN[m[3]!]!] = doc;
    }
  }
  const primaryYears = new Set(cells.keys());
  let hasSecondary = false;
  if (kind !== 'pe') {
    for (const doc of secondary) {
      const m = doc.slug?.match(SECONDARY);
      if (!m) continue;
      const code = `${m[1]}${m[2]}`;
      hasSecondary = true;
      if (!secondaryOnlyYears && !primaryYears.has(code)) continue;
      at(code).c3 = doc;
    }
  }
  return { years: [...cells.keys()].sort(compareExamYearDesc), cells, hasSecondary };
}
