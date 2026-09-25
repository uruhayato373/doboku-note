/**
 * kosshi-sheet-guards.mjs — 指導サービスの「骨子シート」の決定的ゲート
 * ---------------------------------------------------------------------------
 * なぜ要るか:
 *   2026-09-25、ココナラ運営が答案ドラフトを納品する「作成」サービスを「学校の課題の代行」として
 *   取り下げた。作成系4件は、ヒアリング→骨子シート→本人が書いた答案の添削、という「指導」へ
 *   作り替えた。骨子シートに答案の文章が紛れ込めば、また代筆（代行）になる。
 *   「答案の文章を書いていない」「事実はすべて本人の回答から来ている」を機械で止める。
 *   意味の評価（骨子の粒度・区画の割り振り・技術的妥当性）は civil-keiken-tensaku-qa が担う。
 *
 * 書式（civil-keiken-tensaku-drafter の kosshi モードが出力する形）:
 *   「■ 」で始まる行が節の見出し。「■ 工事概要」と「■ テーマ…」の節を検査対象にする。
 *   テーマ節は「（1）」「（2）」で始まる区画の行を含む（1テーマ＝本番の〔設問1〕か〔設問2〕の1問分。
 *   その中が（1）（2）の2区画）。事実はヒアリング回答からの「」引用で書く。
 *
 * ゲート:
 *   K1 引用の出典   — 検査対象節の「」内が、ヒアリングシートに（空白を無視して）そのまま実在する
 *   K2 答案の文なし — 検査対象節の地の文（「」引用を除いた部分）は、1行 60 字以内・句点「。」なし
 *                     （体言止めの箇条書きだけ）・テーマ節ごとの合計 500 字以内
 *   K3 数値の出典   — 工事の事実を表す数値がヒアリングシートに実在する（返信文ゲート R6 と同じ判定）
 *   K4 区画の構成   — テーマ節が1つ以上あり、各テーマ節に（1）（2）の区画がそろう
 *   K6 引用の長さ   — 1つの「」引用は 30 字以内（回答の文を丸ごと並べると、つなぐだけで答案になる。
 *                     要点の語句だけを引き、組み立ては本人に残す）
 *   K5 送信前の禁止 — 外部誘導・合格保証・下書き注記の消し忘れ（返信文ゲート R2〜R4 と同じ判定）
 * ---------------------------------------------------------------------------
 */
import { assertNoExternalLinks, assertNoContactInfo, BlogGuardError } from './coconala-blog-guards.mjs';
import { factTokens, normalizeDigits, countChars } from './tensaku-reply-guards.mjs';

export const OWN_TEXT_MAX = 60;
export const OWN_TEXT_PER_THEME_MAX = 500;
export const QUOTE_MAX = 30;
/** ココナラのメッセージ欄上限。超えたらファイル添付で送る（違反ではなく送り方の判断材料） */
export const MESSAGE_MAX_CHARS = 3000;

const GUARANTEE_RE = /合格を?保証|必ず合格|確実に合格|絶対に?合格|合格できます(?!よう)|合格間違いなし/g;
const DRAFT_NOTE_RE = /AI\s*下書き|\[!note\]|運営者の最終(?:確認|赤入れ)|運営者へ|（運営者判断）/g;
const QUOTE_RE = /「([^「」]*)」/g;

const squash = (s) => normalizeDigits(s).replace(/\s/g, '');

/** 「■ 」見出しで節に分ける。見出し前の前置きは name='' の節になる */
export function splitSections(text) {
  const sections = [{ name: '', lines: [] }];
  const lines = String(text ?? '').split(/\r?\n/);
  lines.forEach((line, i) => {
    const m = line.match(/^■\s*(.+?)\s*$/);
    if (m) sections.push({ name: m[1], lines: [] });
    else sections[sections.length - 1].lines.push({ no: i + 1, text: line });
  });
  return sections;
}

const isChecked = (name) => /^工事概要/.test(name) || /^テーマ/.test(name);

/**
 * 骨子シートを検査する。違反は投げずに配列で返す（全件を一度に見せるため）。
 * @param {string} sheet 骨子シート
 * @param {{source?:string|null}} opts source=ヒアリングシート（K1/K3 用。無ければ未検査として報告）
 */
