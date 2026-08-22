/**
 * generate-civil-theme-packs.mjs — 1級/2級土木 IG「論点（頻出問題）パック」の slide-data.json を生成。
 *
 * 年度括り（既存 exam-packs）を廃し、Kindle A系（build-takuitsu-reconstruct.mjs）と同一の
 * 論点分類で「1論点 × 4問（異なる年度から採録）」のパックを作る。競合 @miyabi_labo の
 * 「科目＋論点＋頻出度」括りに揃える。
 *
 * 分類ロジックは build-takuitsu-reconstruct.mjs から import（THEMES / matchesTheme /
 * assignSubtopic / normalizeQuestion / FIGURE_RE / norm）＝Kindle と単一源で一致させる。
 *
 * 対象科目 = 6 管理テーマ（安全/法規/施工計画/環境/品質/工程）。土木一般・専門土木の
 * 技術系論点は THEMES 未定義のため v1 対象外（別途論点設計が必要・件数はレポートに明示）。
 *
 * 出力: content/sns/instagram/civil-{1,2}/theme-packs/{themeKey}-{subtopicKey}/pack-NN/slide-data.json
 *
 * Usage:
 *   node .claude/scripts/sns/generate-civil-theme-packs.mjs --exam civil-1 [--dry-run]
 *   node .claude/scripts/sns/generate-civil-theme-packs.mjs --exam both
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wrapByCharCount } from './lib/text-wrap.mjs';
import {
  THEMES, normalizeQuestion, matchesTheme, assignSubtopic, FIGURE_RE, norm,
} from '../../../scripts/build-takuitsu-reconstruct.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
// テーマ処理順 = Kindle GOUBON.order（テーマ間の重複は先勝ちで解消・precedence を一致させる）
const ORDER = ['sekokeikaku', 'koutei', 'anzen', 'hinshitsu', 'kankyo', 'hoki'];

const EXAMS = {
  'civil-1': { json: 'src/config/civil-1-exam-questions.json', examDir: '1級土木', fmtLabel: '第一次検定 過去問', totalUnits: 12 },
  'civil-2': { json: 'src/config/civil-2-exam-questions.json', examDir: '2級土木', fmtLabel: '第一次検定 過去問', totalUnits: 10 },
};

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
const examArg = arg('exam', 'both');
const exams = examArg === 'both' ? ['civil-1', 'civil-2'] : [examArg];
const dryRun = arg('dry-run') === true;

// --- 表示ヘルパ ---
function yearLabel(year) {
  const m = String(year).match(/^([hr])(\d+)([zk]?)$/);
  if (!m) return year;
  const era = m[1] === 'r' ? '令和' : '平成';
  const term = m[3] === 'z' ? '前期' : m[3] === 'k' ? '後期' : '';
  return `${era}${parseInt(m[2], 10)}年度${term}`;
}
// 出題年度の圧縮列挙（基準年で重複排除・新しい順）例: 令和7・5・3年度
function yearsEnum(years) {
  const bases = [...new Set(years.map((y) => String(y).replace(/[zk]$/, '')))];
  bases.sort((a, b) => (a < b ? 1 : -1));
  const nums = bases.map((y) => {
    const m = y.match(/^([hr])(\d+)$/);
    return (m[1] === 'r' ? '令和' : '平成') + parseInt(m[2], 10);
  });
  // 「令和7・令和5・令和3」→ 元号が同一なら先頭のみ表記
  if (nums.every((n) => n.startsWith('令和'))) return '令和' + bases.map((y) => parseInt(y.slice(1), 10)).join('・') + '年度';
  return nums.join('・') + '年度';
}
function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
}
const clean = (s) => decodeEntities(s).replace(/\*\*/g, '');
function shortTopic(body) {
  const b = clean(body);
  const m = b.match(/^(.{4,24}?)に関する/);
  return m ? m[1] : [...b].slice(0, 18).join('');
}
function freqStars(unitCount, totalUnits) {
  const ratio = unitCount / totalUnits;
  return ratio >= 0.6 ? 3 : ratio >= 0.3 ? 2 : 1;
}

