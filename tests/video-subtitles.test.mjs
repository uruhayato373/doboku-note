import test from 'node:test';
import assert from 'node:assert/strict';
import { subtitleChunks } from '../scripts/lib/video-subtitles.mjs';

test('calculation values, decimals, units and Latin terms stay on one subtitle screen', () => {
  const text = '配合計算は1000リットルが基準。170を0.50で割ると340です。塩化物は0.30kg/m³。JCIの案内で確認します。';
  const chunks = subtitleChunks(text);
  assert.equal(chunks.join(''), text);
  for (const token of ['1000', '170', '0.50', '340', '0.30kg/m³', 'JCI']) assert.ok(chunks.some(chunk => chunk.includes(token)), token);
  assert.ok(chunks.every(chunk => [...chunk].reduce((n, ch) => n + (/^[\x20-\x7e]$/.test(ch) ? 0.62 : 1), 0) <= 15));
});
test('Japanese punctuation does not start a new subtitle and a short tail is balanced', () => {
  const text = '「数値と条件」を一組で確認し、コンクリートの復習はプロフィールから。';
  const chunks = subtitleChunks(text);
  assert.equal(chunks.join(''), text);
  assert.ok(chunks.every(chunk => !/^[、。，．！？：；）］」』]/u.test(chunk)));
  for (const word of ['コンクリート', 'プロフィール']) assert.ok(chunks.some(chunk => chunk.includes(word)), word);
  assert.ok(chunks.at(-1).length > 3);
  assert.deepEqual(subtitleChunks(''), []);
  assert.throws(() => subtitleChunks('verylongunbreakabletechnicalterm', 5), /1行/);
});

test('専門語の連続カタカナを字幕の切り替わりで分断しない', () => {
 const text='打込み・締固め・養生は手順が命です。打重ね時間の限度を守らないとコールドジョイントが生じます。バイブレータは横移動に使ってはいけません。';
 const chunks=subtitleChunks(text,28);
 assert.equal(chunks.join(''),text);
 assert.ok(chunks.some(s=>s.includes('コールドジョイント')));
 assert.ok(chunks.every(s=>[...s].reduce((n,c)=>n+(/^[\x20-\x7e]$/.test(c)?0.62:1),0)<=28));
});

test('実動画で分断された複合語を一続きで表示し、台本文字列と行幅を保つ', () => {
  const cases = [
    ['完成答案集です。安全・品質・工程の答案と置換ガイドで練習する際は、概要欄をご覧ください。', '置換ガイド'],
    ['まとめます。施工計画は事前調査から管理計画への1本の流れ。事前調査の2条件、計画書の記載項目、工程と仮設備の区別を肉付けします。', '管理計画'],
    ['ここで押さえたいのが締固めです。最適含水比のもとで施工し、現場の乾燥密度と最大乾燥密度の比である締固め度で品質を確認します。', '締固め度'],
    ['ここからは基礎工です。支持層が浅ければ直接基礎、深ければ杭基礎、より大きな荷重を伝える大型構造物ではケーソン基礎という分類が基本です。', '大型構造物'],
    ['工程計画は、休日や悪天候日を除いた作業可能日数をもとに施工速度を決めます。仮設備計画には、設置だけでなく撤去や後片付けまでが含まれます。', '作業可能日数'],
    ['最後に、本文の現場状況・技術的課題が、概要の工種・施工量・工期から自然に出てくるかを読み返します。概要にない工種が本文に出てきたら、概要側に足してください。', '読み返し'],
    ['実際の担当範囲で、現場の課題にどう向き合ったかを具体化します。立場や工法の名前を大きく見せるより、自分が検討し、実施した内容を設問に沿って説明しましょう。', '具体化'],
    ['対象になる工事も幅広いです。河川、道路、上下水道、土工事など、日常的な改良工事や維持工事でも十分に題材になります。', '維持工事'],
  ];
  for (const [text, term] of cases) {
    for (const width of [15, 28]) {
      const chunks = subtitleChunks(text, width);
      assert.equal(chunks.join(''), text);
      assert.ok(chunks.some(chunk => chunk.includes(term)), term);
      assert.ok(chunks.every(chunk => [...chunk].reduce((n, ch) => n + (/^[\x20-\x7e]$/.test(ch) ? 0.62 : 1), 0) <= width));
    }
  }
});

test('列挙の中黒を次の字幕の先頭に残さない', () => {
  const text = '検討項目の観点は、計画・材料・施工・養生・検査・周知の6つです。現場条件が原因で、どの品質項目の達成が難しくなったかを具体的に書きます。';
  const chunks = subtitleChunks(text, 28);
  assert.equal(chunks.join(''), text);
  assert.ok(chunks.every(chunk => !chunk.startsWith('・')));
});
