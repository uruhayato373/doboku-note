#!/usr/bin/env node

// 技術士第一次試験 H25-H30 の公開前ラチェット。
// OCR由来の「意味を保つつもりの言い換え」で誤答肢が正しい文へ変わった事故と、
// 正答番号だけを根拠にした循環解説を機械的に再発防止する。

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const YEARS = ['h25', 'h26', 'h27', 'h28', 'h29', 'h30'];
const SUBJECTS = {
  basic: 30,
  aptitude: 15,
  construction: 35,
};
const FORBIDDEN = [
  /記述の定義・数値・適用条件のいずれかが設問条件と一致しない/,
  /記述又は計算結果が設問条件に合致するため/,
  /用語の定義、構造・地盤・水理上の関係又は関係基準と照合すると/,
  /正答肢[1-5]の成立条件/,
  /の定義と適用条件を正確に区別して設問の正誤を判断する/,
  /計算値と異なるため誤り/,
  /計算値と一致せず誤り/,
  /成立する定義・数値・条件/,
  /用語・数値・条件とは一致しない/,
  /で問われる定義・数値・適用条件/,
  /適切な記述を選ぶ設問極性/,
  /不適切な記述を選ぶ設問極性/,
  /については「/,
  /定義、式又は与条件を順に照合すると/,
  /本文の数値・固有語を原典どおりに照合する/,
  /本文の数値を条件式に代入すると/,
  /正しい語句・数値・条件/,
  /正答判断の核/,
  /比較して区別する記述/,
  /この肢は「[^」]+」としている点が異なる/,
  /正しい内容は選択肢に記された/,
  /直前の式・定義に反するため誤り/,
  /記載された定義・数値関係が成立するため正しい/,
  /このうち「/,
  /…」は/,
  /判定結果は[^。\n]*一致しない/,
  /値又は組合せが異なる/,
  /得られる値・式・順序を表していない/,
  /この手順で確定するのは/,
  /(?:説明は(?:、)?(?:概ね)?適切|説明として適切|一般論は適切)(?!でない)/,
  /を指す定義であり正しい/,
  /^\s*"導出結果は「[^"]+」",?$/m,
  /欠陥によ他人/,
  /という性質・条件が成り立つため正しい/,
  /(?:に|で)について/,
  /というという/,
  /「[アイウエオ][）)]|[(（][アイウエオ]」/,
];
const OCR_BREAKAGE = /炊に|派の|関わの|1人の定義|ア1ウ|ウ玉|行為者の縮に|「「倫理|浴道|通常子見|(?<!元)来自由|追発|日指|要素作p|u_&#123;|1\.5L°C|✕線|連携は・もちろん|以下、安法|指標生物といい。例えば|A13\+|Cuz\+|CoHi20g|CaClz|O°C|1\.013✕105|3\.0x1023|エネルギ一|過流|正しいものはO|と言じるに足りる|aアミノ酸|水の記述のうち/;
const BROKEN_MATH = /\$[^$\n]*(?:√|′|，)[^$\n]*\$|^\s*[1-5]\.\s+\^\{|。\\(?:end|delta|sigma|begin|phi|sqrt)\b|\$(?:delta|omega|sigma|mathrm)\b|\b(?:Pell|arepsilon)\b|(?<!\\)sqrt\{|\tomathrm/m;
const CONTROL_CHAR = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;
const errors = [];

function examPointSimilarity(first, second) {
  const normalize = (value) => value
    .replace(/^(?:正答肢\dの根拠|別の誤答肢\dの修正|誤答肢\dの修正|関連知識（肢\d）)：/, '')
    .replace(/[、。・「」（）()\s]/g, '');
  const trigrams = (value) => {
    const normalized = normalize(value);
    const result = new Set();
    for (let index = 0; index < normalized.length - 2; index += 1) {
      result.add(normalized.slice(index, index + 3));
    }
    return result;
  };
  const left = trigrams(first);
  const right = trigrams(second);
  const intersection = [...left].filter((value) => right.has(value)).length;
  return intersection / Math.max(1, Math.min(left.size, right.size));
}

function latexOutsideMath(line) {
  let inMath = false;
  let outside = '';
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const escaped = index > 0 && line[index - 1] === '\\';
    if (char === '$' && !escaped) {
      inMath = !inMath;
    } else if (!inMath) {
      outside += char;
    }
  }
  return /\\(?:begin|end)\{(?:bmatrix|matrix|array)\}|\\(?:delta|sigma|phi|sqrt)(?:[_^{\s])/.test(outside);
}

for (const year of YEARS) {
  for (const [subject, expected] of Object.entries(SUBJECTS)) {
    const id = `${year}-${subject}`;
    const file = resolve(ROOT, 'content/site/pe-first-stage', id, 'article.mdx');
    const audit = resolve(ROOT, '.claude/state/pe-first-stage-audit', `${id}.json`);
    if (!existsSync(file)) {
      errors.push(`${id}: article.mdx がない`);
      continue;
    }
    const text = readFileSync(file, 'utf8');
    const questions = text.match(/^##\s+(?:Ⅰ|Ⅱ|Ⅲ)-/gm)?.length ?? 0;
    const answers = text.match(/^\*\*正答：/gm)?.length ?? 0;
    const details = text.match(/^<details>$/gm)?.length ?? 0;
    const points = text.match(/^<ExamPoint$/gm)?.length ?? 0;
    for (const [label, actual] of Object.entries({ questions, answers, details, points })) {
      if (actual !== expected) errors.push(`${id}: ${label}=${actual}（期待${expected}）`);
    }
    for (const pattern of FORBIDDEN) {
      if (pattern.test(text)) errors.push(`${id}: 循環・汎用解説が残存 ${pattern}`);
    }
    const repeatedOptions = text.split(/^##\s+/m).slice(1).flatMap((block) => {
      const question = block.split('\n')[0];
      const parts = block.split('<details>');
      if (parts.length < 2) return [];
      const options = new Map(
        [...parts[0].matchAll(/^([1-5])\.\s+(.+)$/gm)].map((match) => [match[1], match[2].trim()]),
      );
      return [...parts[1].matchAll(/^([1-5])\.\s+(.+?)\s+[✅❌]$/gm)]
        .filter((match) => options.get(match[1]) === match[2].trim())
        .map((match) => `${question}肢${match[1]}`);
    });
    if (repeatedOptions.length) {
      errors.push(`${id}: 選択肢本文の再掲だけで解説がない ${repeatedOptions.join(' / ')}`);
    }
    const truncatedSummaries = [...text.matchAll(/^\s*summary="([^"]*)"/gm)]
      .filter((match) => /(?:は|を|に|で|と|から|ので|ため|なら|すると|して|及び)$/.test(match[1]))
      .map((match) => match[1]);
    if (truncatedSummaries.length) {
      errors.push(`${id}: 途中で切れたExamPoint summary ${truncatedSummaries.join(' / ')}`);
    }
    const duplicatePoints = [...text.matchAll(/<ExamPoint\s+summary="([^"]+)"\s+items=\{\[\s*"([^"]*)",\s*"([^"]*)",\s*\]\}\s*\/>/g)]
      .filter((match) => {
        const normalize = (value) => value.replace(/^(?:原則|誤りの訂正)：/, '').trim();
        const [summary, first, second] = match.slice(1).map(normalize);
        return first === summary || second === summary || first === second;
      })
      .map((match) => match[1]);
    if (duplicatePoints.length) {
      errors.push(`${id}: ExamPointの2項目がsummaryの重複 ${duplicatePoints.join(' / ')}`);
    }
    const semanticallyDuplicatedPoints = [...text.matchAll(/<ExamPoint\s+summary="([^"]+)"\s+items=\{\[\s*"([^"]*)",\s*"([^"]*)",\s*\]\}\s*\/>/g)]
      .filter((match) => examPointSimilarity(match[2], match[3]) > 0.8)
      .map((match) => match[1]);
    if (semanticallyDuplicatedPoints.length) {
      errors.push(`${id}: ExamPointの2項目が意味重複 ${semanticallyDuplicatedPoints.join(' / ')}`);
    }
    if (OCR_BREAKAGE.test(text)) errors.push(`${id}: 既知のOCR破損語が残存`);
    const oddDollarLines = text.split(/\r?\n/).flatMap((line, index) => {
      const count = line.match(/(?<!\\)\$/g)?.length ?? 0;
      return count % 2 ? [index + 1] : [];
    });
    if (oddDollarLines.length) errors.push(`${id}: 未閉鎖の数式 $ がある行 ${oddDollarLines.join(',')}`);
    if (BROKEN_MATH.test(text)) errors.push(`${id}: KaTeX非互換または数式断片が残存`);
    if (CONTROL_CHAR.test(text)) errors.push(`${id}: 制御文字を含む数式断片が残存`);
    const outsideMathLines = text.split(/\r?\n/).flatMap((line, index) => latexOutsideMath(line) ? [index + 1] : []);
    if (outsideMathLines.length) errors.push(`${id}: 数式外にLaTeX断片がある行 ${outsideMathLines.join(',')}`);
    if (!existsSync(audit)) {
      errors.push(`${id}: audit JSON がない`);
    } else {
      const record = JSON.parse(readFileSync(audit, 'utf8'));
      for (const key of ['answer_check', 'visual_check', 'structure_check']) {
        if (record[key]?.status !== 'pass') errors.push(`${id}: ${key} がpassでない`);
      }
      if (record.answer_check?.verified_count !== expected) {
        errors.push(`${id}: answer verified=${record.answer_check?.verified_count}（期待${expected}）`);
      }
      if (record.visual_check?.checked_count !== expected) {
        errors.push(`${id}: visual checked=${record.visual_check?.checked_count}（期待${expected}）`);
      }
    }
  }
}

// 実際に起きた意味反転を、設問単位の固定回帰として保持する。
const h25Construction = readFileSync(
  resolve(ROOT, 'content/site/pe-first-stage/h25-construction/article.mdx'),
  'utf8',
);
for (const phrase of ['粗粒土のコンシステンシー限界', '乾燥密度という', '塑性図によって', '状態を飽和という']) {
  if (!h25Construction.includes(phrase)) errors.push(`h25-construction Ⅲ-1: 原典句がない「${phrase}」`);
}

const h29Aptitude = readFileSync(
  resolve(ROOT, 'content/site/pe-first-stage/h29-aptitude/article.mdx'),
  'utf8',
);
if (!h29Aptitude.includes('正誤の組合せはア×・イ×・ウ○・エ○・オ○')) {
  errors.push('h29-aptitude Ⅱ-5: 原典どおりの正誤組合せが解説にない');
}

const h30Basic = readFileSync(
  resolve(ROOT, 'content/site/pe-first-stage/h30-basic/article.mdx'),
  'utf8',
);
for (const phrase of ['0.950²［1−（1−X）²］=X³', 'X³≈0.901']) {
  if (!h30Basic.includes(phrase)) errors.push(`h30-basic Ⅰ-1-1: 導出結果がない「${phrase}」`);
}

const h30Aptitude = readFileSync(
  resolve(ROOT, 'content/site/pe-first-stage/h30-aptitude/article.mdx'),
  'utf8',
);
for (const phrase of ['## Ⅱ-14', '**正答：なし（全員正解扱い）**', '公式は選択肢不備と判断し、問題全体を全員正解とした']) {
  if (!h30Aptitude.includes(phrase)) errors.push(`h30-aptitude Ⅱ-14: 公式訂正の反映がない「${phrase}」`);
}

const h30Construction = readFileSync(
  resolve(ROOT, 'content/site/pe-first-stage/h30-construction/article.mdx'),
  'utf8',
);
if (/## Ⅲ-9[\s\S]*?作用影響を考慮するのは適切[\s\S]*?## Ⅲ-10/.test(h30Construction)) {
  errors.push('h30-construction Ⅲ-9: 衝撃を考慮しない条件と逆の解説が残存');
}
if (/## Ⅲ-35[\s\S]*?平成29年度/.test(h30Construction)) {
  errors.push('h30-construction Ⅲ-35: 平成28年度調査の解説に平成29年度が残存');
}
if (/防火地域と準防火地域[^\n]*耐水性能/.test(h30Construction)) {
  errors.push('h30-construction Ⅲ-13: 原典の「耐火性能」が「耐水性能」へ変わっている');
}

if (errors.length) {
  console.error(`[check-pe-first-stage-historical] FAIL ${errors.length}件`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('[check-pe-first-stage-historical] PASS 18ページ / 480問（原典監査・構造・汎用解説ラチェット）');
