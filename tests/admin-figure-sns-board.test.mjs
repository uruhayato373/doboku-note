import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { figureSnsBoard } from '../tools/admin-app/src/lib/figure-sns-board.mjs';

function fixture() {
  mkdirSync('.tmp', { recursive: true });
  const root = mkdtempSync(join(process.cwd(), '.tmp/figure-sns-test-'));
  const write = (path, data) => { const full = join(root, path); mkdirSync(join(full, '..'), { recursive: true }); writeFileSync(full, typeof data === 'string' ? data : JSON.stringify(data)); };
  const article = 'content/site/civil-construction-1/example/article.mdx';
  const figure = 'content/site/civil-construction-1/example/img/figure-example.svg';
  const dir = 'content/sns/instagram/civil-1/keyword-packs/example';
  const x = 'content/sns/x/draft/001-example-diagrams';
  const svg = '<svg viewBox="0 0 400 500"><text>1級土木 試験の要点 1級土木の学習ページへアクセス</text></svg>';
  write(article, '学習用本文'); write(figure, svg);
  const ref = path => ({ path, sha256: createHash('sha256').update(readFileSync(join(root, path))).digest('hex') });
  const source = { schemaVersion: 1, article: ref(article), figure: ref(figure), needs: 'なぜ？', nextStep: 'https://doboku-note.com/exam/civil-construction-1/secondary/example' };
  write(`${dir}/source.json`, source); write(`${dir}/carousel/caption.txt`, '図の読み方');
  const entries = {}, assets = [];
  for (const name of ['00-cover', '01-figure', '02-text', '03-cta']) {
    write(`${dir}/carousel/img/${name}.svg`, svg); assets.push(`${dir}/carousel/img/${name}.png`);
  }
  const file = 'img/tweet-01-example.png'; assets.push(`${x}/${file}`);
  write(`${x}/images.json`, [{ tweet: '1', concept: 'なぜ？', needs: 'なぜ？', file, article: source.article, figure: source.figure }]);
  write(`${x}/tweets.md`, '## Tweet 01: 学習\n\n図を読んで学ぶ。\n');
  write(`${x}/status.json`, { tweets: { '1': { status: 'draft', text: '図を読んで学ぶ。', image: file } } });
  for (const path of assets) { write(path, `画像-${path}`); entries[path] = ref(path); }
  const manifest = '.claude/state/assets/drive-manifest.json'; write(manifest, { entries });
  return { root, write, article, dir, x, assets, entries, manifest, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('既存入力を結合し、投稿状態を書き換えず準備済にする', () => {
  const f = fixture(); try {
    const b = figureSnsBoard(f.root); assert.equal(b.sourceCount, 1); assert.equal(b.checkedCount, 1);
    assert.equal(b.rows[0].readiness, 'ready'); assert.equal(b.rows[0].archivedCount, 5);
    assert.equal(b.rows[0].igStatus, 'draft'); assert.equal(b.rows[0].x[0].status, 'draft');
    f.write(`${f.dir}/posted.json`, { carousel: { at: '2026-10-07', url: 'https://example.org/post' } });
    f.write(`${f.x}/status.json`, { tweets: { '1': { status: 'posted' } } });
    const row = figureSnsBoard(f.root).rows[0]; assert.equal(row.igStatus, 'posted'); assert.equal(row.x[0].status, 'posted');
  } finally { f.cleanup(); }
});

test('元記事が変更されたら画像が揃っていても要確認', () => {
  const f = fixture(); try { f.write(f.article, '変更された本文'); const row = figureSnsBoard(f.root).rows[0]; assert.equal(row.readiness, 'review'); assert.match(row.issues.join('\n'), /元articleが変更/); } finally { f.cleanup(); }
});

test('同じXバッチの別の投稿が公開済みでも下書きを検査できる', () => {
  const f = fixture(); try {
    const items = JSON.parse(readFileSync(join(f.root, `${f.x}/images.json`), 'utf8'));
    f.write(`${f.x}/images.json`, [...items, { ...items[0], tweet: '2', figure: { path: 'content/site/other/img/figure-other.svg' } }]);
    f.write(`${f.x}/status.json`, { tweets: { '1': { status: 'draft', text: '図を読んで学ぶ。', image: items[0].file }, '2': { status: 'posted' } } });
    assert.equal(figureSnsBoard(f.root).rows[0].readiness, 'ready');
  } finally { f.cleanup(); }
});

test('Driveに保存済でも手元に画像がなければ要復元', () => {
  const f = fixture(); try { rmSync(join(f.root, f.assets[0])); const row = figureSnsBoard(f.root).rows[0]; assert.equal(row.readiness, 'restore'); assert.equal(row.archivedCount, 5); assert.equal(row.localCount, 4); } finally { f.cleanup(); }
});

test('画像と保存台帳の不一致、破損台帳を準備済と扱わない', () => {
  const f = fixture(); try {
    f.write(f.assets[0], '変更後の画像'); assert.equal(figureSnsBoard(f.root).rows[0].readiness, 'review');
    f.write(f.manifest, '{'); const b = figureSnsBoard(f.root); assert.equal(b.errors.length, 1); assert.equal(b.rows[0].readiness, 'review');
  } finally { f.cleanup(); }
});

test('制作入力0件と、壊れて読み取れない入力1件を区別する', () => {
  const f = fixture(); try {
    f.write(`${f.dir}/source.json`, '{'); let b = figureSnsBoard(f.root); assert.equal(b.sourceCount, 1); assert.equal(b.rows[0].readiness, 'review');
    rmSync(join(f.root, f.dir), { recursive: true }); b = figureSnsBoard(f.root); assert.equal(b.sourceCount, 0); assert.deepEqual(b.rows, []);
  } finally { f.cleanup(); }
});
