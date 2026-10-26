/**
 * parse-civil-2-questions.mjs — 2級土木 第一次検定 過去問 MDX → 試験別問題JSON（全年度を記事から作り直す・中身が変わったときだけ書く・refresh-indexes の build-exam-question-data）
 *
 * 入力: content/site/civil-construction-2/primary-{年度}-{zenki|kouki}/article.mdx（平成27年度までの年1回の学科試験は primary-{年度}/article.mdx）
 * 出力: src/config/civil-2-exam-questions.json
 *   { generatedAt, exam:'civil-2', years:[{ year, term, questions:[
 *       { id, no, body, options:[{num,text}], correct, optionExplanations, igEligible, packEligible } ]}] }
 *
 * 2級は年2回（前期 zenki / 後期 kouki）＝別試験。年度コードに期を付与（例 r05z / r05k）
 * して前期後期を分離（案1）。z=前期, k=後期。前期が始まる前（平成27年度まで）の年1回の学科試験は期を付けない（例 h26）。
 * 1級(parse-civil-1)と MDX 構造は同一。POSTS と dir 正規表現・年度コードのみ差分。
 * 設計: docs/marketing/03_多資格SNS展開設計.md
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { writeGeneratedJson } from '../../../scripts/lib/generated-json.mjs';
import { join, relative } from 'node:path';
import { extractStatementExplanations } from '../../../scripts/lib/statement-explanations.mjs';
import { REPO_ROOT, SITE_CONTENT_ROOT } from '../../../scripts/lib/repository-paths.mjs';
import { isUnpublishedMdx } from '../../../scripts/lib/mdx-published.mjs';

const POSTS = join(SITE_CONTENT_ROOT, 'civil-construction-2');
const OUT = join(REPO_ROOT, 'src/config/civil-2-exam-questions.json');

function stripFrontmatter(c) {
  const m = c.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return m ? c.slice(m[0].length) : c;
}

function parseArticle(dir) {
  // dir 例: primary-r05-zenki / primary-r07-kouki / primary-h26（年1回の学科試験）
  const m = dir.match(/^primary-([hr]\d{2})(?:-(zenki|kouki))?$/);
  if (!m) return null;
  const baseYear = m[1];
  const term = m[2] ?? null;               // zenki | kouki | null（年1回）
  const year = term ? `${baseYear}${term === 'zenki' ? 'z' : 'k'}` : baseYear; // r05z / r05k / h26
  const raw = readFileSync(join(POSTS, dir, 'article.mdx'), 'utf8').replace(/\r\n/g, '\n');
  // 非公開の下書き（公式正答の無い年度で、運営者の確定前）は演習データへ入れない（DN-0866）
  if (isUnpublishedMdx(raw)) return { year, term, questions: [], skipped: true };
  const body = stripFrontmatter(raw);
  const blocks = body.split(/^## 問題 No\./m).slice(1);
  const out = [];
  for (const b of blocks) {
    const noM = b.match(/^\s*(\d+)/);
    if (!noM) continue;
    const no = parseInt(noM[1], 10);
    const beforeDetails = b.split(/<details>/)[0];
    const igEligible = !/<img/.test(beforeDetails) && !/^\s*\|/m.test(beforeDetails) && !/\$/.test(beforeDetails);
    // 選択肢 (1)〜(4)。後期は太字 **(1)** 形式のため行頭/番号後の ** を許容
    const choiceRe = /^\*{0,2}[（(]\s*([1-4])\s*[)）]\*{0,2}\s*([\s\S]*?)(?=^\*{0,2}[（(]\s*[1-4]\s*[)）]|<details>|$)/gm;
    const options = [];
    let cm;
    while ((cm = choiceRe.exec(beforeDetails)) !== null) {
      options.push({ num: parseInt(cm[1], 10), text: cm[2].trim().replace(/\*\*/g, '').replace(/\s+/g, ' ') });
    }
    // 現行書式: 行頭「1. 」〜「4. 」の番号リスト（前期は 2026-06 品質サイクルで
    // （1）括弧書式から番号リストへ移行済み。civil-1 parser と同じフォールバックを持つ）
    if (options.length === 0) {
      const listRe = /^\*{0,2}([1-4])[.．]\*{0,2}\s+([\s\S]*?)(?=^\*{0,2}[1-4][.．]|<details>|$)/gm;
      while ((cm = listRe.exec(beforeDetails)) !== null) {
        options.push({ num: parseInt(cm[1], 10), text: cm[2].trim().replace(/\*\*/g, '').replace(/\s+/g, ' ') });
      }
    }
    let firstChoiceIdx = beforeDetails.search(/^\*{0,2}[（(]\s*1\s*[)）]/m);
    if (firstChoiceIdx < 0) firstChoiceIdx = beforeDetails.search(/^\*{0,2}1[.．]\s+/m);
    // No 見出し行を丸ごと除去（後期は「3 土木一般」等カテゴリ名が付くため行全体を落とす）
    let stem = (firstChoiceIdx >= 0 ? beforeDetails.slice(0, firstChoiceIdx) : beforeDetails)
      .replace(/^\s*\d+[^\n]*\n+/, '').trim();
    // 正答表記ゆれ対応: 「正答：N」「正解: (N)」両形式
    const corrM = b.match(/\*\*正(?:答|解)[：:]\s*[（(]?\s*([1-4])\s*[)）]?\*\*/);
    // 公式正答が複数の問題（「正解: (3), (4)」）は correct に最初の番号、correctAll に全部を入れる
    const multiM = corrM ? null : b.match(/\*\*正(?:答|解)[：:]\s*((?:[（(]?\s*[1-4]\s*[)）]?\s*[,、・と]\s*)+[（(]?\s*[1-4]\s*[)）]?)\*\*/);
    const correctAll = multiM ? [...multiM[1].matchAll(/[1-4]/g)].map((m) => parseInt(m[0], 10)) : null;
    const correct = corrM ? parseInt(corrM[1], 10) : correctAll ? correctAll[0] : null;
    const detailsM = b.match(/<details>([\s\S]*?)<\/details>/);
    const optionExplanations = [];
    if (detailsM) {
      const dlines = detailsM[1].split(/\r?\n/);
      let cur = null;
      for (const ln of dlines) {
        // 解説番号の表記ゆれ対応: 「N. 解説」「(N) 解説」両形式
        const hm = ln.match(/^\s*(?:[（(]\s*([1-4])\s*[)）]|([1-4])[.．])\s+(.*)$/);
        if (hm) {
          if (cur) optionExplanations.push(cur);
          cur = { num: parseInt(hm[1] || hm[2], 10), text: hm[3] };
        } else if (cur && ln.trim() && !/^\*\*正(?:答|解)/.test(ln)) {
          cur.text += ' ' + ln.trim();
        }
      }
      if (cur) optionExplanations.push(cur);
      for (const oe of optionExplanations) {
        oe.correct = /❌/.test(oe.text) ? false : (/✅/.test(oe.text) ? true : null);
        oe.text = oe.text.replace(/[✅❌]/g, '').replace(/\s+/g, ' ').trim();
      }
    }
    // ①〜・ア〜の記述ごとの解説（無ければ空。選択肢の解説 optionExplanations とは別に持つ）
    const statements = detailsM ? extractStatementExplanations(detailsM[1], beforeDetails) : [];
    const correctText = (correct && options[correct - 1]) ? options[correct - 1].text : null;
    const packEligible = igEligible && options.length === 4 && optionExplanations.length === 4 && correct != null;
    out.push({ id: `${year}-${String(no).padStart(2, '0')}`, no, term, body: stem, options, correct, ...(correctAll ? { correctAll } : {}), correctText, optionExplanations, ...(statements.length ? { statements } : {}), igEligible, packEligible });
  }
  return { year, term, questions: out };
}

