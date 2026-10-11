/**
 * answer-marks.mjs — 過去問 MDX の「正答 ⇔ 解説の ✅/❌」の整合判定（DN-0665）。
 *
 * ✅/❌ は「その記述が正しい（適当）か」の印。サイトの演習（/tools/kakomon-quiz）は ✅ を「○ 適当」、❌ を「× 適当でない」
 * と表示し、iOS アプリも同じ演習データを読む。問い方が否定（適当でない・誤っている・不適切）なら正答の選択肢だけ ❌、
 * 肯定（適当な・正しい・適切な）なら正答だけ ✅ になる（2026-10-11 の全件集計で否定 2,893:49・肯定 1,581:4 がこの向き）。
 *
 * 1 問の判定:
 *   1. 正答行（`**正答：N**`・`**正解: (N)**`・複数正答）から正答の番号を取る。記述式（解答例を参照）と全員得点
 *      （出題不備）は番号が無いので数えるだけ。
 *   2. 解説の番号付きの行（`N. …✅` か `(N) …✅`）から ✅ と ❌ の番号を取る。番号付きの行に印が無い問題は数えるだけ。
 *   3. 正答の番号の集合が ✅ の集合か ❌ の集合のどちらかと一致しなければ不整合。
 *   4. 問いの文の向きが読めたときは向きまで照合する（否定なのに正答が ✅、肯定なのに正答が ❌ は印が全部逆）。
 *      「該当しない」「許可を必要としない」「改善の必要がない」のような語は、否定が選ぶ向きなのか中身なのかが
 *      文から決まらず、既存記事でも ✅ と ❌ が半々なので向きを照合しない（集合の一致だけ見る）。
 *   5. ①〜④・ア〜エの記述を数える／組み合わせる問題で、記述ごとの解説に選択肢と同じ `1.` を振っていれば不整合
 *      （演習データは `N.` の行を選択肢 N の解説として読むので、記述①の解説が選択肢 1 に付く）。
 *   6. 1 行の解説が「…正しい。 ❌」「…誤り ✅」のように、行末の判定の語と印で食い違えば不整合。
 */

const ANSWER_LINE = /\*\*正[答解]\s*[：:]\s*([^*\n]+)\*\*/;
const DIGITS = /[0-9０-９]+/g;
// 選ぶ向きが否定（正答が ❌）になる語。「該当しない」等は向きが文から決まらないので入れない（上の 4.）
const WRONG = /(不適|適当でない|適切でない|妥当でない|誤(?!差)|正しくない)/u;
const RIGHT = /(適当|適切|正しい|妥当)/u;
const NEGATION = /(ない|不|誤(?!差))/u;
const COUNT = /(いくつ|の数)/u;
const COMBINATION = /組合せ/u;
// 問いの文で、選ぶ対象を述べる部分（「…適当でないものはどれか」の「適当でない」）
const POLARITY_PHRASE = /([^、，,。\s]{1,24}?)(?:もの|語句|記述|数値)(?:の組合せ|の数)?(?:として)?[、，,]?\s*(?:は|を)?[、，,]?\s*(?:次の|下記の|以下の)?(?:うち)?[、，,]?\s*(?:どれか|いくつか|選べ)/u;
// 記述の見出し（①〜⑤・ア〜オ・(イ)〜(ホ)）
const STATEMENT_LABEL = /^(?:[①②③④⑤⑥⑦⑧]|[ア-オ][\s　．.）)]|[（(][イロハニホ][）)])/mu;
// 解説の行末の判定の語（行の最後の判定だけを見る。「…は誤り（…点は正しい）」のように両方ある行は判定しない）
// 解説の行が記述の見出しか数に触れているか（触れていれば選択肢の組合せ・数の解説として読める）
const LABEL_MENTION = /[①②③④⑤⑥⑦⑧]|(?<![ァ-ヶー])[ア-オイロハニホ](?![ァ-ヶー])|[0-9０-９]\s*つ/u;
const VERDICT_WRONG = /(誤り|誤っている|不適当|不適切|適当でない|適切でない|正しくない|妥当でない)/gu;
const VERDICT_RIGHT = /(正しい|適当|適切|妥当)/gu;

