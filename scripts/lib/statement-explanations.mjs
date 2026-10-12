/**
 * statement-explanations.mjs — 過去問の解説から「記述ごとの解説」（① …✅・（ア）…❌）を取り出し、表示用の HTML にする（DN-0671）。
 *
 * ①〜④・ア〜エの記述を数える／組み合わせる問題は、解説に記述ごとの理由が書いてある。演習データは `N.` の行だけを
 * 選択肢 N の解説として読むので、記述の解説は別に持たせる。取り出す実装は 1 つだけで、1級・2級土木の抽出
 * （.claude/scripts/sns/parse-civil-{1,2}-questions.mjs）・総監（scripts/parse-exam-questions.mjs）・
 * 技術士第一次（scripts/build-quiz-data.mjs）が同じ関数を呼ぶ。
 *
 * 取り出す形: { label: '①' | 'ア', text: 印を除いた Markdown, correct: true | false | null }
 *   correct は記述が正しい（適当）か。✅ なら true・❌ なら false・印が無ければ文の判定の語（正しい・誤り）から読み、読めなければ null。
 * 記述が 2 つ未満の解説は記述ごとの解説と見なさない（選択肢の文中に記号が出ただけのものを拾わない）。
 */
import { decodeEntities, lineVerdict } from './answer-marks.mjs';
import { renderQuizMarkdown } from './quiz-markdown.mjs';

// 記述の見出し: ①〜⑧、（ア）〜（オ）、（イ）（ロ）（ハ）（ニ）（ホ）、後ろに空白か句点が続くア〜オ
const LABEL_LINE = /^\s*(?:[-*]\s+)?(?:\*\*)?(?:([①②③④⑤⑥⑦⑧])|[（(]\s*([ア-オイロハニホ])\s*[）)]|([ア-オ])(?=[\s　．.、：:]))\s*[．.、：:]?\s*(.*)$/u;
// 選択肢の行（`1.` `(1)` `（1）`）。ここから先は選択肢の解説なので、記述の解説は終わる
const OPTION_LINE = /^\s*(?:\*\*)?(?:[0-9０-９][.．]|[（(]\s*[0-9０-９]\s*[）)])\s/u;
const MARKS = /[✅❌]/gu;
const TRAILING_MARK = /\s*[○×]\s*$/u;
// 1 行に（ア）は…。（イ）は…。と続けて書いた解説は、次の（イ）の手前で記述ごとに分ける（（ア）と（イ）の…のような文中の並びは分けない）
const INLINE_SPLIT = /(?<=[。、])(?=[（(][ア-オイロハニホ][）)](?:は|が|から))/u;
// 分けた最後の記述に付いた、まとめの文（「適切なのは（イ）（エ）の2つである。」）
const TRAILING_SUMMARY = /。(?=(?:適切|適当|不適切|不適当|正しい|誤っ|誤り)[^。]*(?:のは|の数は)[^。]*。?\s*$)/u;

// 問題文の記述の行（①〜・（ア）〜 の後ろに 10 字以上の文が続く）。語句の空欄（「ア：持続可能な発展」を答える形）の問題は問題文に記述の行が無い
const STEM_STATEMENT_LINE = /^\s*(?:[-*]\s+)?(?:[①②③④⑤⑥⑦⑧]|[（(]\s*[ア-オイロハニホ]\s*[）)]|[ア-オ](?=[\s\u3000．.、]))\s*[．.、]?\s*(.{10,})$/gmu;

/** 問題文が「記述を並べて、数える／組み合わせる」形か（記述の行が 2 行以上ある）。語句の空欄を答える問題の解説（ア：…）を記述の解説と取り違えない */
export function hasStatementStem(stem) {
  return [...decodeEntities(String(stem ?? '')).matchAll(STEM_STATEMENT_LINE)].length >= 2;
}

/** 記述 1 つの正誤。✅ なら true・❌ なら false・印が無ければ文の判定の語・読めなければ null */
function statementCorrect(raw) {
  // 行末の ○ ×（技術士第一次の適性科目の解説）も印として読む
  const ok = raw.includes('✅') || /○\s*$/u.test(raw);
  const ng = raw.includes('❌') || /×\s*$/u.test(raw);
  if (ok !== ng) return ok;
  // 「不適切。…」「適切。…」と判定を先頭に言い切る記述
  const lead = /^\s*(不適切|不適当|適切でない|適当でない|誤り|適切|適当|正しい)[。．]/u.exec(raw.replace(MARKS, ''));
  if (lead) return !/^(?:不|誤|.*でない)/u.test(lead[1]);
  const verdict = lineVerdict(raw);
  if (verdict) return verdict === 'right';
  // 「…が適切。」「…は誤り。」のように文末で言い切る記述（lineVerdict は「が適切」を直した値と見て読まない）
  const tail = raw.replace(MARKS, '').replace(/\*\*/g, '').trim().replace(/[。．]$/u, '').slice(-8);
  if (/(?:不適切|不適当|適切でない|適当でない|妥当でない|誤り|誤っている|正しくない)$/u.test(tail)) return false;
  if (/(?:適切|適当|妥当|正しい)$/u.test(tail)) return true;
  return null;
}

