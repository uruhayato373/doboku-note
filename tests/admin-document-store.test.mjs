import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * admin の文書ビュー（document-store / markdown / project）の契約を固定する。
 *
 * ルート tsconfig の exclude に tools/** があり `npm run type-check` はこれらを見ない。
 * admin-app 側にもテストランナーが無いので、**ここが唯一の自動検証**。
 *
 * 守りたい事故（2026-08-18 に実際に踏んだ）:
 *   1. catch-all のセグメントが URL エンコードのまま届き、日本語ディレクトリの詳細が全滅（404）。
 *      ASCII 名では encoded === decoded なので .claude/knowledge では露見しなかった
 *   2. パストラバーサル・symlink 経由の root 外読み出し
 *   3. 見出し目次と本文 id のずれ（別々の正規表現で採ると起きる）
 */

function tsx(code) {
  const cli = join(ROOT, 'node_modules/tsx/dist/cli.mjs');
  return execFileSync(process.execPath, [cli, '-e', code], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

test('URL エンコードされた日本語パスを復号して解決する', () => {
  const out = tsx(`
    import { resolveDocumentPath } from './tools/admin-app/src/lib/document-store.ts';
    import { PROJECT_SOURCE } from './tools/admin-app/src/lib/project.ts';
    const raw = resolveDocumentPath(PROJECT_SOURCE, ['strategy', '01_プロダクト戦略']);
    const enc = resolveDocumentPath(PROJECT_SOURCE, ['strategy', '01_%E3%83%97%E3%83%AD%E3%83%80%E3%82%AF%E3%83%88%E6%88%A6%E7%95%A5']);
    process.stdout.write(JSON.stringify({ raw: Boolean(raw), enc: Boolean(enc), same: raw === enc }));
  `);
  assert.deepEqual(JSON.parse(out), { raw: true, enc: true, same: true });
});

test('root 外・トラバーサル・存在しない slug は null（notFound へ倒す）', () => {
  const out = tsx(`
    import { resolveDocumentPath } from './tools/admin-app/src/lib/document-store.ts';
    import { PROJECT_SOURCE } from './tools/admin-app/src/lib/project.ts';
    const cases = [['..','..','CLAUDE'], ['%2e%2e','CLAUDE'], ['no-such-doc'], [''], ['..','CLAUDE']];
    process.stdout.write(JSON.stringify(cases.map((c) => resolveDocumentPath(PROJECT_SOURCE, c))));
  `);
  assert.deepEqual(JSON.parse(out), [null, null, null, null, null]);
});

test('見出し目次の id が本文 HTML の id と一致する', () => {
  const out = tsx(`
    import { renderDocument } from './tools/admin-app/src/lib/markdown.ts';
    const md = ['# T','','## あ','本文','### い','本文','## あ','重複見出し'].join('\\n');
    const { html, headings } = renderDocument(md);
    const ids = [...html.matchAll(/<h[23] id="([^"]+)"/g)].map((m) => m[1]);
    process.stdout.write(JSON.stringify({ ids, toc: headings.map((h) => h.id), depths: headings.map((h) => h.depth) }));
  `);
  const r = JSON.parse(out);
  assert.deepEqual(r.ids, r.toc, '目次と本文の id がずれている');
  assert.equal(new Set(r.ids).size, r.ids.length, '同一文書内で id が重複している');
  assert.deepEqual(r.depths, [2, 3, 2]);
});

test('sanitize は外れていない（生 HTML を落とす）', () => {
  const out = tsx(`
    import { renderDocument } from './tools/admin-app/src/lib/markdown.ts';
    const { html } = renderDocument('<script>alert(1)</script>\\n\\n通常の段落');
    process.stdout.write(JSON.stringify({ hasScript: html.includes('<script'), hasText: html.includes('通常の段落') }));
  `);
  assert.deepEqual(JSON.parse(out), { hasScript: false, hasText: true });
});

// 2026-08-18: docs/project/_archive を 3 件個別に分類して廃止した。以後「履歴だから警告集計の
// 対象外」という層は存在しない（逃げ場を残すとそこが検査の穴になる）。代わりに、フラット化した
// 6 領域が分類として立っていること・廃止参照が 0 であることを固定する。
test('docs の分類は 6 領域＋運用ディレクトリで、廃止参照は 0', () => {
  const out = tsx(`
    import { loadProjectEntries } from './tools/admin-app/src/lib/project.ts';
    const all = loadProjectEntries();
    process.stdout.write(JSON.stringify({
      total: all.length,
      sections: [...new Set(all.map((e) => e.section))].sort(),
      unlabeled: [...new Set(all.filter((e) => e.sectionLabel === e.section).map((e) => e.section))].sort(),
      retired: all.reduce((n, e) => n + e.retiredReferenceCount, 0),
    }));
  `);
  const r = JSON.parse(out);
  assert.ok(r.total > 30, `文書数が異常に少ない: ${r.total}`);
  for (const s of ['strategy', 'editorial', 'marketing', 'operations', 'products', 'design']) {
    assert.ok(r.sections.includes(s), `${s} 領域が無い`);
  }
  assert.ok(!r.sections.includes('project'), 'docs/project が残っている');
  assert.deepEqual(r.unlabeled, [], `日本語ラベルの無い領域がある: ${r.unlabeled}`);
  assert.equal(r.retired, 0, '恒久文書に廃止済み経路への参照が残っている');
});

/* ------------------------------------------------------------------ *
 * 複数ルート（Phase 3: /docs /content /knowledge /todo /plans）
 * ------------------------------------------------------------------ */

test('allowlist された全ルートが列挙でき、移行 fallback を持たない', () => {
  const out = tsx(`
    import { ROOTS } from './tools/admin-app/src/lib/document-roots.ts';
    import { listDocuments } from './tools/admin-app/src/lib/document-store.ts';
    const rows = ROOTS.map((d) => ({
      id: d.id, routeBase: d.routeBase, n: listDocuments(d).length,
      empty: Boolean(d.emptyState), hasLegacy: 'legacyRoots' in d,
    }));
    process.stdout.write(JSON.stringify(rows));
  `);
  const rows = JSON.parse(out);
  assert.deepEqual(
    rows.map((r) => r.routeBase).sort(),
    ['/content', '/docs', '/knowledge', '/plans'],
    'ルートの集合が変わっている（追加したら意図的にこの期待値を更新する）',
  );
  // 「1 件も検査していない」を緑にしない（CLAUDE.md §9）
  for (const r of rows) {
    assert.ok(r.empty, `${r.id}: emptyState が無い`);
    assert.ok(r.n > 0, `${r.id}: 0 件（列挙が壊れている疑い）`);
    assert.equal(r.hasLegacy, false, `${r.id}: 移行 fallback が残っている（Phase 11 で外す約束）`);
  }
});

test('/docs は content へ出ていくチャネル素材を列挙しない（/content の fallback と二重計上しない）', () => {
  const out = tsx(`
    import { rootById } from './tools/admin-app/src/lib/document-roots.ts';
    import { listDocuments } from './tools/admin-app/src/lib/document-store.ts';
    const docs = listDocuments(rootById('docs'));
    const leaked = docs.filter((e) => /^docs\\/(note|sns|textbook|coconala-blog)\\//.test(e.file));
    process.stdout.write(JSON.stringify({ total: docs.length, leaked: leaked.slice(0, 3).map((e) => e.file) }));
  `);
  const r = JSON.parse(out);
  assert.ok(r.total > 0, 'docs が 0 件（exclude が効きすぎている）');
  assert.deepEqual(r.leaked, [], 'exclude したはずのチャネル素材が /docs に出ている');
});

test('symlink で root 外へ出る文書は読めない（ディレクトリ・ファイル両方）', () => {
  const out = tsx(`
    import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from 'node:fs';
    import { tmpdir } from 'node:os';
    import { join } from 'node:path';
    import { loadDocument, listDirectory, listDocuments } from './tools/admin-app/src/lib/document-store.ts';
    const base = mkdtempSync(join(tmpdir(), 'sym-'));
    const root = join(base, 'root'), outside = join(base, 'outside');
    mkdirSync(root); mkdirSync(outside);
    writeFileSync(join(outside, 'secret.md'), '# 機密');
    symlinkSync(join(outside, 'secret.md'), join(root, 'secret.md'));
    symlinkSync(outside, join(root, 'esc'));
    const src = { root, filePrefix: 'root', allowedExtensions: new Set(['.md']) };
    process.stdout.write(JSON.stringify({
      file: loadDocument(src, ['secret']),
      viaDir: loadDocument(src, ['esc', 'secret']),
      dir: listDirectory(src, 'esc'),
      listed: listDocuments(src).length,
    }));
  `);
  const r = JSON.parse(out);
  assert.equal(r.file, null, 'symlink されたファイルを読んでいる');
  assert.equal(r.viaDir, null, 'symlink ディレクトリ経由で root 外を読んでいる');
  assert.equal(r.dir, null, 'symlink ディレクトリを列挙している');
  assert.equal(r.listed, 0, '一覧に symlink 経由の root 外ファイルが載っている');
});

test('content は本文もバイナリも読まずに件数と容量だけを数える', () => {
  const out = tsx(`
    import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
    import { tmpdir } from 'node:os';
    import { join } from 'node:path';
    import { summarizeChannels, listDirectory, loadDocument } from './tools/admin-app/src/lib/document-store.ts';
    const root = mkdtempSync(join(tmpdir(), 'bin-'));
    mkdirSync(join(root, 'sns', 'pack'), { recursive: true });
    writeFileSync(join(root, 'sns', 'pack', 'a.png'), Buffer.alloc(4096, 1));
    writeFileSync(join(root, 'sns', 'pack', 'note.md'), '# メモ');
    const src = { root, filePrefix: 'content', allowedExtensions: new Set(['.md']) };
    process.stdout.write(JSON.stringify({
      channels: summarizeChannels(src),
      listing: listDirectory(src, 'sns/pack'),
      png: loadDocument(src, ['sns', 'pack', 'a.png']),
    }));
  `);
  const r = JSON.parse(out);
  assert.deepEqual(r.channels.map((c) => [c.segment, c.files]), [['sns', 2]]);
  assert.ok(r.channels[0].bytes >= 4096, 'bytes を statSync で数えていない');
  // バイナリは名前とサイズだけ。isDoc:false なら画面はリンクを張らない＝本文として開けない
  assert.deepEqual(
    r.listing.files.map((f) => [f.name, f.isDoc]),
    [['a.png', false], ['note.md', true]],
  );
  assert.equal(r.png, null, 'バイナリを本文として読み込んでいる');
});

test('content は段階的列挙で、空のときの説明を持つ', () => {
  const out = tsx(`
    import { existsSync } from 'node:fs';
    import { rootById } from './tools/admin-app/src/lib/document-roots.ts';
    import { summarizeChannels } from './tools/admin-app/src/lib/document-store.ts';
    const d = rootById('content');
    process.stdout.write(JSON.stringify({
      exists: existsSync(d.root), empty: d.emptyState, staged: d.staged === true,
      channels: summarizeChannels(d).map((c) => c.segment).sort(),
    }));
  `);
  const r = JSON.parse(out);
  assert.ok(r.empty.length > 0, 'content の emptyState が空');
  assert.equal(r.staged, true, 'content は段階的列挙（staged）でなければならない');
  assert.deepEqual(r.channels.slice().sort(), ['coconala', 'kindle', 'note', 'site', 'sns', 'sources'].sort(), 'チャネル構成が変わっている');
});
