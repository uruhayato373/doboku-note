#!/usr/bin/env node
// pe-question-pages — 技術士 建設部門の設問ページ（1 設問 1 ページ）の骨組みの生成・問題文の照合・照合文の抜き出し（DN-1073）。
//
//   node scripts/pe-question-pages.mjs scaffold --year r07 --subject steel-concrete            # 作るページの計画（書かない）
//   node scripts/pe-question-pages.mjs scaffold --year r07 --subject steel-concrete --write    # 無いページだけ骨組みを書く（published: false）
//   node scripts/pe-question-pages.mjs check                                                   # 既存の設問ページの問題文の節が年度ページと一致するか
//   node scripts/pe-question-pages.mjs claims --year r07 --subject road                        # 論点の解説から照合が要る文を JSON で出す
//
// 骨組みは問題文の節（年度ページの逐語）・frontmatter・答案用紙の配分の枠・他年度へのリンクまで。
// 論点の解説・問われていること・観点・失点は担当が書き、書き終えたら published: true にする。
// exit 0 = 成功（check は全件一致） / 1 = 不一致・年度ページが読めない・対象 0 件（検査不成立）
//
// npm run check-pe-question-pages — 設問ページの問題文の節が、年度×科目のページから作った節と一字一句同じか（quality:audit の ci）
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { writeMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';
import { duplicateTags, extractClaims, extractQuestionSection, parseYearPage, questionSection, questionSlug, scaffoldPage } from './lib/pe-question-pages.mjs';

const NAME = 'pe-question-pages';
// --root は検査・テスト用（既定は content/site/pe-construction）
const argRoot = process.argv.indexOf('--root');
const DIR = argRoot !== -1 ? process.argv[argRoot + 1] : join(SITE_CONTENT_ROOT, 'pe-construction');
const args = parseCliArgs({ year: { type: 'string' }, subject: { type: 'string' }, write: { type: 'boolean' }, only: { type: 'string' }, root: { type: 'string' } });
const cmd = args._[0];
const file = (slug) => join(DIR, slug, 'article.mdx');
const exists = (slug) => existsSync(file(slug));
const YEAR_PAGE = /^(r0\d)-([a-z-]+?)$/;
const QUESTION_PAGE = /^(r0\d)-([a-z-]+?)-(i-[12]|ii-[12]-\d|iii-[12])$/;

function readYear(year, subject) {
  const slug = `${year}-${subject}`;
  if (!exists(slug)) throw new Error(`年度ページが無い: ${slug}`);
  return parseYearPage(readFileSync(file(slug), 'utf8'));
}

function main() {
  if (cmd === 'scaffold') {
    if (!args.year || !args.subject) { console.error(`[${NAME}] scaffold には --year と --subject が要る`); return 1; }
    const parsed = readYear(args.year, args.subject);
    const ids = [...parsed.questions.keys()].filter((id) => !args.only || id === args.only);
    if (!ids.length) { console.error(`[${NAME}] 設問が 0 件（検査不成立）`); return 1; }
    const yearCodes = readdirSync(DIR).map((d) => YEAR_PAGE.exec(d)).filter((m) => m && m[2] === args.subject).map((m) => m[1]).sort();
    let made = 0;
    let skipped = 0;
    for (const id of ids) {
      const slug = questionSlug(args.year, args.subject, id);
      if (exists(slug)) { skipped++; console.log(`  既存: ${slug}`); continue; }
      const text = scaffoldPage({ parsed, year: args.year, subject: args.subject, id, exists, yearCodes });
      if (args.write) { mkdirSync(dirname(file(slug)), { recursive: true }); writeMdxFile(file(slug), text); }
      made++;
      console.log(`  ${args.write ? '作成' : '作る予定'}: ${slug}`);
    }
    console.log(`[${NAME}] 設問 ${ids.length} 件・${args.write ? '作成' : '作る予定'} ${made} 件・既存 ${skipped} 件`);
    return 0;
  }
  if (cmd === 'check') {
    const pages = readdirSync(DIR).map((d) => QUESTION_PAGE.exec(d)).filter(Boolean);
    if (!pages.length) { console.error(`[${NAME}] 設問ページが 0 件（検査不成立）`); return 1; }
    const cache = new Map();
    const bad = [];
    const dupBad = [];
    for (const [slug, year, subject, idLower] of pages) {
      const id = idLower.toUpperCase();
      const key = `${year}-${subject}`;
      if (!cache.has(key)) cache.set(key, readYear(year, subject));
      const want = questionSection(cache.get(key), id, year);
      const text = readFileSync(file(slug), 'utf8');
      if (extractQuestionSection(text) !== want) bad.push(slug);
      const dup = duplicateTags(text);
      if (dup.length) dupBad.push(`${slug}（${dup.join('・')}）`);
    }
    console.log(`[${NAME}] 設問ページ ${pages.length} 件を実検査・問題文の節の不一致 ${bad.length} 件・タグの重複 ${dupBad.length} 件`);
    for (const s of bad) console.error(`  ✗ ${s}: 問題文の節が年度ページから作ったものと違う（node scripts/${NAME}.mjs scaffold で作り直した節と比べる）`);
    for (const s of dupBad) console.error(`  ✗ ${s}: tags に同じタグが重なっている`);
    return bad.length || dupBad.length ? 1 : 0;
  }
  if (cmd === 'claims') {
    const pages = readdirSync(DIR).map((d) => QUESTION_PAGE.exec(d)).filter((m) => m && (!args.year || m[1] === args.year) && (!args.subject || m[2] === args.subject));
    if (!pages.length) { console.error(`[${NAME}] 対象の設問ページが 0 件`); return 1; }
    const out = pages.map(([slug]) => ({ slug, claims: extractClaims(readFileSync(file(slug), 'utf8')) }));
    console.log(JSON.stringify(out, null, 2));
    return 0;
  }
  console.error(`[${NAME}] 使い方: scaffold --year r07 --subject <科目> [--only II-1-1] [--write] / check / claims [--year] [--subject]`);
  return 1;
}

try { process.exitCode = main(); } catch (e) { console.error(`[${NAME}] ${e.message}`); process.exitCode = 1; }
