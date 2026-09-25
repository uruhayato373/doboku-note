/**
 * tensaku-reply-guards.test.mjs — 顧客返信文ゲートの境界を固定する
 * ---------------------------------------------------------------------------
 * ここで固定するのは「間違えると顧客への誤情報・規約違反になる」境界:
 *   - 書き換え例の（N字）表記が実字数とずれたら止めるか（CRLF でも数え方が変わらないか）
 *   - 原稿に無い工事の数値を止め、試験制度側の数値（字・行・年度）は止めないか
 *   - 外部誘導・合格保証・下書き注記の消し忘れを止めるか
 *   - 「--source なし」を検査済みと取り違えないか
 * ---------------------------------------------------------------------------
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkReply, extractRewriteBlocks, countChars } from '../scripts/lib/tensaku-reply-guards.mjs';

const SOURCE = '漏水が1,260箇所判明し、当初推定の800箇所を上回った。約20分から約10分に短縮。2班から3班に増員。延長2km。工期 2024年10月1日〜2027年3月1日。';
const codes = (r) => r.violations.map((v) => v.code);

test('書き換え例: 表記と実字数が一致すれば通す（CRLF でも同じ字数）', () => {
  const body = 'あ'.repeat(180);
  const lf = `(1) 課題（180字）\n${body}\n\n以上`;
  assert.deepEqual(codes(checkReply(lf, { source: SOURCE, maxChars: 200 })), []);
  assert.deepEqual(codes(checkReply(lf.replace(/\n/g, '\r\n'), { source: SOURCE, maxChars: 200 })), []);
});

test('書き換え例: 表記ずれ・上限超過・8割未満を止める', () => {
  assert.ok(codes(checkReply(`(1) 課題（180字）\n${'あ'.repeat(170)}`, { maxChars: 200, source: '' })).includes('R5_COUNT_MISMATCH'));
  assert.ok(codes(checkReply(`(1) 課題（210字）\n${'あ'.repeat(210)}`, { maxChars: 200, source: '' })).includes('R5_OVER_LIMIT'));
  assert.ok(codes(checkReply(`(1) 課題（100字）\n${'あ'.repeat(100)}`, { maxChars: 200, source: '' })).includes('R5_TOO_SHORT'));
});

test('書き換え例: 空行までを本文とし、空白は数えない', () => {
  const [b] = extractRewriteBlocks('(2) 対応（6字）\nあい う\nえお か\n\n次の段落は含めない');
  assert.equal(b.actual, 6);
  assert.equal(countChars(' あ\tい\n'), 2);
});

test('数値の出典: 原稿に無い工事の数値を止め、表記揺れ（カンマ・全角）は同じ値とみなす', () => {
  const ok = checkReply('漏水は１２６０箇所、作業は約10分、3班、2027年まで。', { source: SOURCE });
  assert.deepEqual(codes(ok), []);
  assert.equal(ok.stats.facts.inspected, 4);
  const ng = checkReply('作業時間を約15分に短縮し、4班に増員した。', { source: SOURCE });
  assert.deepEqual(codes(ng), ['R6_UNGROUNDED_NUMBER', 'R6_UNGROUNDED_NUMBER']);
});

test('数値の出典: 試験制度側の数値（字・行・年度・回・テーマ）は対象にしない', () => {
  const r = checkReply('令和6年度以降は2テーマ必答で、各200字（25字×8行）。書き直しは1回。', { source: SOURCE });
  assert.equal(r.stats.facts.inspected, 0);
  assert.deepEqual(codes(r), []);
});

test('--source なしは R6 未検査として返す（検査済みと区別する）', () => {
  const r = checkReply('4班に増員した。');
  assert.equal(r.stats.facts.checked, false);
  assert.equal(r.stats.facts.inspected, 0);
});

test('外部誘導・合格保証・下書き注記・長さを止める', () => {
  assert.ok(codes(checkReply('詳しくは https://example.com へ', { source: '' })).some((c) => c.startsWith('R2_')));
  assert.ok(codes(checkReply('note.com の記事もどうぞ', { source: '' })).some((c) => c.startsWith('R2_')));
  assert.ok(codes(checkReply('これで必ず合格できます', { source: '' })).includes('R3_GUARANTEE'));
  assert.deepEqual(codes(checkReply('合格できますようお祈りしています', { source: '' })), []);
  assert.ok(codes(checkReply('> [!note] このドラフトは AI 下書きです', { source: '' })).includes('R4_DRAFT_NOTE'));
  assert.ok(codes(checkReply('あ'.repeat(3001), { source: '' })).includes('R1_TOO_LONG'));
});