/**
 * 解説（<details> の中身）から記述ごとの解説を取り出す。ExamPoint から先と正答の行は読まない。
 * @param {string} detailsInner `<summary>` のあと `</details>` の手前
 * @param {string} [stem] 問題文（選択肢を含んでよい）。渡したときは、問題文が hasStatementStem を満たすか、解説に選択肢の行が無いときだけ取り出す
 * @returns {{ label: string, text: string, correct: boolean | null }[]} 2 つ以上そろったときだけ。無ければ []
 */
export function extractStatementExplanations(detailsInner, stem) {
  const body = decodeEntities(String(detailsInner ?? '')).replace(/\r\n/g, '\n').split(/<ExamPoint\b/)[0];
  // 問題文が記述を並べる形でなく、解説に選択肢の行もあるときは、（ア）：… の行は空欄の答えの列挙なので取り出さない。
  // 選択肢の行が無いときは、この行が唯一の解説なので取り出す
  if (stem !== undefined && !hasStatementStem(stem) && body.split('\n').some((l) => OPTION_LINE.test(l))) return [];
  const out = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const raw = cur.lines.join('\n');
    // 「（ア）は、…」の「は、」は見出しの記号と続けて読む語なので落とす
    const text = raw.replace(MARKS, '').replace(TRAILING_MARK, '').replace(/[ \t]+$/gm, '').replace(/\s+$/u, '').trim().replace(/^は[、，]?/u, '');
    if (text) out.push({ label: cur.label, text, correct: statementCorrect(raw) });
    cur = null;
  };
  const lines = body.split('\n').flatMap((line) => {
    const parts = /^\s*[（(]/u.test(line) ? line.split(INLINE_SPLIT) : [line];
    if (parts.length < 2) return [line];
    const last = parts.length - 1;
    const cut = TRAILING_SUMMARY.exec(parts[last]);
    return cut ? [...parts.slice(0, last), parts[last].slice(0, cut.index + 1)] : parts;
  });
  for (const line of lines) {
    if (/^\s*[①-⑧]\s*[〜～~]/u.test(line)) { flush(); continue; } // 「①〜④のすべてが適当」はまとめの文
    if (/^\s*\*\*正[答解]/u.test(line) || /^\s*<\/?(?:details|summary)/u.test(line)) { flush(); continue; }
    const m = LABEL_LINE.exec(line);
    if (m) {
      flush();
      cur = { label: m[1] ?? m[2] ?? m[3], lines: [m[4]] };
    } else if (OPTION_LINE.test(line) || !line.trim()) {
      flush();
    } else if (cur) {
      cur.lines.push(line.trim());
    }
  }
  flush();
  return out.length >= 2 ? out : [];
}

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// 記号の表示: ①〜⑧はそのまま、ア〜は（ア）
const displayLabel = (label) => (/^[①-⑧]$/u.test(label) ? label : `（${label}）`);

/** 記述ごとの解説に表示用の HTML（本文の Markdown → HTML）を付ける */
export function withStatementHtml(statements) {
  return (statements ?? []).map((s) => ({ ...s, html: renderQuizMarkdown(s.text) }));
}

/**
 * 記述ごとの解説のかたまり（選択肢の解説の前に出す）の HTML。サイトの演習と iOS アプリが同じ文字列を差し込む。
 * 見た目は src/styles/quiz-content.css の .quiz-statements 以下。
 * @param {{ label: string, text: string, html?: string, correct: boolean | null }[]} statements
 */
export function renderStatementsHtml(statements) {
  if (!statements?.length) return '';
  const verdict = (c) => (c === true ? '<span class="quiz-statement-verdict ok">○ 適当</span>' : c === false ? '<span class="quiz-statement-verdict ng">× 適当でない</span>' : '');
  const items = statements.map((s) => {
    const html = s.html ?? renderQuizMarkdown(s.text);
    return `<div class="quiz-statement"><div class="quiz-statement-head"><span class="quiz-statement-label">${escapeHtml(displayLabel(s.label))}</span>${verdict(s.correct)}</div><div class="quiz-statement-body quiz-rich-text">${html}</div></div>`;
  });
  return `<section class="quiz-statements" aria-label="記述ごとの解説"><h4 class="quiz-statements-title">記述ごとの解説</h4>${items.join('')}</section>`;
}
