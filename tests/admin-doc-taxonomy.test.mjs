import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * DN-0103 Phase 02: docs/ の 3 軸分類（doc-taxonomy.ts）と Obsidian callout / table wrapper
 * の markdown レンダリング（markdown.ts）の契約を固定する。
 */

function tsx(code) {
  const cli = join(ROOT, 'node_modules/tsx/dist/cli.mjs');
  return execFileSync(process.execPath, [cli, '-e', code], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

test('ディレクトリ既定推論: frontmatter 無しは先頭ディレクトリから決まる', () => {
  const out = tsx(`
    import { inferDefaults } from './tools/admin-app/src/lib/doc-taxonomy.ts';
    process.stdout.write(JSON.stringify({
      strategy: inferDefaults('strategy'),
      products: inferDefaults('products'),
      editorial: inferDefaults('editorial'),
      operations: inferDefaults('operations'),
      reviews: inferDefaults('reviews'),
      handoffs: inferDefaults('handoffs'),
      root: inferDefaults('root'),
    }));
  `);
  const r = JSON.parse(out);
  assert.equal(r.strategy.documentType, 'strategy');
  assert.equal(r.products.documentType, 'product-spec');
  assert.equal(r.editorial.documentType, 'policy');
  assert.equal(r.operations.documentType, 'runbook');
  assert.equal(r.reviews.documentType, 'review');
  assert.equal(r.reviews.retention, 'temporary');
  assert.equal(r.handoffs.documentType, 'handoff');
  assert.equal(r.handoffs.retention, 'temporary');
  assert.equal(r.root.documentType, 'index');
  for (const key of Object.keys(r)) assert.deepEqual(r[key].channel, ['cross']);
});

test('frontmatter override は既定値を上書きする（Brain 文書想定）', () => {
  const out = tsx(`
    import { classifyDocument } from './tools/admin-app/src/lib/doc-taxonomy.ts';
    const t = classifyDocument('products', { documentType: 'research', channel: 'brain', retention: 'durable' });
    process.stdout.write(JSON.stringify(t));
  `);
  const t = JSON.parse(out);
  assert.equal(t.documentType, 'research');
  assert.deepEqual(t.channel, ['brain']);
  assert.equal(t.retention, 'durable');
  assert.deepEqual(t.invalidFields, []);
});

test('channel は配列指定も 1 件だけの scalar 指定も受け付ける', () => {
  const out = tsx(`
    import { classifyDocument } from './tools/admin-app/src/lib/doc-taxonomy.ts';
    const scalar = classifyDocument('root', { channel: 'note' });
    const array = classifyDocument('root', { channel: ['note', 'site'] });
    process.stdout.write(JSON.stringify({ scalar: scalar.channel, array: array.channel }));
  `);
  const r = JSON.parse(out);
  assert.deepEqual(r.scalar, ['note']);
  assert.deepEqual(r.array, ['note', 'site']);
});

test('不正な値は unknown へ握りつぶさず、既定値へフォールバックしつつ invalidFields へ記録する', () => {
  const out = tsx(`
    import { classifyDocument } from './tools/admin-app/src/lib/doc-taxonomy.ts';
    const t = classifyDocument('strategy', { documentType: 'not-a-real-type', channel: 'not-a-real-channel', retention: 'sometimes' });
    process.stdout.write(JSON.stringify(t));
  `);
  const t = JSON.parse(out);
  // 既定値（strategy セクション）へフォールバックしている
  assert.equal(t.documentType, 'strategy');
  assert.deepEqual(t.channel, ['cross']);
  assert.equal(t.retention, 'durable');
  // だが検出可能な形で記録されている（黙って握りつぶさない）
  assert.deepEqual(t.invalidFields.sort(), ['channel', 'documentType', 'retention']);
});

test('現行 docs/**/*.md は全て有効な frontmatter 値を持つ（決定的ゲート・不正値の混入を検知）', () => {
  const out = tsx(`
    import { readFileSync, readdirSync } from 'node:fs';
    import { join, extname } from 'node:path';
    import matter from 'gray-matter';
    import { classifyDocument } from './tools/admin-app/src/lib/doc-taxonomy.ts';

    function walk(dir, out = []) {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (extname(e.name) === '.md') out.push(p);
      }
      return out;
    }
    const sectionOf = (rel) => (rel.includes('/') ? rel.split('/')[0] : 'root');

    const files = walk('docs');
    const invalid = [];
    for (const f of files) {
      const { data } = matter(readFileSync(f, 'utf8'));
      const rel = f.replace(/^docs\\//, '');
      const t = classifyDocument(sectionOf(rel), data);
      if (t.invalidFields.length) invalid.push([f, t.invalidFields]);
    }
    process.stdout.write(JSON.stringify({ checked: files.length, invalid }));
  `);
  const r = JSON.parse(out);
  assert.ok(r.checked > 30, `検査対象が想定より少ない: ${r.checked}`);
  assert.deepEqual(r.invalid, [], `不正な frontmatter 値を持つ docs 文書がある: ${JSON.stringify(r.invalid)}`);
});

test('Brain override 文書は channel:brain で分類される', () => {
  const files = [
    'docs/products/brain-claude-code-essay-skill/00-product-spec.md',
    'docs/products/brain-claude-code-essay-skill/01-package-spec.md',
    'docs/products/brain-claude-code-essay-skill/03-publication-checklist.md',
    'docs/products/brain-claude-code-essay-skill/04-build-plan.md',
    'docs/products/brain-r8-policy-prediction-skill/00-product-concept.md',
    'docs/products/brain-r8-policy-prediction-skill/01-evidence-ledger.md',
    'docs/products/brain-r8-policy-prediction-skill/02-match-criteria.md',
    'docs/products/brain-r8-policy-prediction-skill/03-backtest-protocol.md',
    'docs/products/brain-r8-policy-prediction-skill/04-backtest-results.md',
  ];
  const out = tsx(`
    import { readFileSync } from 'node:fs';
    import matter from 'gray-matter';
    import { classifyDocument } from './tools/admin-app/src/lib/doc-taxonomy.ts';
    const files = ${JSON.stringify(files)};
    const results = files.map((f) => {
      const { data } = matter(readFileSync(f, 'utf8'));
      return classifyDocument('products', data).channel;
    });
    process.stdout.write(JSON.stringify(results));
  `);
  const results = JSON.parse(out);
  assert.equal(results.length, files.length);
  for (const channel of results) assert.deepEqual(channel, ['brain']);
});

test('Callout: allowlist タイプごとに div.callout-{type} へ変換され、title 有無どちらも扱える', () => {
  const out = tsx(`
    import { renderDocument } from './tools/admin-app/src/lib/markdown.ts';
    const md = [
      '> [!note] タイトル',
      '> 本文1行目',
      '> 本文2行目',
      '',
      '> [!warn]',
      '> 別名で warning になる',
      '',
      '> [!tip] ヒント',
      '> tip body',
      '',
      '> [!important] 重要',
      '> important body',
      '',
      '> [!caution] 注意',
      '> caution body',
      '',
      '> [!todo]',
      '> title 無しは type ラベルへ',
    ].join('\\n');
    process.stdout.write(renderDocument(md).html);
  `);
  assert.match(out, /<div class="callout callout-note" data-callout="note">/);
  assert.match(out, /<div class="callout-title">タイトル<\/div>/);
  assert.match(out, /<div class="callout callout-warning" data-callout="warning">[\s\S]*?別名で warning になる/);
  assert.match(out, /<div class="callout callout-tip" data-callout="tip">/);
  assert.match(out, /<div class="callout callout-important" data-callout="important">/);
  assert.match(out, /<div class="callout callout-caution" data-callout="caution">/);
  assert.match(out, /<div class="callout callout-todo" data-callout="todo">[\s\S]*?<div class="callout-title">Todo<\/div>/);
});

test('Callout: allowlist に無い type は通常の blockquote へフォールバックし、マーカーは残す', () => {
  const out = tsx(`
    import { renderDocument } from './tools/admin-app/src/lib/markdown.ts';
    const md = ['> [!info] 未対応タイプ', '> body'].join('\\n');
    process.stdout.write(renderDocument(md).html);
  `);
  assert.doesNotMatch(out, /class="callout/);
  assert.match(out, /<blockquote>/);
  assert.match(out, /\[!info] 未対応タイプ/);
});

test('sanitize は callout 追加後も raw script / event handler / javascript: URL を出力しない', () => {
  const out = tsx(`
    import { renderDocument } from './tools/admin-app/src/lib/markdown.ts';
    const md = [
      '<script>alert(1)</script>',
      '[xss](javascript:alert(1))',
      '<div onclick="x()" class="evil">y</div>',
    ].join('\\n\\n');
    const { html } = renderDocument(md);
    process.stdout.write(JSON.stringify({
      hasScript: html.includes('<script'),
      hasOnclick: html.includes('onclick'),
      hasJsUrl: html.includes('javascript:'),
      hasEvilClass: html.includes('evil'),
    }));
  `);
  assert.deepEqual(JSON.parse(out), { hasScript: false, hasOnclick: false, hasJsUrl: false, hasEvilClass: false });
});

test('GFM table は div.table-wrap で包まれ、thead/tbody 構造を保つ', () => {
  const out = tsx(`
    import { renderDocument } from './tools/admin-app/src/lib/markdown.ts';
    const md = ['| a | b |', '|---|---|', '| 1 | 2 |'].join('\\n');
    process.stdout.write(renderDocument(md).html);
  `);
  assert.match(out, /<div class="table-wrap"><table>/);
  assert.match(out, /<thead>/);
  assert.match(out, /<tbody>/);
});

test('task list checkbox は disabled のまま出力される（クリック不可）', () => {
  const out = tsx(`
    import { renderDocument } from './tools/admin-app/src/lib/markdown.ts';
    const md = ['- [ ] todo', '- [x] done'].join('\\n');
    process.stdout.write(renderDocument(md).html);
  `);
  assert.match(out, /<input type="checkbox" disabled>/);
  assert.match(out, /<input type="checkbox" checked disabled>/);
});

test('callout 変換後も見出し目次の id は本文 HTML の id と一致する（既存契約の維持）', () => {
  const out = tsx(`
    import { renderDocument } from './tools/admin-app/src/lib/markdown.ts';
    const md = ['# T', '', '> [!note] callout', '> body', '', '## 見出し2', '本文', '### 見出し3', '本文'].join('\\n');
    const { html, headings } = renderDocument(md);
    const ids = [...html.matchAll(/<h[23] id="([^"]+)"/g)].map((m) => m[1]);
    process.stdout.write(JSON.stringify({ ids, toc: headings.map((h) => h.id) }));
  `);
  const r = JSON.parse(out);
  assert.deepEqual(r.ids, r.toc);
});

test('docs/**/*.md 全件が例外なくレンダリングできる（callout/table 変換の実データ smoke）', () => {
  function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (extname(e.name) === '.md') out.push(p);
    }
    return out;
  }
  const files = walk(join(ROOT, 'docs'));
  assert.ok(files.length > 30, `docs 対象数が想定より少ない: ${files.length}`);
  const out = tsx(`
    import { readFileSync } from 'node:fs';
    import matter from 'gray-matter';
    import { renderDocument } from './tools/admin-app/src/lib/markdown.ts';
    const files = ${JSON.stringify(files)};
    let errors = [];
    for (const f of files) {
      try {
        const { content } = matter(readFileSync(f, 'utf8'));
        renderDocument(content);
      } catch (e) {
        errors.push([f, String(e && e.message)]);
      }
    }
    process.stdout.write(JSON.stringify({ checked: files.length, errors }));
  `);
  const r = JSON.parse(out);
  assert.equal(r.checked, files.length);
  assert.deepEqual(r.errors, []);
});
