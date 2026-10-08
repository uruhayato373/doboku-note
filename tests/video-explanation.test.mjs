import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import satori from 'satori';
import { buildExplanationNode } from '../scripts/lib/video-explanation.mjs';
const theme = { base: '#1E73C8', deep: '#155293', label: '1級土木施工管理技士' };
const fonts = [{ name: 'NotoSansJP', weight: 700, data: readFileSync(new URL('../node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff', import.meta.url)) }];
const cases = [
  { portrait: false, items: ['本文で書く施工部分から逆算する', '「道路工」ではなく「道路土工、排水構造物工」', '数量は単位つきで工種に対応させる'] },
  { portrait: false, items: ['悪天候の目安は風10m/s・雨50mm・雪25cm', '側圧は水平荷重（鉛直荷重の2.5〜5%）とは別'] },
  { portrait: false, items: ['① 工種と数量', '② 工期を照合する', '③ 立場を明確にする', '④ 本文との整合を確認'] },
  { portrait: true, items: ['四肢択一式（小論文なし）', '本文で書く施工部分から逆算する', '数量は単位つきで工種に対応させる'] },
];
test('実フォントで括弧・長文・縦型の文字が割当領域をはみ出さない', async () => {
  let checked = 0;
  for (const { portrait, items } of cases) {
    const scene = { sceneId: 'step1', visual: { heading: 'STEP 1　工種と施工量を対で決める', items } };
    await satori(buildExplanationNode(scene, { theme, portrait }), {
      width: portrait ? 1080 : 1920, height: portrait ? 1920 : 1080, fonts,
      onNodeDetected: node => {
        if (!node.props['data-fit-width']) return;
        checked++;
        assert.ok(node.width <= node.props['data-fit-width'] + 2, node.textContent);
        assert.ok(node.height <= node.props['data-fit-height'] + 2, node.textContent);
      },
    });
  }
  assert.equal(checked, 16);
});

// 16:9 の任意要素（character・compare・sheet・reveal・focus）も実フォントで割当領域に収まる。
const character = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', width: 440, height: 487 };
const richScenes = [
  { sceneId: 'cmp', visual: { kind: 'compare', heading: '主な工種・施工量の書き方', rows: [
    { label: '主な工種', ng: '道路工', ok: '道路土工、\n排水構造物工' }, { label: '施工量', ng: '舗装工', ok: 'アスファルト舗装\n○○○○m²' },
  ], character: { pose: 'red-pen', say: '工種名だけは\nNG' } } },
  { sceneId: 'sheet', visual: { kind: 'sheet', heading: 'STEP 2　工期を数量と突き合わせる', sheetTitle: '〔設問1〕工事概要', rows: [
    { label: '工事名', order: 3 }, { label: '発注者名', order: 3 }, { label: '工事場所', order: 3 },
    { label: '工期', value: '平成30年12月1日〜令和元年3月10日', state: 'focus', order: 2 },
    { label: '主な工種', value: '道路土工、排水構造物工', order: 1 }, { label: '施工量', value: '掘削○○m³、盛土○○m³、側溝 L=○○m', order: 1 },
    { label: '現場での立場', value: '工事部長', state: 'ng', order: 3 },
  ], character: { pose: 'thinking', say: 'この量を\nこの期間で？' } } },
  { sceneId: 'reveal', visual: { heading: '工事概要は「項目どうしの整合」で見られる', items: ['工期 × 施工量：この期間で施工できるか', '工種 × 数量：対応する数量を書いているか'], reveal: 1, focus: 0, character: { pose: 'explaining' } } },
];
test('character・compare・sheet の場面も文字が割当領域をはみ出さない', async () => {
  let checked = 0;
  for (const scene of richScenes) {
    await satori(buildExplanationNode(scene, { theme, character }), {
      width: 1920, height: 1080, fonts,
      onNodeDetected: node => {
        if (!node.props['data-fit-width']) return;
        checked++;
        assert.ok(node.width <= node.props['data-fit-width'] + 2, node.textContent);
        assert.ok(node.height <= node.props['data-fit-height'] + 2, node.textContent);
      },
    });
  }
  // cmp: 見出し1＋吹き出し1＋ラベル2＋NG2＋OK2、sheet: 見出し1＋吹き出し1＋ラベル7＋値7、reveal: 見出し1＋カード1
  assert.equal(checked, 26);
});

function texts(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (typeof node.props?.children === 'string') out.push(node.props.children);
  for (const child of [].concat(node.props?.children ?? [])) texts(child, out);
  return out;
}
test('reveal は先頭N項目だけを描き、character は画像が無ければ止める', () => {
  const node = buildExplanationNode(richScenes[2], { theme, character });
  const all = texts(node).join('|').replace(/\n/g, '');
  assert.ok(all.includes('施工できるか'));
  assert.ok(!all.includes('書いているか'));
  assert.throws(() => buildExplanationNode(richScenes[2], { theme }), /character の画像データがありません/);
  assert.throws(() => buildExplanationNode(richScenes[0], { theme, portrait: true }), /16:9専用/);
});
test('語句単位の改行は character・compare・sheet の場面だけで使う', () => {
  const heading = '仕上げ　概要と本文の一貫チェック';
  const scene = (extra) => ({ sceneId: 'a', visual: { heading, items: ['本文にだけ出る工種は、概要へ足す'], ...extra } });
  const withCharacter = texts(buildExplanationNode(scene({ character: { pose: 'good-sign' } }), { theme, character }));
  assert.ok(withCharacter.includes('仕上げ　\n概要と本文の一貫チェック'), withCharacter.join('|'));
  // 同じ幅（右列 440＋余白 40 を rightMargin で空ける）でも character が無ければ従来の文字数での改行のまま。
  const plain = texts(buildExplanationNode(scene({}), { theme, rightMargin: 88 + 440 + 40 }));
  assert.ok(plain.includes('仕上げ　概要と本文の一貫チェッ\nク'), plain.join('|'));
});
