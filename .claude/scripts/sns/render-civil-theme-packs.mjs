/**
 * render-civil-theme-packs.mjs — 論点パックの slide-data.json → carousel PNG + caption.txt。
 *
 * generate-civil-theme-packs.mjs が書いた docs/sns/instagram/civil-{1,2}/theme-packs/**\/slide-data.json
 * を走査し、各パックの carousel/img/NN-*.png と carousel/caption.txt を生成する。
 *   - cover(00) : exam-quiz-cover-ig.mjs（論点表紙: 科目+論点+頻出度★+第1問Q+出題年度）
 *   - problem/answer/cta : 既存 renderSlide（quiz テンプレ）。problem は data.topic に年度ラベル
 *   - caption   : generate-caption.cjs --format carousel（isThemePack 分岐）
 *
 * Usage:
 *   node .claude/scripts/sns/render-civil-theme-packs.mjs --exam civil-1 [--only <theme-subtopic>] [--skip-caption]
 *   node .claude/scripts/sns/render-civil-theme-packs.mjs --exam both
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const { renderSlide } = await import(pathToFileURL(join(ROOT, '.claude/scripts/lib/sns-common/slide-render.mjs')).href);
const { renderExamQuizCoverIg } = await import(pathToFileURL(join(ROOT, '.claude/scripts/sns/templates/exam-quiz-cover-ig.mjs')).href);
const { svgToPng } = await import(pathToFileURL(join(ROOT, '.claude/scripts/sns/lib/svg-to-png.mjs')).href);
const CAPTION_GEN = join(ROOT, '.claude/scripts/instagram/generate-caption.cjs');

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
const examArg = arg('exam', 'both');
const exams = examArg === 'both' ? ['civil-1', 'civil-2'] : [examArg];
const onlyDir = typeof arg('only') === 'string' ? arg('only') : null;
const skipCaption = arg('skip-caption') === true;

// slide.type → renderSlide の quiz テンプレ種別（ig-post-create と同一マップ）
const TYPE_MAP = { cover: 'quiz-cover', problem: 'quiz-problem', answer: 'quiz-answer', cta: 'quiz-cta' };
const filePart = (t) => (t === 'cover' ? 'cover' : t === 'problem' ? 'problem' : t === 'answer' ? 'answer' : 'cta');
const W = 1080, HGT = 1350;

let total = 0, failed = 0;
const failures = [];

for (const exam of exams) {
  const base = join(ROOT, `docs/sns/instagram/${exam}/theme-packs`);
  if (!existsSync(base)) { console.warn(`skip: ${base} なし（先に generate-civil-theme-packs）`); continue; }
  for (const themeSub of readdirSync(base).sort()) {
    if (onlyDir && themeSub !== onlyDir) continue;
    const tsPath = join(base, themeSub);
    for (const pack of readdirSync(tsPath).filter((p) => /^pack-\d+$/.test(p)).sort()) {
      const packDir = join(tsPath, pack);
      const sjPath = join(packDir, 'slide-data.json');
      if (!existsSync(sjPath)) continue;
      try {
        const sd = JSON.parse(readFileSync(sjPath, 'utf8'));
        const m = sd._meta;
        const imgDir = join(packDir, 'carousel/img');
        mkdirSync(imgDir, { recursive: true });
        const totalPages = sd.slides.length;
        for (let i = 0; i < sd.slides.length; i++) {
          const s = sd.slides[i];
          const file = `${String(i).padStart(2, '0')}-${filePart(s.type)}.png`;
          let png;
          if (s.type === 'cover') {
            const svg = renderExamQuizCoverIg({
              exam: m.exam, examDir: m.examDir,
              subject: s.themeLabel, topic: s.subtopicLabel,
              stars: s.stars, question: s.firstQuestion, yearsLabel: s.yearsLabel,
            });
            png = await svgToPng(svg, { width: W });
          } else {
            const data = { ...s, management: m.management || 'safety', exam: m.exam, pageIndex: s.pageIndex ?? i + 1, totalPages };
            png = await renderSlide({ width: W, height: HGT, slide: { type: TYPE_MAP[s.type], data } });
          }
          writeFileSync(join(imgDir, file), png);
        }
        if (!skipCaption) {
          execSync(`node "${CAPTION_GEN}" "${sjPath}" --format carousel`, { cwd: ROOT, stdio: 'pipe' });
        }
        total++;
        process.stdout.write(`  ✓ ${exam}/${themeSub}/${pack} (${totalPages}枚)\n`);
      } catch (e) {
        failed++;
        failures.push(`${exam}/${themeSub}/${pack}: ${String(e.message || e).split('\n')[0]}`);
        process.stdout.write(`  ✗ ${exam}/${themeSub}/${pack}: ${String(e.message || e).split('\n')[0]}\n`);
      }
    }
  }
}

console.log(`\n=== render-civil-theme-packs ===  OK ${total} / FAIL ${failed}`);
if (failures.length) { failures.forEach((f) => console.log(`  ${f}`)); process.exit(1); }
