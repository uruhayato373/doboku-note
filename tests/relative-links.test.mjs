import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditLinks, listTracked, maskCode, listTargets } from '../scripts/check-relative-links.mjs';

/**
 * 相対リンク検査の契約。
 *
 * この検査を足した動機は「置き場を変えると href だけが黙って壊れる」ことだが、
 * **過検知で使われなくなったら無いのと同じ**なので、誤検知しない側も同じ強さで固定する。
 * 実測（974 リンク）で誤検知の原因はコードスパン/フェンス内の記法例示だけだった。
 */

const exists = (set) => (p) => set.has(p);

test('壊れた相対リンクを検出する', () => {
  const r = auditLinks('docs/strategy/a.md', 'see [x](../operations/b.md)', exists(new Set()));
  assert.equal(r.length, 1);
  assert.equal(r[0].resolved, 'docs/operations/b.md');
});

test('実在する相対リンクは通す', () => {
  const r = auditLinks('docs/strategy/a.md', 'see [x](../operations/b.md)', exists(new Set(['docs/operations/b.md'])));
  assert.deepEqual(r, []);
});

test('コードスパン内の記法説明は検査しない（実測された唯一の誤検知源）', () => {
  const src = '`](../../x)` 形式の相対リンクは検査対象外である';
  assert.deepEqual(auditLinks('.claude/todo/backlog.md', src, exists(new Set())), []);
});

test('フェンス内のパスも検査しない', () => {
  const src = ['文', '```bash', 'cat [a](../../nowhere.md)', '```', ''].join('\n');
  assert.deepEqual(auditLinks('docs/a.md', src, exists(new Set())), []);
});

test('プレースホルダは検査しない', () => {
  for (const link of ['../{slug}/article.md', '../YYYY-Www.md', '../img/figure-*.png']) {
    assert.deepEqual(auditLinks('docs/a.md', `[x](${link})`, exists(new Set())), [], link);
  }
});

test('マスクしても行番号がずれない（長さを保つ）', () => {
  const src = ['# T', '```', 'inner', '```', '[x](../nowhere.md)'].join('\n');
  const r = auditLinks('docs/a.md', src, exists(new Set()));
  assert.equal(r.length, 1);
  assert.equal(r[0].line, 5, 'フェンスを潰した結果、行番号がずれている');
  assert.equal(maskCode(src).length, src.length);
});

test('実リポジトリは壊れ 0 で、検査対象が 0 件ではない', () => {
  const files = listTargets();
  assert.ok(files.length > 500, `検査対象が少なすぎる: ${files.length}`);
  // 実ファイルに対しては本体スクリプトが全量を回す。ここでは走査の生存だけ確認する
  assert.ok(files.every((f) => f.endsWith('.md')));
  assert.ok(!files.some((f) => f.startsWith('.agents/')), '.agents/ は DN-0098 の判断待ちなので二重報告しない');
});

/**
 * 「ローカルには在るが git 未追跡」の検出。
 *
 * 2026-08-21 に 2 回起きた形: 別セッションが作った未コミットの plan / doc を指す行が
 * backlog.md 経由で commit され、手元は緑のまま CI（クリーンチェックアウト）だけが赤くなった。
 * existsSync だけを見ていると原理的に捕まえられないので、追跡集合と突き合わせる。
 */
test('ローカルに在っても git 未追跡なら untracked として落ちる', () => {
  const onDisk = exists(new Set(['docs/operations/b.md']));
  const tracked = new Set(); // git には無い
  const r = auditLinks('docs/strategy/a.md', 'see [x](../operations/b.md)', onDisk, tracked);
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, 'untracked', '未追跡と実在なしを区別していない');
});

test('追跡されていれば通る（staged な新規ファイルもここに入る）', () => {
  const onDisk = exists(new Set(['docs/operations/b.md']));
  const tracked = new Set(['docs/operations/b.md']);
  assert.deepEqual(auditLinks('docs/strategy/a.md', 'see [x](../operations/b.md)', onDisk, tracked), []);
});

test('どこにも無いものは missing（未追跡と混同しない）', () => {
  const r = auditLinks('docs/strategy/a.md', 'see [x](../operations/b.md)', exists(new Set()), new Set());
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, 'missing');
});

test('tracked を渡さなければ従来どおり実在だけを見る（後方互換）', () => {
  const onDisk = exists(new Set(['docs/operations/b.md']));
  assert.deepEqual(auditLinks('docs/strategy/a.md', 'see [x](../operations/b.md)', onDisk), []);
});

test('listTracked はディレクトリも含み、対象 0 件ではない', () => {
  const t = listTracked();
  assert.ok(t.size > 1000, `追跡集合が小さすぎる: ${t.size}（走査の破損を疑う）`);
  assert.ok(t.has('package.json'), 'ファイルが入っていない');
  assert.ok(t.has('scripts'), 'ディレクトリが入っていない（ディレクトリ宛リンクが全部落ちる）');
});

// 2026-10-12（DN-0654）: staged モードが、削除・改名した宛先を指す「変更していない文書」のリンクを見ていなかった。
import { parseRemoved, findLinksToRemoved } from '../scripts/check-relative-links.mjs';

test('parseRemoved: 削除と改名の旧パスだけを返し、追加・コピーの宛先は返さない', () => {
  const z = ['D', 'docs/reviews/weekly/2026-W39-review.md', 'R100', 'docs/a.md', 'docs/b.md', 'C090', 'docs/c.md', 'docs/d.md', ''].join('\0');
  assert.deepEqual(parseRemoved(z), ['docs/reviews/weekly/2026-W39-review.md', 'docs/a.md']);
  assert.deepEqual(parseRemoved(''), []);
});

test('findLinksToRemoved: 削除したファイルを指す他の文書のリンクを壊れとして出す', () => {
  const removed = new Set(['docs/reviews/weekly/2026-W39-review.md']);
  const docs = [
    { file: 'docs/marketing/07c.md', source: '前回は[W39](../reviews/weekly/2026-W39-review.md)を見る。\n' },
    { file: 'docs/other.md', source: '[関係ない](./other2.md)\n' },
  ];
  const onDisk = new Set(['docs/other2.md']);
  const hits = findLinksToRemoved(docs, removed, (p) => onDisk.has(p), onDisk);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].file, 'docs/marketing/07c.md');
  assert.equal(hits[0].resolved, 'docs/reviews/weekly/2026-W39-review.md');
  assert.equal(hits[0].kind, 'missing');
});

test('findLinksToRemoved: 消えた宛先と無関係の既存の壊れリンクは出さない（staged の判定を広げない）', () => {
  const removed = new Set(['docs/gone.md']);
  const docs = [{ file: 'docs/x.md', source: '[gone](./gone.md) と [昔から無い](./never.md)\n' }];
  const hits = findLinksToRemoved(docs, removed, () => false, new Set());
  assert.deepEqual(hits.map((h) => h.resolved), ['docs/gone.md']);
});

test('findLinksToRemoved: 削除が無ければ何も読まない', () => {
  assert.deepEqual(findLinksToRemoved([{ file: 'a.md', source: '[x](./b.md)' }], new Set(), () => false, new Set()), []);
});