// IG カード適性フィルタ（packEligible を通っても固定キャンバスで破綻する問題を除外）。
//   - 個数型（選択肢が全て「Nつ」）: ①〜④の長文を本文に列挙する壁テキストで訴求が弱い
//   - 解説合計が長い問題: answer スライドは font 自動縮小がなく、解説4本+「ここがポイント」箱が
//     縦に溢れて重なる（実測: 合計>400字で重なり発生・329字は正常）。上限420で余裕をみる
const isKosuuType = (q) => (q.options || []).length > 0 && (q.options || []).every((o) => /^\s*\d+\s*つ\s*$/.test(o.text || ''));
const explTotal = (q) => (q.optionExplanations || []).reduce((a, o) => a + (o.text || '').length, 0);
const igSuitable = (q) => !isKosuuType(q) && explTotal(q) <= 420;

function buildPackSlides(questions, { examDir, exam, themeLabel, subtopicLabel, stars, yearsLabel }) {
  const totalQ = questions.length;
  const totalPages = totalQ * 2 + 2;
  const slides = [{
    type: 'cover',
    title: subtopicLabel,          // 論点名（cover 主見出し）
    themeLabel,                    // 科目（6管理テーマ）
    subtopicLabel,                 // 論点
    stars,
    yearsLabel,                    // 出題年度の列挙
    firstQuestion: clean(questions[0].body).split('\n')[0], // 第1問の設問文（Q ヒーロー）
    examDir, exam,
    sectionTag: '頻出',
    pageIndex: 1, totalPages,
  }];
  questions.forEach((q, i) => {
    const qNum = i + 1;
    slides.push({
      type: 'problem',
      bodyLines: wrapByCharCount(clean(q.body), 26),
      options: q.options.map((o) => ({ ...o, text: clean(o.text) })),
      topic: yearLabel(q.year),    // 各問の出題年度（problem テンプレの topic ピルで表示）
      qNum, totalQ, pageIndex: i * 2 + 2, totalPages,
    });
    const ansExpl = q.optionExplanations.find((e) => e.num === q.correct);
    slides.push({
      type: 'answer',
      correctNum: q.correct,
      correctText: shortTopic(q.body),
      optionExplanations: q.optionExplanations.map((e) => ({ ...e, text: clean(e.text) })),
      pointText: ansExpl ? wrapByCharCount(clean(ansExpl.text), 38).slice(0, 2).join('') : '',
      qNum, totalQ, pageIndex: i * 2 + 3, totalPages,
    });
  });
  slides.push({ type: 'cta', pageIndex: totalPages, totalPages });
  return slides;
}

