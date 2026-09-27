/**
 * exam-calendar-guards.mjs — 試験日の誤記を本文から検出する禁止パターン（純粋関数）
 * ---------------------------------------------------------------------------
 * 試験日の SSOT は .claude/config/exam-calendar.json。本文へ写した日付の誤りを
 * scripts/check-exam-calendar.mjs がこのパターンで止める（tests/exam-calendar-guards.test.mjs）。
 * ---------------------------------------------------------------------------
 */

/**
 * 判定前に取り除く「実体としてのパス／ファイル名」。
 * 実在するディレクトリ名は誤記チェックの対象にしてはいけない——が、**実体が消えたら
 * 除外も消す**こと。2026-08-13 に content/note/コンクリート主任技師/ を「主任技士」へ
 * リネームしたのに除外だけ残り、docs/strategy/README.md の
 * 「旧名を指す壊れリンク」を静かに検査対象から外していた（除外がバグを覆い隠した）。
 * 除外を足すときは、その実体が消えたときに気づける形にする（下の存在検査）。
 */
export const PATH_LITERALS = [
  /コンクリート主任技師20/g, // content/sources/textbook/コンクリート主任技師2022|2024（ローカル PDF 名・実在）
  /09_YouTube戦略_コンクリート技士・主任技士\.md/g, // docs/marketing の実在ファイル名。版表で直後に更新日（YYYY-MM-DD）が並ぶと日付近接ルールが誤検知する
];
export const FORBIDDEN = [
  // ISO 予約時刻（2026-10-27T21:05…）は試験日の誤記ではなく X 台帳の投稿日なので除外する（2026-09-16・RCCM 10/27 投稿で偽赤）
  { pattern: /2026-10-27(?!T\d)/g, reason: "2級後期・第二次は2026-10-25" },
  { pattern: /10月27日/g, reason: "2級後期・第二次は10月25日" },
  { pattern: /10\/4-10\/27/g, reason: "土木第二次は1級10/4・2級10/25" },
  {
    pattern: /主任技師/g,
    reason:
      "公式名称は「コンクリート主任技士」（技師ではない）。2026-08-12 に 46 ファイル 163 箇所を是正した誤記の再発",
    stripPathLiterals: true,
  },
  {
    pattern: /コンクリート主任技士[^\n]{0,12}10月/g,
    reason: "コンクリート主任技士の試験は11/29（申込締切8/25）。10月ではない",
  },
  {
    pattern: /コンクリート(?:主任)?技士[^\n]{0,30}(?:2026-09-01|2026-11-30|9月1日|11月30日|11\/30)/g,
    reason: "2026年度のコンクリート技士・主任技士は申込締切8/25、試験11/29",
    stripPathLiterals: true,
  },
  // 2026-09-26: annual.md の表「| **11/30** | **コンクリート主任技士・技士** |」と「試験 11/30・申込締切 9/01」が
  // 「資格名 → 日付」の語順とハイフン日付だけを見ていたため素通りした。日付が先に来る語順とスラッシュ表記も止める。
  {
    pattern: /(?:2026-11-30|11月30日|11\/30)[^\n]{0,30}コンクリート(?:主任)?技士/g,
    reason: "2026年度のコンクリート技士・主任技士の試験は11/29",
    stripPathLiterals: true,
  },
  // 9/1 は X 台帳の投稿日（例「コンクリート主任技士 2026-09 前半（9/1〜9/10）」）と衝突するため、申込・締切の文脈に限る。
  {
    pattern: /コンクリート(?:主任)?技士[^\n]{0,30}(?:申込|締切)[^\n]{0,10}9\/0?1(?!\d)|9\/0?1(?!\d)[^\n]{0,30}コンクリート(?:主任)?技士[^\n]{0,20}(?:申込|締切)/g,
    reason: "2026年度のコンクリート技士・主任技士の申込締切は8/25",
    stripPathLiterals: true,
  },
];

/**
 * 本文から禁止パターンの違反理由を返す（純粋関数）。stripPathLiterals のルールは
 * PATH_LITERALS を取り除いてから判定する。
 * @param {string} raw
 * @returns {string[]}
 */
export function findForbidden(raw) {
  const stripped = PATH_LITERALS.reduce((acc, re) => acc.replace(re, ""), raw);
  const reasons = [];
  for (const rule of FORBIDDEN) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(rule.stripPathLiterals ? stripped : raw)) reasons.push(rule.reason);
  }
  return reasons;
}
