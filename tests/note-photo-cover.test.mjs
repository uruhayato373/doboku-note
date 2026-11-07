import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { renderNoteCharacterCover } from '../scripts/lib/note-character-cover.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const input = (magazineDir) => ({
  magazine: true, magazineDir, examKey: 'pe-comprehensive', title: '総監 模範論文',
  palette: { band: '#16365C', authority: '技術士（総監）' },
  cover: { photo: '_cover-photo.png', qualifier: '総監 記述式｜模範論文', magazineName: '自治体 上水道', proof: '過去問5年＋R8予想', benefit: '立場が同じ答案で書ける' },
});

test('写真カバー: 1280×670 で、左は資格色、右は元写真', async () => {
  const root = mkdtempSync(join(tmpdir(), 'note-photo-'));
  try {
    mkdirSync(join(root, 'm'));
    symlinkSync(join(REPO_ROOT, '.claude'), join(root, '.claude'));
    writeFileSync(join(root, 'm/_cover-photo.png'), await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#ff0000' } }).png().toBuffer());
    const { buffer, pose, copy } = await renderNoteCharacterCover(root, input('m'));
    const meta = await sharp(buffer).metadata();
    assert.deepEqual([meta.width, meta.height], [1280, 670]);
    assert.equal(pose, 'photo');
    assert.equal(copy.title, '自治体 上水道');
    const { data } = await sharp(buffer).extract({ left: 1000, top: 300, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
    assert.equal(data[0], 255, '右は写真');
    const left = await sharp(buffer).extract({ left: 4, top: 4, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([...left.data.slice(0, 3)], [0x16, 0x36, 0x5c], '左は資格色');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('写真カバー: 元写真がどこにも無ければ失敗で止める（別の絵で進めない）', async () => {
  const root = mkdtempSync(join(tmpdir(), 'note-photo-'));
  try {
    symlinkSync(join(REPO_ROOT, '.claude'), join(root, '.claude'));
    await assert.rejects(() => renderNoteCharacterCover(root, input('content/note/存在しない')));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
