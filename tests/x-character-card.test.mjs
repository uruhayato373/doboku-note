import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';
import { readTweetBlocks } from '../scripts/lib/x-review.mjs';
import { cardSpecHash, validateCharacterCard, validateAdoptedCardLedger } from '../scripts/lib/x-character-spec.mjs';
import { renderXCharacterCard } from '../scripts/lib/x-character-card.mjs';
const spec={headline:['課題と対策を','つなげて書く'],points:['条件から課題を整理する','課題に対応した行動を書く'],character:{pose:'pointing',frame:'bust'},alt:'課題と対策の関係',sourcePaths:['example.mdx']};
test('numbered post parsing preserves gaps, removes internal comments and separators',()=>{
 const md='# header\r\n<!-- internal -->\r\n## Tweet 01: 9/11 07:15 civil-1 / hint / linkless\r\n\r\n本文A\r\n<!-- private note -->\r\n\r\n---\r\n\r\n## Tweet 03: 9/11 19:40 civil-1 / magazine / note\r\n\r\n本文B\r\nhttps://note.com/test?a=1&b=2\r\n';
 const result=readTweetBlocks(md);assert.deepEqual(Object.keys(result),['1','3']);assert.equal(result['1'].text,'本文A');assert.equal(result['3'].text,'本文B\r\nhttps://note.com/test?a=1&b=2');
});
test('reject overlong, missing and multiline authored copy instead of silently clipping',()=>{
 assert.equal(validateCharacterCard(spec),spec);
 assert.throws(()=>validateCharacterCard({...spec,headline:['あ'.repeat(11),'短文']}));
 assert.throws(()=>validateCharacterCard({...spec,points:['一行\n二行','要点']}));
 assert.throws(()=>validateCharacterCard({...spec,alt:''}));
 assert.throws(()=>validateCharacterCard({...spec,sourcePaths:[]}));
});
test('render provenance changes for revised copy and pose',()=>{
 assert.notEqual(cardSpecHash(spec),cardSpecHash({...spec,points:['別の説明','二行目']}));
 assert.notEqual(cardSpecHash(spec),cardSpecHash({...spec,character:{pose:'thinking',frame:'bust'}}));
});

async function adoptedFixture(t, width = 1200) {
 const root = mkdtempSync(join(tmpdir(), 'x-pop-card-'));
 t.after(() => rmSync(root, { recursive: true, force: true }));
 const buffer = await sharp({ create: { width, height: 675, channels: 3, background: '#169b6a' } }).png().toBuffer();
 const sha256 = createHash('sha256').update(buffer).digest('hex');
 const path = `.tmp/media/civil-construction-2/test/x.post.t01/cover.${sha256.slice(0,8)}.png`;
 mkdirSync(dirname(join(root, path)), { recursive: true });
 writeFileSync(join(root, path), buffer);
 return { root, buffer, spec: { ...spec, design: 'pop-poster-v3', approvedImage: { path, sha256 } } };
}

test('adopted POP cards reproduce the reviewed bytes without character assets or fonts', async t => {
 const f = await adoptedFixture(t);
 const result = await renderXCharacterCard(f.root, { exam: 'civil-2', sectionTitle: 'test' }, f.spec);
 assert.deepEqual(result.buffer, f.buffer);
 assert.equal(result.meta.template, 'pop-poster-v3');
 validateAdoptedCardLedger(f.spec, result.meta);
 assert.throws(() => validateAdoptedCardLedger({ ...f.spec, headline: ['別の主題','別の説明'] }, result.meta), /一致しません/);
 assert.throws(() => validateAdoptedCardLedger(f.spec, { ...result.meta, sha256: '0'.repeat(64) }), /一致しません/);
});

test('adopted POP cards reject changed pixels and wrong output dimensions', async t => {
 const f = await adoptedFixture(t);
 writeFileSync(join(f.root, f.spec.approvedImage.path), Buffer.from('changed'));
 await assert.rejects(renderXCharacterCard(f.root, { exam: 'civil-2' }, f.spec), /sha256/);
 const wrongSize = await adoptedFixture(t, 960);
 await assert.rejects(renderXCharacterCard(wrongSize.root, { exam: 'civil-2' }, wrongSize.spec), /寸法/);
});

test('adopted POP cards reject missing or noncanonical PNG references', () => {
 assert.throws(() => validateCharacterCard({ ...spec, design: 'pop-poster-v3' }), /採用PNG/);
 assert.throws(() => validateCharacterCard({ ...spec, design: 'pop-poster-v3', approvedImage: { path: '../other.png', sha256: '0'.repeat(64) } }), /採用PNG/);
});
