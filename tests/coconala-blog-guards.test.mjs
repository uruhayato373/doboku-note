/**
 * coconala-blog-guards.test.mjs — ココナラブログのハードゲートの境界を固定する
 * ---------------------------------------------------------------------------
 * ここで固定するのは「間違えるとアカウントか信用が飛ぶ」境界:
 *   - 外部リンク・外部プラットフォーム言及を**必ず例外で**止めるか（戻り値だと握り潰せる）
 *   - 死んだ導線（paused/retired の出品）へ送る記事を公開できてしまわないか
 *   - 本文の金額とカタログ価格のズレを止めるか
 *   - 「0件だった」と「検査していない」を区別して返すか（TITLE_MAX 未計測時）
 * ---------------------------------------------------------------------------
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertNoExternalLinks,
  assertNoContactInfo,
  assertFunnelTargets,
  assertPriceClaims,
  assertTitle,
  assertBlogPost,
  BlogGuardError,
  SERVICE_URL_RE,
} from '../scripts/lib/coconala-blog-guards.mjs';

const CATALOG = {
  'sv-live': { id: 'sv-live', status: 'listed', title: '経験記述を診断します', priceYen: 1500 },
  'sv-live2': { id: 'sv-live2', status: 'listed', title: '添削します', priceYen: 6000 },
  'sv-paused': { id: 'sv-paused', status: 'paused', title: '休止中', priceYen: 3000 },
  'sv-draft': { id: 'sv-draft', status: 'draft', title: '未出品', priceYen: 2000 },
};

const codeOf = (fn) => {
  try { fn(); } catch (e) {
    assert.ok(e instanceof BlogGuardError, `BlogGuardError であること (got ${e?.name})`);
    return e.code;
  }
  return null; // 例外が出なかった
};

// --- G1 外部リンク ---------------------------------------------------------

test('外部リンクは例外で止まる', () => {
  assert.equal(codeOf(() => assertNoExternalLinks('詳しくは https://example.com/a を参照')), 'EXTERNAL_LINK');
});

test('note.com / doboku-note は URL でなくても止まる（テキスト言及も外部誘導）', () => {
  assert.equal(codeOf(() => assertNoExternalLinks('note.com で公開しています')), 'OFFSITE_MENTION');
  assert.equal(codeOf(() => assertNoExternalLinks('doboku-note に詳しく書きました')), 'OFFSITE_MENTION');
});

test('自出品URLは allowServiceLinks=true のときだけ通る（既定は全面ゼロ）', () => {
  const url = 'https://coconala.com/services/1234567';
  assert.equal(codeOf(() => assertNoExternalLinks(`こちら ${url}`)), 'EXTERNAL_LINK');
  const r = assertNoExternalLinks(`こちら ${url}`, { allowServiceLinks: true });
  assert.deepEqual(r, { urlsFound: 1, allowed: 1 });
});

test('SERVICE_URL_RE は他ドメイン・サブパスを許さない', () => {
  assert.ok(SERVICE_URL_RE.test('https://coconala.com/services/123'));
  assert.ok(!SERVICE_URL_RE.test('https://coconala.com/blogs/123'));
  assert.ok(!SERVICE_URL_RE.test('http://coconala.com/services/123'));
  assert.ok(!SERVICE_URL_RE.test('https://evil.com/coconala.com/services/123'));
});

test('リンクが1件も無ければ検査数0で通る（0件と未検査の区別）', () => {
  assert.deepEqual(assertNoExternalLinks('普通の本文です。'), { urlsFound: 0, allowed: 0 });
});

// --- G2 外部連絡先 ---------------------------------------------------------

test('メール・電話・LINE・外部SNSは止まる', () => {
  for (const body of ['連絡は a@b.co.jp まで', '090-1234-5678 へ', 'LINE ID: abc', 'twitter.com/foo']) {
    assert.equal(codeOf(() => assertNoContactInfo(body)), 'CONTACT_INFO', `止まるべき: ${body}`);
  }
  assert.equal(assertNoContactInfo('連絡先の記載はありません').patternsChecked, 4);
});

// --- G3 導線の実在 ---------------------------------------------------------

test('funnel が空なら止まる', () => {
  assert.equal(codeOf(() => assertFunnelTargets([], CATALOG)), 'FUNNEL_EMPTY');
});

test('カタログに無い serviceId は止まる', () => {
  assert.equal(codeOf(() => assertFunnelTargets(['sv-nope'], CATALOG)), 'FUNNEL_UNKNOWN');
});

test('listed でない出品への送客は止まる（休止・未出品の両方）', () => {
  assert.equal(codeOf(() => assertFunnelTargets(['sv-paused'], CATALOG)), 'FUNNEL_NOT_LISTED');
  assert.equal(codeOf(() => assertFunnelTargets(['sv-draft'], CATALOG)), 'FUNNEL_NOT_LISTED');
});

test('listed なら通り、対象を返す', () => {
  const { targets } = assertFunnelTargets(['sv-live', 'sv-live2'], CATALOG);
  assert.deepEqual(targets.map((t) => t.id), ['sv-live', 'sv-live2']);
});

// --- G4 価格 ---------------------------------------------------------------

test('カタログと違う金額は止まる', () => {
  assert.equal(codeOf(() => assertPriceClaims('料金は¥2,000です', ['sv-live'], CATALOG)), 'PRICE_MISMATCH');
  assert.equal(codeOf(() => assertPriceClaims('料金は2000円です', ['sv-live'], CATALOG)), 'PRICE_MISMATCH');
});

test('カタログと一致する金額は通る（¥表記・円表記・カンマ有無）', () => {
  assert.equal(assertPriceClaims('¥1,500 です', ['sv-live'], CATALOG).amountsFound, 1);
  assert.equal(assertPriceClaims('1,500円 です', ['sv-live'], CATALOG).amountsFound, 1);
  assert.equal(assertPriceClaims('1500円 です', ['sv-live'], CATALOG).amountsFound, 1);
});

test('金額に触れない本文は 0 件で通る', () => {
  const r = assertPriceClaims('価格には触れていません', ['sv-live'], CATALOG);
  assert.equal(r.amountsFound, 0);
  assert.deepEqual(r.prices, [1500]);
});

test('複数 funnel ならどちらの価格でも通る', () => {
  assert.equal(assertPriceClaims('¥6,000', ['sv-live', 'sv-live2'], CATALOG).amountsFound, 1);
});

// --- G5 タイトル -----------------------------------------------------------

test('空タイトルは止まる', () => {
  assert.equal(codeOf(() => assertTitle('   ')), 'TITLE_EMPTY');
});

test('TITLE_MAX 未計測なら lengthChecked:false を返す（黙って PASS にしない）', () => {
  const r = assertTitle('長さ未計測でも通るタイトル');
  assert.equal(r.lengthChecked, false);
  assert.equal(r.max, null);
});

test('max を渡せば長さで止まる（プローブ後の姿）', () => {
  assert.equal(codeOf(() => assertTitle('あいうえおかきくけこ', { max: 5 })), 'TITLE_TOO_LONG');
  assert.equal(assertTitle('あいうえ', { max: 5 }).lengthChecked, true);
});

// --- 統合 ------------------------------------------------------------------

test('assertBlogPost は全ゲートを通し、検査実数を返す', () => {
  const r = assertBlogPost(
    { title: '落ちる経験記述の3パターン', body: '本文です。料金は¥1,500。', funnel: ['sv-live'] },
    CATALOG,
  );
  assert.equal(r.links.urlsFound, 0);
  assert.equal(r.price.amountsFound, 1);
  assert.equal(r.funnel.targets.length, 1);
  assert.equal(r.title.lengthChecked, false);
});

test('assertBlogPost は1つでも違反があれば例外（握り潰せない）', () => {
  assert.equal(
    codeOf(() => assertBlogPost({ title: 'T', body: 'https://example.com', funnel: ['sv-live'] }, CATALOG)),
    'EXTERNAL_LINK',
  );
});
