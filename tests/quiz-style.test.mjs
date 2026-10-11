import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLOBALS_CSS, QUIZ_CONTENT_CSS, QUIZ_TOKENS, extractQuizTokens, quizTokensCss } from '../scripts/lib/quiz-style.mjs';

test('globals.css から演習のトークンをライト・ダークとも実際の値で抜き出す', () => {
  const { light, dark } = extractQuizTokens(readFileSync(GLOBALS_CSS, 'utf8'));
  for (const name of QUIZ_TOKENS) {
    assert.match(light[name], /^#|^rgb|^hsl|^oklch/u, `${name} のライトの値 ${light[name]}`);
    assert.match(dark[name], /^#|^rgb|^hsl|^oklch/u, `${name} のダークの値 ${dark[name]}`);
  }
  assert.notEqual(light['--ink'], dark['--ink']);
});

test('quiz-content.css が使うトークンはすべてアプリへ渡す（QUIZ_TOKENS に無いとアプリで色が付かない）', () => {
  const used = [...readFileSync(QUIZ_CONTENT_CSS, 'utf8').matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]);
  assert.ok(used.length > 0);
  for (const name of used) assert.ok(QUIZ_TOKENS.includes(name), `${name} が QUIZ_TOKENS に無い`);
});

test('quiz-tokens.css はライトを :root、ダークを prefers-color-scheme: dark に書く', () => {
  const css = quizTokensCss(`:root { --ink: #111; --ink-body: #222; --ink-muted: #333; --rule-soft: #444; --accent: #555; --paper: #fff;
    --color-positive: #060; --color-positive-fill: #cfc; --color-danger: #900; --color-danger-fill: var(--paper); }
    .dark { --ink: #eee; --paper: #000; }
    .dark .prose-blog { --ink: #f00; }`);
  assert.match(css, /^\/\* 自動生成/u);
  assert.match(css, /:root\{--ink:#111;[^}]*--color-danger-fill:#fff\}/u);
  assert.match(css, /@media \(prefers-color-scheme: dark\)\{:root\{--ink:#eee;[^}]*--paper:#000;[^}]*--color-danger-fill:#000\}\}/u);
  assert.throws(() => quizTokensCss(':root { --ink: #111; }'), /--ink-body が無い/u);
});
