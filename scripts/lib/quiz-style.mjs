/**
 * quiz-style.mjs — 過去問演習の見た目をサイトと iOS アプリで 1 か所から引く。
 *
 * - 問題文・選択肢・解説の HTML の見た目は src/styles/quiz-content.css（サイトは globals.css が @import、
 *   アプリは build-ios-quiz-bundle が同梱）。
 * - 色はサイトのトークン（src/styles/globals.css の :root と .dark）。アプリにはここで値を抜き出し、
 *   quiz-tokens.css（ライトは :root、ダークは prefers-color-scheme: dark）として書き出す。
 *   アプリの WebView の枠（選択肢のボタン・正誤の表示）も同じトークン名で色を引く。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './repository-paths.mjs';

export const QUIZ_CONTENT_CSS = join(REPO_ROOT, 'src', 'styles', 'quiz-content.css');
export const GLOBALS_CSS = join(REPO_ROOT, 'src', 'styles', 'globals.css');

/** アプリへ渡すトークン（quiz-content.css と iOS の QuestionWebView が使うもの） */
export const QUIZ_TOKENS = [
  '--ink',
  '--ink-body',
  '--ink-muted',
  '--rule-soft',
  '--accent',
  '--paper',
  '--color-positive',
  '--color-positive-fill',
  '--color-danger',
  '--color-danger-fill',
];

/** セレクタがちょうど `selector` のブロックの宣言を順に集める（後勝ち） */
function declarationsOf(css, selector) {
  const out = new Map();
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i);
    if (open < 0) break;
    const start = Math.max(text.lastIndexOf('}', open - 1), text.lastIndexOf('{', open - 1), text.lastIndexOf(';', open - 1)) + 1;
    const head = text.slice(start, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < text.length && depth > 0) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') depth--;
      j++;
    }
    const body = text.slice(open + 1, j - 1);
    if (head === selector) {
      for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) out.set(m[1], m[2].trim());
      i = j;
    } else {
      // 入れ子（@layer base { :root { … } }）の中も見る
      i = open + 1;
    }
  }
  return out;
}

function resolve(name, own, fallback, seen = new Set()) {
  const raw = own.get(name) ?? fallback?.get(name);
  if (raw == null) return null;
  const ref = raw.match(/^var\((--[\w-]+)\)$/);
  if (!ref) return raw;
  if (seen.has(ref[1])) throw new Error(`トークン ${name} の参照が循環している`);
  seen.add(ref[1]);
  return resolve(ref[1], own, fallback, seen);
}

/** globals.css から QUIZ_TOKENS のライト・ダークの値を抜き出す。無いトークンがあれば投げる */
export function extractQuizTokens(css, names = QUIZ_TOKENS) {
  const root = declarationsOf(css, ':root');
  const dark = declarationsOf(css, '.dark');
  const light = {};
  const darkOut = {};
  for (const name of names) {
    const l = resolve(name, root);
    if (!l) throw new Error(`globals.css の :root に ${name} が無い（quiz-style.mjs の QUIZ_TOKENS を直す）`);
    light[name] = l;
    darkOut[name] = resolve(name, dark, root) ?? l;
  }
  return { light, dark: darkOut };
}

const block = (vars) => Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');

/** アプリに同梱する quiz-tokens.css の中身 */
export function quizTokensCss(css = readFileSync(GLOBALS_CSS, 'utf8')) {
  const { light, dark } = extractQuizTokens(css);
  return [
    '/* 自動生成（build-ios-quiz-bundle）: src/styles/globals.css のトークンの写し。手で直さない */',
    `:root{${block(light)}}`,
    `@media (prefers-color-scheme: dark){:root{${block(dark)}}}`,
    '',
  ].join('\n');
}
