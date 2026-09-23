/**
 * note 公開ページの見え方の判定（scripts/lib/note-public-view.mjs）を固定する。
 * 2026-09-23: 無料の入口記事が全文会員限定になった事故・PDF 添付の欠落・会員限定記事の誤検出を扱う。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { evaluateApi, evaluateRendered, MIN_CARD_HEIGHT } from '../scripts/lib/note-public-view.mjs';

const live = (o = {}) => ({ price: 0, is_limited: false, eyecatch: 'https://assets.st-note.com/x.png', remained_file_num: 0, body: '<p>本文</p>', ...o });
const src = (o = {}) => ({ pricing: 'free', price: 0, expectedPdfs: 0, lockPolicy: null, ...o });

test('PDF: 有料エリアの添付数（remained_file_num）と本文内の添付を足して、原稿の本数に足りなければ BAD', () => {
  assert.deepEqual(evaluateApi(src({ pricing: 'paid', price: 780, expectedPdfs: 1 }), live({ price: 780, remained_file_num: 1 })).bad, []);
  assert.match(evaluateApi(src({ pricing: 'paid', price: 780, expectedPdfs: 1 }), live({ price: 780, remained_file_num: 0 })).bad[0], /PDF 不足/);
  assert.deepEqual(evaluateApi(src({ expectedPdfs: 1 }), live({ body: '<a href="https://note.com/api/v2/attachments/download/abc">x.pdf</a>' })).bad, []);
});

test('PDF: 会員限定は未ログインで数えられないので判定しない（欠落扱いにしない）', () => {
  assert.deepEqual(evaluateApi(src({ pricing: 'membership', expectedPdfs: 1 }), live({ is_limited: true, body: '' })).bad, []);
});

test('価格の食い違いとカバー無しは BAD', () => {
  assert.match(evaluateApi(src({ pricing: 'paid', price: 980 }), live({ price: 780 })).bad[0], /価格が違う/);
  assert.match(evaluateApi(src(), live({ eyecatch: null })).bad[0], /カバー画像なし/);
});

test('無料記事の全文会員限定: 台帳に無ければ BAD、判断待ちは WARN、意図したものは OK、試し読みで読めれば OK', () => {
  const locked = live({ is_limited: true, body: '' });
  assert.match(evaluateApi(src(), locked).bad[0], /全文会員限定/);
  assert.match(evaluateApi(src({ lockPolicy: 'pending', pendingRef: 'DN-0275' }), locked).warn[0], /DN-0275/);
  assert.deepEqual(evaluateApi(src({ lockPolicy: 'intentional' }), locked), { bad: [], warn: [] });
  assert.deepEqual(evaluateApi(src(), live({ is_limited: true, body: '<p>試し読みで読める本文</p>' })).bad, []);
});

test('画面: 壊れた画像・描画されないカード・はみ出しは BAD、読み込み待ちは WARN', () => {
  const ok = { status: 200, bodyFound: true, locked: false, imgs: 2, imgBroken: 0, imgPending: 0, cardHeights: [139, 210], overflow: [] };
  assert.deepEqual(evaluateRendered(ok), { bad: [], warn: [] });
  assert.match(evaluateRendered({ ...ok, imgBroken: 1 }).bad[0], /画像が読み込めない/);
  assert.match(evaluateRendered({ ...ok, cardHeights: [139, MIN_CARD_HEIGHT - 1] }).bad[0], /リンクカード/);
  assert.match(evaluateRendered({ ...ok, overflow: ['table'] }).bad[0], /はみ出す/);
  assert.match(evaluateRendered({ ...ok, imgPending: 1 }).warn[0], /読み込みが終わらない/);
});

test('画面: 会員限定は本文要素が無くても BAD にしない（2026-09-23 の誤検出）。公開記事で無ければ BAD', () => {
  const base = { status: 200, bodyFound: false, imgs: 0, imgBroken: 0, imgPending: 0, cardHeights: [], overflow: [] };
  assert.deepEqual(evaluateRendered({ ...base, locked: true }).bad, []);
  assert.match(evaluateRendered({ ...base, locked: false }).bad[0], /本文の要素/);
  assert.match(evaluateRendered({ ...base, status: 404, locked: false }).bad[0], /HTTP 404/);
});

test('代表ページのグループ: 資格 × 種類（もくじ・マガジン入口・会員限定・有料PDF付き・有料・無料）', async () => {
  const { noteGroup } = await import('../scripts/lib/note-public-view.mjs');
  assert.equal(noteGroup({ rel: '技術士総監/総監もくじ/article.md', pricing: 'free', pdfs: 0 }), '技術士総監｜もくじ');
  assert.equal(noteGroup({ rel: '1級・2級土木/1級土木/magazines/1級土木-二次まるごとパック/article.md', pricing: 'free', pdfs: 0 }), '1級・2級土木｜マガジン入口');
  assert.equal(noteGroup({ rel: '技術士建設部門/magazines/BK-01_道路/R03/article-III.md', pricing: 'paid', pdfs: 1 }), '技術士建設部門｜有料PDF付き');
  assert.equal(noteGroup({ rel: '1級・2級土木/メンバーシップ/学科記述予想/01_土工/article.md', pricing: 'membership', pdfs: 0 }), '1級・2級土木｜会員限定');
  assert.equal(noteGroup({ rel: '共通/AIで土木資格を攻略/article.md', pricing: 'free', pdfs: 0 }), '共通｜無料');
});

test('代表ページ: グループごとに公開・更新がいちばん新しい 1 本（同日はパス順）', async () => {
  const { pickRepresentatives } = await import('../scripts/lib/note-public-view.mjs');
  const reps = pickRepresentatives([
    { group: 'A', date: '2026-08-01', path: 'a1' },
    { group: 'A', date: '2026-09-01', path: 'a2' },
    { group: 'B', date: '2026-09-01', path: 'b2' },
    { group: 'B', date: '2026-09-01', path: 'b1' },
    { group: 'C', date: '', path: 'c1' },
  ]);
  assert.deepEqual(reps.map((r) => r.path), ['a2', 'b1', 'c1']);
});
