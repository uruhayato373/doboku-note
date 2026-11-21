/**
 * exam-question-number.ts — 過去問ページの設問の見出しから番号を取り出す（唯一の実装）。
 * スマホの問題番号ジャンプ（QuestionJumpNav）・PC の右の欄の設問一覧（ExamQuestionNav）・右の欄に設問一覧を出すかの判定
 * （article-sidebar-plan）が共用する。以前はスマホと PC で別の解析器を持ち、第 1 次の 78 ページ中 20 ページで
 * スマホには番号が出るのに PC には設問一覧が出なかった（2026-11-22）。
 */

const toHalfWidth = (s: string) => s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));

/** 見出しテキストから設問番号を取り出す。「問題 No.1」「No.1」「問1」「問題 1」「Q1」「第1問」「1.」・全角数字に対応 */
export function parseQuestionNo(text: string): number | null {
  const t = toHalfWidth(text);
  const m =
    t.match(/(?:問題|問|Q|No\.?)\s*(\d{1,3})/i) ??
    t.match(/第\s*(\d{1,3})\s*問/) ??
    t.match(/^(\d{1,3})[.．、 ]/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** 設問の並ぶページの見出し（H2）のうち、番号の取れるものだけを順に返す */
export function questionHeadings<H extends { id: string; text: string; level: number }>(headings: readonly H[]): { id: string; no: number }[] {
  return headings
    .filter((h) => h.level === 2)
    .map((h) => ({ id: h.id, no: parseQuestionNo(h.text) }))
    .filter((q): q is { id: string; no: number } => q.no !== null);
}
