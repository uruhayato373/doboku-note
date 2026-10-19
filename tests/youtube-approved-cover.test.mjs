import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { readApprovedCover, coverInputDigest } from '../scripts/lib/youtube-approved-cover.mjs';

test('reviewed pixels are preserved; stale input, altered bytes and wrong dimensions fail closed', async () => {
  const root=mkdtempSync(join(tmpdir(),'youtube-approved-'));
  try {
    const dir=join(root,'.tmp/video-render/release');mkdirSync(dir,{recursive:true});
    const buffer=await sharp({create:{width:32,height:18,channels:3,background:'#ffffff'}}).png().toBuffer();
    writeFileSync(join(dir,'cover.png'),buffer);
    const spec={headline:['確認用','見出し'],character:{pose:'reading',frame:'waist'}};
    spec.approvedImage={path:'.tmp/video-render/release/cover.png',sha256:createHash('sha256').update(buffer).digest('hex'),specSha256:coverInputDigest(spec)};
    assert.deepEqual((await readApprovedCover(root,spec,{width:32,height:18})).buffer,buffer);
    await assert.rejects(readApprovedCover(root,{...spec,headline:['変更後','見出し']},{width:32,height:18}),/採用後/);
    await assert.rejects(readApprovedCover(root,spec,{width:18,height:32}),/寸法/);
    await assert.rejects(readApprovedCover(root,{...spec,approvedImage:{...spec.approvedImage,path:'../../secret.png'}},{width:32,height:18}),/パス/);
    writeFileSync(join(dir,'cover.png'),'changed');
    await assert.rejects(readApprovedCover(root,spec,{width:32,height:18}),/sha256/);
    assert.equal(await readApprovedCover(root,{},{}),null);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('pop-poster-v3 requires adopted artwork rather than silently falling back to typography', async () => {
  const {validateCoverSpec}=await import('../scripts/lib/youtube-cover.mjs');
  const spec={format:'longform',exam:'civil-2',headline:['2級土木','耳で総復習'],accentLine:1,subtitle:'',character:{pose:'pop-explaining',frame:'waist'},design:'pop-poster-v3'};
  assert.throws(()=>validateCoverSpec(spec),/採用PNG/);
  assert.doesNotThrow(()=>validateCoverSpec({...spec,approvedImage:{path:'checked.png'}}));
});

test('図解主体の採用原本は装飾キャラクターを必須にしない', async () => {
  const {validateCoverSpec}=await import('../scripts/lib/youtube-cover.mjs');
  const spec={format:'longform',exam:'civil-2',headline:['題材選び','自分の経験'],accentLine:1,subtitle:'条件と対応を整理',design:'pop-poster-v3',layout:'diagram-led',approvedImage:{normalization:{mode:'full-frame-v1'}}};
  assert.doesNotThrow(()=>validateCoverSpec(spec));
  assert.throws(()=>validateCoverSpec({...spec,approvedImage:undefined}),/character/);
  assert.throws(()=>validateCoverSpec({...spec,layout:undefined}),/character/);
});