export function checkKosshiSheet(sheet, { source = null } = {}) {
  const text = String(sheet ?? '');
  const violations = [];
  const add = (code, message) => violations.push({ code, message });
  const sections = splitSections(text);
  const checked = sections.filter((s) => isChecked(s.name));
  const themes = sections.filter((s) => /^テーマ/.test(s.name));
  const src = source == null ? null : squash(source);
  const stats = { length: [...text].length, sections: checked.length, themes: themes.length, lines: 0, quotes: { inspected: 0, grounded: 0, checked: source != null }, facts: { inspected: 0, grounded: 0, checked: source != null } };

  for (const s of checked) {
    let ownTotal = 0;
    for (const { no, text: line } of s.lines) {
      if (!line.trim()) continue;
      stats.lines++;
      // K2: 「」引用を除いた地の文の長さ
      const own = line.replace(QUOTE_RE, '').replace(/^[\s・①-⑳0-9.()（）〔〕]+/, '');
      const ownLen = countChars(own);
      ownTotal += ownLen;
      if (ownLen > OWN_TEXT_MAX) add('K2_PROSE', `${no}行目（${s.name}）: 引用を除いた地の文が ${ownLen} 字（上限 ${OWN_TEXT_MAX} 字）。答案の文章になっていないか確認: "${line.trim().slice(0, 40)}…"`);
      if (/[。．]/.test(own)) add('K2_SENTENCE', `${no}行目（${s.name}）: 引用の外に句点で終わる文がある（骨子は体言止めの箇条書きだけ）: "${line.trim().slice(0, 40)}…"`);
      // K1: 引用はヒアリングシートに実在する
      for (const m of line.matchAll(QUOTE_RE)) {
        const qLen = countChars(m[1]);
        if (qLen > QUOTE_MAX) add('K6_LONG_QUOTE', `${no}行目（${s.name}）: 引用が ${qLen} 字（上限 ${QUOTE_MAX} 字）。回答の文を丸ごと引かず要点の語句に絞る: 「${m[1].slice(0, 30)}…」`);
      }
      if (src != null) {
        for (const m of line.matchAll(QUOTE_RE)) {
          const q = squash(m[1]);
          if (!q) continue;
          stats.quotes.inspected++;
          if (src.includes(q)) stats.quotes.grounded++;
          else add('K1_UNGROUNDED_QUOTE', `${no}行目（${s.name}）: ヒアリングシートに無い引用「${m[1].slice(0, 40)}」（言い換えたなら「」を外すか、回答どおりに引用する）`);
        }
      }
    }
    if (/^テーマ/.test(s.name) && ownTotal > OWN_TEXT_PER_THEME_MAX) add('K2_TOO_MUCH_OWN', `「${s.name}」の地の文が合計 ${ownTotal} 字（上限 ${OWN_TEXT_PER_THEME_MAX} 字）。答案の文章を書いていないか確認`);
  }

  // K3: 数値の出典（引用の外で書いた数値も含めて見る）
  if (source != null) {
    const have = new Set(factTokens(source).map((t) => `${t.value}|${t.unit}`));
    const seen = new Set();
    const body = checked.flatMap((s) => s.lines.map((l) => l.text)).join('\n');
    for (const t of factTokens(body)) {
      const key = `${t.value}|${t.unit}`;
      if (seen.has(key)) continue;
      seen.add(key);
      stats.facts.inspected++;
      if (have.has(key)) stats.facts.grounded++;
      else add('K3_UNGROUNDED_NUMBER', `ヒアリングシートに無い数値: "${t.raw}"（創作でないか確認。回答に無ければ〇〇にして「確認したいこと」へ）`);
    }
  }

  // K4: 区画の構成
  if (!themes.length) add('K4_NO_THEME', '「■ テーマ…」の節が無い（骨子シートの書式になっていない）');
  for (const s of themes) {
    for (const n of ['1', '2']) {
      const re = new RegExp(`^\\s*[（(]${n}[）)]`);
      if (!s.lines.some((l) => re.test(normalizeDigits(l.text)))) add('K4_MISSING_PART', `「${s.name}」に（${n}）の区画が無い`);
    }
  }

  // K5: 送信前の禁止事項
  for (const fn of [assertNoExternalLinks, assertNoContactInfo]) {
    try { fn(text); } catch (e) {
      if (!(e instanceof BlogGuardError)) throw e;
      add(`K5_${e.code}`, e.message.split('\n')[0]);
    }
  }
  for (const m of text.matchAll(GUARANTEE_RE)) add('K5_GUARANTEE', `合格を保証・断定する表現: "${m[0]}"`);
  for (const m of text.matchAll(DRAFT_NOTE_RE)) add('K5_DRAFT_NOTE', `下書き用の注記が残っている: "${m[0]}"`);

  return { ok: violations.length === 0, violations, stats: { ...stats, fitsMessage: stats.length <= MESSAGE_MAX_CHARS } };
}