const toAscii = (s) => s.replace(/[０-９]/g, (d) => String('０１２３４５６７８９'.indexOf(d)));
// 記述の見出しを数値文字参照（&#x2460; = ①）で書いた記事もあるので、判定の前に戻す
const decodeEntities = (s) => s.replace(/&#x([0-9a-f]+);/giu, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/gu, (_, d) => String.fromCodePoint(Number(d)));

/** 正答行の中身を分類する。番号があれば numbers、記述式・参照は essay、全員得点は void */
export function parseAnswerLine(text) {
  const t = String(text ?? '').trim();
  if (/参照/u.test(t)) return { kind: 'essay', numbers: [] };
  if (/(全員|得点|正解扱い|なし)/u.test(t) && !/又は|または/u.test(t)) return { kind: 'void', numbers: [] };
  const numbers = [...new Set((t.match(DIGITS) ?? []).map((d) => Number(toAscii(d))))].filter((n) => n >= 1 && n <= 9);
  return numbers.length ? { kind: 'numbers', numbers } : { kind: 'unknown', numbers: [] };
}

/** 問いの文（最後の「どれか」「選べ」の文） */
function questionSentence(stem) {
  // 太字の記号だけ落とす（タグの行は問いの文を含まないので、行ごとに分けて「どれか」の文を探せば足りる）
  const plain = String(stem ?? '').replace(/\*\*|__/g, '');
  const sentences = plain.split(/(?<=[。？?])|\n/u).map((s) => s.trim()).filter((s) => s && !s.startsWith('<'));
  return [...sentences].reverse().find((s) => /(どれか|いくつか|選べ)/u.test(s)) ?? null;
}

/** 問いの文から向きを読む。'neg'（正答が ❌）・'pos'（正答が ✅）・'count'（数を問う）・null（向きを照合しない） */
export function stemPolarity(stem) {
  const question = questionSentence(stem);
  if (!question) return null;
  if (COUNT.test(question)) return 'count';
  const phrase = question.match(POLARITY_PHRASE)?.[1];
  if (!phrase) return null;
  if (WRONG.test(phrase)) return 'neg';
  if (RIGHT.test(phrase) && !NEGATION.test(phrase.replace(RIGHT, ''))) return 'pos';
  return null;
}

/** 解説の 1 行の判定の語。'right'・'wrong'・null（無い・両方ある・行末に無い） */
export function lineVerdict(text) {
  // 「誤りはない」「取り違えがない」「不適切ではない」は正しいの意味
  const t = String(text ?? '').replace(/\*\*/g, '').replace(/[✅❌]/gu, '').trim()
    .replace(/(?:誤り|取り違え|不備)(?:は|が|も)?(?:ない|無い|なく)|誤っていない|(?:不適切|不適当)(?:では|で)?ない/gu, '正しい');
  const masked = t.replace(VERDICT_WRONG, (m) => '＿'.repeat(m.length));
  const hasWrong = masked !== t;
  const hasRight = new RegExp(VERDICT_RIGHT.source, 'u').test(masked);
  if (hasWrong === hasRight) return null;
  const tail = (hasWrong ? t : masked).slice(-16);
  if (hasWrong && new RegExp(VERDICT_WRONG.source, 'u').test(tail)) return 'wrong';
  // 「「3 cm以下」が正しい」「…点は正しい」は直した値・一部の評価で、選択肢の記述の判定ではない
  if (hasRight && new RegExp(`(?<!が|点は|点で|方が)${VERDICT_RIGHT.source}(?:な?記述)?(?:である|です)?[。．]?[)）]?$`, 'u').test(tail)) return 'right';
  return null;
}

/** 解説（正答行から ExamPoint の手前まで）の番号付きの行 */
function readMarkedLines(explanation) {
  const lines = [];
  for (const m of explanation.matchAll(/^(?:([0-9])[.．]|\(([0-9])\)|（([0-9])）)\s(.*)$/gmu)) {
    const text = m[4];
    const hasOk = text.includes('✅');
    const hasNg = text.includes('❌');
    lines.push({ num: Number(m[1] ?? m[2] ?? m[3]), text, mark: hasOk && !hasNg ? 'ok' : hasNg && !hasOk ? 'ng' : null });
  }
  return lines;
}

const sameSet = (set, nums) => set.size === nums.length && nums.every((n) => set.has(n));
const list = (s) => [...s].sort((x, y) => x - y).join(',') || 'なし';

/**
 * 記事 1 本を判定する。
 * @returns {{ questions: number, checked: number, essay: number, void: number, unmarked: number, directionChecked: number, linesChecked: number, issues: string[] }}
 */
export function checkArticleMarks(raw) {
  const result = { questions: 0, checked: 0, essay: 0, void: 0, unmarked: 0, directionChecked: 0, linesChecked: 0, issues: [] };
  for (const section of decodeEntities(String(raw)).split(/\n(?=## )/)) {
    const head = section.match(/^## (.+)/)?.[1]?.trim();
    if (!head) continue;
    const detailsAt = section.indexOf('<details>');
    if (detailsAt < 0) continue;
    const answerMatch = section.slice(detailsAt).match(ANSWER_LINE);
    if (!answerMatch) continue;
    result.questions++;
    const answer = parseAnswerLine(answerMatch[1]);
    if (answer.kind === 'essay') { result.essay++; continue; }
    if (answer.kind === 'void') { result.void++; continue; }
    if (answer.kind === 'unknown') { result.issues.push(`${head}: 正答行から番号が読めない（${answerMatch[1].trim()}）`); continue; }

    const stem = section.slice(head.length + 3, detailsAt);
    const afterAnswer = section.slice(detailsAt).split(answerMatch[0])[1] ?? '';
    const explanation = afterAnswer.split(/<ExamPoint\b/)[0].split(/<\/details>/)[0];
    const examPoint = afterAnswer.slice(explanation.length).split(/<\/details>/)[0];
    if (/[✅❌]/u.test(examPoint)) result.issues.push(`${head}: ExamPoint 内に ✅/❌ がある`);

    const lines = readMarkedLines(explanation);
    for (const line of lines) {
      if (!line.mark) continue;
      const verdict = lineVerdict(line.text);
      if (!verdict) continue;
      result.linesChecked++;
      if ((verdict === 'right' && line.mark === 'ng') || (verdict === 'wrong' && line.mark === 'ok')) {
        result.issues.push(`${head}: 解説 ${line.num} の文は「${verdict === 'right' ? '正しい・適当' : '誤り・不適当'}」なのに ${line.mark === 'ok' ? '✅' : '❌'}`);
      }
    }
    const ok = new Set(lines.filter((l) => l.mark === 'ok').map((l) => l.num));
    const ng = new Set(lines.filter((l) => l.mark === 'ng').map((l) => l.num));
    if (ok.size === 0 && ng.size === 0) { result.unmarked++; continue; }
    result.checked++;

    const question = questionSentence(stem) ?? '';
    const marked = lines.filter((l) => l.mark);
    const restatesStatements = marked.filter((l) => !LABEL_MENTION.test(l.text.replace(/[✅❌]/gu, ''))).length * 2 > marked.length;
    if (STATEMENT_LABEL.test(stem) && (COUNT.test(question) || COMBINATION.test(question)) && !STATEMENT_LABEL.test(explanation) && restatesStatements) {
      result.issues.push(`${head}: 記述（①〜・ア〜）を数える／組み合わせる問題なのに、記述ごとの解説を選択肢と同じ番号（1. 2. …）で書いている`);
      continue;
    }
    const nums = answer.numbers;
    const okMatches = sameSet(ok, nums);
    const ngMatches = sameSet(ng, nums);
    if (!okMatches && !ngMatches) {
      result.issues.push(`${head}: 正答 ${nums.join('・')} が ✅[${list(ok)}] にも ❌[${list(ng)}] にも一致しない`);
      continue;
    }
    const polarity = stemPolarity(stem);
    if (polarity === 'neg' || polarity === 'pos') {
      result.directionChecked++;
      if (polarity === 'neg' && !ngMatches) result.issues.push(`${head}: 問い方は否定（適当でない等）なのに正答 ${nums.join('・')} が ✅（印が逆）`);
      if (polarity === 'pos' && !okMatches) result.issues.push(`${head}: 問い方は肯定（適当な等）なのに正答 ${nums.join('・')} が ❌（印が逆）`);
    }
  }
  return result;
}
