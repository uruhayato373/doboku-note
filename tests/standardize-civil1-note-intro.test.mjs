// 1級土木 note 冒頭の標準化（scripts/standardize-civil1-note-intro.mjs）の組み直し規則を固定する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rebuildIntro, dropTailBanners, classify } from '../scripts/standardize-civil1-note-intro.mjs';

const PAST = 'magazines/1級土木-施工経験記述-過去問模範答案集/R06/article.md';
const PACK = 'magazines/1級土木-経験記述-完全攻略パック/工事101-x/article.md';

const legacy = [
  '# 題名',
  '![](img/figure-author-authority.png)',
  'この教材は、技術士（総合技術監理部門）を持つ元・地方自治体の土木職（発注者）がつくっています。',
  '総監の5つの管理の視点で記述を分析し、発注者として…',
  '**こんな人のための記事です**\n\n- A',
  '**この記事でわかること**\n\n- B',
  '---',
  '本記事は **1級土木 施工経験記述 過去問 模範答案集**（R03-R07）マガジンの収録記事です。',
  'https://note.com/dobokunote/m/m3a578194a0a9',
  '上位資格の分析力・発注者として書類を評価してきた目・合格者の当事者性で、あなたの答案を合格ラインへ引き上げます。',
  'https://note.com/dobokunote/m/m150c9db08902',
  '---',
  '施工経験記述は「自分が経験した工事」を書く問題であり、経験していない工事を書いたことが判明すると失格となります。',
  '数値の 【〇〇】 は自分の現場の値に必ず差し替えてください。',
  '<!-- cta:pack-top -->\n自分の工事に近い…完全攻略パックが最短です。',
  'https://note.com/dobokunote/m/m8290970a7f05',
  '<!-- cta:coconala-custom -->\n旧文面',
  'https://coconala.com/services/4418735',
  'まだ答案が無い人は、ヒアリングから骨子（構成）をつくるこちらへ。',
  'https://coconala.com/services/4350199',
].join('\n\n') + '\n\n';

test('標準順に組み直し、商品案内は1組だけにする', () => {
  const { intro, review } = rebuildIntro(legacy, PAST);
  assert.deepEqual(review, []);
  const order = ['# 題名', 'figure-author-authority-pop.png', 'この教材は', '総監の5つの管理', 'こんな人', 'わかること',
    '\n---\n', 'cta:coconala-custom', '4418735', '4350199', '過去問 模範答案集」の収録記事', 'm3a578194a0a9',
    'cta:pack-top', 'm8290970a7f05', '失格となります', '【〇〇】'];
  let pos = -1;
  for (const k of order) { const i = intro.indexOf(k, pos + 1); assert.ok(i > pos, `順序: ${k}`); pos = i; }
  assert.equal((intro.match(/figure-author-authority/g) || []).length, 1);
  assert.equal((intro.match(/coconala\.com/g) || []).length, 2);
  assert.ok(!intro.includes('合格ラインへ引き上げます'));
  assert.ok(!intro.includes('まだ答案が無い人は'));
  assert.ok(!intro.includes('m150c9db08902'), '収録元＋上位の2枚だけ');
  assert.equal((intro.match(/^---$/gm) || []).length, 1);
});

test('パックの工事記事は収録元1枚だけ・記事固有の文は残す', () => {
  const src = ['# 題名', '**こんな人のための記事です**\n\n- A', '供用中の橋で伸縮装置を取り替える工事の改変前提テンプレートです。',
    '> **失格注意**：自分が経験した工事だけを書きます。', 'https://note.com/dobokunote/m/m8290970a7f05'].join('\n\n');
  const { intro, review } = rebuildIntro(src, PACK);
  assert.deepEqual(review, []);
  assert.ok(intro.includes('改変前提テンプレートです'));
  assert.equal((intro.match(/note\.com\/dobokunote\/m\//g) || []).length, 1);
  assert.ok(!intro.includes('cta:pack-top'));
  assert.ok(intro.indexOf('失格注意') > intro.indexOf('m8290970a7f05'));
});

test('経験記述の答案記事で失格注意が無ければ要確認にする', () => {
  const { review } = rebuildIntro('# 題名\n\n**こんな人のための記事です**\n\n- A\n', PACK);
  assert.equal(review.length, 1);
});

test('本文側は末尾の著者画像と締めの一文だけを消す', () => {
  const rest = '## 本文\n\n文。\n\n![](img/figure-author-authority-pop.png)\n\n上位資格の分析力・発注者として書類を評価してきた目・合格者の当事者性で、あなたの答案を合格ラインへ引き上げます。\n\nhttps://note.com/dobokunote/m/x\n';
  assert.equal(dropTailBanners(rest), '## 本文\n\n文。\n\nhttps://note.com/dobokunote/m/x\n');
});

test('記事固有の段落は KEEP に分類する', () => {
  assert.equal(classify('1級土木施工管理技士 第2次検定 問題1（施工経験記述）の完全攻略パックの総合案内です。'), 'KEEP');
  assert.equal(classify('本記事は **1級土木 二次学科記述 テーマ別出る順**マガジンの収録記事です。'), 'MAG');
});

test('2回当てても変わらない（単品カードの URL を迷子にしない）', () => {
  const REL = 'magazines/1級土木-テキスト精読ガイド/施工管理-法規編/article.md';
  const src = ['# 題名', '**この記事でわかること**\n\n- A', '第1次検定の問題Bは全35問が必須です。'].join('\n\n');
  const once = rebuildIntro(src, REL).intro;
  const twice = rebuildIntro(once, REL).intro;
  assert.equal(twice, once);
  assert.equal((once.match(/nec34238ca6d6/g) || []).length, 1);
});
