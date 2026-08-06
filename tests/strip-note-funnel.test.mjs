/**
 * strip-note-funnel.test.mjs — ココナラ納品 PDF の note 導線除去の境界を固定する
 * ---------------------------------------------------------------------------
 * 2026-08-06、納品直前の実物検査で判明した欠陥を再発させないためのテスト。
 * 行単位の除去は正しく動いていたのに、**節が空になったことを誰も見ていなかった**ため、
 * 納品 PDF 16 冊のうち 10 冊が「関連リンク」の一語で終わり、うち 3 冊はその一語だけの
 * 空白ページが最終ページになっていた（顧客が最後に見る面）。
 * 併せて、note 側にだけ追加された「印刷用PDF の案内」「著者バナー」を再ビルドで
 * 混入させない境界も固定する（PDF を読んでいる人に PDF を案内するのは無意味・
 * バナー画像は PDF で解決できず alt だけが残る）。
 * ---------------------------------------------------------------------------
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripNoteFunnel, assertNoFunnel } from '../scripts/lib/strip-note-funnel.mjs';

test('リンクが全部消えた「関連リンク」ラベルは残らない', () => {
  const md = [
    '## 本文',
    '',
    '答案の中身。',
    '',
    '---',
    '',
    '**関連リンク**',
    '',
    '- 施工経験記述 出題傾向: [出題傾向](https://doboku-note.com/docs/foo)',
    '- 施工経験記述 改善例: [改善例](https://doboku-note.com/docs/bar)',
    '',
  ].join('\n');
  const { clean } = stripNoteFunnel(md);
  assert.ok(!clean.includes('関連リンク'), `孤立ラベルが残っている:\n${clean}`);
  assert.ok(clean.includes('答案の中身。'), '本文まで消してはいけない');
});

test('中身が残っている見出しは消さない', () => {
  const md = ['## 関連する論点', '', '- コンクリートの養生', ''].join('\n');
  const { clean } = stripNoteFunnel(md);
  assert.ok(clean.includes('## 関連する論点'));
  assert.ok(clean.includes('コンクリートの養生'));
});

test('note 専用の「印刷用PDF」節は次の見出しまで丸ごと落ちる', () => {
  const md = [
    '## 答案例',
    '',
    '本文A。',
    '',
    '## 印刷用PDF｜本記事の完成答案',
    '',
    '本記事の完成答案を、そのまま印刷できるPDFにまとめました。',
    '',
    '## 次の節',
    '',
    '本文B。',
    '',
  ].join('\n');
  const { clean } = stripNoteFunnel(md);
  assert.ok(!clean.includes('印刷用PDF'), 'PDF の中で PDF を案内してはいけない');
  assert.ok(!clean.includes('そのまま印刷できるPDF'));
  assert.ok(clean.includes('本文A。') && clean.includes('本文B。'), '前後の節は残る');
  assert.ok(clean.includes('## 次の節'), '復帰した見出しを食べてはいけない');
});

test('著者バナー画像とその定型キャプションは落ちる', () => {
  const md = [
    '# 題名',
    '',
    '![技術士（総合技術監理部門）を持つ元発注者が…](img/figure-author-authority.png)',
    '',
    '## 本文',
    '',
    '答案。',
    '',
    '上位資格の分析力・発注者の採点眼・合格者の当事者性で、あなたの答案を合格ラインへ引き上げます。',
    '',
    'https://note.com/dobokunote/m/m3a578194a0a9',
    '',
  ].join('\n');
  const { clean } = stripNoteFunnel(md);
  assert.ok(!clean.includes('figure-author-authority'));
  assert.ok(!clean.includes('上位資格の分析力'), 'URL だけ消すとキャンペーン文が宙に浮く');
  assert.ok(clean.includes('# 題名'), 'H1 は題名に使うので残す');
  assert.ok(assertNoFunnel(clean).ok);
});

test('入れ子で空になった節も収束するまで落ちる', () => {
  const md = [
    '## 参考',
    '',
    '### さらに読む',
    '',
    'https://note.com/dobokunote/foo',
    '',
    '## 本文',
    '',
    '残す。',
    '',
  ].join('\n');
  const { clean } = stripNoteFunnel(md);
  assert.ok(!clean.includes('## 参考'), '中身が空になった親見出しも落ちる');
  assert.ok(!clean.includes('さらに読む'));
  assert.ok(clean.includes('残す。'));
});
