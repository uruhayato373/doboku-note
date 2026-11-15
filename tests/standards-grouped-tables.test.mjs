/** 表示投影の契約。章全文をSSRし、原典・配布用Markdownと検索全文の経路を分けて検査する。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import * as pagefind from 'pagefind';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { compileMDX } from 'next-mdx-remote/rsc';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import remarkGfm from 'remark-gfm';
import { buildDocument } from '../scripts/build-standard-articles.mjs';
import { createHash } from 'node:crypto';
import { loadTableOverrides, loadDocumentPages, ARTICLES_ROOT, getCatalog, loadOverrides } from '../scripts/lib/standards-structure.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { resolveTablePart } from '../scripts/lib/standards-table.mjs';
import { classifyGroupedTable, prepareGroupedTable, projectGroupedChapter, groupedCoverageErrors, groupedArtifact } from '../scripts/lib/standards-grouped-tables.mjs';
import { restoreStandardSearchText } from '../scripts/lib/standards-search-text.mjs';
import { isIndexableHtml } from '../scripts/build-search-index.mjs';

const root = join(ARTICLES_ROOT, 'mlit', 'sekou-kanri-kijun');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const overrides = loadTableOverrides('mlit/sekou-kanri-kijun');
const sourceUrl = getCatalog().documents.find((d) => d.agencyId === 'mlit' && d.documentId === 'sekou-kanri-kijun').sourceUrl;
const canonical = (id) => readFileSync(join(root, 'chapters', `${id}.md`), 'utf8');
const presentation = (id) => JSON.parse(readFileSync(join(root, 'chapters', `${id}.grouped.json`), 'utf8'));
const project = (id) => {
  const md = canonical(id);
  const records = [...md.matchAll(/table-override: ([a-f0-9]{16}) \*\//gu)].map((m) => ({ key: m[1], prepared: prepareGroupedTable(overrides.get(m[1]), (key) => overrides.get(key)) }));
  return projectGroupedChapter(md, records, { sourceUrl });
};
const expectedTypes = { dekigata: 107, dekigata_dual: 12, dekigata_scale: 70, quality: 54 };

test('S1の全243部品の型をコード規則で判定（仕様ファイルは本番依存にしない）', () => {
  const seen = new Set();
  const counts = {};
  for (const ch of manifest.chapters) for (const match of canonical(ch.chapterId).matchAll(/table-override: ([a-f0-9]{16}) \*\//gu)) seen.add(match[1]);
  for (const key of seen) {
    const entry = overrides.get(key);
    const parts = entry.parts ?? (entry.kind === 'table' ? [entry] : []);
    for (const part of parts.filter((p) => p.kind === 'table')) {
      const resolved = resolveTablePart(part, (k) => overrides.get(k), { abbreviate: false });
      const classified = classifyGroupedTable(resolved);
      assert.equal(classified.ok, true, key);
      counts[classified.type] = (counts[classified.type] ?? 0) + 1;
    }
  }
  assert.deepEqual(counts, expectedTypes);
  // S1が手元にある場合だけ全参照・列の役割まで照合する。
  const path = join(REPO_ROOT, '.tmp', 'codex', 'S1-spec.json');
  if (existsSync(path)) for (const t of JSON.parse(readFileSync(path, 'utf8')).tables) {
    const entry = overrides.get(t.key);
    for (const p of t.parts.filter((p) => p.kind === 'table')) {
      const raw = entry.parts ? entry.parts[p.index] : entry;
      const actual = classifyGroupedTable(resolveTablePart(raw, (k) => overrides.get(k), { abbreviate: false }));
      assert.equal(actual.type, p.type, t.key);
      assert.deepEqual(actual.roles, p.columns.map((c) => c.role), t.key);
    }
  }
});

test('sameの長文は省略せず解決し、未解決・未知列はフォールバック', () => {
  const text = '長い測定基準'.repeat(12);
  const part = { kind: 'table', header: [['項目', '規格値']], rows: [[text, { same: 'left' }], [{ same: 'above' }, { same: 'above' }]] };
  assert.deepEqual(resolveTablePart(part, undefined, { abbreviate: false }).rows, [[text, text], [text, text]]);
  assert.equal(resolveTablePart(part).rows[1][0], '（同上）');
  assert.equal(prepareGroupedTable({ key: 'test', ...part, header: [[{ same: 'above' }, '規格値']] }).reason, 'override-bad-same');
  assert.equal(prepareGroupedTable({ key: 'test', ...part }).reason, 'unknown-columns');
});

test('2-1: H2〜H3、最大3列、共通注記に行番号なし、単位と原本リンク、定義と数式', () => {
  const p = presentation('2-1');
  assert.match(p.markdown, /^## ２ 土工 ／ ３ 河川土工・海岸土工・砂防土工$/mu);
  assert.match(p.markdown, /^### 2-1 掘削工 （1-2-3-2）$/mu);
  assert.doesNotMatch(p.markdown, /^#{4,}|^## .*共通編|同左|（同上）/mu);
  assert.match(p.markdown, /単位：mm\n\n\| 測定項目 \|/u);
  assert.doesNotMatch(p.markdown, /測定箇所の図：原本/u); // 原本リンクは出典表示の 1 か所だけ
  assert.match(p.markdown, /※かぶりとは、鉄筋の最外縁からコンクリート表面までの距離をいう/u);
  assert.match(p.markdown, /d＝D÷\(n－1\)/u);
  const first = p.markdown.split('<SourceRef')[0];
  assert.doesNotMatch(first, /〔\d+〕/u);
  assert.equal((first.match(/施工延長40m/g) ?? []).length, 1);
  for (const line of p.markdown.split('\n').filter((l) => l.startsWith('|'))) assert.ok(line.split('|').length - 2 <= 3, line);
  const fill = p.markdown.split('### 3-1 盛土工')[1].split('###')[0];
  assert.match(fill, /\| 測定項目 \| 規格値 \|/u);
  assert.doesNotMatch(fill, /\| 平均値 \|/u);
});

test('品質9-2:試験頻度・確認○を保持し、行ごとの注記のみ番号対応', () => {
  const p = presentation('9-2');
  assert.match(p.markdown, /\| 試験項目 \| 規格値 \| 試験時期・頻度 \|/u);
  assert.match(p.markdown, /試験成績表等による確認/u);
  assert.match(p.markdown, /○/u);
  assert.match(p.markdown, /- 〔1〕/u);
  assert.doesNotMatch(p.markdown, /^#{5}/mu);
  for (const line of p.markdown.split('\n').filter((l) => l.startsWith('|'))) assert.ok(line.split('|').length - 2 <= 3);
});

test('全245参照: 表244件と図のみ1件を投影、セル網羅と保存物一致', () => {
  let count = 0;
  const fallback = [];
  for (const ch of manifest.chapters.filter((c) => c.presentationFile)) {
    const p = project(ch.chapterId);
    assert.deepEqual(groupedCoverageErrors(p), []);
    assert.deepEqual(groupedArtifact(p), presentation(ch.chapterId));
    for (const t of p.tables) {
      count++;
      if (t.ok) continue;
      fallback.push(t.key);
      assert.ok(t.sourceText.trim(), `${t.key}: フォールバックの検索全文が空`);
      if (overrides.get(t.key).kind === 'verbatim') for (const line of overrides.get(t.key).layout) assert.ok(t.sourceText.includes(line));
      const block = canonical(ch.chapterId).match(new RegExp(`\\{\\/\\* table-override: ${t.key} \\*\\/\\}\\n[\\s\\S]*?<SourceRef[^>]*\\/>`))[0];
      assert.ok(p.markdown.includes(block), t.key);
    }
  }
  assert.equal(count, 245);
  assert.deepEqual(fallback, []);
  const changed = project('2-1');
  changed.markdown = changed.markdown.replaceAll('施工延長40m', '削除');
  assert.ok(groupedCoverageErrors(changed).length > 0, '表示の欠落を検出');
});

test('全28表示章のMDXをコンパイルしてSSR、検索投入の全セルとアンカーを確認', async () => {
  let chapters = 0;
  let tables = 0;
  for (const ch of manifest.chapters.filter((c) => c.presentationFile)) {
    const p = presentation(ch.chapterId);
    const { content } = await compileMDX({ source: p.markdown, components: { SourceRef: () => null }, options: { mdxOptions: { remarkPlugins: [remarkGfm] } } });
    const html = renderToStaticMarkup(React.createElement('main', null, content));
    assert.match(html, /^<main>/u);
    assert.doesNotMatch(html, /フォーマットエラー/u);
    assert.match(html, /<table>/u);
    const search = restoreStandardSearchText(html, p.tables);
    for (const t of p.tables) {
      assert.ok(html.includes(`id="${t.id}"`));
      assert.ok(search.includes(t.sourceText.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;')));
      tables++;
    }
    chapters++;
  }
  assert.equal(chapters, 28);
  assert.equal(tables, 245);
  assert.equal(isIndexableHtml('<head><meta name="robots" content="noindex,follow"/></head>'), false);
  assert.throws(() => restoreStandardSearchText('<main/>', presentation('2-1').tables), /照合不成立/u);
});

test('サイト・配布共用JSON-LDのTechArticleに章全文を格納し、他文書は追加しない', () => {
  const output = execFileSync(process.execPath, ['--conditions', 'react-server', '--import', 'tsx', '--input-type=module', '-e', `
    import { readFileSync } from 'node:fs';
    import { buildStandardChapterStructuredData } from './src/lib/standards-structured-data.ts';
    import { readStandardPresentation } from './src/lib/standards-presentation.ts';
    const root = ${JSON.stringify(root)};
    const chapter = JSON.parse(readFileSync(root + '/manifest.json')).chapters.find(c => c.chapterId === '2-1');
    const document = JSON.parse(readFileSync('content/site/standards-library/catalog.json')).documents.find(d => d.agencyId === 'mlit' && d.documentId === 'sekou-kanri-kijun');
    const p = readStandardPresentation(root, chapter);
    const withText = buildStandardChapterStructuredData(document, chapter, undefined, undefined, p.text)['@graph'].find(n => n['@type'] === 'TechArticle');
    const without = buildStandardChapterStructuredData(document, chapter)['@graph'].find(n => n['@type'] === 'TechArticle');
    console.log(JSON.stringify({ text: withText.text, without: Object.hasOwn(without, 'text') }));
  `], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const actual = JSON.parse(output);
  assert.equal(actual.text, presentation('2-1').text);
  assert.equal(actual.without, false);
});


test('Pagefind実索引の抜粋に図ラベルを収録し、配信HTMLの表アンカーへ結ぶ', async () => {
  const p = presentation('2-1');
  const t = p.tables.at(-1);
  const { index, errors } = await pagefind.createIndex({});
  assert.deepEqual(errors, []);
  try {
    const html = `<html lang="ja"><head><title>施工管理基準</title></head><body><main data-pagefind-body><section id="${t.id}" data-standard-table="${t.id}"><p>表示用の表</p></section></main></body></html>`;
    const restored = restoreStandardSearchText(html, [t]);
    const result = await index.addHTMLFile({ url: '/standards/mlit/sekou-kanri-kijun/chapters/2-1/', content: restored });
    assert.deepEqual(result.errors, []);
    const files = await index.getFiles();
    const fragments = files.files.filter((f) => f.path.endsWith('.pf_fragment'));
    assert.equal(fragments.length, 1);
    const fragment = JSON.parse(gunzipSync(fragments[0].content).toString().replace(/^pagefind_dcd/u, ''));
    assert.ok(fragment.anchors.some((a) => a.id === t.id));
    assert.match(fragment.content.replace(/\u200b/gu, ''), /コンクリート表面/u);
    assert.equal(fragment.url, '/standards/mlit/sekou-kanri-kijun/chapters/2-1/');
  } finally { await pagefind.close(); }
});


test('grouped対象外23文書の生成内容は現行Manifest・807章の本文と一致', () => {
  const config = loadOverrides();
  const catalog = getCatalog();
  let documents = 0;
  let chapters = 0;
  for (const id of config.build.documents.filter((id) => config.documents[id]?.tableLayout !== 'grouped')) {
    const document = catalog.documents.find((d) => `${d.agencyId}/${d.documentId}` === id);
    const actual = buildDocument(document, config, { write: false });
    const expected = JSON.parse(readFileSync(join(ARTICLES_ROOT, id, 'manifest.json'), 'utf8'));
    assert.deepEqual(actual, expected, id);
    for (const chapter of actual.chapters) {
      const md = readFileSync(join(ARTICLES_ROOT, id, chapter.file), 'utf8').replace(/\r\n/gu, '\n');
      assert.equal(createHash('sha256').update(md).digest('hex'), chapter.outputSha256);
      chapters++;
    }
    documents++;
  }
  assert.equal(documents, 23);
  assert.equal(chapters, 807);
});

test('番号付きの注記を連番の箇条に分け、小数や番号の無い文は分けない', async () => {
  const { numberedNoteItems } = await import('../scripts/lib/standards-grouped-tables.mjs');
  assert.equal(numberedNoteItems('１．あ２．５mい２．う３．え'), '- １．あ２．５mい\n- ２．う\n- ３．え');
  assert.equal(numberedNoteItems('施工延長40m につき1ヶ所'), '施工延長40m につき1ヶ所');
  assert.equal(numberedNoteItems('１．だけ'), '１．だけ');
});

function projectFixture(parts) {
  const records = parts.map((part, i) => ({
    key: i.toString(16).padStart(16, '0'),
    prepared: { ok: true, parts: [part], raw: [part], sourceText: [...part.header, ...part.rows].flat().join('\n') },
  }));
  const markdown = records.map(({ key }) => `{/* table-override: ${key} */}\nold\n<SourceRef pages="1" kind="table" />`).join('\n\n');
  return projectGroupedChapter(markdown, records, { sourceUrl });
}

test('セルと注記の改行はbrで表示し、特殊文字を逃がし、文字網羅も維持する', async () => {
  const p = projectFixture([{
    kind: 'table',
    header: [['試験項目', '規格値', '試験時期・頻度', '摘要']],
    rows: [['項目A\n項目B', '粗骨材 3.0%以下\r\nスラグ 5.0%以下', '着手前\n材料変更時', '注意<原文>\n次の行']],
  }]);
  assert.match(p.markdown, /\| 項目A<br \/>項目B \| 粗骨材 3.0%以下<br \/>スラグ 5.0%以下 \| 着手前<br \/>材料変更時 \|/u);
  assert.match(p.markdown, /\*\*摘要\*\*\n\n注意&lt;原文&gt;<br \/>次の行/u);
  assert.deepEqual(groupedCoverageErrors(p), []);
  const { content } = await compileMDX({ source: p.markdown, components: { SourceRef: () => null }, options: { mdxOptions: { remarkPlugins: [remarkGfm] } } });
  const html = renderToStaticMarkup(content);
  assert.match(html, /<td>項目A<br\/>項目B<\/td>/u);
  assert.match(html, /<p>注意&lt;原文&gt;<br\/>次の行<\/p>/u);
  p.markdown = p.markdown.replace('スラグ', '');
  assert.ok(groupedCoverageErrors(p).length > 0);
});

test('品質・出来形とも空白違いのグループは同一視し、最初の見出し表記を保つ', () => {
  for (const item of ['試験項目', '測定項目']) {
    const part = (group) => ({ kind: 'table', header: [['工種', item, '規格値']], rows: [[group, '項目', '10']] });
    const first = '1　セメント・コンクリート';
    const p = projectFixture([part(first), part(' 1  セメント・コンクリート '), part('2 別工種')]);
    const headings = p.markdown.split('\n').filter((line) => line.startsWith('## '));
    assert.deepEqual(headings, [`## ${first}`, '## 2 別工種']);
    assert.deepEqual(groupedCoverageErrors(p), []);
  }
});

