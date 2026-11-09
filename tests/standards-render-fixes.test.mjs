import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyTableOverride, tableKey } from '../scripts/lib/standards-table.mjs';
import { loadTableOverrides, variantsOf } from '../scripts/lib/standards-structure.mjs';
import { RE_STANDARD_FIGURE_TITLE, isFigureCaption } from '../scripts/lib/standards-figures.mjs';
import { parseTranscribedGfmTable } from '../scripts/build-standard-articles.mjs';
import { SITE_CONTENT_ROOT } from '../scripts/lib/repository-paths.mjs';

// 画面の目視判定（standards-visual-review）で見つかった基準書の崩れの回帰を固定する（DN-0916・DN-1052・DN-1053）

test('画像から起こしたページの GFM の表を表として出す（DN-0916）', () => {
  const table = parseTranscribedGfmTable([
    '| 区分 | 試験項目 | 数量 |',
    '|---|---|---:|',
    '| 配合設計時 | ① 配合設計書の照査<br>② WT 試験 | 1部 |',
  ]);
  assert.equal(table, ['| 区分 | 試験項目 | 数量 |', '| --- | --- | ---: |', '| 配合設計時 | ① 配合設計書の照査<br />② WT 試験 | 1部 |'].join('\n'));
  // 列の数がそろわない・区切りが無いものは表にしない（文字を落とさないため平文に戻す）
  assert.equal(parseTranscribedGfmTable(['| a | b |', '|---|---|', '| 1 |']), null);
  assert.equal(parseTranscribedGfmTable(['| a | b |', '| 1 | 2 |']), null);
});

test('近畿の必携の章記事に、記法の文字のまま出る表が残っていない（DN-0916）', () => {
  for (const id of ['36-1', '31-1', '7-1', '34-3']) {
    const md = readFileSync(join(SITE_CONTENT_ROOT, 'standards-articles', 'kinki', 'hikkei', 'chapters', `${id}.md`), 'utf8');
    assert.ok(!/^\\\|/m.test(md), `${id}: \\| で始まる段落が残っている`);
  }
});

test('標準図の題名を図のキャプションとして扱う（崩れて段落の途中に来たものも・DN-1053）', () => {
  const standardTitles = { standardTitles: true };
  assert.ok(isFigureCaption('Ａ―３型 標準図 ４車線以上 片側 1 車線以上通行可 夜間作業', standardTitles));
  assert.ok(isFigureCaption('Ｅ型 標準図 レーンマーク作業 昼間工事', standardTitles));
  assert.ok(isFigureCaption('H－２型標準図 路面作業 ２車線（ｂ作業）', standardTitles));
  // 設定で有効にしていない文書では題名を図にしない（図を切り出していない文書で検査 20 を落とさない）
  assert.ok(!isFigureCaption('Ａ―３型 標準図 ４車線以上 片側 1 車線以上通行可 夜間作業'));
  assert.ok(RE_STANDARD_FIGURE_TITLE.test('目地シール作業等（比較的短時間に作業個所の移動をする場合） 夜間工Ｄ―１型 標準'));
  assert.ok(isFigureCaption('図3-2-1 盛土の段切'));
  // 本文の「標準図に従って」は題名ではない
  assert.ok(!RE_STANDARD_FIGURE_TITLE.test('（1）トンネル支保工は，標準図に従って，同一平面内に建て込む'));
});

test('見出しの結合セル（{same}）だけを空欄にし、同じ文字の別の欄は残す（表3-2-22 の粒度区分・DN-1052）', () => {
  const override = {
    kind: 'table',
    layout: ['x'],
    header: [['種類', '①', '②', '③'], ['', '(20)', '(20)', { same: 'left' }]],
    rows: [['最大粒径', '20', '20', '13']],
    review: { status: 'approved' },
  };
  const layout = ['種類 ① ② ③ (20) (20) 最大粒径 20 20 13'];
  const parts = applyTableOverride(layout, { ...override, layout, key: tableKey(layout) });
  assert.equal(parts.ok, true, parts.reason);
  const table = parts.parts.find((p) => p.kind === 'table');
  assert.deepEqual(table.headerMerged[1], [false, false, false, true]);
});

test('同じ見出しの版面が 2 回出る表3-2-14・3-2-15 は、後ろの段落で中身を選ぶ（DN-1052）', () => {
  const entry = loadTableOverrides('kinki/common').get('1adda71657b420c3');
  assert.equal(entry.review.status, 'approved');
  const [variant] = variantsOf(entry);
  assert.match(entry.rows[2][0], /1,524/);
  assert.match(variant.rows[2][0], /2,000/);
  assert.equal(variant.key, entry.key);
  // 北海道版は文書の差し替えの中に、同じ形の候補を持つ
  const hokkaido = loadTableOverrides('hokkaido/common').get('1adda71657b420c3');
  assert.match(hokkaido.rows[2][0], /2000mm/);
  assert.match(variantsOf(hokkaido)[0].rows[2][0], /1524mm/);
});

test('近畿の共通仕様書 3-2 の表3-2-15 に本体の 3 行が入り、表3-2-22 の粒度区分が欠けない（DN-1052）', () => {
  const md = readFileSync(join(SITE_CONTENT_ROOT, 'standards-articles', 'kinki', 'common', 'chapters', '3-2.md'), 'utf8');
  const at = md.indexOf('**表3-2-15');
  const block = md.slice(at, md.indexOf('<SourceRef', at));
  assert.match(block, /\| 1,016㎜を超え2,000㎜以下 \| 4㎜以下 \|/);
  const t22 = md.slice(md.lastIndexOf('**表3-2-22'));
  assert.match(t22.split('\n').find((line) => line.includes('(20F)')) ?? '', /\*\*\(20\)\*\* \| \*\*\(20\)\*\* \| \*\*\(13\)\*\* \| \*\*\(13\)\*\*/);
});
