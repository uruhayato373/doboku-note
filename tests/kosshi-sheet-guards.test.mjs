/**
 * kosshi-sheet-guards.test.mjs — 骨子シートゲートの境界を固定する
 * ---------------------------------------------------------------------------
 * ここで固定するのは「間違えると代筆（代行）や捏造になる」境界:
 *   - 答案の文章（引用の外の長い地の文）を止め、見出し・短い指示・長い引用は止めないか
 *   - ヒアリングシートに無い引用・数値を止め、表記の揺れ（全角数字・空白）では止めないか
 *   - テーマ節の（1）（2）区画の欠け、外部誘導・合格保証・下書き注記を止めるか
 *   - 「--source なし」を検査済みと取り違えないか
 * ---------------------------------------------------------------------------
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkKosshiSheet, splitSections } from '../scripts/lib/kosshi-sheet-guards.mjs';

const SOURCE = [
  '1. 工事名: 市道○○線舗装補修工事',
  '5. 工種・規模: 切削オーバーレイ 延長 450m、舗装面積 3,150m2',
  '6. 立場: 現場代理人',
  '7-2. 課題: 夏季施工で合材の温度低下が早く、初期転圧温度110℃を確保できないおそれがあった',
  '7-3. 検討: 運搬時間の短縮と保温シートの使用を検討した',
  '7-4. 対応: 保温シートを二重にし、プラントからの運搬を30分以内とした',
  '7-5. 結果: 到着時温度を全車で確認し、締固め度の規格値を満たした',
].join('\n');

const GOOD = `【骨子シート】1級土木 施工経験記述（2テーマ）
ご回答の事実を、設問ごとに何を・どの順で書くかに並べました。答案の文章はご自身で書いてください。

■ 工事概要
・工事名: 「市道○○線舗装補修工事」
・工種・規模: 「切削オーバーレイ 延長 450m、舗装面積 3,150m2」
・あなたの立場: 「現場代理人」

■ テーマ①: 品質管理
（1）現場状況・技術的課題と検討した項目（目安 約200字）
① 現場の状況（約50字）: 「夏季施工で合材の温度低下が早く」
② 技術的課題（約60字）: 「初期転圧温度110℃を確保できない」→（なぜ問題か: ご自身の言葉で）
③ 検討した項目（約90字）: 「運搬時間の短縮」「保温シートの使用」
（2）対応処置とその評価（目安 約200字）
① 対応処置（約130字）: 「保温シートを二重にし」「運搬を30分以内」
② 評価（約70字）: 「締固め度の規格値を満たした」
書くときの注意: 設問1と設問2で同じ内容を繰り返さない

■ 確認したいこと
・到着時の温度は何℃でしたか？記録があれば数値で教えてください。

■ このあとの流れ
骨子をもとに答案を書き、このトークルームへお送りください。受け取りから48時間以内に添削してお返しします。
`;

const codes = (r) => r.violations.map((v) => v.code);

test('書式どおりの骨子シートは通し、節・引用・数値の実検査件数を数える', () => {
  const r = checkKosshiSheet(GOOD, { source: SOURCE });
  assert.deepEqual(codes(r), []);
  assert.equal(r.stats.themes, 1);
  assert.equal(r.stats.sections, 2);
  assert.ok(r.stats.quotes.inspected >= 8);
  assert.equal(r.stats.quotes.grounded, r.stats.quotes.inspected);
  assert.ok(r.stats.facts.inspected >= 3);
});

test('K2: 引用の外に答案の文章を書いたら止める（前置き・確認・流れの節は対象外）', () => {
  const prose = GOOD.replace(
    '① 対応処置（約130字）: 「保温シートを二重にし」「運搬を30分以内」',
    '① 対応処置: 合材の温度低下を防ぐため、保温シートを二重にして運搬車両の荷台を覆い、プラントからの運搬時間を短縮した。',
  );
  assert.ok(codes(checkKosshiSheet(prose, { source: SOURCE })).includes('K2_SENTENCE'));
  const long = GOOD.replace('→（なぜ問題か: ご自身の言葉で）', '→ 合材の温度低下を防ぐため保温シートを二重にして運搬車両の荷台を覆い運搬時間を短縮して初期転圧温度を確保した');
  assert.ok(codes(checkKosshiSheet(long, { source: SOURCE })).includes('K2_PROSE'));
  const many = GOOD.replace('書くときの注意: 設問1と設問2で同じ内容を繰り返さない', Array(12).fill('書くときの注意: 設問1と設問2で同じ内容を繰り返さず数値を具体的に示す').join('\n'));
  assert.ok(codes(checkKosshiSheet(many, { source: SOURCE })).includes('K2_TOO_MUCH_OWN'));
  // 長い引用は地の文に数えない
  assert.deepEqual(codes(checkKosshiSheet(GOOD, { source: SOURCE })), []);
});

test('K1: ヒアリングシートに無い引用を止め、空白・全角数字の揺れでは止めない', () => {
  const made = GOOD.replace('「締固め度の規格値を満たした」', '「締固め度98%を確保した」');
  assert.ok(codes(checkKosshiSheet(made, { source: SOURCE })).includes('K1_UNGROUNDED_QUOTE'));
  const spaced = GOOD.replace('「切削オーバーレイ 延長 450m、舗装面積 3,150m2」', '「切削オーバーレイ延長４５０m、舗装面積 3,150m2」');
  assert.deepEqual(codes(checkKosshiSheet(spaced, { source: SOURCE })), []);
});

test('K6: 回答の文を丸ごと引いた長い引用を止める', () => {
  const whole = GOOD.replace('「保温シートを二重にし」「運搬を30分以内」', '「夏季施工で合材の温度低下が早く、初期転圧温度110℃を確保できないおそれがあった」');
  assert.ok(codes(checkKosshiSheet(whole, { source: SOURCE })).includes('K6_LONG_QUOTE'));
});

test('K3: 引用の外に書いた数値もヒアリングシートに無ければ止める', () => {
  const num = GOOD.replace('→（なぜ問題か: ご自身の言葉で）', '→ 到着時 140℃・運搬 45分');
  assert.ok(codes(checkKosshiSheet(num, { source: SOURCE })).includes('K3_UNGROUNDED_NUMBER'));
});

test('K4: テーマ節が無い・区画が欠けたら止める', () => {
  assert.ok(codes(checkKosshiSheet('■ 工事概要\n・工事名: 「市道○○線舗装補修工事」', { source: SOURCE })).includes('K4_NO_THEME'));
  const noPart2 = GOOD.replace('（2）対応処置とその評価', '対応処置とその評価');
  assert.ok(codes(checkKosshiSheet(noPart2, { source: SOURCE })).includes('K4_MISSING_PART'));
});

test('K5: 外部誘導・合格保証・下書き注記の消し忘れを止める', () => {
  const c = codes(checkKosshiSheet(`${GOOD}\n必ず合格できます。\n> [!note] このドラフトは AI 下書きです。\nhttps://example.com`, { source: SOURCE }));
  assert.ok(c.includes('K5_GUARANTEE'));
  assert.ok(c.includes('K5_DRAFT_NOTE'));
  assert.ok(c.some((x) => x.startsWith('K5_') && !['K5_GUARANTEE', 'K5_DRAFT_NOTE'].includes(x)));
});

test('--source なしでは引用・数値を「未検査」として返す（検査済みと取り違えない）', () => {
  const r = checkKosshiSheet(GOOD);
  assert.equal(r.stats.quotes.checked, false);
  assert.equal(r.stats.facts.checked, false);
  assert.equal(r.stats.quotes.inspected, 0);
});

test('節の分割: 「■ 」見出しだけで区切り、見出し前は前置きの節', () => {
  const s = splitSections('前置き\n■ テーマ①: 安全管理\n（1）\n■ 確認したいこと\n・？');
  assert.deepEqual(s.map((x) => x.name), ['', 'テーマ①: 安全管理', '確認したいこと']);
});
