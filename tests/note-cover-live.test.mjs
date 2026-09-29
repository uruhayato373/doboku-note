/**
 * note カバーの登録判定（scripts/lib/note-cover-live.mjs の planCoverWork）。
 * CI の check-note-sync と Mac の週次 note-sync-routine（マガジン）・lib/note-sync-plan（記事）が同じ判定で動くので、ここで理由の振り分けを固定する。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { coverInputHash, planCoverWork, recordCover, sameImage } from '../scripts/lib/note-cover-live.mjs';

const design = { article: 'v2', magazine: 'm2' };
const article = (key, extra = {}) => ({
  key, kind: 'article', noteId: 'n0123456789ab', imagePath: `${key}/img/cover.png`, source: key,
  input: { title: key, poseSelection: { pose: 'reading' } }, ...extra,
});
const magazine = (key) => ({ key, kind: 'magazine', imagePath: `content/note/x/magazines/${key}/_cover.png`, input: { title: key, poseSelection: { pose: 'smile' } } });
const live = (eyecatch = 'https://assets.st-note.com/a.png?width=1280') => ({ noteKey: 'n0123456789ab', status: 'published', isDraft: false, isReserved: false, eyecatch });

function ledgerWith(target, overrides = {}) {
  const ledger = { articles: {}, magazines: {} };
  recordCover(ledger, target, { design: design[target.kind], noteKey: target.kind === 'article' ? target.noteId : 'm1', liveUrl: 'https://assets.st-note.com/a.png', sha256: 'x' });
  Object.assign((target.kind === 'article' ? ledger.articles : ledger.magazines)[target.key], overrides);
  return ledger;
}
const plan = (targets, ledger, liveArticles = {}, liveMagazines = {}) => planCoverWork({ targets, ledger, design, liveArticles, liveMagazines });

test('台帳と note が一致していれば最新（クエリの違いは同じ画像として扱う）', () => {
  const t = article('a');
  const r = plan([t], ledgerWith(t), { a: live() });
  assert.equal(r.ok.length, 1);
  assert.equal(r.pending.length, 0);
});

test('要登録の理由を振り分ける', () => {
  const t = article('a');
  const reason = (ledger, l = live()) => plan([t], ledger, { a: l }).pending[0]?.reason;
  assert.equal(reason(ledgerWith(t), live(null)), 'no-cover');
  assert.equal(reason({ articles: {}, magazines: {} }), 'unrecorded');
  assert.equal(reason(ledgerWith(t, { design: 'v1' })), 'design');
  assert.equal(reason(ledgerWith(t, { inputHash: 'old' })), 'input');
  assert.equal(reason(ledgerWith(t), live('https://assets.st-note.com/b.png')), 'live-changed');
});

test('ポーズだけの違いは再登録にしない（前後の記事でずれるため）', () => {
  const t = article('a');
  const moved = { ...t, input: { ...t.input, poseSelection: { pose: 'pointing' } } };
  assert.equal(coverInputHash(t), coverInputHash(moved));
  assert.notEqual(coverInputHash(t), coverInputHash({ ...t, input: { ...t.input, title: '別の見出し' } }));
});

test('登録しようがないものは保留にする（要登録に数えない）', () => {
  const r = plan([
    article('draft', { noteId: null, noteStatus: 'draft' }),
    article('reserved'),
    article('gone'),
    magazine('unknown'),
  ], { articles: {}, magazines: {} }, {
    reserved: { ...live(), isReserved: true, publishAt: '2026-10-01' },
    gone: { noteKey: 'n0123456789ab', error: 'HTTP 404' },
  }, { unknown: { noteKey: null, reason: 'note掲載文.txt が無い' } });
  assert.equal(r.pending.length, 0);
  assert.deepEqual(r.hold.map((x) => x.key), ['draft', 'reserved', 'gone', 'unknown']);
});

test('マガジンは同定した noteKey と cover で判定する', () => {
  const m = magazine('mag');
  const ledger = ledgerWith(m);
  const ok = plan([m], ledger, {}, { mag: { noteKey: 'm1', status: 'public', cover: 'https://assets.st-note.com/a.png' } });
  assert.equal(ok.ok.length, 1);
  const moved = plan([m], ledger, {}, { mag: { noteKey: 'm9', status: 'public', cover: 'https://assets.st-note.com/a.png' } });
  assert.equal(moved.pending[0].reason, 'unrecorded');
});

test('sameImage は取れない側があれば判定しない', () => {
  assert.equal(sameImage(null, 'https://a/b.png'), null);
  assert.equal(sameImage('https://a/b.png?w=1', 'https://a/b.png'), true);
});