let grand = { packs: 0, drop1: 0, small: 0 };
for (const exam of exams) {
  const cfg = EXAMS[exam];
  if (!cfg) { console.error(`未知の exam: ${exam}`); process.exit(1); }
  const data = JSON.parse(readFileSync(join(ROOT, cfg.json), 'utf8'));
  const all = [];
  for (const y of data.years) for (const q of y.questions) all.push(normalizeQuestion({ ...q, year: y.year }));

  // 分類: packEligible かつ 図依存でない かつ IG カード適性のある問題を、テーマ先勝ちで割付
  const poolBase = all.filter((q) => q.packEligible && !FIGURE_RE.test(q.body));
  const pool = poolBase.filter(igSuitable);
  const igExcluded = poolBase.length - pool.length;
  const assigned = new Map(); // id -> {themeKey, subtopicKey, q}
  const collisions = [];
  for (const themeKey of ORDER) {
    const theme = THEMES[themeKey];
    for (const q of pool) {
      if (!matchesTheme(theme, q)) continue;
      if (assigned.has(q.id)) { collisions.push({ id: q.id, first: assigned.get(q.id).themeKey, also: themeKey }); continue; }
      assigned.set(q.id, { themeKey, subtopicKey: assignSubtopic(theme, q), q });
    }
  }

  // グループ化（科目/論点）
  const groups = new Map(); // "themeKey/subtopicKey" -> [q...]
  for (const { themeKey, subtopicKey, q } of assigned.values()) {
    const k = `${themeKey}/${subtopicKey}`;
    (groups.get(k) || groups.set(k, []).get(k)).push(q);
  }

  const outRoot = join(ROOT, `content/sns/instagram/${exam}/theme-packs`);
  if (!dryRun && existsSync(outRoot)) rmSync(outRoot, { recursive: true, force: true }); // 再生成は総入れ替え

  let packCount = 0, dropped1 = 0, smallPacks = 0;
  const rows = [];
  for (const [k, arr] of groups) {
    const [themeKey, subtopicKey] = k.split('/');
    const theme = THEMES[themeKey];
    const subtopic = theme.subtopics.find((s) => s.key === subtopicKey);
    // 頻出度: 分類された全問（重複前）の distinct 年コード / 総回数
    const stars = freqStars(new Set(arr.map((q) => q.year)).size, cfg.totalUnits);
    // パック用: body 重複を排除し新しい順に
    const seen = new Set(); const uniq = [];
    for (const q of [...arr].sort((a, b) => (a.year < b.year ? 1 : a.year > b.year ? -1 : a.no - b.no))) {
      const b = norm(q.body); if (seen.has(b)) continue; seen.add(b); uniq.push(q);
    }
    // 4問ずつ。端数 2-3 は小パック、1 は破棄
    const chunks = [];
    for (let i = 0; i < uniq.length; i += 4) chunks.push(uniq.slice(i, i + 4));
    if (chunks.length && chunks[chunks.length - 1].length === 1) { dropped1++; chunks.pop(); }

    let n = 0;
    for (const chunk of chunks) {
      if (chunk.length < 4) smallPacks++;
      n++; packCount++;
      const packNum = String(n).padStart(2, '0');
      const yl = yearsEnum(chunk.map((q) => q.year));
      const slides = buildPackSlides(chunk, {
        examDir: cfg.examDir, exam, themeLabel: theme.label, subtopicLabel: subtopic.label, stars, yearsLabel: yl,
      });
      const pack = {
        _meta: {
          exam, examDir: cfg.examDir,
          theme: { key: themeKey, label: theme.label },
          subtopic: { key: subtopicKey, label: subtopic.label },
          packNum, fmtLabel: cfg.fmtLabel, management: 'safety',
          freqStars: stars,
          years: chunk.map((q) => q.year),
          yearsLabel: yl,
          questionIds: chunk.map((q) => q.id),
        },
        slides,
      };
      if (!dryRun) {
        const dir = join(outRoot, `${themeKey}-${subtopicKey}`, `pack-${packNum}`);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'slide-data.json'), JSON.stringify(pack, null, 2) + '\n');
      }
    }
    rows.push(`  ${theme.label} / ${subtopic.label}: ${chunks.length}パック (${uniq.length}問, ★${stars})`);
  }

  const classified = assigned.size, poolN = pool.length;
  console.log(`\n=== ${exam} (${dryRun ? 'DRY' : 'WRITE'}) ===`);
  console.log(`  IG適性除外: ${igExcluded}問（個数型/解説過長でカード破綻するもの）`);
  console.log(`  分類: ${classified}/${poolN} 適性問題（${(100 * classified / poolN).toFixed(0)}%を6管理テーマへ・残りは土木一般/専門土木でv1対象外）`);
  console.log(`  論点数: ${groups.size}  パック: ${packCount}（小パック ${smallPacks} / 1問破棄 ${dropped1}）  テーマ間衝突(先勝ち): ${collisions.length}`);
  if (collisions.length) console.log(`  衝突例: ${collisions.slice(0, 8).map((c) => `${c.id}(${c.first}<${c.also})`).join(', ')}`);
  rows.sort().forEach((r) => console.log(r));
  grand.packs += packCount; grand.small += smallPacks; grand.drop1 += dropped1;
}
console.log(`\n総パック: ${grand.packs}（小パック ${grand.small} / 1問破棄 ${grand.drop1}）`);
