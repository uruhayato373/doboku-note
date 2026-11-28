/**
 * note-overclaim.mjs — note 記事の「根拠の無い言い切り」の判定（純関数・依存ゼロ）。語の一覧はここだけに置く。
 *
 * なぜ要るか: 2026-11-27、note の無料記事が筆者の目安を「鉄則」「必ず」「減点必至」「採点上きわめて重要」と
 * 採点基準のように書いていて、読者が「守れていないから落ちたのか」と不安になった。採点基準は公表されておらず、
 * 運営者は採点者ではない。note-lint は書式しか見ないので素通りした。
 *
 * 使う側: scripts/checks/check-note-overclaim.mjs（全件と --staged・基準線のラチェット）。
 *
 * 罠:
 * - 「合格を保証するものではありません」「必ず合格とは約束しません」は言い切りの逆（断り書き）なので、
 *   同じ文の中で否定が続く形は拾わない（2026-11-27 の実測で「合格を保証」116 件はすべて断り書きだった）。
 * - frontmatter は見ない（title・description は別の検査の持ち場）。行番号はファイルの先頭から数える。
 * - 「お詫びと訂正」で以前の書き方を引用する行は、行末に `<!-- overclaim-ok: 理由 -->` を付ける。理由が空なら除外しない。
 */

/** 同じ文（。と改行まで）の中で否定が続くなら断り書き */
const NOT_NEGATED = '(?![^。\\n]{0,24}(?:ません|ない|ものでは|ものでも))';

/**
 * 検出する型。kind: scoring＝採点を断定する語 / rule＝決まりのように書く語 / condescending＝読者を見下す語。
 * @type {{ id: string, kind: 'scoring' | 'rule' | 'condescending', re: RegExp }[]}
 */
export const OVERCLAIM_RULES = [
  { id: '減点必至', kind: 'scoring', re: /減点必至/g },
  { id: '即減点', kind: 'scoring', re: /即減点/g },
  { id: '採点上（きわめて）重要', kind: 'scoring', re: /採点上(?:きわめて)?重要/g },
  { id: '最も評価され', kind: 'scoring', re: /最も評価され/g },
  { id: '高く評価されます', kind: 'scoring', re: /高く評価されます/g },
  { id: '採点者は〜評価/減点します', kind: 'scoring', re: /採点者は.{0,30}(?:評価|減点)し?ます/g },
  // 2026-11-28 に 865 記事の見出しと 1,000 か所近い本文を直した型（採点者を名乗る見出し・採点の扱いの断定）
  { id: '採点者が見るポイント', kind: 'scoring', re: /採点者が見(?:る|ている)(?:ポイント|チェックポイント|点)/g },
  { id: '採点者視点', kind: 'scoring', re: /採点者視点/g },
  { id: '採点者は〜を見ています', kind: 'scoring', re: /採点者(?:は|が).{0,30}(?:見てい(?:ます|る)|重視し|確認し(?:ます|てい)|チェックする)/g },
  { id: '評価される書き方', kind: 'scoring', re: /評価される(?:書き方|答案)/g },
  { id: '加点・減点される', kind: 'scoring', re: new RegExp(`(?:加点|減点)され(?:る|ます|やすい)${NOT_NEGATED}`, 'g') },
  { id: '高評価', kind: 'scoring', re: /(?<!最)高評価/g },
  { id: '鉄則', kind: 'rule', re: /鉄則/g },
  { id: '作法が決まって', kind: 'rule', re: /作法が決まって/g },
  { id: '必ず合格', kind: 'rule', re: new RegExp(`必ず合格${NOT_NEGATED}`, 'g') },
  { id: '合格を保証', kind: 'rule', re: new RegExp(`合格を保証${NOT_NEGATED}`, 'g') },
  { id: '小学生レベル', kind: 'condescending', re: /小学生レベル/g },
];

/** 行末の除外の印。理由（空白以外が 1 字以上）が要る */
const OK_MARK_RE = /<!--\s*overclaim-ok:\s*\S[\s\S]*?-->\s*$/;

/** note 記事のファイル名か（パス全体では判定しない＝区切りが OS で変わる） */
export const isNoteArticleName = (name) => /^article(-[^/\\]+)?\.md$/.test(name);

/** frontmatter の行数（無ければ 0）。先頭の BOM は無視する */
function frontmatterLineCount(lines) {
  if (lines.length === 0 || lines[0].replace(/^﻿/, '').trimEnd() !== '---') return 0;
  for (let i = 1; i < lines.length; i++) if (lines[i].trimEnd() === '---') return i + 1;
  return 0;
}

/**
 * 本文の言い切りを返す。1 行に複数あればすべて返す。
 * @param {string} text 記事の全文（frontmatter つき）
 * @returns {{ line: number, rule: string, kind: string, match: string, text: string }[]}
 */
export function findOverclaims(text) {
  const lines = text.split(/\r?\n/);
  const hits = [];
  for (let i = frontmatterLineCount(lines); i < lines.length; i++) {
    const line = lines[i];
    if (OK_MARK_RE.test(line)) continue;
    for (const rule of OVERCLAIM_RULES) {
      for (const m of line.matchAll(rule.re)) hits.push({ line: i + 1, rule: rule.id, kind: rule.kind, match: m[0], text: line.trim().slice(0, 120) });
    }
  }
  return hits;
}

/**
 * 基準線との比較（純関数）。counts に無い記事は見ない（--staged は staged の記事だけを渡す）。
 * 全件のときは allFiles: true を渡す＝基準線にあるのに counts に無い記事（消えた・直った）を 0 件として扱う。
 * @param {Record<string, number>} counts 記事のリポジトリ相対パス → 今の件数（0 件の記事も入れる）
 * @param {Record<string, number>} baseline 記事のリポジトリ相対パス → 基準線の件数
 * @returns {{ increased: { file: string, base: number, now: number }[], decreased: { file: string, base: number, now: number }[] }}
 */
export function compareWithBaseline(counts, baseline, { allFiles = false } = {}) {
  const files = new Set(Object.keys(counts));
  if (allFiles) for (const f of Object.keys(baseline)) files.add(f);
  const increased = [];
  const decreased = [];
  for (const file of [...files].sort()) {
    const base = baseline[file] ?? 0;
    const now = counts[file] ?? 0;
    if (now > base) increased.push({ file, base, now });
    else if (now < base) decreased.push({ file, base, now });
  }
  return { increased, decreased };
}

/**
 * 書き直す基準線（全件の counts から作る）。減った記事は下げ、0 件は行を消す。
 * 増えた記事は allowIncrease のときだけ上げる（既定は元の値のまま＝検査は赤のまま残る）。
 * @returns {Record<string, number>} パスの昇順
 */
export function nextBaseline(counts, baseline, { allowIncrease = false } = {}) {
  const next = {};
  for (const file of [...new Set([...Object.keys(counts), ...Object.keys(baseline)])].sort()) {
    const base = baseline[file] ?? 0;
    const now = counts[file] ?? 0;
    const value = now > base && !allowIncrease ? base : now;
    if (value > 0) next[file] = value;
  }
  return next;
}
