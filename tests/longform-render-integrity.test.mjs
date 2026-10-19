import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildLongformAss } from '../scripts/lib/longform-render.mjs';
import { narrationInput, sha256 } from '../scripts/lib/video-narration-cache.mjs';
import { longformInputHash, verifyLongformRender } from '../scripts/lib/longform-render-integrity.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'render-integrity-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const pack = join(root, 'pack'), render = join(root, 'render');
  for (const dir of [pack, join(render, 'img'), join(render, 'wav')]) mkdirSync(dir, { recursive: true });
  const board = { scenes: [{ sceneId: 'explain', narration: '水セメント比だけでスランプは決まりません。', visual: { heading: '指標を分ける' } }] };
  const saveBoard = () => writeFileSync(join(pack, 'storyboard.json'), JSON.stringify(board)); saveBoard();
  writeFileSync(join(render, 'img/frame.png'), 'image');
  writeFileSync(join(render, 'wav/audio.wav'), 'audio');
  writeFileSync(join(render, 'video.mp4'), 'mp4');
  const ass = buildLongformAss(board.scenes, [5]); writeFileSync(join(render, 'subtitles.ass'), ass);
  const manifest = { mp4: 'video.mp4', tts: true, speaker: 13, scenes: [{ sceneId: 'explain', png: 'frame.png', wav: 'audio.wav', actualSec: 5, pngSha256: sha256('image'), wavSha256: sha256('audio'), narrationInputSha256: narrationInput(board.scenes[0].narration, 13).inputSha256 }], integrity: { schemaVersion: 1, inputSha256: longformInputHash(pack), subtitlesSha256: sha256(ass), mp4Sha256: sha256('mp4') } };
  const saveManifest = () => writeFileSync(join(render, 'render-manifest.json'), JSON.stringify(manifest)); saveManifest();
  return { root, pack, render, board, manifest, saveBoard, saveManifest };
}

test('現行入力から作った完成動画は場面数を返す', t => {
  const f = fixture(t); assert.equal(verifyLongformRender(f.pack, f.render).scenesChecked, 1);
});
test('図だけ修正して旧音声・旧字幕・旧MP4を残した事故を拒否する', t => {
  const f = fixture(t); f.board.scenes[0].visual.heading = '修正済み図解'; f.saveBoard();
  assert.throws(() => verifyLongformRender(f.pack, f.render), /台本・画像指定が古い/);
});
test('新版台本で入力SHAだけ更新しても旧字幕を採用できない', t => {
  const f = fixture(t); f.board.scenes[0].narration = '新版の説明です。'; f.saveBoard();
  f.manifest.integrity.inputSha256 = longformInputHash(f.pack);
  f.manifest.scenes[0].narrationInputSha256 = narrationInput(f.board.scenes[0].narration, 13).inputSha256;
  f.saveManifest(); assert.throws(() => verifyLongformRender(f.pack, f.render), /字幕が現行台本/);
});
test('未知の旧レンダーと音声無し設計版を完成品にできない', t => {
  for (const change of [m => delete m.integrity, m => m.tts = false]) {
    const f = fixture(t); change(f.manifest); f.saveManifest();
    assert.throws(() => verifyLongformRender(f.pack, f.render), /入力照合記録が無い/);
  }
});
test('画像・音声・完成MP4の差し替え、話者・場面・尺の変更を拒否する', t => {
  for (const [file, error] of [['img/frame.png', /場面画像のSHA/], ['wav/audio.wav', /音声のSHA/], ['video.mp4', /MP4のSHA/]]) {
    const f = fixture(t); writeFileSync(join(f.render, file), 'old');
    assert.throws(() => verifyLongformRender(f.pack, f.render), error);
  }
  for (const change of [m => m.speaker = 1, m => m.scenes[0].sceneId = 'wrong', m => m.scenes[0].actualSec = 0, m => m.scenes = []]) {
    const f = fixture(t); change(f.manifest); f.saveManifest();
    assert.throws(() => verifyLongformRender(f.pack, f.render));
  }
});
test('音声実尺と字幕の一致、素材のパス境界を検査する', t => {
  const f = fixture(t); f.manifest.scenes[0].actualSec = 6; f.saveManifest();
  assert.throws(() => verifyLongformRender(f.pack, f.render), /字幕が現行台本/);
  f.manifest.scenes[0].actualSec = 5; f.manifest.scenes[0].wav = '../audio.wav'; f.saveManifest();
  assert.throws(() => verifyLongformRender(f.pack, f.render), /ファイル名が不正/);
});
test('表紙の採用指定変更も完成動画の再生成を要求する', t => {
  const f = fixture(t); writeFileSync(join(f.pack, 'cover-design.json'), '{"image":"new"}');
  assert.throws(() => verifyLongformRender(f.pack, f.render), /画像指定が古い/);
});

test('POPの監査追記は入力を変えず、採用画像の変更は再生成を要求する', t => {
 const f=fixture(t);
 const pop={activeBodyRevision:'body',revisions:{body:{images:[{sceneId:'explain',inputSha256:'a',output:{path:'image.png',sha256:'a'}}]}}};
 const save=()=>writeFileSync(join(f.pack,'pop-image.json'),JSON.stringify(pop));save();
 const before=longformInputHash(f.pack);
 pop.revisions.body.review={status:'ai-ok'};save();assert.equal(longformInputHash(f.pack),before);
 pop.revisions.body.images[0].output.sha256='b';save();assert.notEqual(longformInputHash(f.pack),before);
});
