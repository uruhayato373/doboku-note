/**
 * tensaku-reply-guards.mjs — 添削・診断・作成の「顧客への返信文」の決定的ゲート
 * ---------------------------------------------------------------------------
 * なぜ要るか:
 *   返信文は顧客へそのまま届く。書いた本人（Generator）の自己点検では、
 *   「書き換え例の字数表記が実数とずれている」「原稿に無い数値が紛れ込んだ」
 *   「外部 URL が残った」を見落とす。意味の評価は civil-keiken-tensaku-qa が担い、
 *   ここは機械で白黒がつくものだけを判定する（2026-09-25 ココナラ S2 初回添削で新設）。
 *
 * ゲート:
 *   R1 長さ       — ココナラのメッセージ欄上限 3000 字以内
 *   R2 外部誘導   — URL / note・自サイトの言及 / メール・電話・LINE（coconala-blog-guards を流用）
 *   R3 合格保証   — 「必ず合格」等の断定
 *   R4 下書き残り — AI 下書き注記・運営者向けメモの消し忘れ
 *   R5 書き換え例 — 見出し末尾の（N字）表記と実字数の一致・解答欄上限以内・8割以上
 *   R6 数値の出典 — 工事の事実を表す数値（箇所・分・班・km・m² 等）が提出原稿に実在する
 *                    （「受け取りから48時間以内」のような返却期限＝サービス条件は対象外）
 * ---------------------------------------------------------------------------
 */
import { assertNoExternalLinks, assertNoContactInfo, BlogGuardError } from './coconala-blog-guards.mjs';

export const REPLY_MAX_CHARS = 3000;

const GUARANTEE_RE = /合格を?保証|必ず合格|確実に合格|絶対に?合格|合格できます(?!よう)|合格間違いなし/g;
const DRAFT_NOTE_RE = /AI\s*下書き|\[!note\]|運営者の最終赤入れ|運営者へ|（運営者判断）/g;

// 工事の事実を表す単位だけを対象にする（字・行・回・テーマ・年度 等の試験制度側の数値は対象外）
const FACT_UNITS = [
  '箇所', 'か所', 'ヶ所', 'カ所', '時間', '分', '班', '人', '台', '本',
  'km', 'm²', 'm2', 'm³', 'm3', 'mm', 'cm', 'm', 't', '倍', '%', '％',
  '日間', 'ヶ月', 'か月', 'カ月', '週間',
];
const FACT_RE = new RegExp(
  `(\\d[\\d,]*(?:\\.\\d+)?)\\s*(${FACT_UNITS.map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![a-zA-Z²³0-9])`,
  'g',
);
const YEAR_RE = /(\d{4})年(?!度)/g;

/** 全角数字・記号を半角へ寄せる（原稿と返信で表記が揺れても同じ値として扱う） */
export function normalizeDigits(s) {
  return String(s ?? '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[．]/g, '.')
    .replace(/[，]/g, ',');
}

/** 字数の数え方は keiken-charcount と同じ（空白・改行を除いた実文字数） */
export const countChars = (s) => String(s ?? '').replace(/\s/g, '').length;

// 「受け取りから48時間以内」「受領後24時間」等の返却期限は工事の事実ではない
const SERVICE_TERM_BEFORE_RE = /(?:受け取り|受領|ご購入|購入)(?:から|後)\s*$/;

export function factTokens(text) {
  const t = normalizeDigits(text);
  const out = [];
  for (const m of t.matchAll(FACT_RE)) {
    if (SERVICE_TERM_BEFORE_RE.test(t.slice(Math.max(0, m.index - 8), m.index))) continue;
    out.push({ raw: m[0], value: m[1].replace(/,/g, ''), unit: m[2] });
  }
  for (const m of t.matchAll(YEAR_RE)) out.push({ raw: m[0], value: m[1], unit: '年' });
  return out;
}

/**
 * 見出し末尾が（N字）の行を書き換え例の見出しとみなし、次の空行までを本文として返す。
 * @returns {{heading:string, declared:number, body:string, actual:number}[]}
 */
export function extractRewriteBlocks(text) {
  const lines = normalizeDigits(text).split(/\r?\n/);
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/[（(](\d+)字[）)]\s*$/);
    if (!m) continue;
    const body = [];
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    for (; j < lines.length && lines[j].trim() !== ''; j++) body.push(lines[j]);
    if (!body.length) continue;
    const joined = body.join('\n');
    blocks.push({ heading: lines[i].trim(), declared: Number(m[1]), body: joined, actual: countChars(joined) });
  }
  return blocks;
}

/**
 * 返信文を検査する。違反は投げずに配列で返す（全件を一度に見せるため）。
 * @param {string} reply 返信文
 * @param {{source?:string, maxChars?:number|null, minRatio?:number}} opts
 *   source=提出原稿（R6 用。無ければ R6 は未検査として報告）
 *   maxChars=解答欄1区画の上限字数（R5 用。null なら上限判定は未検査）
 */
export function checkReply(reply, { source = null, maxChars = null, minRatio = 0.8 } = {}) {
  const text = String(reply ?? '');
  const violations = [];
  const add = (code, message) => violations.push({ code, message });

  // R1
  const length = [...text].length;
  if (length > REPLY_MAX_CHARS) add('R1_TOO_LONG', `返信文が ${length} 字（上限 ${REPLY_MAX_CHARS} 字）。分割して送るか圧縮する`);

  // R2
  for (const fn of [assertNoExternalLinks, assertNoContactInfo]) {
    try { fn(text); } catch (e) {
      if (!(e instanceof BlogGuardError)) throw e;
      add(`R2_${e.code}`, e.message.split('\n')[0]);
    }
  }

  // R3
  for (const m of text.matchAll(GUARANTEE_RE)) add('R3_GUARANTEE', `合格を保証・断定する表現: "${m[0]}"`);

  // R4
  for (const m of text.matchAll(DRAFT_NOTE_RE)) add('R4_DRAFT_NOTE', `下書き用の注記が残っている: "${m[0]}"`);

  // R5
  const blocks = extractRewriteBlocks(text);
  for (const b of blocks) {
    if (b.declared !== b.actual) add('R5_COUNT_MISMATCH', `「${b.heading}」の表記 ${b.declared} 字に対し実字数 ${b.actual} 字`);
    if (maxChars != null) {
      if (b.actual > maxChars) add('R5_OVER_LIMIT', `「${b.heading}」が ${b.actual} 字（解答欄 ${maxChars} 字を超過）`);
      else if (b.actual < Math.ceil(maxChars * minRatio)) add('R5_TOO_SHORT', `「${b.heading}」が ${b.actual} 字（解答欄の${minRatio * 100}%＝${Math.ceil(maxChars * minRatio)} 字未満）`);
    }
  }

  // R6
  let facts = { inspected: 0, grounded: 0, checked: source != null };
  if (source != null) {
    const have = new Set(factTokens(source).map((t) => `${t.value}|${t.unit}`));
    const seen = new Set();
    for (const t of factTokens(text)) {
      const key = `${t.value}|${t.unit}`;
      if (seen.has(key)) continue;
      seen.add(key);
      facts.inspected++;
      if (have.has(key)) facts.grounded++;
      else add('R6_UNGROUNDED_NUMBER', `提出原稿に無い数値: "${t.raw}"（創作でないか、原稿のどこから来たかを確認）`);
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    stats: { length, rewriteBlocks: blocks.length, blocks, facts, maxChars },
  };
}
