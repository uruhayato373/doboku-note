import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { readLongformPopImages, popSceneHash } from '../scripts/lib/longform-pop-images.mjs';

const sha = b => createHash('sha256').update(b).digest('hex');
async function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'longform-pop-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, 'pack'); mkdirSync(dir);
  const png = await sharp({ create: { width: 1920, height: 1080, channels: 3, background: '#123456' } }).png().toBuffer();
  writeFileSync(join(root, 'body.png'), png);
  const scene = { sceneId: 'body', narration: '説明', caption: '見出し', visual: { kind: 'points', heading: '見出し', items: ['要点'] }, sourceRef: 'source.mdx' };
  const board = { format: 'longform-16x9', imageDesign: { mode: 'codex-pop', scope: 'all-body', revision: 'r1' }, scenes: [{sceneId:'cover'}, scene] };
  const output = { path: 'body.png', sha256: sha(png), width: 1920, height: 1080 };
  const image = { sceneId: 'body', inputSha256: popSceneHash(scene), generation: { tool: 'image_gen', prompt: '承認画像を参照して生成', references: [output], output }, output };
  const pop = { activeBodyRevision: 'r1', revisions: { r1: { images: [image] } } };
  const save = () => writeFileSync(join(dir, 'pop-image.json'), JSON.stringify(pop)); save();
  return {root,dir,board,pop,image,save,png};
}

test('全本文の画像を実体SHA・寸法まで照合し、表紙は従来経路へ残す', async t => {
  const f = await fixture(t);
  assert.deepEqual([...readLongformPopImages(f.root,f.dir,f.board,{local:true}).keys()], ['body']);
});
test('未指定の既存パックを変更せず、本文契約の片側だけの削除は拒否', async t => {
  const f = await fixture(t);
  delete f.board.imageDesign;
  assert.throws(() => readLongformPopImages(f.root,f.dir,f.board), /一致/);
  delete f.pop.activeBodyRevision; f.save();
  assert.equal(readLongformPopImages(f.root,f.dir,f.board).size, 0);
});
test('生成記録・全場面が揃わなければテンプレートへ戻さない', async t => {
  const f = await fixture(t);
  f.pop.revisions.r1.images = []; f.save();
  assert.throws(() => readLongformPopImages(f.root,f.dir,f.board), /全1場面/);
  rmSync(join(f.dir,'pop-image.json'));
  assert.throws(() => readLongformPopImages(f.root,f.dir,f.board), /読めません/);
});
test('コピー・語り・出典変更後の古い画像を拒否', async t => {
  const f = await fixture(t);
  for (const key of ['caption','narration','sourceRef','visual']) {
    const changed=structuredClone(f.board); changed.scenes[1][key] = key === 'visual' ? {heading:'新版'} : '新版';
    assert.throws(() => readLongformPopImages(f.root,f.dir,changed), /原稿が古い/);
  }
});
test('別場面で件数だけ埋めても欠落を拒否', async t => {
  const f = await fixture(t); f.image.sceneId='wrong'; f.save();
  assert.throws(() => readLongformPopImages(f.root,f.dir,f.board), /欠落・重複/);
});
test('生成ツール・指示・参照の欠落を拒否', async t => {
  const f = await fixture(t); const original=structuredClone(f.image.generation);
  for (const key of ['tool','prompt','references']) {
    f.image.generation=structuredClone(original);delete f.image.generation[key];f.save();
    assert.throws(() => readLongformPopImages(f.root,f.dir,f.board), /参照記録/);
  }
});
test('CIはDrive画像未復元でも記録を検査し、レンダーは欠落を拒否', async t => {
  const f = await fixture(t); rmSync(join(f.root,'body.png'));
  assert.equal(readLongformPopImages(f.root,f.dir,f.board).size,1);
  assert.throws(() => readLongformPopImages(f.root,f.dir,f.board,{local:true}), /ENOENT/);
});
test('採用PNGの変更と偽の寸法を拒否', async t => {
  const f=await fixture(t);writeFileSync(join(f.root,'body.png'),'changed');
  assert.throws(() => readLongformPopImages(f.root,f.dir,f.board,{local:true}), /SHA不一致/);
  const wrong=await sharp(f.png).resize(360,203).png().toBuffer();writeFileSync(join(f.root,'body.png'),wrong);f.image.output.sha256=sha(wrong);f.save();
  assert.throws(() => readLongformPopImages(f.root,f.dir,f.board,{local:true}), /実寸・形式/);
});
test('リポジトリ外の参照とsymlinkを拒否', async t => {
  const f=await fixture(t); f.image.output.path='../outside.png';f.save();
  assert.throws(() => readLongformPopImages(f.root,f.dir,f.board), /リポジトリ外/);
  f.image.output.path='body.png';f.save();rmSync(join(f.root,'body.png'));symlinkSync('/etc/hosts',join(f.root,'body.png'));
  assert.throws(() => readLongformPopImages(f.root,f.dir,f.board,{local:true}), /リポジトリ外/);
});
