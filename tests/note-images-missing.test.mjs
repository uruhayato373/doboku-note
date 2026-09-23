// 本文画像の欠落を黙って除去しないことを固定する。
//
// 経緯（2026-09-23）: ops-write（CI）の note.update-body で再公開した 7 記事から、ライブの
// 著者オーソリティ バナーが消えた。バナーの記事ごとのコピーは git 管理外の生成物で、CI の
// checkout に無い。extractBodyImages は「ファイル無し」の画像行を黙って除去していた。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  extractBodyImages,
  resolveAuthorBannerOrigin,
  AUTHOR_BANNER_ORIGIN_DIR,
} from '../scripts/lib/note-images.mjs';

// 実リポジトリと同じ形の最小ツリーを作る（原本は追跡、記事側のコピーは無い＝CI の状態）
function fakeRepo({ withOrigin = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'note-img-'));
  if (withOrigin) {
    mkdirSync(join(root, AUTHOR_BANNER_ORIGIN_DIR), { recursive: true });
    writeFileSync(join(root, AUTHOR_BANNER_ORIGIN_DIR, 'figure-author-authority.png'), 'PNG');
    writeFileSync(join(root, AUTHOR_BANNER_ORIGIN_DIR, 'figure-author-authority-concrete.png'), 'PNG');
  }
  const art = join(root, 'content', 'note', '1級・2級土木', '記事A');
  mkdirSync(join(art, 'img'), { recursive: true });
  writeFileSync(join(art, 'img', 'figure-1-own.png'), 'PNG'); // 追跡されている記事固有の図
  return { root, art };
}

test('記事側に無いバナーは追跡原本へ解決され、本文から消えない', () => {
  const { art } = fakeRepo();
  const body = '冒頭\n\n![著者](img/figure-author-authority.png)\n\n本文\n\n![図](img/figure-1-own.png)\n';
  const r = extractBodyImages(body, art);
  assert.equal(r.missing.length, 0, `除去された画像がある: ${r.missing.join(' / ')}`);
  assert.equal(r.images.length, 2, 'バナーと図の 2 枚が残るはず');
  assert.ok(r.images[0].abs.endsWith(join(AUTHOR_BANNER_ORIGIN_DIR, 'figure-author-authority.png')),
    'バナーは原本パスで上がる');
});

test('concrete 用のバナー（別名）も原本へ解決される', () => {
  const { art } = fakeRepo();
  const r = extractBodyImages('![著者](img/figure-author-authority-concrete.png)', art);
  assert.equal(r.missing.length, 0);
  assert.equal(r.images.length, 1);
});

test('原本も無ければ欠落として報告する（黙って成功させない）', () => {
  const { art } = fakeRepo({ withOrigin: false });
  const r = extractBodyImages('![著者](img/figure-author-authority.png)', art);
  assert.equal(r.images.length, 0);
  assert.equal(r.missing.length, 1);
  assert.match(r.missing[0], /ファイル無し/);
});

test('バナー以外の欠落画像は原本へ化けない', () => {
  const { art } = fakeRepo();
  assert.equal(resolveAuthorBannerOrigin(join(art, 'img', 'figure-2-missing.png')), null);
  const r = extractBodyImages('![図](img/figure-2-missing.png)', art);
  assert.equal(r.missing.length, 1, '記事固有の図は原本で代用してはいけない');
});

test('note-update-body は欠落画像を黙って除去せず中断する（既定）', () => {
  const src = readFileSync('scripts/note-update-body.mjs', 'utf8');
  assert.ok(src.includes("const ALLOW_MISSING_IMAGES = argv.includes('--allow-missing-images')"),
    '明示の逃げ道フラグが無い');
  const i = src.indexOf('const localMissing');
  assert.ok(i > 0, '欠落画像の判定が無い');
  const block = src.slice(i, i + 400);
  assert.ok(/if \(localMissing\.length && !ALLOW_MISSING_IMAGES\)/.test(block), '既定で中断していない');
  assert.ok(/throw new Error/.test(block), '中断が throw（保存前に記事単位で失敗）になっていない');
});