test('○だけの共通注記は1行、○と空欄が混在する列は行番号を保持する', () => {
  const header = [['試験項目', '規格値', '試験成績表等による確認', '摘要']];
  const p = projectFixture([{ kind: 'table', header, rows: [['A', '1', '○', '○'], ['B', '2', '○', '○']] }]);
  assert.match(p.markdown, /^\*\*試験成績表等による確認\*\*：○$/mu);
  assert.match(p.markdown, /^\*\*摘要\*\*：○$/mu);
  assert.doesNotMatch(p.markdown, /^○$/mu);
  const varied = projectFixture([{ kind: 'table', header, rows: [['A', '1', '○', ''], ['B', '2', '', '']] }]);
  assert.match(varied.markdown, /\| A〔1〕 \|/u);
  assert.match(varied.markdown, /\| B〔2〕 \|/u);
  assert.match(varied.markdown, /\*\*試験成績表等による確認\*\*\n\n- 〔1〕A：○/u);
});

test('3列以下の表の1列目には7emの最小幅を確保する', () => {
  const css = readFileSync(join(REPO_ROOT, 'src/styles/globals.css'), 'utf8');
  const rule = css.split('[data-standards-chapter] table:not(:has(th:nth-child(4))) :is(td, th):first-child {')[1].split('}')[0];
  assert.match(rule, /white-space: normal;/u);
  assert.match(rule, /min-width: 7em;/u);
});

