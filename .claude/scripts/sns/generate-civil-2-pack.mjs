/**
 * generate-civil-2-pack.mjs — 2級土木 IGパックの slide-data.json を生成（追加のみ）
 *
 * 入力: src/config/civil-2-exam-questions.json（packEligible のみ採用）
 * 出力: docs/sns/instagram/_exam-packs/2級土木/{年度コード}/pack-NN/slide-data.json
 *   年度コード: r05z(前期) / r05k(後期)。cover は年度=主役・形式に「前期/後期」を明示。
 *   _meta.exam='civil-2' → ig-post-create が試験識別カバー(緑)で描画。
 *
 * 1級(generate-civil-1)と同型。exam/examDir/年度コード(期)のみ差分。
 * 使い方: node .claude/scripts/sns/generate-civil-2-pack.mjs --year r05z [--pack 01]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { wrapByCharCount } from './lib/text-wrap.mjs';

const DATA = 'src/config/civil-2-exam-questions.json';
const OUT_BASE = 'docs/sns/instagram/_exam-packs/2級土木';
const EXAM_DIR = '2級土木';

const args = process.argv.slice(2);
const year = (args[args.indexOf('--year') + 1] || 'r05z');
const onlyPack = args.includes('--pack') ? args[args.indexOf('--pack') + 1] : null;

// 年度コード r05z / r05k → 年度ラベル + 期
const ym = year.match(/^([hr])(\d+)([zk])$/);
if (!ym) { console.error(`年度コード ${year} は <r|h><NN><z|k>（例 r05z）`); process.exit(1); }
const YEAR_LABEL = `${ym[1] === 'r' ? '令和' : '平成'}${parseInt(ym[2], 10)}年度`;
const TERM_LABEL = ym[3] === 'z' ? '前期' : '後期';
const FMT_LABEL = `第一次検定 ${TERM_LABEL}`;

const d = JSON.parse(readFileSync(DATA, 'utf8'));
const y = d.years.find((y) => y.year === year);
if (!y) { console.error(`年度 ${year} が無い`); process.exit(1); }
const pool = y.questions.filter((q) => q.packEligible);
console.log(`${year}(${YEAR_LABEL}${TERM_LABEL}): packEligible ${pool.length} 問 → ${Math.floor(pool.length / 4)} パック`);

function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
}
function clean(s) { return decodeEntities(s).replace(/\*\*/g, ''); }

function shortTopic(body) {
  const b = clean(body);
  const m = b.match(/^(.{4,24}?)に関する/);
  if (m) return m[1];
  return [...b].slice(0, 18).join('');
}

function buildPack(questions, packNum) {
  const totalQ = questions.length;
  const slides = [
    { type: 'cover', title: YEAR_LABEL, subtitle: FMT_LABEL, sectionTag: '過去問', pageIndex: 1, totalPages: totalQ * 2 + 2 },
  ];
  questions.forEach((q, i) => {
    const qNum = i + 1;
    slides.push({
      type: 'problem',
      bodyLines: wrapByCharCount(clean(q.body), 26),
      options: q.options.map((o) => ({ ...o, text: clean(o.text) })),
      qNum, totalQ,
    });
    const ansExpl = q.optionExplanations.find((e) => e.num === q.correct);
    slides.push({
      type: 'answer',
      correctNum: q.correct,
      correctText: shortTopic(q.body),
      optionExplanations: q.optionExplanations.map((e) => ({ ...e, text: clean(e.text) })),
      pointText: ansExpl ? wrapByCharCount(clean(ansExpl.text), 38).slice(0, 2).join('') : '',
      qNum, totalQ,
    });
  });
  slides.push({ type: 'cta', pageIndex: totalQ * 2 + 2, totalPages: totalQ * 2 + 2 });

  return {
    _meta: {
      exam: 'civil-2',
      examDir: EXAM_DIR,
      year,
      packNum,
      fmtLabel: FMT_LABEL,
      management: 'safety',
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
  console.log(`  ok: ${EXAM_DIR}/${year}/pack-${packNum}（${pack.slides.length}枚）`);
  made++;
  if (onlyPack) break;
}
console.log(`生成パック: ${made}`);
