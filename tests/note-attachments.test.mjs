import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listAttachedFiles, saveAttachmentDraft } from '../scripts/lib/note-attach.mjs';

function draftPage(buttonNames, persistedFiles) {
  const clicks = [], navigations = [];
  return {
    clicks, navigations,
    getByRole: (role, { name }) => {
      const matches = buttonNames.filter((text) => name.test(text));
      return { count: async () => matches.length, click: async () => clicks.push(matches[0]) };
    },
    waitForTimeout: async () => {}, waitForSelector: async () => {},
    goto: async (url) => navigations.push(url), evaluate: async () => persistedFiles,
  };
}

for (const button of ['下書き保存', '一時保存']) {
  test(`添付の下書き復旧: ${button}で保存して対象PDFを再読込し、公開しない`, async () => {
    const page = draftPage([button, '公開に進む'], ['既存.pdf', '対象.pdf']);
    const result = await saveAttachmentDraft(page, { noteId: 'n123456abcdef', expectedFile: '対象.pdf' });
    assert.equal(result.ok, true);
    assert.deepEqual(page.clicks, [button]);
    assert.deepEqual(page.navigations, ['https://editor.note.com/notes/n123456abcdef/edit/']);
  });
}

test('添付の下書き復旧: 別のPDFだけ残っていても保存成功としない', async () => {
  const page = draftPage(['一時保存', '公開に進む'], ['既存.pdf']);
  assert.equal((await saveAttachmentDraft(page, { noteId: 'n123456abcdef', expectedFile: '対象.pdf' })).ok, false);
});

test('添付の下書き復旧: 保存ボタンがなければ公開ボタンで代用しない', async () => {
  const page = draftPage(['公開に進む'], ['対象.pdf']);
  assert.equal((await saveAttachmentDraft(page, { noteId: 'n123456abcdef', expectedFile: '対象.pdf' })).ok, false);
  assert.deepEqual(page.clicks, []);
  assert.deepEqual(page.navigations, []);
});

test('添付検出: 公式資料の PDF URL だけなら添付済みにしない', async () => {
  const page = { evaluate: async () => ['https://example.jp/official.pdf'] };
  assert.deepEqual(await listAttachedFiles(page), []);
});

test('添付検出: 出典 URL と実際の配布 PDF を区別する', async () => {
  const page = { evaluate: async () => ['https://example.jp/official.pdf', '想定24問.pdf'] };
  assert.deepEqual(await listAttachedFiles(page), ['想定24問.pdf']);
});

import {
  evaluatePreSaveGate,
  evaluatePostSaveGate,
  needsConfirm,
  expectedPdfs,
  expectationsByNoteId,
  recordAttachmentLoss,
  publicAttachmentCount,
} from '../scripts/lib/note-attachments.mjs';

test('公開APIの有料域と無料域の添付本数を合算し、限定・誤対象・欠測は著者確認へ回す', () => {
  const live = { key: 'n123456abcdef', status: 'published', is_limited: false, remained_file_num: 2, body: '<a href="/api/v2/attachments/download/1">PDF</a>' };
  assert.equal(publicAttachmentCount(live, live.key), 3);
  assert.equal(publicAttachmentCount({ ...live, remained_file_num: 0, body: '' }, live.key), 0);
  for (const partial of [{ ...live, is_limited: true }, { ...live, key: 'n999999999999' }, { ...live, remained_file_num: null }, { ...live, status: 'draft' }, {}]) {
    assert.equal(publicAttachmentCount(partial, live.key), null);
  }
});

// ---------------------------------------------------------------------------
// 保存前ゲート（DN-0177）: 「壊れたエディタ状態を正として保存する」を止めるのが目的。
// ---------------------------------------------------------------------------
test('保存前ゲート: 期待 PDF がある記事で添付 0 なら保存させない', () => {
  assert.equal(evaluatePreSaveGate({ expected: 1, before: 0 }).ok, false);
  assert.match(evaluatePreSaveGate({ expected: 2, before: 1 }).reason, /1\/2/);
});

test('保存前ゲート: 期待どおり添付があるか、配布 PDF が無い記事は通す', () => {
  assert.equal(evaluatePreSaveGate({ expected: 2, before: 2 }).ok, true);
  assert.equal(evaluatePreSaveGate({ expected: 2, before: 3 }).ok, true);
  assert.equal(evaluatePreSaveGate({ expected: 0, before: 0 }).ok, true);
});

test('保存前ゲート: 計測できていない（未計測）を「問題なし」と扱わない', () => {
  assert.equal(evaluatePreSaveGate({ expected: 1, before: undefined }).ok, false);
  assert.equal(evaluatePreSaveGate({ expected: null, before: 1 }).ok, false);
});

test('保存後ゲート: 減少を検出し、維持・増加は通す', () => {
  assert.equal(evaluatePostSaveGate({ before: 2, after: 1 }).ok, false);
  assert.match(evaluatePostSaveGate({ before: 2, after: 1 }).reason, /2→1/);
  assert.equal(evaluatePostSaveGate({ before: 2, after: 2 }).ok, true);
  assert.equal(evaluatePostSaveGate({ before: 0, after: 1 }).ok, true);
  assert.equal(evaluatePostSaveGate({ before: 2, after: null }).ok, false);
});

// ---------------------------------------------------------------------------
// live 実査の確定パス（DN-0176）: 不足と出た記事だけを単独条件で測り直す。
// ---------------------------------------------------------------------------
test('確定パス: 不足のときだけ再実測へ回し、取得失敗（null）は回さない', () => {
  assert.equal(needsConfirm({ live: 0, want: 1 }), true);
  assert.equal(needsConfirm({ live: 1, want: 1 }), false);
  assert.equal(needsConfirm({ live: 2, want: 1 }), false);
  assert.equal(needsConfirm({ live: null, want: 1 }), false);
});

