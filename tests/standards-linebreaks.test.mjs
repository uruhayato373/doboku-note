import { test } from 'node:test';
import assert from 'node:assert/strict';
import { helpers } from '../scripts/lib/standards-structure.mjs';

// DN-0864: 基準類の章記事の改行（中部 土木工事特記仕様書 1-3 p.43〜44 の版面をそのまま使う）。
const { segmentToBlocks } = helpers;
const texts = (blocks) => blocks.map((b) => b.lines.map((l) => l.text.trim()).join(''));

test('ページをまたぐ文は、前のページの最後の行が右端まで詰まっていれば次のページの先頭行とつなぐ', () => {
  const blocks = segmentToBlocks([
    { page: 43, text: '      (7)    テストハンマーによる強度推定調査は、材齢28日～91日の間に試験を行うこ' },
    { page: 43, text: '            とを原則とするが、工期等により、基準期間内に調査を行えない場合は、以下' },
    { page: 43, text: '            の方法に従い、再調査の必要性等を判断するものとする。' },
    // 原本は中黒の後ろに空白 3〜4 個。この断片だけだと広い空白の行の密度で表に化けるので 1 個にしている
    { page: 43, text: '             ・ 材齢10日で試験を行う場合は、推定強度を1.55倍して評価する。' },
    { page: 43, text: '             ・ 材齢10日～28日までの間で、上に明示していない場合は、前後の補正' },
    { page: 43, text: '' },
    { page: 44, text: '' },
    { page: 44, text: '           値を比例配分して得られる補正値を用いて評価する。' },
    { page: 44, text: '       ・ 材齢10日以前の試験は、適切な評価が困難なことから、実施しない。' },
  ]);
  const out = texts(blocks);
  assert.equal(out.length, 4);
  assert.match(out[2], /前後の補正値を比例配分して得られる補正値を用いて評価する。$/);
  assert.match(out[3], /^・\s*材齢10日以前/);
});

test('字下げの深い号 (1)〜(n) と見出し 1）は、番号の後ろの空白の幅によらず別の段落になる', () => {
  const blocks = segmentToBlocks([
    { page: 43, text: '      コンクリート構造物の品質確保の調査は、以下の規定による。' },
    { page: 43, text: '      1）テストハンマーによる強度推定調査' },
    { page: 43, text: '      (1)    受注者は、高さが5m以上の鉄筋コンクリート擁壁、内空断面積が25㎡以上' },
    { page: 43, text: '            の鉄筋コンクリートカルバート類の施工完了時に強度推定調査を実施しなければ' },
    { page: 43, text: '            ならない。' },
    { page: 43, text: '      (2)    テストハンマーによる強度推定調査は、鉄筋コンクリート擁壁及びカルバー' },
    { page: 43, text: '            ト類、トンネルについては目地間で行う。' },
    { page: 43, text: '      (3)    各単位につき3ヶ所の調査を実施しなければならない。' },
  ]);
  const out = texts(blocks);
  assert.equal(out.length, 5);
  assert.equal(out[1], '1）テストハンマーによる強度推定調査');
  assert.match(out[2], /^\(1\)/);
  assert.match(out[3], /^\(2\)/);
  assert.match(out[4], /^\(3\)/);
  assert.equal(blocks[3].type, 'item');
  assert.equal(blocks[3].itemNumber, 2);
});

test('中黒の箇条は、前の行が句点で終わらず右端近くまであっても 1 行ずつ別の段落になる', () => {
  const blocks = segmentToBlocks([
    { page: 44, text: '(4)    テストハンマーによる強度推定調査は、気乾状態の箇所で測定することを原' },
    { page: 44, text: '      則とするが、測定装置のマニュアルに従って補正する。不明な場合は、以下の値を用い' },
    { page: 44, text: '      ても良いものとする。' },
    { page: 44, text: '       ・測定位置が湿っており打撃の跡が黒点になる場合→反発度の補正値 ＋3' },
    { page: 44, text: '       ・測定位置が濡れている場合→反発度の補正値 ＋5' },
  ]);
  const out = texts(blocks);
  assert.equal(out.length, 3);
  assert.match(out[1], /＋3$/);
  assert.match(out[2], /^・測定位置が濡れている/);
});

test('式の後の「ここで、」は式の段落につながない', () => {
  const blocks = segmentToBlocks([
    { page: 44, text: '(5)    強度推定は以下の式 (材料学会式) による。' },
    { page: 44, text: '       Ｆ (N／㎜２) ＝ 0．098 × (－184 ＋ 13．0 × Ｒ)' },
    { page: 44, text: '' },
    { page: 44, text: '       ここで、 Ｆ ： 推定強度' },
  ]);
  const out = texts(blocks);
  assert.equal(out.length, 3);
  assert.match(out[1], /× Ｒ\)$/);
  assert.match(out[2], /^ここで、/);
});

test('ページの変わり目でも、小見出し・様式名・図の題名は次のページの段落につながない', () => {
  // 前のページの最後の 1 行と次のページの先頭の 1 行。つながなければ 2 段落、つなげば 1 段落
  const pageBreak = (last, first) => segmentToBlocks([
    { page: 10, text: last },
    { page: 10, text: '' },
    { page: 11, text: first },
  ]).length;
  // 番号つきの 1 行で読点の無い小見出し
  assert.equal(pageBreak('  ２）施工実施上の留意事項及び施工方法について記述する事項の一覧の題名', '  工事箇所の作業環境を記載する。'), 2);
  // 次のページが様式の番号で始まる
  assert.equal(pageBreak('  写真・ポンチ絵等を別紙説明資料に整理して監督職員に提出する際の書類の', '  様式－34 創意工夫に関する実施状況。'), 2);
  // 前のページの段落が図の題名
  assert.equal(pageBreak('  図 21 右側と左側で計画路面高が異なる場合の高さ属性を入力する測点の位置', '  交差点や拡幅箇所等にて複数の横断勾配が存在する場合は、入力する。'), 2);
  // 次のページの先頭が文を含まない（目次・白紙の印）
  assert.equal(pageBreak('  国土交通省大臣官房技術調査課', '  目 次'), 2);
  // 対照: 語の途中で切れた本文はつなぐ（漢字で始まる続きも）
  assert.equal(pageBreak('  受注者は、設置した保安施設が常に良好な状態を保つよう、日々の保守点検を行わ', '  なければならない。'), 1);
  assert.equal(pageBreak('  エポキシ系樹脂塗装鉄筋の切断・溶接による塗膜欠落や、加工・組立にともなう有', '  害な損傷部を発見した場合は、適切な方法で補修しなければならない。'), 1);
});
