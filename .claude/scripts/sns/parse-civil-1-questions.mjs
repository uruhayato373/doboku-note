/**
 * parse-civil-1-questions.mjs — 1級土木 第一次検定 過去問 MDX → 試験別問題JSON（追加のみ）
 *
 * 入力: .local/r2/posts/civil-construction-1/primary-{年度}-{a|b}/article.mdx
 * 出力: src/config/civil-1-exam-questions.json
 *   { generatedAt, exam:'civil-1', years:[{ year, questions:[
 *       { id, no, part, body, options:[{num,text}], correct, igEligible } ]}] }
 *
 * 総監 exam-questions.json は一切触らない（試験別ファイルで分離＝既存ゼロリスク）。
 * igEligible: 図(img)・組合せ表(|)・数式($)を含まない＝テキストのみでIGスライド化可能。
 * 設計: docs/project/03_SNS/03_多資格SNS展開設計.md
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const POSTS = '.local/r2/posts/civil-construction-1';
const OUT = 'src/config/civil-1-exam-questions.json';

function stripFrontmatter(c) {
  const m = c.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return m ? c.slice(m[0].length) : c;
}

function parseArticle(dir) {
  // dir 例: primary-r06-a / primary-h26-a
  const m = dir.match(/^primary-([hr]\d{2})(?:-([ab]))?$/);
  if (!m) return null;
  const year = m[1];
  const part = (m[2] || 'a').toUpperCase();
  const raw = readFileSync(join(POSTS, dir, 'article.mdx'), 'utf8');
  const body = stripFrontmatter(raw);
  const blocks = body.split(/^## 問題 No\./m).slice(1);
  const out = [];
  for (const b of blocks) {
    const noM = b.match(/^\s*(\d+)/);
    if (!noM) continue;
    const no = parseInt(noM[1], 10);
    // details 前（＝設問本体＋選択肢）
    const beforeDetails = b.split(/<details>/)[0];
    const igEligible = !/<img/.test(beforeDetails) && !/^\s*\|/m.test(beforeDetails) && !/\$/.test(beforeDetails);
    // 選択肢 (1)〜(4) または （1）〜（4）
    const choiceRe = /^[（(]\s*([1-4])\s*[)）]\s*([\s\S]*?)(?=^[（(]\s*[1-4]\s*[)）]|<details>|$)/gm;
    const options = [];
    let cm;
    while ((cm = choiceRe.exec(beforeDetails)) !== null) {
      options.push({ num: parseInt(cm[1], 10), text: cm[2].trim().replace(/\s+/g, ' ') });
    }
    // 現行書式: 行頭「1. 」〜「4. 」の番号リスト（2026-06 の過去問品質サイクルで
    // （1）括弧書式から全記事移行済み。旧 regex のみだと全問 options 空になり、
    // 再実行で既存 JSON の選択肢が全滅する事故になる）
    if (options.length === 0) {
      const listRe = /^([1-4])[.．]\s+([\s\S]*?)(?=^[1-4][.．]\s+|<details>|$)/gm;
      while ((cm = listRe.exec(beforeDetails)) !== null) {
        options.push({ num: parseInt(cm[1], 10), text: cm[2].trim().replace(/\s+/g, ' ') });
      }
    }
    // 設問文＝最初の選択肢より前（No 行を除く）。両書式対応
    let firstChoiceIdx = beforeDetails.search(/^[（(]\s*1\s*[)）]/m);
    if (firstChoiceIdx < 0) firstChoiceIdx = beforeDetails.search(/^1[.．]\s+/m);
    let stem = (firstChoiceIdx >= 0 ? beforeDetails.slice(0, firstChoiceIdx) : beforeDetails)
      .replace(/^\s*\d+\s*/, '').trim();
    // 正答
    const corrM = b.match(/\*\*正答[：:]\s*([1-4])\*\*/);
    const correct = corrM ? parseInt(corrM[1], 10) : null;
    // 解説（details 内の `N. 〜 ✅/❌` を選択肢別に抽出）
    const detailsM = b.match(/<details>([\s\S]*?)<\/details>/);
    const optionExplanations = [];
    if (detailsM) {
      const dlines = detailsM[1].split(/\r?\n/);
      let cur = null;
      for (const ln of dlines) {
        const hm = ln.match(/^\s*([1-4])[.．]\s+(.*)$/);
        if (hm) {
          if (cur) optionExplanations.push(cur);
          cur = { num: parseInt(hm[1], 10), text: hm[2] };
        } else if (cur && ln.trim() && !/^\*\*正答/.test(ln)) {
          cur.text += ' ' + ln.trim();
        }
      }
      if (cur) optionExplanations.push(cur);
      for (const oe of optionExplanations) {
        oe.correct = /❌/.test(oe.text) ? false : (/✅/.test(oe.text) ? true : null);
        oe.text = oe.text.replace(/[✅❌]/g, '').replace(/\s+/g, ' ').trim();
      }
    }
    const correctText = (correct && options[correct - 1]) ? options[correct - 1].text : null;
    // packEligible: IGスライド化に必要な要素が完全に揃った問題のみ（テキストのみ＋選択肢4＋解説4＋正答）
    const packEligible = igEligible && options.length === 4 && optionExplanations.length === 4 && correct != null;
    out.push({ id: `${year}-${part.toLowerCase()}-${String(no).padStart(2, '0')}`, no, part, body: stem, options, correct, correctText, optionExplanations, igEligible, packEligible });
  }
  return { year, part, questions: out };
}

const dirs = readdirSync(POSTS).filter((d) => /^primary-[hr]\d{2}(-[ab])?$/.test(d)).sort();
const byYear = {};
for (const d of dirs) {
  const r = parseArticle(d);
  if (!r) continue;
  (byYear[r.year] ||= []).push(...r.questions);
}
const years = Object.keys(byYear).sort().map((year) => ({ year, questions: byYear[year].sort((a, b) => a.part.localeCompare(b.part) || a.no - b.no) }));
const result = { generatedAt: new Date().toISOString().slice(0, 19) + 'Z', exam: 'civil-1', years };
writeFileSync(OUT, JSON.stringify(result, null, 2));

// サマリ
const tot = years.reduce((s, y) => s + y.questions.length, 0);
const ige = years.reduce((s, y) => s + y.questions.filter((q) => q.igEligible).length, 0);
const noCorrect = years.reduce((s, y) => s + y.questions.filter((q) => q.correct == null).length, 0);
const badOpts = years.reduce((s, y) => s + y.questions.filter((q) => q.igEligible && q.options.length !== 4).length, 0);
const badExpl = years.reduce((s, y) => s + y.questions.filter((q) => q.igEligible && q.optionExplanations.length !== 4).length, 0);
console.log(`年度: ${years.map((y) => `${y.year}(${y.questions.length})`).join(' ')}`);
const packOk = years.reduce((s, y) => s + y.questions.filter((q) => q.packEligible).length, 0);
console.log(`総問題: ${tot} / igEligible(テキストのみ): ${ige} / 正答抽出失敗: ${noCorrect} / IG対象で選択肢数≠4: ${badOpts} / IG対象で解説数≠4: ${badExpl}`);
console.log(`packEligible(完全クリーン＝パック生成対象): ${packOk}（≒ ${Math.floor(packOk / 4)} パック分）`);
console.log(`出力: ${OUT}`);
