/**
 * generate-civil-1-pack.mjs — 1級土木 IGパックの slide-data.json を生成（追加のみ）
 *
 * 入力: src/config/civil-1-exam-questions.json（packEligible のみ採用）
 * 出力: docs/sns/instagram/_exam-packs/1級土木/{年度}/pack-NN/slide-data.json
 *   構成: cover + 4×(problem+answer) + cta = 10 枚（既存パック互換スキーマ）
 *   _meta.exam='civil-1' を付与 → ig-post-create が試験識別カバーで描画。
 *
 * 既存（総監 _exam-packs/{年度}/）は一切触らない。新パス {試験}/{年度}/ に出力。
 * 使い方: node .claude/scripts/sns/generate-civil-1-pack.mjs --year r06 [--pack 01]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { wrapByCharCount } from './lib/text-wrap.mjs';

const DATA = 'src/config/civil-1-exam-questions.json';
const OUT_BASE = 'docs/sns/instagram/_exam-packs/1級土木';
const EXAM_DIR = '1級土木';

const args = process.argv.slice(2);
const year = (args[args.indexOf('--year') + 1] || 'r06');
const onlyPack = args.includes('--pack') ? args[args.indexOf('--pack') + 1] : null;

const YEAR_LABEL = (() => {
  const m = year.match(/^([hr])(\d+)$/);
  const era = m[1] === 'r' ? '令和' : '平成';
  return `${era}${parseInt(m[2], 10)}年度`;
})();

const d = JSON.parse(readFileSync(DATA, 'utf8'));
const y = d.years.find((y) => y.year === year);
if (!y) { console.error(`年度 ${year} が無い`); process.exit(1); }
const pool = y.questions.filter((q) => q.packEligible);
console.log(`${year}: packEligible ${pool.length} 問 → ${Math.floor(pool.length / 4)} パック`);

function shortTopic(body) {
  const m = body.match(/^(.{4,24}?)に関する/);
  if (m) return m[1];
  return [...body.replace(/\*\*/g, '')].slice(0, 18).join('');
}

function buildPack(questions, packNum) {
  const totalQ = questions.length;
  const slides = [
    { type: 'cover', title: YEAR_LABEL, subtitle: '第一次検定 過去問', sectionTag: '過去問', pageIndex: 1, totalPages: totalQ * 2 + 2 },
  ];
  questions.forEach((q, i) => {
    const qNum = i + 1;
    slides.push({
      type: 'problem',
      bodyLines: wrapByCharCount(q.body.replace(/\*\*/g, ''), 26),
      options: q.options,
      qNum, totalQ,
    });
    // pointText: 正答（=該当肢）の解説を要約として流用
    const ansExpl = q.optionExplanations.find((e) => e.num === q.correct);
    slides.push({
      type: 'answer',
      correctNum: q.correct,
      correctText: shortTopic(q.body),
      optionExplanations: q.optionExplanations,
      pointText: ansExpl ? wrapByCharCount(ansExpl.text, 38).slice(0, 2).join('') : '',
      qNum, totalQ,
    });
  });
  slides.push({ type: 'cta', pageIndex: totalQ * 2 + 2, totalPages: totalQ * 2 + 2 });

  return {
    _meta: {
      exam: 'civil-1',
      examDir: EXAM_DIR,
      year,
      packNum,
      fmtLabel: '第一次検定 過去問',
      management: 'safety', // 描画フォールバック（civil-1 は 5管理なし。accent はcover試験色で識別）
      questionIds: questions.map((q) => q.id),
    },
    slides,
  };
}

let made = 0;
for (let i = 0; i + 4 <= pool.length; i += 4) {
  const packNum = String(i / 4 + 1).padStart(2, '0');
  if (onlyPack && packNum !== String(onlyPack).padStart(2, '0')) continue;
  const pack = buildPack(pool.slice(i, i + 4), packNum);
  const dir = join(OUT_BASE, year, `pack-${packNum}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'slide-data.json'), JSON.stringify(pack, null, 2));
  console.log(`  ok: ${EXAM_DIR}/${year}/pack-${packNum}（${pack.slides.length}枚, Q=${pack._meta.questionIds.join(',')}）`);
  made++;
  if (onlyPack) break;
}
console.log(`生成パック: ${made}`);