const dirs = readdirSync(POSTS).filter((d) => /^primary-[hr]\d{2}(-(zenki|kouki))?$/.test(d)).sort();
const byYear = {};
const termOf = {};
const skipped = [];
for (const d of dirs) {
  const r = parseArticle(d);
  if (!r) continue;
  if (r.skipped) { skipped.push(d); continue; }
  (byYear[r.year] ||= []).push(...r.questions);
  termOf[r.year] = r.term;
}
if (skipped.length) console.log(`非公開の下書きを除外: ${skipped.join(' ')}`);
const years = Object.keys(byYear).sort().map((year) => ({ year, term: termOf[year], questions: byYear[year].sort((a, b) => a.no - b.no) }));
const result = { generatedAt: new Date().toISOString().slice(0, 19) + 'Z', exam: 'civil-2', years };
if (!writeGeneratedJson(OUT, result, { newline: false })) console.log('変更なし（書かない）');

const tot = years.reduce((s, y) => s + y.questions.length, 0);
const packOk = years.reduce((s, y) => s + y.questions.filter((q) => q.packEligible).length, 0);
console.log(`回: ${years.map((y) => `${y.year}(${y.questions.length}/pack:${y.questions.filter((q) => q.packEligible).length})`).join(' ')}`);
console.log(`総問題: ${tot} / packEligible: ${packOk}（≒ ${Math.floor(packOk / 4)} パック分）`);
console.log(`出力: ${relative(REPO_ROOT, OUT).split('\\').join('/')}`);