// ---------------------------------------------------------------------------
// 期待値の算出: 実査と保存経路が同じ規則を使うための単一真実源。
// ---------------------------------------------------------------------------
function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'note-attach-'));
  const dir = join(root, 'content/note/mag/kiji');
  mkdirSync(join(dir, 'pdf'), { recursive: true });
  writeFileSync(join(dir, 'article.md'), '---\nnoteId: nAAA\nnoteStatus: published\n---\n\n# 記事\n\n末尾にPDFを添付しています。\n');
  writeFileSync(join(dir, 'pdf', 'shiryo.pdf'), 'x');
  const typed = join(root, 'content/note/mag/kata');
  mkdirSync(typed, { recursive: true });
  writeFileSync(join(typed, 'article-II1.md'), '---\nnoteId: nBBB\n---\n\n# 型別\n');
  writeFileSync(join(typed, 'article.md'), '---\nnoteId: nCCC\n---\n\n# 素の記事\n');
  writeFileSync(join(typed, 'x-II-1-kaito.pdf'), 'x');
  const draft = join(root, 'content/note/mag/mikoukai');
  mkdirSync(draft, { recursive: true });
  writeFileSync(join(draft, 'article.md'), '---\nnoteId: nDDD\nnoteStatus: draft\n---\n\n# 下書き\n');
  return root;
}

test('期待値: 記事 dir 直下と pdf/ の PDF を拾う', () => {
  const root = fixtureRoot();
  try {
    const got = expectedPdfs(join(root, 'content/note/mag/kiji/article.md'), { root });
    assert.equal(got.length, 1);
    assert.match(got[0], /shiryo\.pdf$/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('期待値: 型別 article は自分の型の PDF だけを取り、素の article は型別 PDF を取らない', () => {
  const root = fixtureRoot();
  try {
    const typed = expectedPdfs(join(root, 'content/note/mag/kata/article-II1.md'), { root });
    assert.equal(typed.length, 1);
    assert.match(typed[0], /x-II-1-kaito\.pdf$/);
    const plain = expectedPdfs(join(root, 'content/note/mag/kata/article.md'), { root });
    assert.deepEqual(plain, []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('noteId 対応表: 公開済みだけを載せ、下書きは載せない', () => {
  const root = fixtureRoot();
  try {
    const map = expectationsByNoteId({ root });
    assert.equal(map.has('nAAA'), true);
    assert.equal(map.get('nAAA').expected.length, 1);
    assert.equal(map.get('nAAA').promises, true);
    assert.equal(map.has('nBBB'), true);
    assert.equal(map.has('nDDD'), false, 'noteStatus: draft は対象外');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------------------
// 負債台帳: 喪失を黙って捨てない。
// ---------------------------------------------------------------------------
test('負債台帳: pending へ1件だけ積み、同じ noteId は重複させない', () => {
  const root = mkdtempSync(join(tmpdir(), 'note-loss-'));
  try {
    recordAttachmentLoss({ root, noteId: 'nZZZ', reason: '価格変更を中止', dropped: ['a.pdf'] });
    recordAttachmentLoss({ root, noteId: 'nZZZ', reason: '境界再設定を中止', dropped: ['a.pdf'] });
    const j = JSON.parse(readFileSync(join(root, '.claude/state/note-attachment-loss.json'), 'utf8'));
    assert.equal(j.pending.length, 1);
    assert.equal(j.pending[0].noteId, 'nZZZ');
    assert.equal(j.pending[0].reason, '境界再設定を中止');
    assert.deepEqual(j.pending[0].dropped, ['a.pdf']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------------------
// DN-0518: noteId が frontmatter に無くても noteUrl から引く。約束ありで PDF 無しは「未添付」に数える。
// ---------------------------------------------------------------------------
import { articleNoteId, classifyAttachmentTargets } from '../scripts/lib/note-attachments.mjs';

test('articleNoteId: noteId が無ければ noteUrl の /n/<key> から引く', () => {
  assert.equal(articleNoteId('---\nnoteUrl: "https://note.com/dobokunote/n/n30d34b67a8c5"\n---\n'), 'n30d34b67a8c5');
  assert.equal(articleNoteId('---\nnoteId: "nAAA"\nnoteUrl: "https://note.com/x/n/nBBB"\n---\n'), 'nAAA');
  assert.equal(articleNoteId('---\ntitle: 下書き\n---\n'), '');
});

test('noteId 欠落（noteUrl のみ）で PDF を約束した記事も対応表に載る', () => {
  const root = mkdtempSync(join(tmpdir(), 'na-url-'));
  try {
    const dir = join(root, 'content/note/mag/kiji');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'article.md'), '---\nnoteUrl: "https://note.com/dobokunote/n/n30d34b67a8c5"\n---\n\n# 題\n\n印刷用 PDF 付き\n');
    const map = expectationsByNoteId({ root });
    assert.equal(map.has('n30d34b67a8c5'), true);
    assert.equal(map.get('n30d34b67a8c5').promises, true);
    assert.equal(map.get('n30d34b67a8c5').expected.length, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('対象の振り分け: 約束あり・PDF 実体なし・allowlist 外だけ promisedNoPdf（PDF ありは need）', () => {
  const t = (noteId, promises, expected, allow = null) => ({ noteId, promises, expected, allow });
  const r = classifyAttachmentTargets([
    t('a', true, []), t('b', true, ['x.pdf']), t('c', false, []), t('d', true, [], { reason: 'ok' }),
  ]);
  assert.deepEqual(r.promisedNoPdf.map((x) => x.noteId), ['a']);
  assert.deepEqual(r.need.map((x) => x.noteId), ['b']);
});
