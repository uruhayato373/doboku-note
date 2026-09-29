/**
 * 記事単位の反映計画（scripts/lib/note-sync-plan.mjs の classifySync / hasBoundaryHeading / orderForRun）。
 * Mac の週次・CI・管理画面が同じ判定で動くので、未反映の部品と止まっている理由の振り分けをここで固定する。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { classifySync, hasBoundaryHeading, orderForRun, SAFE_ABORTS } from '../scripts/lib/note-sync-plan.mjs';

const base = { bodyReason: null, assetDrift: false, tagDrift: false, metaDrift: false, coverReason: null, abort: null, imageMissing: [], pdfPending: false, pdfLocal: false };

test('何も変わっていなければ反映済み', () => {
  const r = classifySync(base);
  assert.equal(r.status, 'synced');
  assert.deepEqual(r.parts, []);
});

test('本文・カバー・タグを 1 回の更新の部品としてまとめる', () => {
  const r = classifySync({ ...base, bodyReason: 'drift', coverReason: 'design', tagDrift: true });
  assert.equal(r.status, 'ready');
  assert.deepEqual(r.parts, ['body', 'cover', 'tags']);
});

test('本文の画像・PDF の中身だけが変わったときも本文を上げ直す', () => {
  const r = classifySync({ ...base, assetDrift: true });
  assert.deepEqual(r.parts, ['body']);
  assert.equal(r.reasons.body, 'asset');
});

test('配布 PDF が手元に無い本文の更新は、取り寄せが要る印を付けて反映待ちに置く（止めない）', () => {
  const r = classifySync({ ...base, bodyReason: 'drift', pdfPending: true, pdfLocal: false });
  assert.equal(r.status, 'ready');
  assert.equal(r.needsPdfPull, true);
  assert.equal(classifySync({ ...base, coverReason: 'input', pdfPending: true }).needsPdfPull, false, '本文を触らないなら取り寄せない');
});

test('保存前に止まった中断は自動で再試行し、それ以外は止める', () => {
  for (const reason of SAFE_ABORTS) assert.equal(classifySync({ ...base, bodyReason: 'drift', abort: { reason } }).status, 'ready', reason);
  const r = classifySync({ ...base, bodyReason: 'drift', abort: { reason: '更新フローが false を返した' } });
  assert.equal(r.status, 'blocked');
  assert.equal(r.blocker, 'aborted');
});

test('会員特典の公開範囲は memberTrial を書けば解消する', () => {
  assert.equal(classifySync({ ...base, bodyReason: 'drift', abort: { reason: 'trial-guard' } }).blocker, 'trial-guard');
  assert.equal(classifySync({ ...base, bodyReason: 'drift', abort: { reason: 'trial-guard' }, memberTrial: 'bottom' }).status, 'ready');
});

test('本文の画像が手元に無い・有料境界の見出しが無い・価格が変わった記事は止める', () => {
  assert.equal(classifySync({ ...base, bodyReason: 'drift', imageMissing: ['img/a.png（ファイル無し・除去）'] }).blocker, 'image-missing');
  assert.equal(classifySync({ ...base, bodyReason: 'drift', boundaryMissing: true }).blocker, 'boundary');
  assert.equal(classifySync({ ...base, coverReason: 'design', boundaryMissing: true }).status, 'ready', '本文を触らないなら境界は動かさない');
  assert.equal(classifySync({ ...base, metaDrift: true }).blocker, 'meta');
});

test('有料境界の見出しは paidBoundary（無ければ 試験問題|予想問題）の H2 で探す', () => {
  assert.equal(hasBoundaryHeading('## 試験問題\n本文', null), true);
  assert.equal(hasBoundaryHeading('## まとめ\n本文', null), false);
  assert.equal(hasBoundaryHeading('## 模範論文\n本文', '模範論文'), true);
});

test('週次は本文なし → 画像なしの本文 → 画像ありの本文の順に流し、反映待ちだけを選ぶ', () => {
  const items = [
    { path: 'c', status: 'ready', parts: ['body'], images: 2 },
    { path: 'a', status: 'ready', parts: ['cover'], images: 5 },
    { path: 'b', status: 'ready', parts: ['body', 'cover'], images: 0 },
    { path: 'd', status: 'blocked', parts: ['body'], images: 0 },
    { path: 'e', status: 'synced', parts: [], images: 0 },
  ];
  assert.deepEqual(orderForRun(items).map((i) => i.path), ['a', 'b', 'c']);
});

test('Drive に預けた配布 PDF がある記事 dir を拾う（原稿が PDF に触れていなくても note に添付がある・2026-09-29 工事21）', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { drivePdfDirs } = await import('../scripts/lib/note-sync-plan.mjs');
  const root = mkdtempSync(join(tmpdir(), 'note-sync-drive-'));
  try {
    mkdirSync(join(root, '.claude/state/assets'), { recursive: true });
    writeFileSync(join(root, '.claude/state/assets/drive-manifest.json'), JSON.stringify({ entries: {
      'content/note/a/工事21/1級土木-経験記述-工事21.pdf': {},
      'content/note/b/R06/pdf/R06.pdf': {},
      'content/note/c/img/figure.png': {},
    } }));
    const dirs = drivePdfDirs(root);
    assert.deepEqual([...dirs].sort(), ['content/note/a/工事21', 'content/note/b/R06']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
