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