test('値の列は「以下・以上・未満・）」の後の半角空白で改行し、名前と値の間の全角空白は残す', async () => {
  const { valueItemBreaks } = await import('../scripts/lib/standards-grouped-tables.mjs');
  assert.equal(valueItemBreaks('砕石　3.0％以下（ただし、5.0％以下） スラグ粗骨材　5.0％以下 それ以外（砂利等）1.0％以下'), '砕石　3.0％以下（ただし、5.0％以下）\nスラグ粗骨材　5.0％以下\nそれ以外（砂利等）1.0％以下');
  assert.equal(valueItemBreaks('設計図書による'), '設計図書による');
});

test('旧例外7件: 表部品は3列以下、式・図の版面はページ注記にし全文を保持', async () => {
  const keys = ['ca5f0c2db24112d7', '9064d57a26078f7d', '1afa7fe58fbb8c5e', '1c67cc73d3d47582', '0cc13e23cfad408e', 'fe8f808b4a34cb16', '1937ba6d73a14b92'];
  let checked = 0;
  for (const id of ['3-2', '3-6', '3-8', '6-1']) {
    const p = project(id);
    const { content } = await compileMDX({ source: p.markdown, components: { SourceRef: () => null }, options: { mdxOptions: { remarkPlugins: [remarkGfm] } } });
    const html = renderToStaticMarkup(content);
    assert.doesNotMatch(html, /原典の表|<pre|ｄ＝/u);
    const search = restoreStandardSearchText(html, p.tables);
    for (const t of p.tables.filter(t => keys.includes(t.key))) {
      checked++;
      assert.equal(t.ok, true, t.key);
      assert.match(t.markdown, new RegExp(`測定箇所・計算式の図：原本 p\\.${t.pages}`));
      assert.doesNotMatch(t.markdown, /https?:|<a\b|\]\(/u);
      const raw = overrides.get(t.key);
      const lines = raw.kind === 'verbatim' ? raw.layout : raw.parts.filter(part => part.kind === 'verbatim').flatMap(part => part.lines);
      for (const line of lines) {
        assert.ok(t.sourceText.includes(line));
        assert.ok(p.text.includes(line));
        assert.ok(canonical(id).includes(line));
        assert.ok(search.includes(line));
      }
      if (raw.kind === 'verbatim') assert.doesNotMatch(t.markdown, /^\|/mu); // p.174 は図のみ
      else {
        assert.match(t.markdown, /^#{2,4} /mu);
        assert.match(t.markdown, /\| 測定項目 \|/u);
        for (const line of t.markdown.split('\n').filter(l => l.startsWith('|'))) assert.ok(line.split('|').length - 2 <= 3);
      }
    }
  }
  assert.equal(checked, 7);
});

test('9-1の目次41項目を原文の行どおり保持して連結せず描く', async () => {
  const document = getCatalog().documents.find(d => d.agencyId === 'mlit' && d.documentId === 'sekou-kanri-kijun');
  const page = loadDocumentPages(document).find(p => p.page === 213);
  const original = page.lines.map(l => l.trim()).filter(l => /^\d+\s+.+･{2,}\s*Ⅱ\s*－\s*\d+$/u.test(l));
  assert.equal(original.length, 41);
  const md = presentation('9-1').markdown;
  const items = md.split('\n').filter(l => /^\d+ .+Ⅱ － \d+$/u.test(l));
  assert.deepEqual(items, original);
  const { content } = await compileMDX({ source: md, components: { SourceRef: () => null }, options: { mdxOptions: { remarkPlugins: [remarkGfm] } } });
  const html = renderToStaticMarkup(content);
  const paragraphs = [...html.matchAll(/<p>([^<]+)<\/p>/gu)].map(m => m[1]);
  assert.deepEqual(paragraphs.filter(p => /^\d+ .+Ⅱ － \d+$/u.test(p)), original);
});

test('9-4 table-10の規格値・頻度を含め、組み直した表の値列は全画面幅で折り返す', () => {
  const md = presentation('9-4').markdown;
  const tables = [...md.matchAll(/\| 試験項目[^\n]*\n[\s\S]*?(?=\n\n)/gu)];
  assert.match(tables[9][0], /温度測定/u);
  assert.match(tables[9][0], /10,000㎡/u);
  const css = readFileSync(join(REPO_ROOT, 'src/styles/globals.css'), 'utf8');
  const selector = '[data-standards-chapter] [data-standard-table] table:not(:has(th:nth-child(4))) :is(td, th):not(:first-child)';
  const rule = css.split(selector + ' {')[1].split('}')[0];
  assert.match(rule, /white-space: normal;/u);
  assert.match(rule, /overflow-wrap: anywhere;/u);
  assert.ok(css.indexOf(selector) < css.indexOf('@media (max-width: 639px)'));
});

test('構成図とロックボルト図1〜3を承認済み切り出し画像で埋め込み、図ラベルの段落を出さない', () => {
  const one = canonical('1-1');
  assert.match(one, /^## 3\. 構成$/mu);
  assert.doesNotMatch(one, /出来形管理施工管理/u);
  const ledger = JSON.parse(readFileSync(join(REPO_ROOT, 'content/sources/standards/mlit/sekou-kanri-kijun/figures.json')));
  assert.equal(ledger.figures.length, 4);
  for (const f of ledger.figures) {
    assert.equal(f.review.status, 'approved');
    assert.ok(existsSync(join(root, 'img', f.file)));
    assert.ok(canonical(f.chapterId).includes(`/img/${f.file}`));
    assert.ok(canonical(f.chapterId).includes(`<SourceRef pages="${f.sourceRef}" kind="figure" />`));
  }
});

test('測定項目の右の欄から規格値まで結合した文は規格値の側にだけ出す（3-8 章）', () => {
  const p = JSON.parse(readFileSync(join(root, 'chapters', '3-8.grouped.json'), 'utf8'));
  const text = JSON.stringify(p);
  assert.ok(!text.includes('厚さｔ ／ ただし'));
  assert.ok(text.includes('| 厚さｔ〔5〕 | ただし、吹付面に凹凸がある場合の最小吹付厚は'));
});
